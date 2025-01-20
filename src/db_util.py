import sqlite3;
import os;
import sys;

def create_schema(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(" CREATE TABLE IF NOT EXISTS scheme_data (scheme_code INT PRIMARY KEY, scheme_name TEXT) ")
    cur.execute("CREATE TABLE IF NOT EXISTS nav_data (scheme_code INT, date DATE, nav FLOAT, foreign key(scheme_code) references schemes(scheme_code))")
    cur.execute("CREATE TABLE IF NOT EXISTS isin_data (scheme_code INT, isin TEXT, foreign key(scheme_code) references scheme_data(scheme_code))")
    cur.execute("CREATE TABLE IF NOT EXISTS isin_data (scheme_code INT, isin TEXT, foreign key(scheme_code) references scheme_data(scheme_code))")
    cur.close()

def insert_scheme(conn: sqlite3.Connection, scheme_code: int, scheme_name: str):
    cur = conn.cursor()
    cur.execute("INSERT INTO schemes VALUES (?, ?)", (scheme_code, scheme_name))
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

if __name__=="__main__":
    conn = sqlite3.connect('funds.db')
    if conn is None:
        print("Error: could not connect to the database.")
        sys.exit(1)
    if os.path.exists('funds.db'):
        print("Yes, file exists.")
    conn.close()