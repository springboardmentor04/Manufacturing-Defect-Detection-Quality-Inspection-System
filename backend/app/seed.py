import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import User, Product, Role, Inspection, Defect, Decision, Severity, ReviewStatus
from .auth import hash_password

def seed_db(db: Session):
    # Seed Users
    qe_user = db.scalar(select(User).where(User.email == "qe@visioninspect.ai"))
    if not qe_user:
        qe_user = User(
            full_name="Sarah Connor (Quality Eng)",
            email="qe@visioninspect.ai",
            password_hash=hash_password("password123"),
            role=Role.QUALITY_ENGINEER
        )
        db.add(qe_user)

    pm_user = db.scalar(select(User).where(User.email == "pm@visioninspect.ai"))
    if not pm_user:
        pm_user = User(
            full_name="Alexander Wright (Prod Mgr)",
            email="pm@visioninspect.ai",
            password_hash=hash_password("password123"),
            role=Role.PRODUCT_MANAGER
        )
        db.add(pm_user)

    db.flush()

    # Seed Products
    products_def = [
        {"code": "PRD-BTL-01", "name": "Beverage Bottle Line A", "category": "Bottle", "line": "Line 1 - Packaging"},
        {"code": "PRD-CBL-02", "name": "Industrial Cable Assembly", "category": "Cable", "line": "Line 2 - Wiring"},
        {"code": "PRD-CAP-03", "name": "Pharma Gel Capsule 500mg", "category": "Capsule", "line": "Line 3 - Pharma"},
        {"code": "PRD-NUT-04", "name": "M8 Stainless Steel Hex Nut", "category": "Metal Nut", "line": "Line 4 - Fasteners"},
        {"code": "PRD-PIL-05", "name": "Coated Tablet 100mg", "category": "Pill", "line": "Line 3 - Pharma"},
        {"code": "PRD-SCR-06", "name": "Precision Drive Screw", "category": "Screw", "line": "Line 4 - Fasteners"},
        {"code": "PRD-TIL-07", "name": "Ceramic Floor Tile", "category": "Tile", "line": "Line 5 - Ceramics"},
        {"code": "PRD-WOD-08", "name": "Hardwood Flooring Board", "category": "Wood", "line": "Line 6 - Materials"},
        {"code": "PRD-ZIP-09", "name": "Heavy-Duty Brass Zipper", "category": "Zipper", "line": "Line 7 - Apparel"}
    ]

    product_objs = []
    for p in products_def:
        existing = db.scalar(select(Product).where(Product.product_code == p["code"]))
        if not existing:
            existing = Product(
                product_code=p["code"],
                product_name=p["name"],
                product_category=p["category"],
                production_line=p["line"]
            )
            db.add(existing)
            db.flush()
        product_objs.append(existing)

    # Seed Initial Inspection Records if empty
    existing_inspections = db.scalar(select(Inspection.id).limit(1))
    if not existing_inspections:
        print("[Seed] Seeding demo inspection history...")
        now = datetime.utcnow()
        sample_scenarios = [
            {"decision": Decision.PASS, "sev": Severity.LOW, "score": 15.0, "defects": [], "days_ago": 6, "prod_idx": 0},
            {"decision": Decision.PASS, "sev": Severity.LOW, "score": 8.0, "defects": [], "days_ago": 5, "prod_idx": 1},
            {"decision": Decision.FAIL, "sev": Severity.CRITICAL, "score": 88.5, "defects": [("bottle_broken_large", 0.96, Severity.CRITICAL, 88.5)], "days_ago": 4, "prod_idx": 0},
            {"decision": Decision.MANUAL_REVIEW, "sev": Severity.MEDIUM, "score": 52.0, "defects": [("capsule_scratch", 0.68, Severity.MEDIUM, 52.0)], "days_ago": 3, "prod_idx": 2},
            {"decision": Decision.FAIL, "sev": Severity.HIGH, "score": 74.0, "defects": [("tile_crack", 0.92, Severity.HIGH, 74.0)], "days_ago": 2, "prod_idx": 6},
            {"decision": Decision.PASS, "sev": Severity.LOW, "score": 12.0, "defects": [], "days_ago": 1, "prod_idx": 3},
            {"decision": Decision.FAIL, "sev": Severity.CRITICAL, "score": 91.0, "defects": [("cable_bent_wire", 0.95, Severity.CRITICAL, 91.0)], "days_ago": 0, "prod_idx": 1},
            {"decision": Decision.PASS, "sev": Severity.LOW, "score": 5.0, "defects": [], "days_ago": 0, "prod_idx": 4},
        ]

        for s in sample_scenarios:
            dt = now - timedelta(days=s["days_ago"], hours=s["prod_idx"] * 2 + 1)
            prod = product_objs[s["prod_idx"]]
            ins = Inspection(
                user_id=qe_user.id,
                product_id=prod.id,
                original_image_path="original/sample.jpg",
                annotated_image_path="annotated/sample.jpg",
                decision=s["decision"],
                severity_score=s["score"],
                severity_level=s["sev"],
                highest_confidence=s["defects"][0][1] if s["defects"] else 0.98,
                average_confidence=s["defects"][0][1] if s["defects"] else 0.98,
                defect_count=len(s["defects"]),
                processing_time_ms=145.0 + s["prod_idx"] * 12,
                model_version="YOLOv8-MVTec-v1",
                image_quality={"width": 1024, "height": 1024, "blur_score": 180.0, "brightness": 128.0, "contrast": 45.0, "readable": True},
                recommendation="Product passed automated visual inspection." if s["decision"] == Decision.PASS else "Critical defect detected. Reject product and trigger quality inspection workflow.",
                review_status=ReviewStatus.PENDING if s["decision"] == Decision.MANUAL_REVIEW else ReviewStatus.REVIEWED,
                created_at=dt
            )
            db.add(ins)
            db.flush()

            for def_type, conf, def_sev, def_score in s["defects"]:
                db.add(Defect(
                    inspection_id=ins.id,
                    defect_type=def_type,
                    confidence=conf,
                    x1=250.0, y1=250.0, x2=550.0, y2=550.0,
                    size_score=75.0, location_score=80.0, defect_type_score=95.0, confidence_score=conf*100,
                    severity_score=def_score, severity_level=def_sev,
                    created_at=dt
                ))

    db.commit()
    print("[Seed] Database seed completed successfully!")
