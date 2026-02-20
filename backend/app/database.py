import sqlite3
from pathlib import Path
from contextlib import contextmanager
from app.config import DATABASE_PATH

DB_PATH = Path(DATABASE_PATH)

def get_connection():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

@contextmanager
def get_db():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def execute_query(query: str, params: tuple = ()):
    with get_db() as conn:
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

def execute_query_df(query: str, params: tuple = ()):
    import pandas as pd
    with get_db() as conn:
        return pd.read_sql_query(query, conn, params=params)
