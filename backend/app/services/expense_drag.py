import pandas as pd
import numpy as np
from typing import Optional
from app.database import execute_query_df
from .amc_parser import parse_amc_from_name


def find_direct_regular_pairs(amc_name: str) -> list[dict]:
    amc_short = amc_name.replace(" Mutual Fund", "").replace("Mutual Fund", "").strip()
    
    query = """
        SELECT DISTINCT sd.scheme_code, sd.scheme_name
        FROM scheme_data sd
        WHERE sd.scheme_name LIKE ?
        AND (sd.scheme_name LIKE '%Direct%' OR sd.scheme_name LIKE '%Regular%')
        ORDER BY sd.scheme_name
    """
    
    results = execute_query_df(query, (f"%{amc_short}%",))
    
    if results.empty:
        return []
    
    pairs = {}
    for _, row in results.iterrows():
        scheme_name = row["scheme_name"]
        scheme_code = row["scheme_code"]
        
        is_direct = "Direct" in scheme_name
        is_regular = "Regular" in scheme_name
        
        if "Growth" in scheme_name:
            base_name = scheme_name.replace("Direct", "").replace("Regular", "")
            base_name = base_name.replace("  ", " ").strip()
            
            if base_name not in pairs:
                pairs[base_name] = {"direct": None, "regular": None}
            
            if is_direct:
                pairs[base_name]["direct"] = scheme_code
            elif is_regular:
                pairs[base_name]["regular"] = scheme_code
    
    valid_pairs = []
    for base_name, codes in pairs.items():
        if codes["direct"] and codes["regular"]:
            valid_pairs.append({
                "scheme_name": base_name,
                "direct_code": codes["direct"],
                "regular_code": codes["regular"],
            })
    
    return valid_pairs


def calculate_expense_drag(
    direct_code: int,
    regular_code: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    query = """
        SELECT n.date, n.scheme_code, n.nav
        FROM nav_data n
        WHERE n.scheme_code IN (?, ?)
    """
    params = [direct_code, regular_code]
    
    if start_date:
        query += " AND n.date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND n.date <= ?"
        params.append(end_date)
    
    query += " ORDER BY n.date"
    
    df = execute_query_df(query, tuple(params))
    
    if df.empty:
        return {
            "time_series": [],
            "average_expense_drag": None,
            "total_expense_drag": None,
        }
    
    df["date"] = pd.to_datetime(df["date"])
    
    direct_df = df[df["scheme_code"] == direct_code].set_index("date")["nav"]
    regular_df = df[df["scheme_code"] == regular_code].set_index("date")["nav"]
    
    aligned = pd.DataFrame({
        "direct_nav": direct_df,
        "regular_nav": regular_df,
    }).dropna()
    
    if aligned.empty:
        return {
            "time_series": [],
            "average_expense_drag": None,
            "total_expense_drag": None,
        }
    
    aligned["expense_drag"] = aligned["direct_nav"] - aligned["regular_nav"]
    aligned["expense_drag_percent"] = (aligned["expense_drag"] / aligned["regular_nav"]) * 100
    
    time_series = []
    for date, row in aligned.iterrows():
        time_series.append({
            "date": date.strftime("%Y-%m-%d"),
            "direct_nav": float(row["direct_nav"]),
            "regular_nav": float(row["regular_nav"]),
            "expense_drag": float(row["expense_drag"]),
            "expense_drag_percent": float(row["expense_drag_percent"]),
        })
    
    avg_drag = aligned["expense_drag_percent"].mean()
    total_drag = aligned["expense_drag"].iloc[-1] if len(aligned) > 0 else 0
    
    return {
        "time_series": time_series,
        "average_expense_drag": float(avg_drag) if not pd.isna(avg_drag) else None,
        "total_expense_drag": float(total_drag),
    }
