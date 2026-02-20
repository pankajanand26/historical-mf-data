import pandas as pd
import numpy as np
from typing import Optional, Tuple
from app.config import RISK_FREE_RATE
from .returns import calculate_daily_returns, annualize_returns, annualize_volatility, calculate_cagr


def calculate_sharpe_ratio(
    daily_returns: pd.Series,
    risk_free_rate: float = RISK_FREE_RATE
) -> Optional[float]:
    if daily_returns is None or len(daily_returns) < 30:
        return None
    
    annual_return = annualize_returns(daily_returns)
    annual_vol = annualize_volatility(daily_returns)
    
    if annual_vol == 0:
        return None
    
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    excess_return = annual_return - risk_free_rate
    
    return excess_return / annual_vol


def calculate_sortino_ratio(
    daily_returns: pd.Series,
    risk_free_rate: float = RISK_FREE_RATE
) -> Optional[float]:
    if daily_returns is None or len(daily_returns) < 30:
        return None
    
    annual_return = annualize_returns(daily_returns)
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    
    downside_returns = daily_returns[daily_returns < daily_rf]
    if len(downside_returns) == 0:
        return None
    
    downside_std = downside_returns.std() * np.sqrt(252)
    
    if downside_std == 0:
        return None
    
    excess_return = annual_return - risk_free_rate
    return excess_return / downside_std


def calculate_max_drawdown(nav_series: pd.Series) -> Optional[float]:
    if nav_series is None or len(nav_series) < 2:
        return None
    
    cumulative = nav_series
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    max_dd = drawdown.min()
    
    return max_dd


def calculate_calmar_ratio(nav_series: pd.Series) -> Optional[float]:
    if nav_series is None or len(nav_series) < 365:
        return None
    
    cagr = calculate_cagr(nav_series)
    max_dd = calculate_max_drawdown(nav_series)
    
    if cagr is None or max_dd is None or max_dd == 0:
        return None
    
    return cagr / abs(max_dd)


def calculate_beta(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series
) -> Optional[float]:
    if portfolio_returns is None or benchmark_returns is None:
        return None
    if len(portfolio_returns) < 30 or len(benchmark_returns) < 30:
        return None
    
    aligned_portfolio, aligned_benchmark = portfolio_returns.align(
        benchmark_returns, join="inner"
    )
    
    if len(aligned_portfolio) < 30:
        return None
    
    covariance = aligned_portfolio.cov(aligned_benchmark)
    benchmark_variance = aligned_benchmark.var()
    
    if benchmark_variance == 0:
        return None
    
    return covariance / benchmark_variance


def calculate_alpha(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series,
    beta: Optional[float] = None,
    risk_free_rate: float = RISK_FREE_RATE
) -> Optional[float]:
    if portfolio_returns is None or benchmark_returns is None:
        return None
    if len(portfolio_returns) < 30 or len(benchmark_returns) < 30:
        return None
    
    if beta is None:
        beta = calculate_beta(portfolio_returns, benchmark_returns)
    
    if beta is None:
        return None
    
    annual_portfolio_return = annualize_returns(portfolio_returns)
    annual_benchmark_return = annualize_returns(benchmark_returns)
    
    alpha = annual_portfolio_return - (
        risk_free_rate + beta * (annual_benchmark_return - risk_free_rate)
    )
    
    return alpha


def calculate_treynor_ratio(
    daily_returns: pd.Series,
    beta: float,
    risk_free_rate: float = RISK_FREE_RATE
) -> Optional[float]:
    if daily_returns is None or len(daily_returns) < 30:
        return None
    if beta is None or beta == 0:
        return None
    
    annual_return = annualize_returns(daily_returns)
    excess_return = annual_return - risk_free_rate
    
    return excess_return / beta


def calculate_information_ratio(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series
) -> Optional[float]:
    if portfolio_returns is None or benchmark_returns is None:
        return None
    if len(portfolio_returns) < 30 or len(benchmark_returns) < 30:
        return None
    
    aligned_portfolio, aligned_benchmark = portfolio_returns.align(
        benchmark_returns, join="inner"
    )
    
    if len(aligned_portfolio) < 30:
        return None
    
    tracking_error = (aligned_portfolio - aligned_benchmark).std() * np.sqrt(252)
    
    if tracking_error == 0:
        return None
    
    annual_portfolio = annualize_returns(aligned_portfolio)
    annual_benchmark = annualize_returns(aligned_benchmark)
    
    return (annual_portfolio - annual_benchmark) / tracking_error


def calculate_volatility(daily_returns: pd.Series, annualize: bool = True) -> Optional[float]:
    if daily_returns is None or len(daily_returns) < 30:
        return None
    
    vol = daily_returns.std()
    
    if annualize:
        vol = vol * np.sqrt(252)
    
    return vol


def calculate_all_metrics(
    nav_series: pd.Series,
    benchmark_returns: Optional[pd.Series] = None,
    risk_free_rate: float = RISK_FREE_RATE
) -> dict:
    if nav_series is None or len(nav_series) < 30:
        return {
            "cagr": None,
            "sharpe_ratio": None,
            "sortino_ratio": None,
            "calmar_ratio": None,
            "treynor_ratio": None,
            "information_ratio": None,
            "beta": None,
            "alpha": None,
            "max_drawdown": None,
            "volatility": None,
        }
    
    daily_returns = calculate_daily_returns(nav_series)
    
    cagr = calculate_cagr(nav_series)
    sharpe = calculate_sharpe_ratio(daily_returns, risk_free_rate)
    sortino = calculate_sortino_ratio(daily_returns, risk_free_rate)
    calmar = calculate_calmar_ratio(nav_series)
    max_dd = calculate_max_drawdown(nav_series)
    vol = calculate_volatility(daily_returns)
    
    beta = None
    alpha = None
    treynor = None
    information_ratio = None
    
    if benchmark_returns is not None and len(benchmark_returns) >= 30:
        beta = calculate_beta(daily_returns, benchmark_returns)
        if beta is not None:
            alpha = calculate_alpha(daily_returns, benchmark_returns, beta, risk_free_rate)
            treynor = calculate_treynor_ratio(daily_returns, beta, risk_free_rate)
        information_ratio = calculate_information_ratio(daily_returns, benchmark_returns)
    
    return {
        "cagr": cagr,
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "calmar_ratio": calmar,
        "treynor_ratio": treynor,
        "information_ratio": information_ratio,
        "beta": beta,
        "alpha": alpha,
        "max_drawdown": max_dd,
        "volatility": vol,
    }
