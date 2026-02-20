from pydantic import BaseModel
from typing import Optional
from datetime import date


class MetricsResult(BaseModel):
    amc_name: str
    scheme_count: int
    cagr: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None
    treynor_ratio: Optional[float] = None
    information_ratio: Optional[float] = None
    beta: Optional[float] = None
    alpha: Optional[float] = None
    max_drawdown: Optional[float] = None
    volatility: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ComparisonRequest(BaseModel):
    amcs: list[str]
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    plan_type: Optional[str] = None


class ComparisonResult(BaseModel):
    metrics: list[MetricsResult]
    cumulative_returns: dict[str, list[dict]]
    benchmark_used: Optional[str] = None


class ExpenseDragPoint(BaseModel):
    date: date
    direct_nav: float
    regular_nav: float
    expense_drag: float
    expense_drag_percent: float


class ExpenseDragData(BaseModel):
    amc_name: str
    scheme_pairs: list[dict]
    time_series: list[ExpenseDragPoint]
    average_expense_drag: float
    total_expense_drag: float
