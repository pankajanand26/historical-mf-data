from fastapi import APIRouter, HTTPException
from typing import Optional
from app.models.amc import AMC, AMCList, Scheme, SchemeList, Category, CategoryList
from app.services.amc_parser import get_all_amcs, get_schemes_by_amc

router = APIRouter(prefix="/api/amc", tags=["AMC"])


@router.get("/list", response_model=AMCList)
async def list_amcs():
    amc_data = get_all_amcs()
    amcs = [AMC(name=a["name"], scheme_count=a["scheme_count"]) for a in amc_data]
    return AMCList(amcs=amcs, total=len(amcs))


@router.get("/{amc_name}/schemes", response_model=SchemeList)
async def list_schemes_by_amc(
    amc_name: str,
    category: Optional[str] = None
):
    schemes_data = get_schemes_by_amc(amc_name, category)
    
    if not schemes_data:
        raise HTTPException(status_code=404, detail=f"No schemes found for AMC: {amc_name}")
    
    schemes = [
        Scheme(
            scheme_code=s["scheme_code"],
            scheme_name=s["scheme_name"],
            isin_payout=s.get("isin_payout"),
            isin_reinvestment=s.get("isin_reinvestment"),
            category=s.get("category"),
        )
        for s in schemes_data
    ]
    
    return SchemeList(amc_name=amc_name, schemes=schemes, total=len(schemes))


@router.get("/categories", response_model=CategoryList)
async def list_categories():
    categories = [
        Category(name="Large Cap", scheme_count=0),
        Category(name="Mid Cap", scheme_count=0),
        Category(name="Small Cap", scheme_count=0),
        Category(name="Flexi Cap", scheme_count=0),
        Category(name="Multi Cap", scheme_count=0),
        Category(name="Large and Mid Cap", scheme_count=0),
        Category(name="ELSS", scheme_count=0),
        Category(name="Focused", scheme_count=0),
        Category(name="Value Fund", scheme_count=0),
        Category(name="Contra", scheme_count=0),
        Category(name="Sectoral", scheme_count=0),
        Category(name="Thematic", scheme_count=0),
        Category(name="Liquid", scheme_count=0),
        Category(name="Overnight", scheme_count=0),
        Category(name="Ultra Short", scheme_count=0),
        Category(name="Short Duration", scheme_count=0),
        Category(name="Medium Duration", scheme_count=0),
        Category(name="Long Duration", scheme_count=0),
        Category(name="Dynamic Bond", scheme_count=0),
        Category(name="Corporate Bond", scheme_count=0),
        Category(name="Banking and PSU", scheme_count=0),
        Category(name="Gilt", scheme_count=0),
        Category(name="Money Market", scheme_count=0),
        Category(name="Credit Risk", scheme_count=0),
        Category(name="Aggressive Hybrid", scheme_count=0),
        Category(name="Conservative Hybrid", scheme_count=0),
        Category(name="Balanced Advantage", scheme_count=0),
        Category(name="Equity Savings", scheme_count=0),
        Category(name="Multi Asset", scheme_count=0),
        Category(name="Arbitrage", scheme_count=0),
        Category(name="Index Fund", scheme_count=0),
        Category(name="ETF", scheme_count=0),
        Category(name="Gold ETF", scheme_count=0),
        Category(name="FoF", scheme_count=0),
    ]
    
    return CategoryList(categories=categories, total=len(categories))
