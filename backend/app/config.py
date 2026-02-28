import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / ".." / "funds.db"))
RISK_FREE_RATE = float(os.getenv("RISK_FREE_RATE", "0.065"))
PORT = int(os.getenv("PORT", "8001"))
