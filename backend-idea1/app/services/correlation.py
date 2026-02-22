"""
correlation.py
--------------
Full-period and rolling 12-month correlation analysis for the portfolio
asset classes defined in data_loader.py.
"""

import numpy as np
import pandas as pd
from typing import Optional
from datetime import date

from app.services.data_loader import load_monthly_returns, ASSET_CLASSES


# Key pairs to track over time (order matters for the label)
ROLLING_PAIRS: list[tuple[str, str]] = [
    ("equity",    "gilt"),
    ("equity",    "gold"),
    ("equity",    "corp_bond"),
    ("gilt",      "gold"),
    ("equity",    "liquid"),
]

_PAIR_LABELS: dict[str, str] = {
    "equity_vs_gilt":      "Equity vs Govt Bonds",
    "equity_vs_gold":      "Equity vs Gold",
    "equity_vs_corp_bond": "Equity vs Corp Bonds",
    "gilt_vs_gold":        "Govt Bonds vs Gold",
    "equity_vs_liquid":    "Equity vs Liquid",
}


def compute_correlation(
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> dict:
    """
    Returns a dict with:
      labels        : list[str] — asset IDs in matrix order
      asset_labels  : dict[str,str] — id → display name
      matrix        : list[list[float]] — correlation matrix (row-major)
      rolling       : dict[str, list[{date, value}]] — rolling 12M correlations
      rolling_labels: dict[str, str] — pair_key → human label
    Raises RuntimeError if insufficient data.
    """
    _, ret_df = load_monthly_returns(start, end)
    if ret_df.empty or len(ret_df) < 13:
        raise RuntimeError("Insufficient return data for correlation analysis")

    labels = list(ret_df.columns)

    # Full-period correlation matrix
    corr_matrix = ret_df.corr()

    # Asset display labels (only for assets that made it into ret_df)
    asset_labels = {
        aid: ASSET_CLASSES[aid]["label"]
        for aid in labels
        if aid in ASSET_CLASSES
    }

    # Rolling 12-month correlations for defined pairs
    rolling: dict[str, list[dict]] = {}
    rolling_labels: dict[str, str] = {}

    for a, b in ROLLING_PAIRS:
        if a not in ret_df.columns or b not in ret_df.columns:
            continue
        pair_key = f"{a}_vs_{b}"
        roll = ret_df[a].rolling(12).corr(ret_df[b]).dropna()
        rolling[pair_key] = [
            {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 4)}
            for dt, v in roll.items()
        ]
        rolling_labels[pair_key] = _PAIR_LABELS.get(pair_key, pair_key)

    return {
        "labels":         labels,
        "asset_labels":   asset_labels,
        "matrix":         [[round(float(v), 4) for v in row]
                           for row in corr_matrix.values],
        "rolling":        rolling,
        "rolling_labels": rolling_labels,
    }
