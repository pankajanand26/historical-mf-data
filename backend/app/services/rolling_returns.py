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
    Reindexes to a full daily calendar so pct_change(periods=N) is
    calendar-accurate, then returns the result on NAV trading days only
    (no ffill artefacts in the output).
    """
    if nav.empty or len(nav) < 2:
        return pd.Series(dtype=float)

    full_range = pd.date_range(nav.index.min(), nav.index.max(), freq="D")
    nav_daily = nav.reindex(full_range).ffill()
    rolling = nav_daily.pct_change(periods=window_days).dropna()
    # Keep only dates that had actual NAV observations (trading days)
    rolling = rolling[rolling.index.isin(nav.index)]
    return rolling


def series_to_points(
    series: pd.Series,
    clip_start: Optional[date] = None,
) -> pd.Series:
    """Apply clip_start filter; return the (still full-resolution) Series."""
    if clip_start is not None and not series.empty:
        series = series[series.index >= pd.Timestamp(clip_start)]
    return series


def downsample_shared(
    named_series: dict[str, pd.Series],
    max_points: int = 500,
) -> dict[str, pd.Series]:
    """
    Downsample multiple aligned series together so they all share the same
    date grid.  Steps:
      1. Inner-join all series on their common dates.
      2. If that common grid has more than max_points entries, pick
         max_points evenly-spaced indices from it.
      3. Return each series restricted to those shared dates.

    This prevents fragmentation: every row in the Recharts data array will
    have a value for every series — no undefined gaps.
    """
    # Build the shared (inner) date index
    common_index = None
    for s in named_series.values():
        if s.empty:
            continue
        common_index = s.index if common_index is None else common_index.intersection(s.index)

    if common_index is None or len(common_index) == 0:
        return {k: pd.Series(dtype=float) for k in named_series}

    if len(common_index) > max_points:
        indices = np.linspace(0, len(common_index) - 1, max_points, dtype=int)
        common_index = common_index[indices]

    return {k: s.reindex(common_index) for k, s in named_series.items()}


def series_to_point_list(series: pd.Series) -> list[dict]:
    """Convert a pd.Series to [{date, value}, ...] dicts."""
    return [
        {
            "date": dt.strftime("%Y-%m-%d"),
            "value": round(float(v) * 100, 4) if not np.isnan(v) else None,
        }
        for dt, v in series.items()
    ]


def compute_monthly_returns(
    nav: pd.Series,
    clip_start: Optional[date] = None,
) -> pd.Series:
    """
    Compute non-overlapping monthly returns using month-end NAV values.

    Steps:
      1. Resample the NAV series to month-end (last trading day per calendar month).
      2. Compute pct_change(1) to get month-over-month decimal returns.
      3. Optionally clip to dates >= clip_start.

    Returns a date-indexed Series of decimal returns (e.g. 0.0312 = 3.12%).
    Values are NOT multiplied by 100 — kept as decimals for the CAGR product formula.
    """
    if nav.empty or len(nav) < 2:
        return pd.Series(dtype=float)

    monthly = nav.resample("ME").last().dropna()
    returns = monthly.pct_change(1).dropna()

    if clip_start is not None and not returns.empty:
        returns = returns[returns.index >= pd.Timestamp(clip_start)]

    return returns


def monthly_returns_to_point_list(series: pd.Series) -> list[dict]:
    """Convert monthly-return Series to [{date, value}, ...] dicts.
    Values are decimal returns (e.g. 0.0312), NOT multiplied by 100.
    """
    return [
        {
            "date": dt.strftime("%Y-%m-%d"),
            "value": round(float(v), 6) if not np.isnan(v) else None,
        }
        for dt, v in series.items()
    ]
