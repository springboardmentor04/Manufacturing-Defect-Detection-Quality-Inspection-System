import sys
import os

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from backend.app.main import app

__all__ = ["app"]
