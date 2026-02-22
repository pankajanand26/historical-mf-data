"""
data_loader.py
--------------
Loads monthly-resampled NAV and return data for the 6 asset-class proxies.
All downstream services (correlation, optimization) import from here.
"""

import pandas as pd
import numpy as np
from typing import Optional
from datetime import date
from app.database import execute_query_df


# ── Asset class universe ────────────────────────────────────────────────────────
# Direct Growth plans only — comparable from Jan 2013 onward.
# If a scheme_code yields no data, that asset is silently dropped so the
# remaining assets still work (e.g. scheme 118780 is a best-effort code).

ASSET_CLASSES: dict[str, dict] = {
    "equity":    {"scheme_code": 120716, "label": "Passive Equity (Nifty 50)"},
    "gold":      {"scheme_code": 111954, "label": "Gold ETF"},
    "gilt":      {"scheme_code": 119116, "label": "Government Bonds"},
    "corp_bond": {"scheme_code": 118987, "label": "Corporate Bonds"},
    "short_dur": {"scheme_code": 118780, "label": "Short Duration Debt"},
    "liquid":    {"scheme_code": 119568, "label": "Liquid (Cash Proxy)"},
}

DEFAULT_START = date(2013, 1, 1)
DEFAULT_END   = date(2025, 12, 31)


def load_raw_nav(scheme_code: int, start: date, end: date) -> pd.Series:
    """
    Return a date-indexed Series of daily NAV for one scheme.
    Duplicates are dropped (keep last); result is sorted ascending.
    Returns empty Series if no rows found.
    """
    query = """
        SELECT date, nav
        FROM nav_data
        WHERE scheme_code = ?
          AND date >= ?
          AND date <= ?
        ORDER BY date
    """
    df = execute_query_df(query, (scheme_code, start.isoformat(), end.isoformat()))
    if df.empty:
        return pd.Series(dtype=float)

    df["date"] = pd.to_datetime(df["date"])
    df["nav"]  = pd.to_numeric(df["nav"], errors="coerce")
    df = df.dropna(subset=["nav"]).query("nav > 0")

    s = df.set_index("date")["nav"]
    s = s[~s.index.duplicated(keep="last")].sort_index()
    return s


def _to_monthly(raw: pd.Series) -> pd.Series:
    """
    Forward-fill a sparse daily series to a full calendar,
    then take the last NAV of each month (month-end resampling).
    """
    full = raw.reindex(
        pd.date_range(raw.index.min(), raw.index.max(), freq="D")
    ).ffill()
    return full.resample("ME").last().dropna()


def load_monthly_returns(
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load month-end NAV and simple monthly returns for all asset classes.

    Returns
    -------
    nav_df  : DataFrame — month-end NAV, columns = asset IDs
    ret_df  : DataFrame — simple monthly returns (one fewer row than nav_df)

    Both DataFrames are inner-joined on common dates (rows where every
    available asset has data).  Assets with fewer than 13 months of data
    are silently excluded.
    """
    s = start or DEFAULT_START
    e = end   or DEFAULT_END

    monthly_navs: dict[str, pd.Series] = {}
    for asset_id, meta in ASSET_CLASSES.items():
        raw = load_raw_nav(meta["scheme_code"], s, e)
        if raw.empty:
            continue
        monthly = _to_monthly(raw)
        if len(monthly) >= 13:          # need at least 13 months to get 12 return obs
            monthly_navs[asset_id] = monthly

    if not monthly_navs:
        return pd.DataFrame(), pd.DataFrame()

    # Inner-join: only keep month-end dates where ALL available assets have data
    nav_df = pd.DataFrame(monthly_navs).dropna()
    ret_df = nav_df.pct_change().dropna()

    return nav_df, ret_df
