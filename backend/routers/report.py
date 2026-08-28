import io
import csv
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("/export-csv")
def export_reports():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Scan ID", "Source", "Status", "Defects Found", "Severity"])
    
    writer.writerow(["SCAN-8091", "Optical Line A", "PASSED", 0, "NONE"])
    writer.writerow(["SCAN-8092", "Optical Line B", "REJECTED", 2, "HIGH"])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inspection_report.csv"}
    )