"""
Check database contents for Phase 7.1 prerequisites.
"""

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import SessionLocal, engine, Base
from app.models.ai_models import AIModel
from app.models.defect_types import DefectType
from app.models.products import Product
from app.models.users import User
from app.models.production_lines import ProductionLine
from app.models.roles import Role
from app.models.inspections import Inspection
from app.models.defect_diagnostics import DefectDiagnostic

def check_db():
    print("=" * 60)
    print("CHECKING DATABASE PREREQUISITES & SCHEMA")
    print("=" * 60)

    # Ensure tables are created if not yet existing
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        models = db.query(AIModel).all()
        print(f"AI Models Count: {len(models)}")
        for m in models:
            print(f"  - Model: {m.model_name} (Version: {m.model_version}, Status: {m.deployment_status})")

        defect_types = db.query(DefectType).all()
        print(f"\nDefect Types Count: {len(defect_types)}")

        products = db.query(Product).all()
        print(f"\nProducts Count: {len(products)}")
        for p in products:
            print(f"  - Product: {p.product_code} ({p.name}, Category: {p.category})")

        users = db.query(User).all()
        print(f"\nUsers Count: {len(users)}")
        for u in users:
            print(f"  - User: {u.full_name} ({u.email})")

        lines = db.query(ProductionLine).all()
        print(f"\nProduction Lines Count: {len(lines)}")
        for l in lines:
            print(f"  - Line: {l.line_code} ({l.name})")

        roles = db.query(Role).all()
        print(f"\nRoles Count: {len(roles)}")
        for r in roles:
            print(f"  - Role: {r.role_name}")

    finally:
        db.close()

if __name__ == "__main__":
    check_db()
