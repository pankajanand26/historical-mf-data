from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import date
import pandas as pd
from app.models.metrics import MetricsResult, ComparisonRequest, ComparisonResult
from app.database import execute_query_df
from app.services.amc_parser import parse_amc_from_name, get_schemes_by_amc
from app.services.returns import calculate_daily_returns, calculate_cumulative_returns
from app.services.metrics import calculate_all_metrics

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def get_amc_nav_data(
    amc_name: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    plan_type: Optional[str] = None
) -> pd.DataFrame:
    amc_short = amc_name.replace(" Mutual Fund", "").replace("Mutual Fund", "").strip()
    
    query = """
        SELECT n.date, n.scheme_code, n.nav, sd.scheme_name
        FROM nav_data n
        JOIN scheme_data sd ON n.scheme_code = sd.scheme_code
        WHERE sd.scheme_name LIKE ?
    """
    params = [f"%{amc_short}%"]
    
    if category:
        params.append(f"%{category}%")
        query = query.replace(
            "WHERE sd.scheme_name LIKE ?",
            "WHERE sd.scheme_name LIKE ? AND sd.scheme_name LIKE ?"
        )
    
    if plan_type:
        if plan_type.lower() == "direct":
            query += " AND sd.scheme_name LIKE '%Direct%'"
        elif plan_type.lower() == "regular":
            query += " AND sd.scheme_name LIKE '%Regular%'"
    
    if start_date:
        query += " AND n.date >= ?"
        params.append(start_date.isoformat())
    if end_date:
        query += " AND n.date <= ?"
        params.append(end_date.isoformat())
    
    query += " ORDER BY n.date, n.scheme_code"
    
    df = execute_query_df(query, tuple(params))
    return df


def get_benchmark_data(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> pd.Series:
    query = """
        SELECT n.date, n.nav
        FROM nav_data n
        JOIN scheme_data sd ON n.scheme_code = sd.scheme_code
        WHERE sd.scheme_name LIKE '%Nifty 50%'
        AND sd.scheme_name LIKE '%Index%'
        AND sd.scheme_name LIKE '%Direct%'
    """
    params = []
    
    if start_date:
        query += " AND n.date >= ?"
        params.append(start_date.isoformat())
    if end_date:
        query += " AND n.date <= ?"
        params.append(end_date.isoformat())
    
    query += " ORDER BY n.date LIMIT 10000"
    
    df = execute_query_df(query, tuple(params))
    
    if df.empty:
        return None
    
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date")["nav"]
    return df


def aggregate_amc_returns(
    df: pd.DataFrame,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> tuple[pd.Series, int]:
    if df.empty:
        return pd.Series(dtype=float), 0
    
    df["date"] = pd.to_datetime(df["date"])
    df["nav"] = pd.to_numeric(df["nav"], errors="coerce")
    
    scheme_count = df["scheme_code"].nunique()
    
    daily_avg = df.groupby("date")["nav"].mean()
    daily_avg = daily_avg.sort_index()
    
    return daily_avg, scheme_count


@router.post("/compare", response_model=ComparisonResult)
async def compare_amcs(request: ComparisonRequest):
    if not request.amcs:
        raise HTTPException(status_code=400, detail="At least one AMC must be selected")
    
    benchmark_nav = get_benchmark_data(request.start_date, request.end_date)
    benchmark_returns = None
    if benchmark_nav is not None and len(benchmark_nav) >= 30:
        benchmark_returns = calculate_daily_returns(benchmark_nav)
    
    metrics_results = []
    cumulative_returns_data = {}
    
    for amc_name in request.amcs:
        nav_df = get_amc_nav_data(
            amc_name,
            start_date=request.start_date,
            end_date=request.end_date,
            category=request.category,
            plan_type=request.plan_type
        )
        
        nav_series, scheme_count = aggregate_amc_returns(
            nav_df,
            request.start_date,
            request.end_date
        )
        
        if nav_series.empty or len(nav_series) < 30:
            metrics_results.append(MetricsResult(
                amc_name=amc_name,
                scheme_count=scheme_count,
                start_date=request.start_date,
                end_date=request.end_date,
            ))
            continue
        
        metrics = calculate_all_metrics(nav_series, benchmark_returns)
        
        daily_returns = calculate_daily_returns(nav_series)
        cumulative = calculate_cumulative_returns(daily_returns)
        
        cumulative_data = []
        for idx, val in cumulative.items():
            cumulative_data.append({
                "date": idx.strftime("%Y-%m-%d") if hasattr(idx, 'strftime') else str(idx),
                "value": float(val) if not pd.isna(val) else None
            })
        cumulative_returns_data[amc_name] = cumulative_data
        
        actual_start = nav_series.index[0]
        actual_end = nav_series.index[-1]
        
        metrics_results.append(MetricsResult(
            amc_name=amc_name,
            scheme_count=scheme_count,
            cagr=metrics["cagr"],
            sharpe_ratio=metrics["sharpe_ratio"],
            sortino_ratio=metrics["sortino_ratio"],
            calmar_ratio=metrics["calmar_ratio"],
            treynor_ratio=metrics["treynor_ratio"],
            information_ratio=metrics["information_ratio"],
            beta=metrics["beta"],
            alpha=metrics["alpha"],
            max_drawdown=metrics["max_drawdown"],
            volatility=metrics["volatility"],
            start_date=actual_start.date() if hasattr(actual_start, 'date') else request.start_date,
            end_date=actual_end.date() if hasattr(actual_end, 'date') else request.end_date,
        ))
    
    benchmark_used = None
    if benchmark_nav is not None:
        benchmark_used = "Nifty 50 Index"
    
    return ComparisonResult(
        metrics=metrics_results,
        cumulative_returns=cumulative_returns_data,
        benchmark_used=benchmark_used,
    )


@router.post("/metrics", response_model=list[MetricsResult])
async def get_amc_metrics(request: ComparisonRequest):
    result = await compare_amcs(request)
    return result.metrics
