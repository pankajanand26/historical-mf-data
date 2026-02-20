import re
from typing import Optional
from app.database import execute_query


AMC_PATTERNS = [
    "HDFC",
    "ICICI Prudential",
    "SBI",
    "Aditya Birla Sun Life",
    "Kotak",
    "Axis",
    "Nippon",
    "DSP",
    "UTI",
    "Franklin Templeton",
    "IDFC",
    "Invesco",
    "Mirae Asset",
    "Motilal Oswal",
    "PGIM India",
    "Canara Robeco",
    "Edelweiss",
    "Baroda BNP Paribas",
    "Bandhan",
    "BOI AXA",
    "DHFL Pramerica",
    "HSBC",
    "ITI",
    "JM Financial",
    "LIC",
    "Mahindra Manulife",
    "PPFAS",
    "Quant",
    "Sundaram",
    "Tata",
    "Union",
    "WhiteOak Capital",
    "Navi",
    "Groww",
    "NJ",
    "Zerodha",
    "Bajaj Finserv",
    "Samco",
    "Old Bridge",
    "Helios",
    "Unifi",
    "Angel One",
]


def parse_amc_from_name(scheme_name: str) -> Optional[str]:
    scheme_name_lower = scheme_name.lower()
    
    for amc in AMC_PATTERNS:
        if amc.lower() in scheme_name_lower:
            if amc == "SBI":
                if "sbi mutual fund" in scheme_name_lower or "sbi mf" in scheme_name_lower:
                    return "SBI Mutual Fund"
                if "sbi " in scheme_name_lower:
                    return "SBI Mutual Fund"
            if amc == "Aditya Birla Sun Life":
                return "Aditya Birla Sun Life Mutual Fund"
            if amc == "ICICI Prudential":
                return "ICICI Prudential Mutual Fund"
            return f"{amc} Mutual Fund"
    
    return None


def get_all_amcs() -> list[dict]:
    query = """
        SELECT DISTINCT scheme_name 
        FROM scheme_data 
        WHERE scheme_name IS NOT NULL AND scheme_name != ''
    """
    results = execute_query(query)
    
    amc_counts = {}
    for row in results:
        scheme_name = row["scheme_name"]
        amc = parse_amc_from_name(scheme_name)
        if amc:
            amc_counts[amc] = amc_counts.get(amc, 0) + 1
    
    amc_list = [{"name": k, "scheme_count": v} for k, v in amc_counts.items()]
    amc_list.sort(key=lambda x: x["name"])
    
    return amc_list


def get_schemes_by_amc(amc_name: str, category: Optional[str] = None) -> list[dict]:
    query = """
        SELECT DISTINCT sd.scheme_code, sd.scheme_name, id.isin_payout, id.isin_reinvestment
        FROM scheme_data sd
        LEFT JOIN isin_data id ON sd.scheme_code = id.scheme_code
        WHERE sd.scheme_name LIKE ?
    """
    params = [f"%{amc_name.replace(' Mutual Fund', '').replace('Mutual Fund', '').strip()}%"]
    
    if category:
        query += " AND sd.scheme_name LIKE ?"
        params.append(f"%{category}%")
    
    results = execute_query(query, tuple(params))
    
    def extract_category(name: str) -> Optional[str]:
        categories = [
            "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Multi Cap",
            "Large and Mid Cap", "ELSS", "Focused", "Value Fund", "Contra",
            "Dividend Yield", "Sectoral", "Thematic", "Liquid", "Overnight",
            "Ultra Short", "Short Duration", "Medium Duration", "Long Duration",
            "Dynamic Bond", "Corporate Bond", "Banking and PSU", "Gilt",
            "Money Market", "Credit Risk", "Aggressive Hybrid", "Conservative Hybrid",
            "Balanced Hybrid", "Balanced Advantage", "Equity Savings", "Multi Asset",
            "Arbitrage", "Index Fund", "ETF", "Gold ETF", "FoF",
        ]
        name_lower = name.lower()
        for cat in categories:
            if cat.lower() in name_lower:
                return cat
        return None
    
    schemes = []
    for row in results:
        schemes.append({
            "scheme_code": row["scheme_code"],
            "scheme_name": row["scheme_name"],
            "isin_payout": row.get("isin_payout"),
            "isin_reinvestment": row.get("isin_reinvestment"),
            "category": extract_category(row["scheme_name"]),
        })
    
    return schemes
