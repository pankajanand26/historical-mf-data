"""
optimization.py
---------------
Markowitz MVO (Max Sharpe, Min Variance, Efficient Frontier) plus
block-bootstrap Monte Carlo wealth-path simulation.

All optimisation is done with scipy.optimize.minimize (SLSQP) — no
external portfolio library dependencies.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Optional
from datetime import date

from app.services.data_loader import load_monthly_returns, ASSET_CLASSES
from app.config import RISK_FREE_RATE


# ── Constants ───────────────────────────────────────────────────────────────────

MONTHS_PER_YEAR  = 12
N_FRONTIER_PTS   = 50       # efficient-frontier sample points
N_MC_SCATTER     = 500      # random portfolios for risk-return scatter cloud
N_MC_PATHS       = 5_000    # wealth-path Monte Carlo simulations
MC_HORIZON_YEARS = 10       # forward-looking horizon
MC_BLOCK_SIZE    = 3        # months per bootstrap block
RANDOM_SEED      = 42


# ── Core portfolio math ─────────────────────────────────────────────────────────

def _ann_stats(weights: np.ndarray, mean_m: np.ndarray, cov_m: np.ndarray) -> tuple[float, float, float]:
    """Return (annualised_ret, annualised_vol, sharpe) for a weight vector."""
    ret    = float(weights @ mean_m) * MONTHS_PER_YEAR
    vol    = float(np.sqrt(weights @ cov_m @ weights)) * np.sqrt(MONTHS_PER_YEAR)
    sharpe = (ret - RISK_FREE_RATE) / vol if vol > 1e-9 else -np.inf
    return ret, vol, sharpe


def _run_optimizer(
    mean_m: np.ndarray,
    cov_m: np.ndarray,
    n: int,
    objective: str,
    target_ret: Optional[float] = None,
) -> np.ndarray:
    """
    Minimise either negative Sharpe (objective='max_sharpe') or variance
    (objective='min_variance'), with optional return equality constraint.
    Returns weights array; falls back to equal-weight on failure.
    """
    bounds      = [(0.0, 1.0)] * n
    eq_sum      = {"type": "eq", "fun": lambda w: w.sum() - 1.0}
    constraints = [eq_sum]

    if target_ret is not None:
        constraints.append({
            "type": "eq",
            "fun": lambda w, r=target_ret: float(w @ mean_m) * MONTHS_PER_YEAR - r,
        })

    if objective == "max_sharpe":
        def obj(w: np.ndarray) -> float:
            r, v, _ = _ann_stats(w, mean_m, cov_m)
            return -(r - RISK_FREE_RATE) / v if v > 1e-9 else np.inf
    else:
        def obj(w: np.ndarray) -> float:  # type: ignore[misc]
            return float(w @ cov_m @ w)

    w0 = np.ones(n) / n
    res = minimize(
        obj, w0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"ftol": 1e-9, "maxiter": 1_000},
    )
    return res.x if res.success else w0


# ── Efficient frontier ──────────────────────────────────────────────────────────

def _build_frontier(
    mean_m: np.ndarray,
    cov_m: np.ndarray,
    n: int,
) -> list[dict]:
    ann_rets = mean_m * MONTHS_PER_YEAR
    r_min = float(ann_rets.min())
    r_max = float(ann_rets.max())
    targets = np.linspace(r_min, r_max, N_FRONTIER_PTS)

    points: list[dict] = []
    for t in targets:
        w = _run_optimizer(mean_m, cov_m, n, "min_variance", target_ret=t)
        r, v, s = _ann_stats(w, mean_m, cov_m)
        points.append({"ret": round(r * 100, 4), "vol": round(v * 100, 4), "sharpe": round(s, 4)})

    return points


# ── Random portfolio scatter ────────────────────────────────────────────────────

def _random_scatter(
    mean_m: np.ndarray,
    cov_m: np.ndarray,
    n: int,
) -> list[dict]:
    rng = np.random.default_rng(RANDOM_SEED)
    raw = rng.random((N_MC_SCATTER, n))
    weights = raw / raw.sum(axis=1, keepdims=True)  # rows sum to 1

    points: list[dict] = []
    for w in weights:
        r, v, s = _ann_stats(w, mean_m, cov_m)
        points.append({"ret": round(r * 100, 4), "vol": round(v * 100, 4), "sharpe": round(s, 4)})

    return points


# ── Block-bootstrap Monte Carlo wealth paths ────────────────────────────────────

def _monte_carlo(
    ret_df: pd.DataFrame,
    weights: np.ndarray,
) -> list[dict]:
    """
    Vectorised block-bootstrap Monte Carlo.
    Draws blocks of historical monthly portfolio returns to build
    N_MC_PATHS wealth trajectories over MC_HORIZON_YEARS years.
    Returns percentile bands [{month, p5, p25, p50, p75, p95}].
    """
    rng           = np.random.default_rng(RANDOM_SEED)
    horizon       = MC_HORIZON_YEARS * MONTHS_PER_YEAR
    block         = MC_BLOCK_SIZE
    n_blocks      = (horizon + block - 1) // block
    total_months  = n_blocks * block

    port_rets = (ret_df.values @ weights).astype(np.float64)   # (T,)
    T = len(port_rets)

    # Shape: (N_MC_PATHS, n_blocks) — random block start indices
    starts = rng.integers(0, max(1, T - block + 1), size=(N_MC_PATHS, n_blocks))
    # Expand to full index arrays: (N_MC_PATHS, total_months)
    offsets = np.arange(block)
    indices = (starts[:, :, None] + offsets[None, None, :]).reshape(N_MC_PATHS, total_months)
    # Clamp to valid range
    indices = np.clip(indices, 0, T - 1)

    all_rets = port_rets[indices][:, :horizon]              # (N_MC_PATHS, horizon)
    wealth   = np.cumprod(1.0 + all_rets, axis=1)          # (N_MC_PATHS, horizon)

    pcts = np.percentile(wealth, [5, 25, 50, 75, 95], axis=0)  # (5, horizon)

    return [
        {
            "month": m + 1,
            "p5":    round(float(pcts[0, m]), 4),
            "p25":   round(float(pcts[1, m]), 4),
            "p50":   round(float(pcts[2, m]), 4),
            "p75":   round(float(pcts[3, m]), 4),
            "p95":   round(float(pcts[4, m]), 4),
        }
        for m in range(horizon)
    ]


# ── Public entry point ──────────────────────────────────────────────────────────

def compute_optimization(
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> dict:
    """
    Run full portfolio optimisation pipeline.

    Returns a dict matching the OptimizeResponse Pydantic model.
    Raises RuntimeError if insufficient data.
    """
    nav_df, ret_df = load_monthly_returns(start, end)
    if ret_df.empty or len(ret_df) < 24:
        raise RuntimeError(
            "Insufficient return data for optimisation — need at least 24 months"
        )

    assets   = list(ret_df.columns)
    n        = len(assets)
    mean_m   = ret_df.mean().values        # monthly mean returns
    cov_m    = ret_df.cov().values         # monthly covariance matrix

    # ── Optimised portfolios ──────────────────────────────────────────────────
    w_sharpe   = _run_optimizer(mean_m, cov_m, n, "max_sharpe")
    w_minvar   = _run_optimizer(mean_m, cov_m, n, "min_variance")
    w_equal    = np.ones(n) / n

    def _portfolio_dict(w: np.ndarray) -> dict:
        r, v, s = _ann_stats(w, mean_m, cov_m)
        return {
            "weights":      {assets[i]: round(float(w[i]), 6) for i in range(n)},
            "ret":          round(r * 100, 4),
            "vol":          round(v * 100, 4),
            "sharpe":       round(s, 4),
            "monte_carlo":  _monte_carlo(ret_df, w),
        }

    # ── Asset metadata ────────────────────────────────────────────────────────
    asset_meta = [
        {
            "id":          aid,
            "label":       ASSET_CLASSES[aid]["label"],
            "scheme_code": ASSET_CLASSES[aid]["scheme_code"],
        }
        for aid in assets
    ]

    return {
        "assets":        asset_meta,
        "max_sharpe":    _portfolio_dict(w_sharpe),
        "min_variance":  _portfolio_dict(w_minvar),
        "equal_weight":  _portfolio_dict(w_equal),
        "frontier":      _build_frontier(mean_m, cov_m, n),
        "mc_scatter":    _random_scatter(mean_m, cov_m, n),
        "risk_free_rate": RISK_FREE_RATE,
        "start_date":    nav_df.index[0].strftime("%Y-%m-%d"),
        "end_date":      nav_df.index[-1].strftime("%Y-%m-%d"),
        "months":        len(ret_df),
    }
