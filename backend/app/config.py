import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "funds.db"))
RISK_FREE_RATE = float(os.getenv("RISK_FREE_RATE", "0.06"))
