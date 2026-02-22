from pydantic import BaseModel
from typing import Optional
from datetime import date


# ── Shared request ─────────────────────────────────────────────────────────────

class PortfolioDateRange(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


# ── NAV Growth ─────────────────────────────────────────────────────────────────

class NavPoint(BaseModel):
    date: str
    value: float          # normalized to 100 at the common start date


class AssetStats(BaseModel):
    total_return_pct: float
    annualized_return_pct: float
    volatility_ann_pct: float    # annualised from monthly std


class AssetNavSeries(BaseModel):
    id: str
    label: str
    scheme_code: int
    nav_series: list[NavPoint]
    stats: AssetStats


class NavResponse(BaseModel):
    assets: list[AssetNavSeries]
    common_start: str
    common_end: str
    months: int


# ── Correlation ────────────────────────────────────────────────────────────────

class RollingCorrPoint(BaseModel):
    date: str
    value: float


class CorrelationResponse(BaseModel):
    labels: list[str]                            # asset IDs in matrix order
    asset_labels: dict[str, str]                 # id → display label
    matrix: list[list[float]]                    # full correlation matrix
    rolling: dict[str, list[RollingCorrPoint]]   # "equity_vs_gilt" → [{date, value}]
    rolling_labels: dict[str, str]               # pair_key → human label


# ── Optimization ───────────────────────────────────────────────────────────────

class MonteCarloPoint(BaseModel):
    month: int
    p5: float
    p25: float
    p50: float
    p75: float
    p95: float


class PortfolioResult(BaseModel):
    weights: dict[str, float]        # asset_id → weight (0–1)
    ret: float                       # annualised return %
    vol: float                       # annualised volatility %
    sharpe: float
    monte_carlo: list[MonteCarloPoint]


class FrontierPoint(BaseModel):
    ret: float    # annualised return %
    vol: float    # annualised volatility %
    sharpe: float


class ScatterPoint(BaseModel):
    ret: float
    vol: float
    sharpe: float


class AssetMeta(BaseModel):
    id: str
    label: str
    scheme_code: int


class OptimizeResponse(BaseModel):
    assets: list[AssetMeta]
    max_sharpe: PortfolioResult
    min_variance: PortfolioResult
    equal_weight: PortfolioResult
    frontier: list[FrontierPoint]
    mc_scatter: list[ScatterPoint]   # 500 random portfolios for risk-return scatter
    risk_free_rate: float
    start_date: str
    end_date: str
    months: int
