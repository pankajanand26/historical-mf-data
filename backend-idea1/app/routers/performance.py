from fastapi import APIRouter, HTTPException
from datetime import timedelta
from app.models.performance import RollingReturnRequest, RollingReturnResponse, WindowResult, RollingReturnPoint
from app.services.rolling_returns import load_nav_series, build_window_data, WINDOW_MAP
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

    scheme_name = get_scheme_name(request.scheme_code)
    if not scheme_name:
        raise HTTPException(status_code=404, detail=f"Scheme {request.scheme_code} not found")

    benchmark_name = get_scheme_name(request.benchmark_code)
    if not benchmark_name:
        raise HTTPException(status_code=404, detail=f"Benchmark scheme {request.benchmark_code} not found")

    # When a start_date is given, fetch extra NAV history equal to the largest
    # requested window so pct_change has enough look-back to produce results
    # starting from the user's chosen start_date rather than window_days later.
    max_window_days = max(WINDOW_MAP[w] for w in request.windows)
    nav_start = (
        request.start_date - timedelta(days=max_window_days)
        if request.start_date else None
    )

    scheme_nav = load_nav_series(request.scheme_code, nav_start, request.end_date)
    benchmark_nav = load_nav_series(request.benchmark_code, nav_start, request.end_date)

    if scheme_nav.empty:
        raise HTTPException(status_code=404, detail=f"No NAV data found for scheme {request.scheme_code}")
    if benchmark_nav.empty:
        raise HTTPException(status_code=404, detail=f"No NAV data found for benchmark {request.benchmark_code}")

    window_results = []
    for window in request.windows:
        window_data = build_window_data(
            scheme_nav=scheme_nav,
            benchmark_nav=benchmark_nav,
            window=window,
            scheme_name=scheme_name,
            benchmark_name=benchmark_name,
            clip_start=request.start_date,  # trim the look-back buffer from output
        )
        window_results.append(
            WindowResult(
                window=window_data["window"],
                window_days=window_data["window_days"],
                data=[RollingReturnPoint(**p) for p in window_data["data"]],
                scheme_name=window_data["scheme_name"],
                benchmark_name=window_data["benchmark_name"],
                data_points=window_data["data_points"],
            )
        )

    return RollingReturnResponse(
        scheme_code=request.scheme_code,
        scheme_name=scheme_name,
        benchmark_code=request.benchmark_code,
        benchmark_name=benchmark_name,
        windows=window_results,
    )
