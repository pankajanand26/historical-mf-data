from fastapi import APIRouter, HTTPException
from datetime import timedelta
from app.models.performance import (
    RollingReturnRequest,
    RollingReturnResponse,
    RollingReturnPoint,
    FundResult,
    FundWindowResult,
    BenchmarkWindowResult,
)
from app.services.rolling_returns import (
    load_nav_series,
    compute_fund_rolling,
    compute_benchmark_rolling,
    WINDOW_MAP,
)
from app.services.benchmarking import get_scheme_name

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

    # Load benchmark NAV once
    benchmark_nav = load_nav_series(request.benchmark_code, nav_start, request.end_date)
    if benchmark_nav.empty:
        raise HTTPException(status_code=404, detail=f"No NAV data found for benchmark {request.benchmark_code}")

    # Compute benchmark rolling returns for all windows
    benchmark_window_dicts = compute_benchmark_rolling(
        benchmark_nav=benchmark_nav,
        windows=request.windows,
        clip_start=request.start_date,
    )
    benchmark_windows = [
        BenchmarkWindowResult(
            window=bw["window"],
            window_days=bw["window_days"],
            data=[RollingReturnPoint(**p) for p in bw["data"]],
            data_points=bw["data_points"],
        )
        for bw in benchmark_window_dicts
    ]

    # Compute rolling returns for each fund
    fund_results: list[FundResult] = []
    for sc in request.scheme_codes:
        fund_nav = load_nav_series(sc, nav_start, request.end_date)
        if fund_nav.empty:
            raise HTTPException(status_code=404, detail=f"No NAV data found for scheme {sc}")

        window_results: list[FundWindowResult] = []
        for window in request.windows:
            points, window_days = compute_fund_rolling(
                nav=fund_nav,
                window=window,
                clip_start=request.start_date,
            )
            window_results.append(
                FundWindowResult(
                    window=window,
                    window_days=window_days,
                    data=[RollingReturnPoint(**p) for p in points],
                    data_points=len(points),
                )
            )

        fund_results.append(
            FundResult(
                scheme_code=sc,
                scheme_name=scheme_names[sc],
                windows=window_results,
            )
        )

    return RollingReturnResponse(
        benchmark_code=request.benchmark_code,
        benchmark_name=benchmark_name,
        funds=fund_results,
        benchmark_windows=benchmark_windows,
    )
