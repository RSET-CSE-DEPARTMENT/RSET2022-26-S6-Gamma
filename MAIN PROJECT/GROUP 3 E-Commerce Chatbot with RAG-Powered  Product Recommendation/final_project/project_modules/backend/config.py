#backend/config.py

import os
import sys
import glob
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(BASE_DIR, "data_2")

sys.path.insert(0, BASE_DIR)