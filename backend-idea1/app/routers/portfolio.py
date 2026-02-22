"""
routers/portfolio.py
--------------------
Three POST endpoints for the Portfolio Optimiser feature:

  POST /api/portfolio/nav         – normalised monthly NAV growth for all assets
  POST /api/portfolio/correlation – full-period + rolling correlation matrix
  POST /api/portfolio/optimize    – MVO + Monte Carlo optimisation results
"""

import numpy as np
from fastapi import APIRouter, HTTPException

from app.models.portfolio import (
    PortfolioDateRange,
    NavResponse,
    AssetNavSeries,
    AssetStats,
    NavPoint,
    CorrelationResponse,
    RollingCorrPoint,
    OptimizeResponse,
    PortfolioResult,
    MonteCarloPoint,
    FrontierPoint,
    ScatterPoint,
    AssetMeta,
)
from app.services.data_loader import load_monthly_returns, ASSET_CLASSES
from app.services.correlation import compute_correlation
from app.services.optimization import compute_optimization

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

MONTHS_PER_YEAR = 12


# ── Helper ─────────────────────────────────────────────────────────────────────

def _raise_data_error(msg: str) -> None:
    raise HTTPException(status_code=422, detail=msg)


# ── 1. NAV Growth ──────────────────────────────────────────────────────────────

@router.post("/nav", response_model=NavResponse)
async def get_portfolio_nav(body: PortfolioDateRange) -> NavResponse:
    """
    Return month-end NAV normalised to 100 at the first common date,
    together with annualised summary statistics per asset.
    """
    nav_df, ret_df = load_monthly_returns(body.start_date, body.end_date)

    if nav_df.empty or len(nav_df) < 2:
        _raise_data_error("No overlapping NAV data found for the requested date range.")

    common_start = nav_df.index[0].strftime("%Y-%m-%d")
    common_end   = nav_df.index[-1].strftime("%Y-%m-%d")
    months       = len(nav_df)

    # Normalise each column to 100 at the first common date
    norm_df = nav_df.div(nav_df.iloc[0]) * 100.0

    assets_out: list[AssetNavSeries] = []
    for asset_id in nav_df.columns:
        meta = ASSET_CLASSES.get(asset_id, {})
        nav_series_raw = norm_df[asset_id]

        # Summary stats from returns
        if asset_id in ret_df.columns and len(ret_df[asset_id]) > 1:
            rets = ret_df[asset_id]
            total_return = float(nav_series_raw.iloc[-1] / 100.0 - 1.0) * 100.0
            n_months = len(rets)
            ann_ret  = float((1 + rets.mean()) ** MONTHS_PER_YEAR - 1) * 100.0
            ann_vol  = float(rets.std() * np.sqrt(MONTHS_PER_YEAR)) * 100.0
        else:
            total_return = 0.0
            ann_ret      = 0.0
            ann_vol      = 0.0

        nav_pts = [
            NavPoint(date=dt.strftime("%Y-%m-%d"), value=round(float(v), 4))
            for dt, v in nav_series_raw.items()
        ]

        assets_out.append(AssetNavSeries(
            id=asset_id,
            label=meta.get("label", asset_id),
            scheme_code=meta.get("scheme_code", 0),
            nav_series=nav_pts,
            stats=AssetStats(
                total_return_pct=round(total_return, 2),
                annualized_return_pct=round(ann_ret, 2),
                volatility_ann_pct=round(ann_vol, 2),
            ),
        ))

    return NavResponse(
        assets=assets_out,
        common_start=common_start,
        common_end=common_end,
        months=months,
    )


# ── 2. Correlation ─────────────────────────────────────────────────────────────

@router.post("/correlation", response_model=CorrelationResponse)
async def get_portfolio_correlation(body: PortfolioDateRange) -> CorrelationResponse:
    """
    Return the full-period Pearson correlation matrix and rolling 12-month
    correlations for key asset-class pairs.
    """
    try:
        result = compute_correlation(body.start_date, body.end_date)
    except RuntimeError as exc:
        _raise_data_error(str(exc))

    rolling_out: dict[str, list[RollingCorrPoint]] = {
        pair_key: [RollingCorrPoint(date=p["date"], value=p["value"]) for p in pts]
        for pair_key, pts in result["rolling"].items()
    }

    return CorrelationResponse(
        labels=result["labels"],
        asset_labels=result["asset_labels"],
        matrix=result["matrix"],
        rolling=rolling_out,
        rolling_labels=result["rolling_labels"],
    )


# ── 3. Optimise ────────────────────────────────────────────────────────────────

@router.post("/optimize", response_model=OptimizeResponse)
async def get_portfolio_optimization(body: PortfolioDateRange) -> OptimizeResponse:
    """
    Run Markowitz MVO (Max Sharpe + Min Variance + Efficient Frontier) and
    5,000-path block-bootstrap Monte Carlo wealth simulation.
    """
    try:
        result = compute_optimization(body.start_date, body.end_date)
    except RuntimeError as exc:
        _raise_data_error(str(exc))

    def _to_portfolio_result(d: dict) -> PortfolioResult:
        return PortfolioResult(
            weights=d["weights"],
            ret=d["ret"],
            vol=d["vol"],
            sharpe=d["sharpe"],
            monte_carlo=[MonteCarloPoint(**p) for p in d["monte_carlo"]],
        )

    return OptimizeResponse(
        assets=[AssetMeta(**a) for a in result["assets"]],
        max_sharpe=_to_portfolio_result(result["max_sharpe"]),
        min_variance=_to_portfolio_result(result["min_variance"]),
        equal_weight=_to_portfolio_result(result["equal_weight"]),
        frontier=[FrontierPoint(**p) for p in result["frontier"]],
        mc_scatter=[ScatterPoint(**p) for p in result["mc_scatter"]],
        risk_free_rate=result["risk_free_rate"],
        start_date=result["start_date"],
        end_date=result["end_date"],
        months=result["months"],
    )
