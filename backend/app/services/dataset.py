import os
from pathlib import Path
from typing import Dict, Any, List

class DatasetService:
    _categories_cache = None
    _overview_cache = None

    def __init__(self, dataset_path: str):
        # Resolve absolute path from backend root if relative
        self.base_path = Path(dataset_path).resolve()
    
    def _count_images(self, folder_path: Path) -> int:
        """Count standard image files in a directory recursively."""
        if not folder_path.exists() or not folder_path.is_dir():
            return 0
        
        valid_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tiff"}
        count = 0
        for root, _, files in os.walk(folder_path):
            for file in files:
                if Path(file).suffix.lower() in valid_extensions:
                    count += 1
        return count
    
    def _get_folder_size(self, folder_path: Path) -> int:
        """Get total size of a directory in bytes."""
        if not folder_path.exists() or not folder_path.is_dir():
            return 0
            
        total_size = 0
        for dirpath, _, filenames in os.walk(folder_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
        return total_size
        
    def _format_size(self, size_in_bytes: int) -> str:
        """Format bytes to human readable string."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_in_bytes < 1024.0:
                return f"{size_in_bytes:.1f} {unit}"
            size_in_bytes /= 1024.0
        return f"{size_in_bytes:.1f} PB"

    DEFAULT_CATEGORIES = [
        "bottle", "cable", "capsule", "carpet", "grid",
        "hazelnut", "leather", "metal_nut", "pill", "screw",
        "tile", "toothbrush", "transistor", "wood", "zipper"
    ]

    def scan_categories(self) -> List[Dict[str, Any]]:
        """Scan all categories in the mvtec dataset folder or return supported taxonomy categories."""
        if DatasetService._categories_cache is not None:
            return DatasetService._categories_cache
            
        if not self.base_path.exists():
            # Fallback for production environments where raw datasets are not stored on server
            taxonomy_path = self.base_path.parents[1] / "ai-model" / "yolo" / "taxonomy.json"
            cats_list = self.DEFAULT_CATEGORIES
            if taxonomy_path.exists():
                try:
                    import json
                    with open(taxonomy_path, "r") as f:
                        tax = json.load(f)
                        mapped = set()
                        for c_list in tax.get("mapping", {}).values():
                            mapped.update(c_list)
                        if mapped:
                            cats_list = sorted(list(mapped))
                except Exception:
                    pass

            categories = [
                {
                    "name": name,
                    "train_images": 0,
                    "test_images": 0,
                    "ground_truth_images": 0,
                    "total_size_bytes": 0,
                    "formatted_size": "0 B",
                    "status": "Production AI Ready",
                    "is_valid": True
                }
                for name in cats_list
            ]
            DatasetService._categories_cache = categories
            return DatasetService._categories_cache
            
        categories = []
        for item in self.base_path.iterdir():

            if item.is_dir():
                # Expected subfolders
                train_dir = item / "train"
                test_dir = item / "test"
                gt_dir = item / "ground_truth"
                
                train_count = self._count_images(train_dir)
                test_count = self._count_images(test_dir)
                gt_count = self._count_images(gt_dir)
                
                # Validation status
                is_valid = train_dir.exists() and test_dir.exists()
                status = "Valid" if is_valid else "Warning"
                if not is_valid:
                    issues = []
                    if not train_dir.exists(): issues.append("Missing train folder")
                    if not test_dir.exists(): issues.append("Missing test folder")
                    status = f"Warning: {', '.join(issues)}"
                
                total_size = self._get_folder_size(item)
                
                categories.append({
                    "name": item.name,
                    "train_images": train_count,
                    "test_images": test_count,
                    "ground_truth_images": gt_count,
                    "total_size_bytes": total_size,
                    "formatted_size": self._format_size(total_size),
                    "status": status,
                    "is_valid": is_valid
                })
                
        # Sort alphabetically
        DatasetService._categories_cache = sorted(categories, key=lambda x: x["name"])
        return DatasetService._categories_cache

    def get_overview(self) -> Dict[str, Any]:
        """Get total aggregated dataset statistics."""
        if DatasetService._overview_cache is not None:
            return DatasetService._overview_cache
            
        categories = self.scan_categories()
        
        total_train = sum(c["train_images"] for c in categories)
        total_test = sum(c["test_images"] for c in categories)
        total_gt = sum(c["ground_truth_images"] for c in categories)
        total_bytes = sum(c["total_size_bytes"] for c in categories)
        
        all_valid = all(c["is_valid"] for c in categories) if categories else False
        
        DatasetService._overview_cache = {
            "total_categories": len(categories),
            "total_images": total_train + total_test + total_gt,
            "train_images": total_train,
            "test_images": total_test,
            "ground_truth_images": total_gt,
            "total_size": self._format_size(total_bytes),
            "health_status": "Healthy" if all_valid and categories else ("Warning" if categories else "Not Found"),
            "dataset_path": str(self.base_path)
        }
        return DatasetService._overview_cache

    def get_health_report(self) -> Dict[str, Any]:
        """Generate a detailed health and validation report."""
        if not self.base_path.exists():
            return {
                "status": "Error",
                "message": f"Dataset directory not found at {self.base_path}",
                "issues": ["Directory does not exist"]
            }
            
        categories = self.scan_categories()
        if not categories:
            return {
                "status": "Warning",
                "message": "Dataset directory exists but is empty.",
                "issues": ["No category folders found"]
            }
            
        issues = []
        for cat in categories:
            if not cat["is_valid"]:
                issues.append(f"Category '{cat['name']}': {cat['status']}")
                
        return {
            "status": "Healthy" if not issues else "Warning",
            "message": "All categories validated successfully." if not issues else "Some categories have missing folders.",
            "issues": issues
        }
