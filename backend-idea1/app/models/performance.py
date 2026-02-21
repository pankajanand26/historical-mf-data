from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date


class SchemeResult(BaseModel):
    scheme_code: int
    scheme_name: str
    isin: Optional[str] = None


class SchemeSearchResponse(BaseModel):
    results: list[SchemeResult]
    total: int


class IndexFundResult(BaseModel):
    scheme_code: int
    scheme_name: str
    isin: Optional[str] = None


class IndexFundListResponse(BaseModel):
    results: list[IndexFundResult]
    total: int


class RollingReturnRequest(BaseModel):
    scheme_codes: list[int]         # one or more funds to compare
    benchmark_code: int
    windows: list[str]              # e.g. ["1y", "3y", "5y", "10y"]
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("scheme_codes")
    @classmethod
    def at_least_one_scheme(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one scheme_code is required")
        if len(v) > 5:
            raise ValueError("Maximum 5 funds can be compared at once")
        return v


class RollingReturnPoint(BaseModel):
    date: str
    value: Optional[float] = None   # rolling return for this fund at this date


class FundWindowResult(BaseModel):
    window: str                     # e.g. "1y"
    window_days: int
    data: list[RollingReturnPoint]
    data_points: int


class FundResult(BaseModel):
    scheme_code: int
    scheme_name: str
    windows: list[FundWindowResult]


class BenchmarkWindowResult(BaseModel):
    window: str
    window_days: int
    data: list[RollingReturnPoint]
    data_points: int


class RollingReturnResponse(BaseModel):
    benchmark_code: int
    benchmark_name: str
    funds: list[FundResult]
    benchmark_windows: list[BenchmarkWindowResult]
    risk_free_rate: float   # annual risk-free rate used for Sharpe / Sortino (e.g. 0.065)
