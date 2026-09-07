# ============================================================
# VISIONINSPECT AI
# PRODUCTION QUALITY REPORT SERVICE
# Milestone 3 - Production Quality Reports
# ============================================================

import os
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle
)
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)


# ============================================================
# REPORT FOLDER
# ============================================================

REPORT_FOLDER = "app/reports"

os.makedirs(
    REPORT_FOLDER,
    exist_ok=True
)


# ============================================================
# HELPER
# ============================================================

def safe_text(value, default="N/A"):
    """
    Safely convert values to text for ReportLab Paragraphs.
    """

    if value is None:
        value = default

    return escape(
        str(value)
    )


# ============================================================
# PERCENTAGE FORMATTER
# ============================================================

def percentage_text(value):
    """
    Safely format confidence values.

    Values between 0 and 1 are treated as probabilities
    and converted to percentages.

    Values above 1 are treated as percentages directly.
    """

    if value is None:
        return "0%"

    try:

        value = float(value)

        if 0 <= value <= 1:
            value *= 100

        return f"{value:.2f}%"

    except (
        TypeError,
        ValueError
    ):

        return safe_text(
            value,
            "0%"
        )


# ============================================================
# GENERATE QUALITY REPORT
# ============================================================

def generate_report(inspection):
    """
    Generate a production quality inspection PDF.

    The report reflects the current VisionInspect AI
    production architecture:

        Stage 1:
            Normal / Defective Detection

        Stage 2:
            Automatic Product Category Classification

        Stage 3:
            Category-Specific Defect Classification

        Stage 4:
            Severity, Risk and Quality Decision
    """

    # ========================================================
    # REPORT FILE
    # ========================================================

    filename = (
        f"{inspection.get('filename', 'inspection')}.pdf"
    )

    filepath = os.path.join(
        REPORT_FOLDER,
        filename
    )

    # ========================================================
    # PDF DOCUMENT
    # ========================================================

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm
    )

    # ========================================================
    # STYLES
    # ========================================================

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=20,
        leading=24,
        spaceAfter=18
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["BodyText"],
        alignment=TA_CENTER,
        fontSize=12,
        leading=15,
        spaceAfter=18
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        spaceBefore=12,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14
    )

    small_style = ParagraphStyle(
        "SmallBody",
        parent=body_style,
        fontSize=9,
        leading=12
    )

    # ========================================================
    # STORY
    # ========================================================

    story = []

    # ========================================================
    # TITLE
    # ========================================================

    story.append(
        Paragraph(
            "VisionInspect AI",
            title_style
        )
    )

    story.append(
        Paragraph(
            "<b>Production Quality Inspection Report</b>",
            subtitle_style
        )
    )

    # ========================================================
    # INSPECTION INFORMATION
    # ========================================================

    story.append(
        Paragraph(
            "Inspection Information",
            heading_style
        )
    )

    inspection_data = [
        [
            Paragraph(
                "<b>Image</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    inspection.get(
                        "original_filename",
                        inspection.get(
                            "filename",
                            "N/A"
                        )
                    )
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Stored Filename</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    inspection.get(
                        "filename",
                        "N/A"
                    )
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Uploaded By</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    inspection.get(
                        "uploaded_by",
                        "N/A"
                    )
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Inspection Time</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    inspection.get(
                        "uploaded_at",
                        "N/A"
                    )
                ),
                body_style
            )
        ]
    ]

    inspection_table = Table(
        inspection_data,
        colWidths=[
            55 * mm,
            110 * mm
        ]
    )

    inspection_table.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.lightgrey
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        inspection_table
    )

    story.append(
        Spacer(
            1,
            12
        )
    )

    # ========================================================
    # AI INSPECTION RESULT
    # ========================================================

    story.append(
        Paragraph(
            "AI Inspection Result",
            heading_style
        )
    )

    prediction = inspection.get(
        "prediction",
        "Unknown"
    )

    status = inspection.get(
        "status",
        "Unknown"
    )

    confidence = inspection.get(
        "confidence",
        0
    )

    product_category = inspection.get(
        "product_category",
        "Unknown"
    )

    category_confidence = inspection.get(
        "category_confidence",
        0
    )

    defect_category = inspection.get(
        "defect_category",
        "None"
    )

    defect_confidence = inspection.get(
        "defect_confidence",
        0
    )

    category_type = inspection.get(
        "category_type",
        "Normal Product"
    )

    category_routing = inspection.get(
        "category_routing",
        "automatic_category_classifier"
    )

    result_data = [
        [
            Paragraph(
                "<b>Prediction</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    prediction
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Status</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    status
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Detection Confidence</b>",
                body_style
            ),
            Paragraph(
                percentage_text(
                    confidence
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Product Category</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    product_category
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Category Confidence</b>",
                body_style
            ),
            Paragraph(
                percentage_text(
                    category_confidence
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Category Routing</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    category_routing
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Defect Category</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    defect_category
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Defect Confidence</b>",
                body_style
            ),
            Paragraph(
                percentage_text(
                    defect_confidence
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Category Type</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    category_type
                ),
                body_style
            )
        ]
    ]

    result_table = Table(
        result_data,
        colWidths=[
            55 * mm,
            110 * mm
        ]
    )

    result_table.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.lightgrey
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        result_table
    )

    story.append(
        Spacer(
            1,
            12
        )
    )

    # ========================================================
    # QUALITY ASSESSMENT
    # ========================================================

    story.append(
        Paragraph(
            "Quality Assessment",
            heading_style
        )
    )

    severity = inspection.get(
        "severity",
        "None"
    )

    severity_score = inspection.get(
        "severity_score",
        0
    )

    risk_level = inspection.get(
        "risk_level",
        "Low"
    )

    quality_decision = inspection.get(
        "quality_decision",
        "PASS"
    )

    quality_data = [
        [
            Paragraph(
                "<b>Severity</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    severity
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Severity Score</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    severity_score,
                    "0"
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Risk Level</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    risk_level
                ),
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Quality Decision</b>",
                body_style
            ),
            Paragraph(
                safe_text(
                    quality_decision
                ),
                body_style
            )
        ]
    ]

    quality_table = Table(
        quality_data,
        colWidths=[
            55 * mm,
            110 * mm
        ]
    )

    quality_table.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.lightgrey
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        quality_table
    )

    story.append(
        Spacer(
            1,
            12
        )
    )

    # ========================================================
    # QUALITY RECOMMENDATION
    # ========================================================

    story.append(
        Paragraph(
            "Quality Recommendation",
            heading_style
        )
    )

    recommendation = inspection.get(
        "recommendation",
        "No additional recommendation available."
    )

    story.append(
        Paragraph(
            safe_text(
                recommendation
            ),
            body_style
        )
    )

    story.append(
        Spacer(
            1,
            18
        )
    )

    # ========================================================
    # AI PIPELINE INFORMATION
    # ========================================================

    story.append(
        Paragraph(
            "AI System Information",
            heading_style
        )
    )

    system_data = [
        [
            Paragraph(
                "<b>AI Architecture</b>",
                body_style
            ),
            Paragraph(
                "ImageNet-pretrained ResNet18 "
                "models with fine-tuning",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Pretrained Models</b>",
                body_style
            ),
            Paragraph(
                "ImageNet-pretrained ResNet18",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Training Strategy</b>",
                body_style
            ),
            Paragraph(
                "Transfer learning and staged fine-tuning",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Stage 1</b>",
                body_style
            ),
            Paragraph(
                "Normal / Defective Detection",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Stage 2</b>",
                body_style
            ),
            Paragraph(
                "Automatic Product Category Classification",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Stage 3</b>",
                body_style
            ),
            Paragraph(
                "Category-Specific Defect Classification",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Stage 4</b>",
                body_style
            ),
            Paragraph(
                "Severity, Risk and Quality Decision",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Category Routing</b>",
                body_style
            ),
            Paragraph(
                "Automatic 15-class product category classifier",
                body_style
            )
        ],
        [
            Paragraph(
                "<b>Quality Assessment</b>",
                body_style
            ),
            Paragraph(
                "Confidence-based risk assessment with "
                "weighted severity framework when "
                "component scores are available",
                body_style
            )
        ]
    ]

    system_table = Table(
        system_data,
        colWidths=[
            55 * mm,
            110 * mm
        ]
    )

    system_table.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.lightgrey
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        system_table
    )

    story.append(
        Spacer(
            1,
            18
        )
    )

    # ========================================================
    # REPORT FOOTER
    # ========================================================

    story.append(
        Paragraph(
            "This report was generated automatically by VisionInspect AI.",
            small_style
        )
    )

    # ========================================================
    # BUILD PDF
    # ========================================================

    doc.build(
        story
    )

    # ========================================================
    # RETURN REPORT PATH
    # ========================================================

    return filepath