import sqlite3;
import os;
import sys;

def create_schema(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(" CREATE TABLE IF NOT EXISTS schemes (scheme_code INT, scheme_namr TEXT) ") 


if __name__=="__main__":
    conn = sqlite3.connect('funds.db')
    if conn is None:
        print("Error: could not connect to the database.")
        sys.exit(1)
    if os.path.exists('funds.db'):
        print("Yes, file exists.")
    conn.close()