import sys
import os

# Add backend folder to sys.path so Vercel Serverless Functions can import main.py & dependencies
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app

# Export FastAPI instance for Vercel Serverless Function engine
handler = app
