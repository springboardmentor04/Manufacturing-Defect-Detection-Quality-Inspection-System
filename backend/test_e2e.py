#!/usr/bin/env python3
"""End-to-end integration tests for VisionInspect AI."""

import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from auth import create_access_token, get_password_hash, verify_password
from database import client, db
from models import UserRegister, ProductCreate, PreprocessingOptions


async def test_database_connection():
    """Test: MongoDB connection works."""
    print("TEST: Database Connection")
    try:
        result = await db.command("ping")
        print(f"  ✓ MongoDB ping response: {result}")
        return True
    except Exception as e:
        print(f"  ✗ MongoDB connection failed: {e}")
        return False


async def test_user_auth_workflow():
    """Test: User registration, login, token generation."""
    print("\nTEST: User Authentication Workflow")
    
    try:
        # Test password hashing
        password = "test_password_123"
        hashed = get_password_hash(password)
        print(f"  ✓ Password hashed: {hashed[:20]}...")
        
        # Verify password works
        if not verify_password(password, hashed):
            print("  ✗ Password verification failed")
            return False
        print("  ✓ Password verification passed")
        
        # Create test user
        test_user = {
            "id": f"u-{uuid.uuid4().hex[:12]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password_hash": hashed,
            "full_name": "Test User",
            "role": "quality_engineer",
            "assigned_line": "Test Line",
            "created_at": datetime.now(timezone.utc),
        }
        
        # Clean up any existing test user
        await db.users.delete_one({"email": test_user["email"]})
        
        # Insert user
        result = await db.users.insert_one(test_user)
        print(f"  ✓ User created with ID: {test_user['id']}")
        
        # Retrieve user
        retrieved = await db.users.find_one({"id": test_user["id"]}, {"_id": 0, "password_hash": 0})
        if not retrieved:
            print("  ✗ User retrieval failed")
            return False
        print(f"  ✓ User retrieved: {retrieved['email']}")
        
        # Test token generation
        token = create_access_token({"sub": test_user["id"], "role": test_user["role"]})
        print(f"  ✓ JWT token generated: {token[:20]}...")
        
        # Cleanup
        await db.users.delete_one({"id": test_user["id"]})
        
        return True
    except Exception as e:
        print(f"  ✗ Auth workflow failed: {e}")
        return False


async def test_product_workflow():
    """Test: Product CRUD operations."""
    print("\nTEST: Product CRUD Workflow")
    
    try:
        # Create product
        product_id = f"prd-{uuid.uuid4().hex[:12]}"
        product_data = {
            "id": product_id,
            "product_name": "Test Widget",
            "product_code": f"CODE-{uuid.uuid4().hex[:8].upper()}",
            "category": "Electronics",
            "manufacturer": "Test Corp",
            "factory_line": "Test Assembly Line",
            "status": "Active",
            "created_at": datetime.now(timezone.utc),
        }
        
        # Clean up any existing
        await db.products.delete_one({"id": product_id})
        
        # Create
        await db.products.insert_one(product_data)
        print(f"  ✓ Product created: {product_data['product_name']}")
        
        # Read
        retrieved = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not retrieved:
            print("  ✗ Product retrieval failed")
            return False
        print(f"  ✓ Product retrieved: {retrieved['product_code']}")
        
        # Update
        await db.products.update_one({"id": product_id}, {"$set": {"status": "Inactive"}})
        updated = await db.products.find_one({"id": product_id}, {"_id": 0})
        if updated["status"] != "Inactive":
            print("  ✗ Product update failed")
            return False
        print(f"  ✓ Product updated: status={updated['status']}")
        
        # Delete
        await db.products.delete_one({"id": product_id})
        deleted = await db.products.find_one({"id": product_id})
        if deleted is not None:
            print("  ✗ Product deletion failed")
            return False
        print("  ✓ Product deleted")
        
        return True
    except Exception as e:
        print(f"  ✗ Product CRUD failed: {e}")
        return False


async def test_inspection_schema():
    """Test: Inspection record schema validation."""
    print("\nTEST: Inspection Record Schema")
    
    try:
        # Create a complete inspection record
        inspection_id = f"INSP-{uuid.uuid4().hex[:10].upper()}"
        user_id = f"u-{uuid.uuid4().hex[:12]}"
        product_id = f"prd-{uuid.uuid4().hex[:12]}"
        
        inspection_record = {
            "id": inspection_id,
            "inspection_code": inspection_id,
            "product_id": product_id,
            "product_name": "Test Product",
            "product_category": "Electronics",
            "factory_line": "Assembly Line A1",
            "image_url": "data:image/png;base64,iVBORw0KGgo=",  # Minimal valid base64
            "processed_image_url": "data:image/png;base64,iVBORw0KGgo=",
            "preprocessing_used": {
                "noise_removal": True,
                "clahe_contrast": True,
                "edge_detection": False,
                "roi_crop": False,
            },
            "defects": [],  # Empty for PASS case
            "severity_score": 0.0,
            "severity_level": "Low",
            "pass_fail": "PASS",
            "inspector_id": user_id,
            "inspector_name": "Test Inspector",
            "comments": "Test inspection",
            "image_width": 512,
            "image_height": 512,
            "model": {
                "architecture": "detect",
                "weights": "runs/detect/unified_20ep/weights/best.pt",
                "confidence_threshold": 0.25,
                "detections": 0,
            },
            "recommendation": "No defects detected. Approve for packaging.",
            "timestamp": datetime.now(timezone.utc),
        }
        
        # Clean up
        await db.inspections.delete_one({"id": inspection_id})
        
        # Insert
        await db.inspections.insert_one(inspection_record)
        print(f"  ✓ Inspection record created: {inspection_id}")
        
        # Retrieve with filter (same as API uses)
        retrieved = await db.inspections.find_one(
            {"id": inspection_id, "inspector_id": {"$exists": True}},
            {"_id": 0}
        )
        if not retrieved:
            print("  ✗ Inspection retrieval failed")
            return False
        print(f"  ✓ Inspection retrieved: {retrieved['inspection_code']}")
        
        # Verify all required fields
        required_fields = [
            "id", "inspection_code", "product_id", "product_name", "factory_line",
            "inspector_id", "inspector_name", "timestamp", "severity_score",
            "severity_level", "pass_fail", "defects", "image_width", "image_height",
            "preprocessing_used", "model", "recommendation"
        ]
        missing = [f for f in required_fields if f not in retrieved]
        if missing:
            print(f"  ✗ Missing fields: {missing}")
            return False
        print(f"  ✓ All required fields present")
        
        # Clean up
        await db.inspections.delete_one({"id": inspection_id})
        
        return True
    except Exception as e:
        print(f"  ✗ Inspection schema test failed: {e}")
        return False


async def test_analytics_calculation():
    """Test: Analytics calculation from MongoDB."""
    print("\nTEST: Analytics Calculation")
    
    try:
        user_id = f"u-{uuid.uuid4().hex[:12]}"
        unique_id = uuid.uuid4().hex[:8]
        
        # Create test inspection records for today
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        test_inspections = [
            {
                "id": f"INSP-{unique_id}-{i}",
                "inspection_code": f"INSP-{unique_id}-{i}",
                "product_id": f"prd-{unique_id}-{i}",
                "product_name": f"Product {i}",
                "product_category": "Test",
                "factory_line": "Test Line A" if i % 2 == 0 else "Test Line B",
                "image_url": "data:image/png;base64,iVBORw0KGgo=",
                "preprocessing_used": {"noise_removal": True, "clahe_contrast": True, "edge_detection": False, "roi_crop": False},
                "defects": [],
                "severity_score": 0.0,
                "severity_level": "Low",
                "pass_fail": "PASS" if i % 3 != 0 else "FAIL",
                "inspector_id": user_id,
                "inspector_name": "Test Inspector",
                "image_width": 512,
                "image_height": 512,
                "model": {"architecture": "detect", "weights": "test", "confidence_threshold": 0.25, "detections": 0},
                "recommendation": "Test",
                "timestamp": today_start,
            }
            for i in range(5)
        ]
        
        # Clean up old test data
        await db.inspections.delete_many({"inspector_id": user_id})
        
        # Insert test records
        await db.inspections.insert_many(test_inspections)
        print(f"  ✓ Created {len(test_inspections)} test inspection records")
        
        # Calculate analytics
        today_filter = {"inspector_id": user_id, "timestamp": {"$gte": today_start}}
        total = await db.inspections.count_documents(today_filter)
        passed = await db.inspections.count_documents({**today_filter, "pass_fail": "PASS"})
        failed = total - passed
        
        print(f"  ✓ Total inspections: {total}")
        print(f"  ✓ Passed: {passed}, Failed: {failed}")
        
        if total == 5 and passed == 3 and failed == 2:
            print("  ✓ Analytics calculation correct")
        else:
            print(f"  ✗ Analytics mismatch: expected 5 total, 3 passed, 2 failed")
            return False
        
        # Test per-line analytics
        line_stats = await db.inspections.aggregate([
            {"$match": today_filter},
            {"$group": {
                "_id": "$factory_line",
                "total": {"$sum": 1},
                "passed": {"$sum": {"$cond": [{"$eq": ["$pass_fail", "PASS"]}, 1, 0]}},
            }},
        ]).to_list(None)
        
        print(f"  ✓ Per-line analytics calculated: {len(line_stats)} lines")
        for line_stat in line_stats:
            print(f"    - {line_stat['_id']}: {line_stat['passed']}/{line_stat['total']} passed")
        
        # Clean up
        await db.inspections.delete_many({"inspector_id": user_id})
        
        return True
    except Exception as e:
        print(f"  ✗ Analytics calculation failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("=" * 60)
    print("VisionInspect AI - End-to-End Tests")
    print("=" * 60)
    
    tests = [
        test_database_connection,
        test_user_auth_workflow,
        test_product_workflow,
        test_inspection_schema,
        test_analytics_calculation,
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append((test.__name__, result))
        except Exception as e:
            print(f"\nERROR in {test.__name__}: {e}")
            results.append((test.__name__, False))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print("=" * 60)
    
    # Close database connection
    client.close()
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
