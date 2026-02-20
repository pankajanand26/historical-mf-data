from pydantic import BaseModel
from typing import Optional


class AMC(BaseModel):
    name: str
    scheme_count: int


class AMCList(BaseModel):
    amcs: list[AMC]
    total: int


class Scheme(BaseModel):
    scheme_code: int
    scheme_name: str
    isin_payout: Optional[str] = None
    isin_reinvestment: Optional[str] = None
    category: Optional[str] = None


class SchemeList(BaseModel):
    amc_name: str
    schemes: list[Scheme]
    total: int


class Category(BaseModel):
    name: str
    scheme_count: int


class CategoryList(BaseModel):
    categories: list[Category]
    total: int
