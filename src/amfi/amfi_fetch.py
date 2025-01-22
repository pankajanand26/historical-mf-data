import datetime;
import requests;
import os;

base_url="portal.amfiindia.com"
date=datetime.datetime.strptime("01-04-2006", '%d-%m-%Y').strftime("%d-%b-%Y")

while datetime.datetime.strptime(date, "%d-%b-%Y") < datetime.datetime.now():
    year = date[-4:]
    month = datetime.datetime.strptime(date[-8:-5], "%b").strftime("%m")
    day = date[:2]

    if os.path.exists("data/"+year+"/"+month+"/"+day+".csv"):
        date = (datetime.datetime.strptime(date, "%d-%b-%Y") + datetime.timedelta(days=1)).strftime("%d-%b-%Y")
        continue
    
    print("Fetching data for "+date, end="\r")
    url="https://"+base_url+"/DownloadNAVHistoryReport_Po.aspx?frmdt="+date
    res = requests.get(url)   # This will fetch the data from the AMFI website
    date = (datetime.datetime.strptime(date, "%d-%b-%Y") + datetime.timedelta(days=1)).strftime("%d-%b-%Y")

    if res.text.find("<html>") != -1:
        continue

    if not os.path.exists("data/"+year+"/"+month):
        os.makedirs("data/"+year+"/"+month)

    with open("data/"+year+"/"+month+"/"+day+".csv", "w", encoding="utf-8") as f:
        f.write(res.text)
        f.close()
print("\nData fetched successfully")
