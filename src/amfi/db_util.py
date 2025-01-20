import sqlite3;
import os;
import sys;

def create_schema(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(" CREATE TABLE IF NOT EXISTS scheme_data (scheme_code INT PRIMARY KEY, scheme_name TEXT) ")
    cur.execute("CREATE TABLE IF NOT EXISTS nav_data (scheme_code INT, date DATE, nav FLOAT, foreign key(scheme_code) references schemes(scheme_code))")
    cur.execute("CREATE TABLE IF NOT EXISTS isin_data (scheme_code INT, isin TEXT, foreign key(scheme_code) references scheme_data(scheme_code))")
    cur.close()

def insert_scheme(conn: sqlite3.Connection, scheme_code: int, scheme_name: str):
    cur = conn.cursor()
    cur.execute("INSERT INTO scheme_data VALUES (?, ?)", (scheme_code, scheme_name))
    conn.commit()
    cur.close()

def insert_nav(conn: sqlite3.Connection, scheme_code: int, date: str, nav: float):
    cur = conn.cursor()
    cur.execute("INSERT INTO nav_data VALUES (?, ?, ?)", (scheme_code, date, nav))
    conn.commit()
    cur.close()

def insert_isin(conn: sqlite3.Connection, scheme_code: int, isin: str):
    cur = conn.cursor()
    cur.execute("INSERT INTO isin_data VALUES (?, ?)", (scheme_code, isin))
    conn.commit()
    cur.close()

def create_indexes(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS scheme_code_index ON scheme_data(scheme_code)")
    cur.execute("CREATE INDEX IF NOT EXISTS date_index ON nav_data(scheme_code, date)")
    cur.execute("CREATE INDEX IF NOT EXISTS isin_index ON isin_data(isin)")
    cur.execute("CREATE INDEX IF NOT EXISTS isin_index ON isin_data(scheme_code)")
    cur.close()

if __name__=="__main__":
    conn = sqlite3.connect('funds.db')
    if conn is None:
        print("Error: could not connect to the database.")
        sys.exit(1)
    if os.path.exists('funds.db'):
        print("Yes, file exists.")
    # create_schema(conn)
    # insert_scheme(conn, 1, "Scheme 1")
    # insert_scheme(conn, 2, "Scheme 2")
    # insert_scheme(conn, 3, "Scheme 3")
    # insert_nav(conn, 1, "01-01-2020", 19.0)
    # insert_nav(conn, 2, "02-01-2020", 20.0)
    # insert_nav(conn, 1, "03-01-2020", 21.0)
    # insert_isin(conn, 1, "ISIN1")
    # insert_isin(conn, 2, "ISIN2")
    # insert_isin(conn, 3, "ISIN3")
    # create_indexes(conn)
    # for row in conn.cursor().execute("SELECT * FROM scheme_data").fetchall():
    #     print(row)
    conn.close()