import os
import cv2
import json
from pathlib import Path
from ultralytics import YOLO

def analyze_failures():
    model_path = "ai-model/yolo/models/optimized_run/weights/best.pt"
    model = YOLO(model_path)
    
    split = "test"
    images_dir = Path(f"ai-model/yolo/dataset/images/{split}")
    labels_dir = Path(f"ai-model/yolo/dataset/labels/{split}")
    
    with open("ai-model/yolo/taxonomy.json", "r") as f:
        taxonomy = json.load(f)
    classes = taxonomy["classes"]
    
    fn_list = []
    
    for img_path in images_dir.glob("*.png"):
        cat = img_path.stem.split('_')[0]
        
        # Check GT
        label_path = labels_dir / f"{img_path.stem}.txt"
        is_defect = False
        gt_defects = []
        if label_path.exists():
            with open(label_path, "r") as f:
                lines = f.readlines()
                if len(lines) > 0:
                    is_defect = True
                    for line in lines:
                        parts = line.strip().split()
                        gt_cls = classes[int(parts[0])]
                        coords = [float(x) for x in parts[1:]]
                        gt_defects.append((gt_cls, coords))
                        
        if not is_defect:
            continue
            
        # It's a defect image, let's predict
        # We need raw confidences down to 0.001 to see weak detections
        results = model.predict(source=str(img_path), imgsz=800, verbose=False, device="cuda", conf=0.001)
        
        # Check if it passes or fails at 0.25
        pred_fail_at_025 = False
        for res in results:
            if res.boxes is not None:
                for box in res.boxes:
                    if float(box.conf) >= 0.25:
                        pred_fail_at_025 = True
                        break
                        
        if not pred_fail_at_025:
            # THIS IS A FALSE NEGATIVE at 0.25
            
            # 1. Image info
            img = cv2.imread(str(img_path))
            orig_h, orig_w = img.shape[:2]
            
            # 2. GT details
            # Calculate mask area and bbox
            total_mask_area_norm = 0
            for defect_cls, coords in gt_defects:
                # coords are polygon points x1 y1 x2 y2... normalized
                # We can approximate bounding box
                xs = coords[0::2]
                ys = coords[1::2]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                # Approximate area (bounding box area for simplicity)
                area_norm = (max_x - min_x) * (max_y - min_y)
                total_mask_area_norm += area_norm
                
            orig_defect_area_px = total_mask_area_norm * orig_w * orig_h
            
            # After 800px resizing, preserving aspect ratio (longest side is 800)
            scale = 800 / max(orig_h, orig_w)
            new_w, new_h = orig_w * scale, orig_h * scale
            resized_defect_area_px = total_mask_area_norm * new_w * new_h
            
            # 3. Prediction details
            max_conf = 0.0
            weak_det = False
            weak_cls = None
            
            for res in results:
                if res.boxes is not None:
                    for box in res.boxes:
                        conf = float(box.conf)
                        if conf > max_conf:
                            max_conf = conf
                            weak_cls = classes[int(box.cls)]
                            weak_det = True
                            
            fn_list.append({
                "filename": img_path.name,
                "category": cat,
                "ground_truth_defects": [d[0] for d in gt_defects],
                "orig_resolution": f"{orig_w}x{orig_h}",
                "orig_defect_area_px": round(orig_defect_area_px, 2),
                "resized_defect_area_800px": round(resized_defect_area_px, 2),
                "predicted_result_at_0.25": "PASS",
                "max_confidence_raw": round(max_conf, 4),
                "weak_detection_exists": weak_det,
                "weak_predicted_class": weak_cls
            })
            
    with open("reports/test_false_negatives.json", "w") as f:
        json.dump(fn_list, f, indent=4)
        
    print(f"Found {len(fn_list)} False Negatives. Results saved to reports/test_false_negatives.json")

if __name__ == "__main__":
    os.makedirs("reports", exist_ok=True)
    analyze_failures()
