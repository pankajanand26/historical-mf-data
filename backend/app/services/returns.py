import pandas as pd
import numpy as np
from typing import Optional


def calculate_daily_returns(nav_series: pd.Series) -> pd.Series:
    if nav_series is None or len(nav_series) < 2:
        return pd.Series(dtype=float)
    return nav_series.pct_change().dropna()


def calculate_cumulative_returns(daily_returns: pd.Series) -> pd.Series:
    if daily_returns is None or len(daily_returns) == 0:
        return pd.Series(dtype=float)
    return (1 + daily_returns).cumprod()


def calculate_rolling_returns(nav_series: pd.Series, window_days: int = 365) -> pd.Series:
    if nav_series is None or len(nav_series) < window_days:
        return pd.Series(dtype=float)
    return nav_series.pct_change(periods=window_days).dropna()


def calculate_cagr(nav_series: pd.Series) -> Optional[float]:
    if nav_series is None or len(nav_series) < 2:
        return None
    
    start_nav = nav_series.iloc[0]
    end_nav = nav_series.iloc[-1]
    
    if start_nav <= 0 or end_nav <= 0:
        return None
    
    days = (nav_series.index[-1] - nav_series.index[0]).days
    if days <= 0:
        return None
    
    years = days / 365.25
    
    if years < 0.1:
        return None
    
    cagr = (end_nav / start_nav) ** (1 / years) - 1
    return cagr


def annualize_returns(daily_returns: pd.Series) -> float:
    if daily_returns is None or len(daily_returns) == 0:
        return 0.0
    return (1 + daily_returns.mean()) ** 252 - 1


def annualize_volatility(daily_returns: pd.Series) -> float:
    if daily_returns is None or len(daily_returns) == 0:
        return 0.0
    return daily_returns.std() * np.sqrt(252)
