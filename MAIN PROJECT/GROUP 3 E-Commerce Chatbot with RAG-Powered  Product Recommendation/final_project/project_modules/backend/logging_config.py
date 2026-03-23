#backend/logging_config.py

import sys
import io
import logging
from logging.handlers import RotatingFileHandler

# ------------------------------------------------
# Force UTF-8 console output safely
# ------------------------------------------------
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except Exception:
    pass


# ------------------------------------------------
# Remove existing handlers (avoid duplicate logs)
# ------------------------------------------------
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)


# ------------------------------------------------
# Log handlers
# ------------------------------------------------
file_handler = RotatingFileHandler(
    "recommender.log",
    maxBytes=10_000_000,   # 10 MB
    backupCount=5,
    encoding="utf-8"
)

console_handler = logging.StreamHandler(sys.stdout)


# ------------------------------------------------
# Logging configuration
# ------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[file_handler, console_handler]
)


# ------------------------------------------------
# Project logger
# ------------------------------------------------
logger = logging.getLogger("recommender")


# ------------------------------------------------
# Silence noisy Neo4j notifications
# ------------------------------------------------
logging.getLogger("neo4j.notifications").setLevel(logging.ERROR)