from app.database import execute_query


def get_scheme_name(scheme_code: int) -> str | None:
    rows = execute_query(
        "SELECT scheme_name FROM scheme_data WHERE scheme_code = ?",
        (scheme_code,),
    )
    if rows:
        return rows[0]["scheme_name"]
    return None


def search_schemes(query: str, limit: int = 20) -> list[dict]:
    """Search funds by name. Returns unique scheme_code rows (no ISIN join)."""
    rows = execute_query(
        """
        SELECT scheme_code, scheme_name
        FROM scheme_data
        WHERE scheme_name LIKE ?
        ORDER BY scheme_name
        LIMIT ?
        """,
        (f"%{query}%", limit),
    )
    return rows


def get_index_funds(limit: int = 200) -> list[dict]:
    """
    Return index funds / ETFs from the DB.
    Only queries scheme_data (no ISIN join) to keep the query fast.
    Filters to Direct + Growth plans to avoid duplicates across plan variants.
    """
    rows = execute_query(
        """
        SELECT scheme_code, scheme_name
        FROM scheme_data
        WHERE (
            scheme_name LIKE '%Index%'
            OR scheme_name LIKE '%ETF%'
            OR scheme_name LIKE '%Nifty%'
            OR scheme_name LIKE '%Sensex%'
            OR scheme_name LIKE '%BSE%'
        )
        AND scheme_name LIKE '%Direct%'
        AND scheme_name LIKE '%Growth%'
        ORDER BY scheme_name
        LIMIT ?
        """,
        (limit,),
    )
    return rows
