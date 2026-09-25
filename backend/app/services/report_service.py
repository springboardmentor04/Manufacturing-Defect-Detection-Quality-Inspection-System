from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm

def build_report(inspection):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=16*mm, leftMargin=16*mm, topMargin=16*mm, bottomMargin=16*mm)
    styles = getSampleStyleSheet()
    story = [Paragraph("VisionInspect AI - Quality Inspection Report", styles["Title"]),
             Spacer(1, 8),
             Paragraph(f"Inspection ID: {inspection.inspection_uuid}", styles["BodyText"]),
             Paragraph(f"Date: {inspection.created_at.isoformat()} UTC", styles["BodyText"]),
             Paragraph(f"Decision: {inspection.decision.value}", styles["BodyText"]),
             Paragraph(f"Severity: {inspection.severity_level.value} ({inspection.severity_score:.1f}/100)", styles["BodyText"]),
             Paragraph(f"Highest confidence: {inspection.highest_confidence*100:.1f}%", styles["BodyText"]),
             Paragraph(f"Processing time: {inspection.processing_time_ms:.1f} ms", styles["BodyText"]),
             Spacer(1, 10)]
    data = [["Defect", "Confidence", "Severity", "Score"]]
    for d in inspection.defects:
        data.append([d.defect_type, f"{d.confidence*100:.1f}%", d.severity_level.value, f"{d.severity_score:.1f}"])
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#172033")),
                           ("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.5,colors.grey),
                           ("PADDING",(0,0),(-1,-1),6)]))
    story += [t, Spacer(1, 10), Paragraph("Recommendation", styles["Heading2"]),
              Paragraph(inspection.recommendation, styles["BodyText"])]
    if inspection.review:
        story += [Spacer(1, 10), Paragraph("Human Review", styles["Heading2"]),
                  Paragraph(f"Original AI decision: {inspection.review.original_decision.value}", styles["BodyText"]),
                  Paragraph(f"Final decision: {inspection.review.final_decision.value}", styles["BodyText"]),
                  Paragraph(f"Comments: {inspection.review.comments}", styles["BodyText"])]
    doc.build(story)
    return buf.getvalue()
