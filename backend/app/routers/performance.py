from fastapi import APIRouter, HTTPException
from datetime import timedelta
from app.models.performance import (
    RollingReturnRequest,
    RollingReturnResponse,
    RollingReturnPoint,
    MonthlyReturnPoint,
    FundResult,
    FundWindowResult,
    BenchmarkWindowResult,
    FundAnalyticsRequest,
    FundAnalyticsResponse,
    FundAnalyticsResult,
    DrawdownStats,
)
from app.services.rolling_returns import (
    load_nav_series,
    compute_rolling_returns,
    compute_monthly_returns,
    monthly_returns_to_point_list,
    series_to_points,
    downsample_shared,
    series_to_point_list,
    WINDOW_MAP,
)
from app.services.analytics import load_nav_for_analytics, compute_max_drawdown
from app.services.benchmarking import get_scheme_name
from app.config import RISK_FREE_RATE
from app.database import execute_query


def _get_ter(scheme_code: int) -> float | None:
    """Return applicable_ter (%) for a scheme, or None if not in ter_data."""
    rows = execute_query(
        "SELECT applicable_ter FROM ter_data WHERE scheme_code = ?",
        (scheme_code,),
    )
    if rows and rows[0]["applicable_ter"] is not None:
        return rows[0]["applicable_ter"]
    return None

router = APIRouter(prefix="/api/performance", tags=["Performance"])


@router.post("/rolling-returns", response_model=RollingReturnResponse)
def get_rolling_returns(request: RollingReturnRequest):
    if not request.windows:
        raise HTTPException(status_code=400, detail="At least one window must be specified")

    invalid = [w for w in request.windows if w not in WINDOW_MAP]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid windows: {invalid}. Valid options: {list(WINDOW_MAP.keys())}",
        )

    # Validate all scheme codes
    scheme_names: dict[int, str] = {}
    for sc in request.scheme_codes:
        name = get_scheme_name(sc)
        if not name:
            raise HTTPException(status_code=404, detail=f"Scheme {sc} not found")
        scheme_names[sc] = name

    benchmark_name = get_scheme_name(request.benchmark_code)
    if not benchmark_name:
        raise HTTPException(status_code=404, detail=f"Benchmark scheme {request.benchmark_code} not found")

    # Fetch NAV with look-back buffer for rolling window
    max_window_days = max(WINDOW_MAP[w] for w in request.windows)
    nav_start = (
        request.start_date - timedelta(days=max_window_days)
        if request.start_date else None
    )

    # Load all NAVs
    benchmark_nav = load_nav_series(request.benchmark_code, nav_start, request.end_date)
    if benchmark_nav.empty:
        raise HTTPException(status_code=404, detail=f"No NAV data found for benchmark {request.benchmark_code}")

    fund_navs: dict[int, object] = {}
    for sc in request.scheme_codes:
        nav = load_nav_series(sc, nav_start, request.end_date)
        if nav.empty:
            raise HTTPException(status_code=404, detail=f"No NAV data found for scheme {sc}")
        fund_navs[sc] = nav

    # Per window: compute all rolling series, downsample on shared date grid
    benchmark_windows: list[BenchmarkWindowResult] = []
    # fund_window_data[sc][window] = list[RollingReturnPoint]
    fund_window_data: dict[int, dict[str, list[RollingReturnPoint]]] = {
        sc: {} for sc in request.scheme_codes
    }

    for window in request.windows:
        window_days = WINDOW_MAP[window]

        # Compute full-resolution rolling series for every series
        bench_rolling = series_to_points(
            compute_rolling_returns(benchmark_nav, window_days),
            request.start_date,
        )
        fund_rollings: dict[int, object] = {}
        for sc in request.scheme_codes:
            fund_rollings[sc] = series_to_points(
                compute_rolling_returns(fund_navs[sc], window_days),
                request.start_date,
            )

        # Build named dict for joint downsampling: benchmark + all funds
        named = {"benchmark": bench_rolling}
        for sc in request.scheme_codes:
            named[f"fund_{sc}"] = fund_rollings[sc]

        # Downsample on the shared date grid
        downsampled = downsample_shared(named, max_points=500)

        bench_ds = downsampled["benchmark"]
        bench_pts = series_to_point_list(bench_ds)
        benchmark_windows.append(
            BenchmarkWindowResult(
                window=window,
                window_days=window_days,
                data=[RollingReturnPoint(**p) for p in bench_pts],
                data_points=len(bench_pts),
            )
        )

        for sc in request.scheme_codes:
            fund_ds = downsampled[f"fund_{sc}"]
            fund_pts = series_to_point_list(fund_ds)
            fund_window_data[sc][window] = [RollingReturnPoint(**p) for p in fund_pts]

    # Assemble FundResult objects
    fund_results: list[FundResult] = []
    for sc in request.scheme_codes:
        window_results: list[FundWindowResult] = []
        for window in request.windows:
            pts = fund_window_data[sc][window]
            window_results.append(
                FundWindowResult(
                    window=window,
                    window_days=WINDOW_MAP[window],
                    data=pts,
                    data_points=len(pts),
                )
            )
        fund_results.append(
            FundResult(
                scheme_code=sc,
                scheme_name=scheme_names[sc],
                windows=window_results,
                ter=_get_ter(sc),
            )
        )

    # ── Freefincal-style monthly returns ────────────────────────────────────────
    # Compute non-overlapping monthly returns for benchmark and each fund.
    # These are used by the frontend to compute CAGR-based UCR/DCR capture ratios
    # following Freefincal's methodology.
    # We load fresh NAV series without the rolling-window look-back buffer so the
    # monthly series starts at start_date (not start_date - max_window_days).
    bench_monthly_nav = load_nav_series(request.benchmark_code, request.start_date, request.end_date)
    monthly_returns_map: dict[str, list[MonthlyReturnPoint]] = {}
    bench_monthly = compute_monthly_returns(bench_monthly_nav, request.start_date)
    monthly_returns_map["benchmark"] = [
        MonthlyReturnPoint(**p) for p in monthly_returns_to_point_list(bench_monthly)
    ]
    for sc in request.scheme_codes:
        fund_monthly_nav = load_nav_series(sc, request.start_date, request.end_date)
        fund_monthly = compute_monthly_returns(fund_monthly_nav, request.start_date)
        monthly_returns_map[f"fund_{sc}"] = [
            MonthlyReturnPoint(**p) for p in monthly_returns_to_point_list(fund_monthly)
        ]

    return RollingReturnResponse(
        benchmark_code=request.benchmark_code,
        benchmark_name=benchmark_name,
        funds=fund_results,
        benchmark_windows=benchmark_windows,
        risk_free_rate=RISK_FREE_RATE,
        monthly_returns=monthly_returns_map,
    )


@router.post("/fund-analytics", response_model=FundAnalyticsResponse)
def get_fund_analytics(request: FundAnalyticsRequest):
    """
    Compute max drawdown and recovery statistics for each fund and the benchmark
    over the selected date range. No rolling-window buffer needed here — we use
    the raw NAV series as-is.
    """
    scheme_names: dict[int, str] = {}
    for sc in request.scheme_codes:
        name = get_scheme_name(sc)
        if not name:
            raise HTTPException(status_code=404, detail=f"Scheme {sc} not found")
        scheme_names[sc] = name

    benchmark_name = get_scheme_name(request.benchmark_code)
    if not benchmark_name:
        raise HTTPException(status_code=404, detail=f"Benchmark scheme {request.benchmark_code} not found")

    # Load benchmark NAV and compute drawdown
    bench_nav = load_nav_for_analytics(request.benchmark_code, request.start_date, request.end_date)
    if bench_nav.empty:
        raise HTTPException(status_code=404, detail=f"No NAV data for benchmark {request.benchmark_code}")

    benchmark_dd = compute_max_drawdown(bench_nav)

    # Load each fund NAV and compute drawdown
    fund_results: list[FundAnalyticsResult] = []
    for sc in request.scheme_codes:
        nav = load_nav_for_analytics(sc, request.start_date, request.end_date)
        if nav.empty:
            raise HTTPException(status_code=404, detail=f"No NAV data for scheme {sc}")
        dd = compute_max_drawdown(nav)
        fund_results.append(
            FundAnalyticsResult(
                scheme_code=sc,
                scheme_name=scheme_names[sc],
                drawdown=DrawdownStats(**dd),
            )
        )

    return FundAnalyticsResponse(
        benchmark_code=request.benchmark_code,
        benchmark_name=benchmark_name,
        benchmark_drawdown=DrawdownStats(**benchmark_dd),
        funds=fund_results,
    )
