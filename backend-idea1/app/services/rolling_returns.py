import pandas as pd
import numpy as np
from typing import Optional
from datetime import date
from app.database import execute_query_df

WINDOW_MAP = {
    "1y": 365,
    "3y": 365 * 3,
    "5y": 365 * 5,
    "10y": 365 * 10,
}


def load_nav_series(
    scheme_code: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> pd.Series:
    """Load NAV time-series for a single scheme as a date-indexed Series."""
    query = """
        SELECT n.date, n.nav
        FROM nav_data n
        WHERE n.scheme_code = ?
    """
    params: list = [scheme_code]

    if start_date:
        query += " AND n.date >= ?"
        params.append(start_date.isoformat())
    if end_date:
        query += " AND n.date <= ?"
        params.append(end_date.isoformat())

    query += " ORDER BY n.date"

    df = execute_query_df(query, tuple(params))
    if df.empty:
        return pd.Series(dtype=float)

    df["date"] = pd.to_datetime(df["date"])
    df["nav"] = pd.to_numeric(df["nav"], errors="coerce")
    df = df.dropna(subset=["nav"])
    df = df[df["nav"] > 0]
    series = df.set_index("date")["nav"]
    series = series[~series.index.duplicated(keep="last")]
    series = series.sort_index()
    return series


def compute_rolling_returns(
    nav: pd.Series,
    window_days: int,
) -> pd.Series:
    """
    Compute point-in-time rolling returns over `window_days` calendar days.
    For each date t, return = (NAV[t] / NAV[t - window_days]) - 1.
    Uses pandas iloc-based shifting after reindexing to a daily calendar.
    """
    if nav.empty or len(nav) < 2:
        return pd.Series(dtype=float)

    # Reindex to a full daily calendar so pct_change(periods=N) is calendar-accurate
    full_range = pd.date_range(nav.index.min(), nav.index.max(), freq="D")
    nav_daily = nav.reindex(full_range).ffill()

    rolling = nav_daily.pct_change(periods=window_days).dropna()
    return rolling


def align_series(
    scheme_nav: pd.Series,
    benchmark_nav: pd.Series,
    window_days: int,
) -> tuple[pd.Series, pd.Series]:
    """
    Compute rolling returns for both series and align them on common dates.
    Only returns dates where both series have data.
    """
    scheme_rolling = compute_rolling_returns(scheme_nav, window_days)
    benchmark_rolling = compute_rolling_returns(benchmark_nav, window_days)

    scheme_aligned, benchmark_aligned = scheme_rolling.align(
        benchmark_rolling, join="inner"
    )
    return scheme_aligned, benchmark_aligned


def build_window_data(
    scheme_nav: pd.Series,
    benchmark_nav: pd.Series,
    window: str,
    scheme_name: str,
    benchmark_name: str,
    max_points: int = 500,
    clip_start: Optional[date] = None,
) -> dict:
    """
    Build the full result dict for a single rolling window.
    Downsamples to `max_points` evenly-spaced observations if needed.

    clip_start: if set, only return rolling-return data points on or after
    this date.  Use this when NAV was fetched with an earlier start to
    provide the rolling window's look-back buffer.
    """
    window_days = WINDOW_MAP.get(window)
    if window_days is None:
        raise ValueError(f"Unsupported window: {window}. Must be one of {list(WINDOW_MAP.keys())}")

    scheme_r, benchmark_r = align_series(scheme_nav, benchmark_nav, window_days)

    # Clip to user's requested start date (strip the look-back buffer)
    if clip_start is not None and not scheme_r.empty:
        clip_ts = pd.Timestamp(clip_start)
        scheme_r = scheme_r[scheme_r.index >= clip_ts]
        benchmark_r = benchmark_r[benchmark_r.index >= clip_ts]

    if scheme_r.empty:
        return {
            "window": window,
            "window_days": window_days,
            "data": [],
            "scheme_name": scheme_name,
            "benchmark_name": benchmark_name,
            "data_points": 0,
        }

    # Downsample if too many points for the frontend
    if len(scheme_r) > max_points:
        indices = np.linspace(0, len(scheme_r) - 1, max_points, dtype=int)
        scheme_r = scheme_r.iloc[indices]
        benchmark_r = benchmark_r.iloc[indices]

    data_points = []
    for dt in scheme_r.index:
        s_val = scheme_r.get(dt)
        b_val = benchmark_r.get(dt)
        data_points.append({
            "date": dt.strftime("%Y-%m-%d"),
            "scheme_return": round(float(s_val) * 100, 4) if s_val is not None and not np.isnan(s_val) else None,
            "benchmark_return": round(float(b_val) * 100, 4) if b_val is not None and not np.isnan(b_val) else None,
        })

    return {
        "window": window,
        "window_days": window_days,
        "data": data_points,
        "scheme_name": scheme_name,
        "benchmark_name": benchmark_name,
        "data_points": len(data_points),
    }
