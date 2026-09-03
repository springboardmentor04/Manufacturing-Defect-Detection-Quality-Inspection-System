import os
import sys

# Add backend root to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.inspection import InspectionImage, InspectionStatus
from app.routes.inspections import process_and_inspect_image

print("Checking database for pending inspections...")
db = SessionLocal()
try:
    pending_records = db.query(InspectionImage).filter(
        InspectionImage.status.in_([InspectionStatus.pending, InspectionStatus.processing])
    ).all()
    
    print(f"Found {len(pending_records)} pending/processing inspections.")
    
    for record in pending_records:
        print(f"Starting inspection #{record.id} ({record.original_filename})...")
        try:
            process_and_inspect_image(record.id, SessionLocal)
            print(f"Inspection #{record.id} finished successfully.")
        except Exception as e:
            print(f"Failed to process inspection #{record.id}: {e}")
            
    print("All pending inspections have been processed.")
finally:
    db.close()
