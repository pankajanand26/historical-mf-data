#!/usr/bin/env python3
"""
Download TER (Total Expense Ratio) data from AMFI India and store it in funds.db.

API endpoints (reverse-engineered from amfiindia.com/ter-of-mf-schemes):
  GET /api/populate-ter-month?year=YYYY-YYYY
      → list of {MonthYear, MonthNumber} for that financial year

  GET /api/populate-te-rdata-revised
          ?MF_ID=All&Month=MM-YYYY&strCat=-1&strType=-1
          &page=N&pageSize=P
      → {data: [...records], meta: {page, pageSize, total, pageCount}}

Each record has:
  NSDLSchemeCode, Scheme_Name, SchemeType_Desc, SchemeCat_Desc, TER_Date,
  R_BaseTER, R_6A_B, R_6A_C, R_GST, R_TER  (Regular plan totals)
  D_BaseTER, D_6A_B, D_6A_C, D_GST, D_TER  (Direct plan totals)
  MF_ID, Month

Matching strategy:
  The TER API uses NSDLSchemeCode, not the 6-digit AMFI scheme code stored in
  funds.db. The only shared identifier is the scheme name. TER records carry the
  "base fund name" (e.g. "HDFC Flexi Cap Fund"), while our DB has plan-variant
  names (e.g. "HDFC Flexi Cap Fund - Direct Plan - Growth Option"). We strip
  plan-variant suffixes from DB names, normalise both to lowercase, and do an
  exact-match lookup (with a fuzzy fallback). Each DB scheme that matches a TER
  record is then assigned:
    • D_TER  if "direct" appears in the DB scheme name
    • R_TER  otherwise (regular plan)
"""

import re
import sys
import time
import sqlite3
import requests
from difflib import get_close_matches
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL   = "https://www.amfiindia.com"
PAGE_SIZE  = 100
REQUEST_DELAY = 0.3   # seconds between paginated API requests (be polite)

# funds.db sits two levels above src/amfi/
DB_PATH = Path(__file__).resolve().parent.parent.parent / "funds.db"

# Financial years available — ordered newest first; first one that returns
# months data is used.
CANDIDATE_YEARS = ["2025-2026", "2024-2025", "2023-2024"]


# ── Name normalisation ────────────────────────────────────────────────────────

# Strip plan-variant / option suffixes that appear in AMFI NAV scheme names but
# NOT in TER base names.  The regex anchors to the first occurrence of a known
# separator followed by a plan/option keyword, and removes everything from there
# to the end of the string.
_STRIP_RE = re.compile(
    r"\s*[-–—]\s*"
    r"(?:"
    r"direct\s+plan"
    r"|regular\s+plan"
    r"|growth\s+plan"
    r"|dividend\s+plan"
    r"|direct\s+growth"
    r"|regular\s+growth"
    r"|direct"          # bare "- Direct"
    r"|regular"         # bare "- Regular"
    r"|growth\s+option"
    r"|dividend\s+option"
    r"|bonus\s+option"
    r"|idcw"
    r"|growth"
    r"|dividend"
    r"|bonus"
    r"|payout"
    r"|reinvestment"
    r"|half\s*[-\s]?yearly\b.*"
    r"|quarterly\b.*"
    r"|monthly\b.*"
    r"|weekly\b.*"
    r"|daily\b.*"
    r"|annual\b.*"
    r"|series\s+\w+"
    r").*$",
    re.IGNORECASE,
)


def normalise(name: str) -> str:
    """Return a canonicalised lowercase base name for fuzzy comparison."""
    name = _STRIP_RE.sub("", name)
    name = re.sub(r"[^\w\s&]", " ", name)   # replace punctuation with space
    name = re.sub(r"\s+", " ", name).strip().lower()
    return name


def to_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None and val != "" else default
    except (ValueError, TypeError):
        return default


# ── AMFI TER API ──────────────────────────────────────────────────────────────

def get_latest_month() -> str:
    """
    Return the most-recent MonthNumber (e.g. '03-2026') across candidate
    financial years, trying newest year first.
    """
    for year in CANDIDATE_YEARS:
        url = f"{BASE_URL}/api/populate-ter-month?year={year}"
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            months = r.json()
            if months:
                month = months[0]["MonthNumber"]
                print(f"  Financial year: {year}  ->  latest month: {month}")
                return month
        except Exception as e:
            print(f"  Could not fetch months for {year}: {e}")
    raise RuntimeError("Could not determine latest TER month from any candidate year.")


def fetch_ter_page(month: str, page: int) -> dict:
    url = (
        f"{BASE_URL}/api/populate-te-rdata-revised"
        f"?MF_ID=All&Month={month}&strCat=-1&strType=-1"
        f"&page={page}&pageSize={PAGE_SIZE}"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


def fetch_all_ter(month: str) -> list[dict]:
    """Fetch every TER record for the given month (paginates automatically)."""
    records: list[dict] = []
    page   = 1
    total  = None

    while True:
        print(f"  Page {page:3d} …", end="\r")
        data  = fetch_ter_page(month, page)
        batch = data.get("data", [])
        meta  = data.get("meta", {})

        records.extend(batch)

        if total is None:
            total = int(meta.get("total", 0))
            page_count = int(meta.get("pageCount", 1))
            print(f"  Total records: {total}  ({page_count} pages @ {PAGE_SIZE}/page)")

        if not batch or len(records) >= total:
            break

        page += 1
        time.sleep(REQUEST_DELAY)

    print(f"  Downloaded {len(records)} records.{' ' * 20}")
    return records


# ── DB index ──────────────────────────────────────────────────────────────────

def build_db_index(conn: sqlite3.Connection) -> dict[str, list[tuple[int, str]]]:
    """
    Return {normalised_base_name: [(scheme_code, original_scheme_name), ...]}
    for every scheme in scheme_data.
    """
    rows = conn.execute(
        "SELECT scheme_code, scheme_name FROM scheme_data"
    ).fetchall()

    index: dict[str, list[tuple[int, str]]] = {}
    for scheme_code, scheme_name in rows:
        key = normalise(scheme_name)
        index.setdefault(key, []).append((int(scheme_code), scheme_name))

    return index


def is_direct(scheme_name: str) -> bool:
    return bool(re.search(r"\bdirect\b", scheme_name, re.IGNORECASE))


# ── Matching ──────────────────────────────────────────────────────────────────

def match_records(
    ter_records: list[dict],
    db_index: dict[str, list[tuple[int, str]]],
) -> tuple[list[dict], list[str]]:
    """
    Match each TER record to one or more scheme_codes in the DB.

    Returns:
      matched_rows  – list of dicts ready for INSERT into ter_data
      unmatched     – list of TER Scheme_Name values with no DB match
    """
    matched: list[dict] = []
    unmatched: list[str] = []
    all_keys = list(db_index.keys())

    for rec in ter_records:
        ter_name = rec["Scheme_Name"]
        ter_key  = normalise(ter_name)

        # 1. Exact match on normalised key
        if ter_key in db_index:
            candidates = db_index[ter_key]
        else:
            # 2. Fuzzy fallback — strict cutoff to avoid false positives
            close = get_close_matches(ter_key, all_keys, n=1, cutoff=0.88)
            if close:
                candidates = db_index[close[0]]
            else:
                unmatched.append(ter_name)
                continue

        r_ter = to_float(rec.get("R_TER"))
        d_ter = to_float(rec.get("D_TER"))

        for scheme_code, scheme_name in candidates:
            applicable = d_ter if is_direct(scheme_name) else r_ter
            matched.append({
                "scheme_code":    scheme_code,
                "nsdl_code":      rec.get("NSDLSchemeCode", ""),
                "scheme_name_ter": ter_name,
                "regular_ter":    r_ter,
                "direct_ter":     d_ter,
                "applicable_ter": applicable,
                "category":       rec.get("SchemeCat_Desc", ""),
                "ter_date":       (rec.get("TER_Date") or "")[:10],
                "as_of_month":    rec.get("Month", ""),
            })

    return matched, unmatched


# ── DB write ──────────────────────────────────────────────────────────────────

_DDL = """
CREATE TABLE IF NOT EXISTS ter_data (
    scheme_code     INTEGER PRIMARY KEY,
    nsdl_code       TEXT,
    scheme_name_ter TEXT,
    regular_ter     REAL,
    direct_ter      REAL,
    applicable_ter  REAL,
    category        TEXT,
    ter_date        TEXT,
    as_of_month     TEXT,
    FOREIGN KEY (scheme_code) REFERENCES scheme_data(scheme_code)
)
"""

_INSERT = """
INSERT OR REPLACE INTO ter_data
    (scheme_code, nsdl_code, scheme_name_ter,
     regular_ter, direct_ter, applicable_ter,
     category, ter_date, as_of_month)
VALUES
    (:scheme_code, :nsdl_code, :scheme_name_ter,
     :regular_ter, :direct_ter, :applicable_ter,
     :category, :ter_date, :as_of_month)
"""


def write_ter_data(conn: sqlite3.Connection, rows: list[dict]) -> int:
    conn.execute(_DDL)
    conn.execute("DELETE FROM ter_data")   # fresh monthly snapshot
    conn.executemany(_INSERT, rows)
    conn.commit()
    return len(rows)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    print(f"Database : {DB_PATH}")

    # Step 1 — determine latest month
    print("\n[1/4] Finding latest TER month …")
    month = get_latest_month()

    # Step 2 — download all TER records
    print(f"\n[2/4] Downloading TER data for {month} …")
    ter_records = fetch_all_ter(month)

    # Step 3 — match to scheme_codes
    print("\n[3/4] Matching TER records to scheme_codes in funds.db …")
    conn = sqlite3.connect(DB_PATH)
    db_index = build_db_index(conn)
    total_db_schemes = sum(len(v) for v in db_index.values())
    print(f"  DB scheme variants indexed : {total_db_schemes}")
    print(f"  Unique base names in DB    : {len(db_index)}")

    matched_rows, unmatched = match_records(ter_records, db_index)

    print(f"\n  TER records downloaded : {len(ter_records)}")
    print(f"  DB rows matched        : {len(matched_rows)}")
    print(f"  TER records unmatched  : {len(unmatched)}")

    match_rate = (len(ter_records) - len(unmatched)) / len(ter_records) * 100
    print(f"  Match rate             : {match_rate:.1f}%")

    if unmatched:
        print(f"\n  Unmatched TER fund names (sample, max 30):")
        for name in unmatched[:30]:
            print(f"    x  {name}")
        if len(unmatched) > 30:
            print(f"    ... and {len(unmatched) - 30} more")

    # Step 4 — write to DB
    print(f"\n[4/4] Writing ter_data table …")
    written = write_ter_data(conn, matched_rows)
    conn.close()
    print(f"  Wrote {written} rows to ter_data.")

    # Sanity-check: print a few rows
    print("\n  Sample rows written:")
    conn2 = sqlite3.connect(DB_PATH)
    conn2.row_factory = sqlite3.Row
    rows = conn2.execute(
        "SELECT scheme_code, scheme_name_ter, applicable_ter, category "
        "FROM ter_data LIMIT 5"
    ).fetchall()
    for row in rows:
        print(f"    [{row['scheme_code']:>7}]  {row['scheme_name_ter']:<50}  "
              f"TER={row['applicable_ter']:.4f}%  ({row['category']})")
    conn2.close()

    print("\nDone.")


if __name__ == "__main__":
    main()
