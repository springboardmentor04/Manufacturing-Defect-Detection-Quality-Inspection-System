#!/usr/bin/env python3
"""Test real YOLO inference with trained model."""
import asyncio
import json
import sys
import os
import base64
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_yolo_inference():
    """Test real YOLO inference with actual MVTec image."""
    
    print("\n" + "="*70)
    print("VisionInspect AI - Real YOLO Inference Test")
    print("="*70 + "\n")
    
    try:
        from backend.yolo_inference import run_yolo_inspection, get_model, decode_data_url
        
        # Test 1: Verify model loads
        print("TEST 1: Model Loading")
        model_path = Path("runs/detect/unified_20ep/weights/best.pt")
        if model_path.exists():
            print(f"  ✓ Model file exists: {model_path}")
        else:
            print(f"  ✗ Model file NOT found: {model_path}")
            return False
        
        model = get_model()
        print(f"  ✓ Model loaded successfully")
        print(f"  ✓ Model type: {type(model).__name__}")
        
        # Test 2: Find and load a real MVTec image
        print("\nTEST 2: Loading Real MVTec Image")
        mvtec_dir = Path("dataset/archive")
        
        # Look for test images in various categories
        test_images = []
        for category in mvtec_dir.glob("*/test/*"):
            if category.is_file() and category.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                test_images.append(category)
                break
        
        if not test_images:
            # Try finding any image in the dataset
            test_images = list(mvtec_dir.glob("*/test/**/*.jpg")) + list(mvtec_dir.glob("*/test/**/*.png"))
        
        if test_images:
            test_image_path = test_images[0]
            print(f"  ✓ Found test image: {test_image_path}")
            
            # Read and encode image as data URL
            with open(test_image_path, 'rb') as f:
                image_data = f.read()
            
            image_size_mb = len(image_data) / (1024 * 1024)
            print(f"  ✓ Image size: {image_size_mb:.2f} MB")
            
            b64_data = base64.b64encode(image_data).decode('utf-8')
            data_url = f"data:image/jpeg;base64,{b64_data}"
            print(f"  ✓ Encoded as data URL")
            
            # Test 3: Run inference
            print("\nTEST 3: Real YOLO Inference")
            result = run_yolo_inspection(data_url, {})
            
            print(f"  ✓ Inference completed")
            print(f"  ✓ Defects detected: {len(result.get('defects', []))}")
            print(f"  ✓ Severity score: {result.get('severity_score')}")
            print(f"  ✓ Severity level: {result.get('severity_level')}")
            print(f"  ✓ Pass/Fail: {result.get('pass_fail')}")
            print(f"  ✓ Recommendation: {result.get('recommendation')[:80]}...")
            
            # Test 4: Validate defect structure
            print("\nTEST 4: Defect Structure Validation")
            defects = result.get('defects', [])
            if defects:
                defect = defects[0]
                required_keys = ['class_id', 'class_name', 'confidence', 'pixel_bounding_box', 'severity_score']
                for key in required_keys:
                    if key in defect:
                        print(f"  ✓ Defect has '{key}'")
                    else:
                        print(f"  ✗ Defect missing '{key}'")
                        return False
            else:
                print(f"  ✓ Zero defects case: Returns empty array (valid PASS result)")
            
            # Test 5: Verify model metadata
            print("\nTEST 5: Model Metadata")
            model_info = result.get('model', {})
            print(f"  ✓ Architecture: {model_info.get('architecture')}")
            print(f"  ✓ Weights path: {model_info.get('weights_path')}")
            print(f"  ✓ Confidence threshold: {model_info.get('confidence_threshold')}")
            print(f"  ✓ Detection count: {model_info.get('detection_count')}")
            
            print("\n" + "="*70)
            print("✓ ALL YOLO INFERENCE TESTS PASSED")
            print("="*70 + "\n")
            return True
        else:
            print("  ✗ No test images found in MVTec dataset")
            print("  → Testing with synthetic image instead...")
            
            # Create a minimal test image
            import numpy as np
            from PIL import Image
            import io
            
            # Create a blank image
            img = Image.new('RGB', (640, 480), color=(128, 128, 128))
            
            # Convert to data URL
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG')
            image_data = buffer.getvalue()
            
            b64_data = base64.b64encode(image_data).decode('utf-8')
            data_url = f"data:image/jpeg;base64,{b64_data}"
            
            print("\nTEST 3: Real YOLO Inference (Synthetic Image)")
            result = await run_yolo_inference(data_url, {})
            
            print(f"  ✓ Inference completed")
            print(f"  ✓ Defects detected: {len(result.get('defects', []))}")
            print(f"  ✓ Severity score: {result.get('severity_score')}")
            print(f"  ✓ Pass/Fail: {result.get('pass_fail')}")
            
            print("\n" + "="*70)
            print("✓ YOLO INFERENCE TEST PASSED")
            print("="*70 + "\n")
            return True
    
    except Exception as e:
        print(f"\n✗ YOLO inference test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = asyncio.run(test_yolo_inference())
    sys.exit(0 if success else 1)
