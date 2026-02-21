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
    Return benchmark options limited to:
      - Nifty 50 pure index funds (excludes factor variants like Value 20, Equal Weight)
      - Nifty Next 50 index funds
      - Nifty Midcap 150 pure index funds (excludes Quality 50, Momentum 50 variants)
      - Nifty Smallcap index funds (250 or 50; excludes momentum/quality factor variants)
      - G-Sec / Gilt index funds (Nifty G-Sec, CRISIL IBX Gilt, etc.)
    Direct + Growth plans only to avoid regular-plan duplicates.
    """
    rows = execute_query(
        """
        SELECT scheme_code, scheme_name
        FROM scheme_data
        WHERE scheme_name LIKE '%Direct%'
          AND scheme_name LIKE '%Growth%'
          AND scheme_name NOT LIKE '%Bonus%'
          AND (
              -- ── Nifty 50 (pure) ──────────────────────────────────────────────
              -- 'Nifty 50' must be followed by space or hyphen (not 'Nifty 500')
              -- Exclude factor variants: Value 20, Equal Weight, ELSS wrappers
              (
                (scheme_name LIKE '%Nifty 50 %'  OR scheme_name LIKE '%Nifty 50-%'
                 OR scheme_name LIKE '%NIFTY 50 %' OR scheme_name LIKE '%NIFTY 50-%')
                AND scheme_name NOT LIKE '%Nifty 500%'
                AND scheme_name NOT LIKE '%NIFTY 500%'
                AND scheme_name NOT LIKE '%Equal Weight%'
                AND scheme_name NOT LIKE '%Equal weight%'
                AND scheme_name NOT LIKE '%Value 20%'
                AND scheme_name NOT LIKE '%ELSS%'
              )

              -- ── Nifty Next 50 ────────────────────────────────────────────────
              OR scheme_name LIKE '%Nifty Next 50%'
              OR scheme_name LIKE '%NIFTY NEXT 50%'
              OR scheme_name LIKE '%Next Nifty 50%'

              -- ── Nifty Midcap 150 (pure) ──────────────────────────────────────
              -- Exclude factor sub-indices: Quality 50, Momentum 50
              OR (
                (scheme_name LIKE '%Nifty Midcap 150%'
                 OR scheme_name LIKE '%NIFTY MIDCAP 150%'
                 OR scheme_name LIKE '%Nifty MidCap 150%')
                AND scheme_name NOT LIKE '%Quality%'
                AND scheme_name NOT LIKE '%Momentum%'
              )

              -- ── Nifty Smallcap (250 / 50) pure ───────────────────────────────
              -- Exclude factor variants: Momentum Quality 100, Quality 50
              OR (
                (scheme_name LIKE '%Nifty Smallcap%'
                 OR scheme_name LIKE '%Nifty SmallCap%'
                 OR scheme_name LIKE '%NIFTY SMALLCAP%')
                AND scheme_name NOT LIKE '%Quality%'
                AND scheme_name NOT LIKE '%Momentum%'
              )

              -- ── G-Sec / Gilt index funds ─────────────────────────────────────
              -- Keep: Nifty G-Sec funds, CRISIL IBX Gilt funds (they track named indices)
              -- Exclude: actively managed gilt funds (no 'Index' in name)
              OR (scheme_name LIKE '%G-Sec%' AND scheme_name LIKE '%Index%')
              OR (scheme_name LIKE '%Gsec%'  AND scheme_name LIKE '%Index%')
              OR (scheme_name LIKE '%Gilt%'  AND scheme_name LIKE '%Index%')
          )
        ORDER BY scheme_name
        LIMIT ?
        """,
        (limit,),
    )
    return rows
