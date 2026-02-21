from pydantic import BaseModel
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
    scheme_code: int
    benchmark_code: int
    windows: list[str]          # e.g. ["1y", "3y", "5y", "10y"]
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class RollingReturnPoint(BaseModel):
    date: str
    scheme_return: Optional[float] = None
    benchmark_return: Optional[float] = None


class WindowResult(BaseModel):
    window: str                 # e.g. "1y"
    window_days: int            # e.g. 365
    data: list[RollingReturnPoint]
    scheme_name: str
    benchmark_name: str
    data_points: int


class RollingReturnResponse(BaseModel):
    scheme_code: int
    scheme_name: str
    benchmark_code: int
    benchmark_name: str
    windows: list[WindowResult]
