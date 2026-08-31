"""
Additive Database Migration Script (Phase 7.1.1)
Safely adds severity_score column to defect_diagnostics table in SQLite and PostgreSQL.
"""

import os
import sys
from sqlalchemy import inspect, text

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import engine, Base
import app.models

def run_migration():
    print("=" * 60)
    print("RUNNING PHASE 7.1.1 ADDITIVE DATABASE MIGRATION")
    print("=" * 60)

    # 1. Create missing tables if any
    Base.metadata.create_all(bind=engine)

    # 2. Check if severity_score column exists in defect_diagnostics
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("defect_diagnostics")]
    print(f"Existing defect_diagnostics columns: {columns}")

    if "severity_score" not in columns:
        print("[MIGRATION] Adding 'severity_score NUMERIC(5,2)' column to defect_diagnostics table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE defect_diagnostics ADD COLUMN severity_score NUMERIC(5,2);"))
            conn.commit()
        print("[MIGRATION] Column 'severity_score' added successfully!")
    else:
        print("[MIGRATION] Column 'severity_score' already exists in defect_diagnostics.")

    print("=" * 60)
    print("MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    run_migration()
