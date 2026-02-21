import sqlite3
from contextlib import contextmanager
from typing import Optional
import pandas as pd
from app.config import DB_PATH


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def execute_query(query: str, params: tuple = ()) -> list[dict]:
    with get_connection() as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def execute_query_df(query: str, params: tuple = ()) -> pd.DataFrame:
    with get_connection() as conn:
        df = pd.read_sql_query(query, conn, params=params)
    return df
