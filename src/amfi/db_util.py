import sqlite3;
import os;
import sys;

def create_schema(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(" CREATE TABLE IF NOT EXISTS scheme_data (scheme_code INT PRIMARY KEY, scheme_name TEXT) ")
    cur.execute("CREATE TABLE IF NOT EXISTS nav_data (scheme_code INT, date DATE, nav FLOAT, foreign key(scheme_code) references schemes(scheme_code))")
    cur.execute("CREATE TABLE IF NOT EXISTS isin_data (scheme_code INT, isin_payout TEXT, isin_reinvestment TEXT, foreign key(scheme_code) references scheme_data(scheme_code))")
    cur.close()

def insert_scheme(conn: sqlite3.Connection, scheme_code: int, scheme_name: str):
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO scheme_data VALUES (?, ?)", (scheme_code, scheme_name))
    cur.close()

def insert_nav(conn: sqlite3.Connection, scheme_code: int, date: str, nav: float):
    cur = conn.cursor()
    cur.execute("INSERT INTO nav_data VALUES (?, ?, ?)", (scheme_code, date, nav))
    cur.close()

def insert_isin(conn: sqlite3.Connection, scheme_code: int, isin_payout: str, isin_reinvestment: str):
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO isin_data VALUES (?, ?, ?)", (scheme_code, isin_payout, isin_reinvestment))
    cur.close()

def create_indexes(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS scheme_code_index ON scheme_data(scheme_code)")
    cur.execute("CREATE INDEX IF NOT EXISTS date_index ON nav_data(scheme_code, date)")
    cur.execute("CREATE INDEX IF NOT EXISTS isin_index1 ON isin_data(isin_payout)")
    cur.execute("CREATE INDEX IF NOT EXISTS isin_index2 ON isin_data(isin_payout)")
    cur.execute("CREATE INDEX IF NOT EXISTS isin_index3 ON isin_data(scheme_code)")
    cur.close()

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except Exception as e:
            print(e)
    return conn

if __name__=="__main__":
    conn = sqlite3.connect('funds.db')
    if conn is None:
        print("Error: could not connect to the database.")
        sys.exit(1)
    if os.path.exists('funds.db'):
        print("Yes, file exists.")
    create_schema(conn)
    insert_scheme(conn, 1, "Scheme 1")
    insert_scheme(conn, 2, "Scheme 2")
    insert_scheme(conn, 3, "Scheme 3")
    insert_nav(conn, 1, "01-01-2020", 19.0)
    insert_nav(conn, 2, "02-01-2020", 20.0)
    insert_nav(conn, 1, "03-01-2020", 21.0)
    insert_isin(conn, 1, "ISIN1", "ISIN4")
    insert_isin(conn, 2, "ISIN2", "ISIN5")
    insert_isin(conn, 3, "ISIN3", "ISIN6")
    create_indexes(conn)
    conn.close()