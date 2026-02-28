import pandas as pd
import numpy as np
from typing import Optional
from datetime import date
from app.database import execute_query_df


def load_nav_for_analytics(
    scheme_code: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> pd.Series:
    """
    Load NAV time-series for max-drawdown computation.
    No look-back buffer needed — just the raw date range.
    """
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


def compute_max_drawdown(nav: pd.Series) -> dict:
    """
    Compute the maximum drawdown statistics from a NAV series.

    Max drawdown = largest peak-to-trough decline as a percentage.
    Returns:
      max_drawdown          : float (%), negative (e.g. -38.5)
      peak_date             : str YYYY-MM-DD (last date NAV was at cumulative high)
      trough_date           : str YYYY-MM-DD (date of lowest point after that peak)
      drawdown_duration_days: int (peak → trough calendar days)
      recovery_date         : str | None (first date NAV >= peak NAV again)
      recovery_days         : int | None (trough → recovery calendar days)
    """
    empty = {
        "max_drawdown": 0.0,
        "peak_date": None,
        "trough_date": None,
        "drawdown_duration_days": 0,
        "recovery_date": None,
        "recovery_days": None,
    }

    if nav.empty or len(nav) < 2:
        return empty

    running_max = nav.cummax()
    drawdown = (nav - running_max) / running_max  # always <= 0

    min_dd = float(drawdown.min())
    if min_dd == 0.0:
        return empty  # NAV never drew down (monotonically increasing)

    trough_date = drawdown.idxmin()

    # Peak = the date the NAV was last at its running maximum before the trough.
    # nav.loc[:trough_date].idxmax() finds that date correctly.
    peak_date = nav.loc[:trough_date].idxmax()
    peak_nav = float(nav[peak_date])

    # Recovery = first date after the trough where NAV >= peak NAV
    after_trough = nav.loc[trough_date:]
    recovered = after_trough[after_trough >= peak_nav]
    recovery_date = recovered.index[0] if not recovered.empty else None
    recovery_days = int((recovery_date - trough_date).days) if recovery_date is not None else None

    return {
        "max_drawdown": round(min_dd * 100, 2),
        "peak_date": peak_date.strftime("%Y-%m-%d"),
        "trough_date": trough_date.strftime("%Y-%m-%d"),
        "drawdown_duration_days": int((trough_date - peak_date).days),
        "recovery_date": recovery_date.strftime("%Y-%m-%d") if recovery_date is not None else None,
        "recovery_days": recovery_days,
    }
