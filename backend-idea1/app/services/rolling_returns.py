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


def compute_fund_rolling(
    nav: pd.Series,
    window: str,
    clip_start: Optional[date] = None,
    max_points: int = 500,
) -> tuple[list[dict], int]:
    """
    Compute rolling returns for a single fund for one window.
    Returns (list of {date, value} dicts, window_days).

    clip_start: if set, strip data points before this date (look-back buffer).
    max_points: downsample to this many evenly-spaced points if needed.
    """
    window_days = WINDOW_MAP[window]
    rolling = compute_rolling_returns(nav, window_days)

    if clip_start is not None and not rolling.empty:
        rolling = rolling[rolling.index >= pd.Timestamp(clip_start)]

    if rolling.empty:
        return [], window_days

    if len(rolling) > max_points:
        indices = np.linspace(0, len(rolling) - 1, max_points, dtype=int)
        rolling = rolling.iloc[indices]

    points = [
        {
            "date": dt.strftime("%Y-%m-%d"),
            "value": round(float(v) * 100, 4) if not np.isnan(v) else None,
        }
        for dt, v in rolling.items()
    ]
    return points, window_days


def compute_benchmark_rolling(
    benchmark_nav: pd.Series,
    windows: list[str],
    clip_start: Optional[date] = None,
    max_points: int = 500,
) -> list[dict]:
    """
    Compute rolling returns for the benchmark for all requested windows.
    Returns a list of BenchmarkWindowResult-shaped dicts.
    """
    results = []
    for window in windows:
        window_days = WINDOW_MAP[window]
        rolling = compute_rolling_returns(benchmark_nav, window_days)

        if clip_start is not None and not rolling.empty:
            rolling = rolling[rolling.index >= pd.Timestamp(clip_start)]

        if rolling.empty:
            results.append({
                "window": window,
                "window_days": window_days,
                "data": [],
                "data_points": 0,
            })
            continue

        if len(rolling) > max_points:
            indices = np.linspace(0, len(rolling) - 1, max_points, dtype=int)
            rolling = rolling.iloc[indices]

        points = [
            {
                "date": dt.strftime("%Y-%m-%d"),
                "value": round(float(v) * 100, 4) if not np.isnan(v) else None,
            }
            for dt, v in rolling.items()
        ]
        results.append({
            "window": window,
            "window_days": window_days,
            "data": points,
            "data_points": len(points),
        })
    return results
