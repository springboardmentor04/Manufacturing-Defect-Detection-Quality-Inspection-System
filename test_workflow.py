#!/usr/bin/env python3
"""End-to-end workflow test for VisionInspect AI."""
import asyncio
import json
import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_workflow():
    from backend.database import db
    from backend.auth import get_password_hash, verify_password, create_access_token
    import uuid
    
    print("\n" + "="*70)
    print("VisionInspect AI - Complete Workflow Test")
    print("="*70 + "\n")
    
    try:
        # Test 1: User Registration
        print("TEST 1: User Registration")
        test_user_id = f"u-{uuid.uuid4().hex[:12]}"
        test_email = f"workflow_test_{uuid.uuid4().hex[:8]}@test.local"
        
        user_doc = {
            "id": test_user_id,
            "email": test_email,
            "password_hash": get_password_hash("TestPassword123!"),
            "full_name": "Workflow Test User",
            "role": "quality_engineer",
            "assigned_line": "Test Line A",
            "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        }
        
        result = await db.users.insert_one(user_doc)
        print(f"  ✓ User created: {test_email}")
        print(f"  ✓ User ID: {test_user_id}")
        
        # Test 2: Password Verification & JWT
        print("\nTEST 2: Authentication (Password & JWT)")
        user_from_db = await db.users.find_one({"email": test_email})
        assert user_from_db is not None
        assert verify_password("TestPassword123!", user_from_db["password_hash"])
        print(f"  ✓ Password verification passed")
        
        token = create_access_token({"sub": test_user_id})
        print(f"  ✓ JWT token generated: {token[:30]}...")
        
        # Test 3: Product Creation
        print("\nTEST 3: Product Creation")
        test_product_id = f"p-{uuid.uuid4().hex[:12]}"
        product_doc = {
            "id": test_product_id,
            "product_name": "Test Widget",
            "product_code": f"TEST-{uuid.uuid4().hex[:8].upper()}",
            "category": "Electronics",
            "manufacturer": "Test Corp",
            "factory_line": "Test Line A",
            "status": "Active",
            "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        }
        
        result = await db.products.insert_one(product_doc)
        print(f"  ✓ Product created: {product_doc['product_name']}")
        print(f"  ✓ Product Code: {product_doc['product_code']}")
        print(f"  ✓ Factory Line: {product_doc['factory_line']}")
        
        # Test 4: Inspection Record Creation
        print("\nTEST 4: Inspection Record Creation")
        test_inspection_id = f"INSP-{uuid.uuid4().hex[:12].upper()}"
        inspection_doc = {
            "id": test_inspection_id,
            "inspection_code": test_inspection_id,
            "product_id": test_product_id,
            "product_name": product_doc['product_name'],
            "product_category": product_doc['category'],
            "factory_line": product_doc['factory_line'],
            "inspector_id": test_user_id,
            "inspector_name": user_doc['full_name'],
            "image_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",  # Minimal JPEG
            "processed_image_url": None,
            "severity_score": 0.0,
            "severity_level": "Low",
            "pass_fail": "PASS",
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc),
            "defects": [],
            "image_width": 640,
            "image_height": 480,
            "preprocessing_used": {},
            "model": {
                "architecture": "YOLOv8",
                "weights_path": "runs/detect/unified_20ep/weights/best.pt",
                "confidence_threshold": 0.25,
                "detection_count": 0
            },
            "recommendation": "No defects detected. Approve for packaging."
        }
        
        result = await db.inspections.insert_one(inspection_doc)
        print(f"  ✓ Inspection created: {test_inspection_id}")
        print(f"  ✓ Severity Level: {inspection_doc['severity_level']}")
        print(f"  ✓ Pass/Fail: {inspection_doc['pass_fail']}")
        
        # Test 5: Analytics Calculation
        print("\nTEST 5: Analytics Calculation")
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_filter = {
            "inspector_id": {"$exists": True},
            "timestamp": {"$gte": today_start}
        }
        
        total = await db.inspections.count_documents(today_filter)
        passed = await db.inspections.count_documents({**today_filter, "pass_fail": "PASS"})
        failed = total - passed
        
        print(f"  ✓ Total inspections today: {total}")
        print(f"  ✓ Passed: {passed}")
        print(f"  ✓ Failed: {failed}")
        
        # Test 6: Per-Line Analytics
        print("\nTEST 6: Per-Line Analytics")
        line_aggregation = await db.inspections.aggregate([
            {"$match": today_filter},
            {"$group": {
                "_id": "$factory_line",
                "total": {"$sum": 1},
                "passed": {"$sum": {"$cond": [{"$eq": ["$pass_fail", "PASS"]}, 1, 0]}}
            }},
            {"$sort": {"_id": 1}}
        ]).to_list(None)
        
        for line in line_aggregation:
            pass_rate = round(line["passed"] * 100 / line["total"], 1) if line["total"] else 0
            print(f"  ✓ {line['_id']}: {line['passed']}/{line['total']} passed ({pass_rate}%)")
        
        print("\n" + "="*70)
        print("✓ ALL WORKFLOW TESTS PASSED")
        print("="*70 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = asyncio.run(test_workflow())
    sys.exit(0 if success else 1)
