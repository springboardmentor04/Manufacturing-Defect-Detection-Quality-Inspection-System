import csv
import os
from datetime import datetime


class ReportGenerator:

    def __init__(self, output_dir=None):
        if output_dir is None:
            
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.output_dir = os.path.join(base_dir, "generated")
        else:
            self.output_dir = output_dir
            
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_csv_report(self, inspection_data: list) -> str:
        filename = f"inspection_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(self.output_dir, filename)

        headers = [
            "Scan ID",
            "Timestamp",
            "Status",
            "Defect Count",
            "Inspected By",
        ]

        with open(
            filepath, mode="w", newline="", encoding="utf-8"
        ) as file:
            writer = csv.writer(file)
            writer.writerow(headers)

            for item in inspection_data:
                if isinstance(item, dict):
                    scan_id = item.get("scan_id") or item.get("scanId") or item.get("id")
                    timestamp = item.get("timestamp") or item.get("created_at") or datetime.now().isoformat()
                    status = item.get("status")
                    defect_count = item.get("defect_count") or item.get("defects_found", 0)
                    inspected_by = item.get("inspected_by") or item.get("user_id", "System")
                else:
                    scan_id = getattr(item, "id", None)
                    timestamp = getattr(item, "created_at", datetime.now().isoformat())
                    status = getattr(item, "status", None)
                    defect_count = len(getattr(item, "defects", []))
                    inspected_by = getattr(item, "user_id", "System")

                writer.writerow(
                    [scan_id, timestamp, status, defect_count, inspected_by]
                )

        return filepath

report_generator = ReportGenerator()