import os
import sqlite3
import datetime
from db_util import *

schemes = []
scheme_isin = []

def parse_data( conn: sqlite3.Connection):
    print(datetime.datetime.now().__str__()+"Parsing data...")
    for root, dirs, files in os.walk("data"):
        print("Root: " + root + " ", end = " ")
        # print("Dirs: " + str(dirs))
        # print("Files: " + str(files))
        for file in files:
            if file.endswith(".csv"):
                # print("Parsing file: " + file, end = " ") 
                with open(os.path.join(root, file), "r") as f:
                    lines = f.readlines()
                    for line in lines:
                        if line.startswith("Scheme Code"):
                            continue
                        data = line.split(";")
                        if len(data) < 8:
                            continue
                        scheme_code = data[0]
                        scheme_name = data[1]
                        isin_payout = data[2]
                        isin_reinvestment = data[3]
                        net_asset_value = data[4]
                        date = data[7]

                        # print(scheme_code, scheme_name, isin_payout, isin_reinvestment, net_asset_value, date)
                        insert_scheme(conn, scheme_code, scheme_name)
                        insert_nav(conn, scheme_code, date, net_asset_value)
                        insert_isin(conn, scheme_code, isin_payout, isin_reinvestment)
                        # insert_data(scheme_code, scheme_name, isin_payout, isin_reinvestment, net_asset_value, date)
                    print(".", end = " ")
                conn.commit()    
        print("\n"+datetime.datetime.now().__str__()+" Parsing data complete for" + " " + root)
        # if root.split("\\").__len__() == 3:
            # break
                    
    
if __name__=="__main__":
    conn = create_connection("funds.db")
    create_schema(conn)
    parse_data(conn)
    # conn.commit()
    create_indexes(conn)
    conn.close()
