#!/usr/bin/env python3
"""Startup script for FastAPI backend with proper Python path configuration."""
import subprocess
import sys
import os

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
os.environ['PYTHONPATH'] = project_root

# Change to backend directory
backend_dir = os.path.join(project_root, 'backend')
os.chdir(backend_dir)

# Start uvicorn with --reload
cmd = [
    sys.executable,
    '-m', 'uvicorn',
    'main:app',
    '--reload',
    '--host', '127.0.0.1',
    '--port', '8000'
]

print(f"Starting FastAPI backend...")
print(f"Working directory: {os.getcwd()}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'not set')}")
print(f"Command: {' '.join(cmd)}")
print()

subprocess.run(cmd)
