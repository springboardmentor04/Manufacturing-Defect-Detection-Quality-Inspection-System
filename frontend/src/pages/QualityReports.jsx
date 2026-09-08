import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import jsPDF from "jspdf";
import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";
import "../styles/QualityReports.css";


function QualityReports() {

    const [reports, setReports] = useState([]);

    const [selectedId, setSelectedId] = useState("");

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);


    // ============================================================
    // LOAD REPORTS
    // ============================================================

    useEffect(() => {

        const loadReports = async () => {

            try {

                setLoading(true);

                const response =
                    await api.get("/quality-reports");

                setReports(
                    Array.isArray(response.data)
                        ? response.data
                        : []
                );

            }

            catch (err) {

                console.error(
                    "Quality Reports Error:",
                    err
                );

                setError(
                    "Unable to load quality reports."
                );

            }

            finally {

                setLoading(false);

            }

        };


        loadReports();

    }, []);


    // ============================================================
    // SELECTED REPORT
    // ============================================================

    const selectedReport =
        reports.find(
            (item) =>
                String(item.analysis_id) ===
                String(selectedId)
        );


    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        try {

            return new Date(
                date
            ).toLocaleString();

        }

        catch {

            return date;

        }

    };


    // ============================================================
    // FORMAT NUMBER
    // ============================================================

    const formatNumber = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return "-";

        }

        const number =
            Number(value);

        return Number.isNaN(number)
            ? value
            : number.toFixed(2);

    };


    // ============================================================
    // STATUS CLASS
    // ============================================================

    const getStatusClass = (status) => {

        if (
            String(status)
                .toUpperCase() === "PASS"
        ) {

            return "report-pass";

        }

        if (
            String(status)
                .toUpperCase() === "FAIL"
        ) {

            return "report-fail";

        }

        return "";

    };

    // ============================================================
// DOWNLOAD DATABASE-BACKED PDF REPORT
// ============================================================

const downloadReport = async () => {
    if (!selectedReport) {
        return;
    }

    setDownloading(true);

    try {
        const report = selectedReport;

        const pdf = new jsPDF(
            "p",
            "mm",
            "a4"
        );

        const pageWidth = 210;
        const pageHeight = 297;

        const margin = 15;
        const contentWidth =
            pageWidth - margin * 2;

        let y = 18;

        // ========================================================
        // HELPER FUNCTIONS
        // ========================================================

        const safeValue = (
            value,
            fallback = "-"
        ) => {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return fallback;
            }

            return String(value);
        };

        const pdfFormatDate = (value) => {
            if (!value) {
                return "-";
            }

            try {
                const date = new Date(value);

                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {
                    return String(value);
                }

                return date.toLocaleString();
            }
            catch {
                return String(value);
            }
        };

        const pdfFormatNumber = (
            value
        ) => {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "-";
            }

            const number = Number(value);

            if (Number.isNaN(number)) {
                return String(value);
            }

            return number.toFixed(2);
        };

        

        const checkPage = (
            requiredHeight = 15
        ) => {
            if (
                y + requiredHeight >
                pageHeight - 20
            ) {
                pdf.addPage();

                y = 18;
            }
        };

        const addSectionTitle = (
            title
        ) => {
            checkPage(18);

            pdf.setFillColor(
                30,
                64,
                175
            );

            pdf.roundedRect(
                margin,
                y,
                contentWidth,
                9,
                2,
                2,
                "F"
            );

            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(11);

            pdf.setTextColor(
                255,
                255,
                255
            );

            pdf.text(
                title,
                margin + 5,
                y + 6
            );

            y += 14;
        };

        const addField = (
            label,
            value,
            x,
            width
        ) => {
            const text =
                safeValue(value);

            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(9);

            pdf.setTextColor(
                80,
                90,
                105
            );

            pdf.text(
                label,
                x,
                y
            );

            pdf.setFont(
                "helvetica",
                "normal"
            );

            pdf.setFontSize(9);

            pdf.setTextColor(
                25,
                30,
                40
            );

            const valueX =
                x + 38;

            const lines =
                pdf.splitTextToSize(
                    text,
                    width - 38
                );

            pdf.text(
                lines,
                valueX,
                y
            );

            return Math.max(
                5,
                lines.length * 4.5
            );
        };

        const addSingleField = (
            label,
            value
        ) => {
            checkPage(10);

            const height =
                addField(
                    label,
                    value,
                    margin,
                    contentWidth
                );

            y += height + 4;
        };

        const addTwoColumnFields = (
            leftLabel,
            leftValue,
            rightLabel,
            rightValue
        ) => {
            checkPage(10);

            const gap = 8;

            const columnWidth =
                (contentWidth - gap) /
                2;

            const leftHeight =
                addField(
                    leftLabel,
                    leftValue,
                    margin,
                    columnWidth
                );

            const rightHeight =
                addField(
                    rightLabel,
                    rightValue,
                    margin +
                        columnWidth +
                        gap,
                    columnWidth
                );

            y +=
                Math.max(
                    leftHeight,
                    rightHeight
                ) + 4;
        };

        // ========================================================
        // PDF HEADER
        // ========================================================

        pdf.setFillColor(
            15,
            23,
            42
        );

        pdf.rect(
            0,
            0,
            pageWidth,
            32,
            "F"
        );

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(19);

        pdf.setTextColor(
            255,
            255,
            255
        );

        pdf.text(
            "VISIONINSPECTAI",
            margin,
            14
        );

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(10);

        pdf.setTextColor(
            190,
            205,
            225
        );

        pdf.text(
            "Industrial Quality Inspection Report",
            margin,
            22
        );

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(9);

        pdf.text(
            `Inspection #${safeValue(
                report.inspection_id
            )}`,
            pageWidth - margin,
            14,
            {
                align: "right"
            }
        );

        pdf.text(
            `Analysis #${safeValue(
                report.analysis_id
            )}`,
            pageWidth - margin,
            22,
            {
                align: "right"
            }
        );

        y = 42;

        // ========================================================
        // REPORT TITLE
        // ========================================================

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(15);

        pdf.setTextColor(
            20,
            30,
            45
        );

        pdf.text(
            "Quality Inspection Report",
            margin,
            y
        );

        y += 8;

        // ========================================================
        // PASS / FAIL
        // ========================================================

        const passFail =
            safeValue(
                report.pass_fail
            ).toUpperCase();

        if (
            passFail === "PASS"
        ) {
            pdf.setFillColor(
                220,
                252,
                231
            );

            pdf.setTextColor(
                22,
                101,
                52
            );
        }
        else {
            pdf.setFillColor(
                254,
                226,
                226
            );

            pdf.setTextColor(
                153,
                27,
                27
            );
        }

        pdf.roundedRect(
            margin,
            y,
            32,
            9,
            2,
            2,
            "F"
        );

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(9);

        pdf.text(
            passFail,
            margin + 16,
            y + 6,
            {
                align: "center"
            }
        );

        y += 17;

        // ========================================================
        // PRODUCT INFORMATION
        // ========================================================

        addSectionTitle(
            "Product Information"
        );

        addTwoColumnFields(
            "Product ID",
            report.product_id,
            "Product Code",
            report.product_code
        );

        addTwoColumnFields(
            "Product Name",
            report.product_name,
            "Category",
            report.category
        );

        addTwoColumnFields(
            "Batch Number",
            report.batch_number,
            "Production Line",
            report.production_line
        );

        addTwoColumnFields(
            "Manufacturing Date",
            pdfFormatDate(
                report.manufacturing_date
            ),
            "Inspection Date",
            pdfFormatDate(
                report.inspection_date
            )
        );

        // ========================================================
        // AI INSPECTION SUMMARY
        // ========================================================

        addSectionTitle(
            "AI Inspection Summary"
        );

        addTwoColumnFields(
            "Inspection Status",
            report.inspection_status,
            "Number of Defects",
            report.number_of_defects ??
                0
        );

        addTwoColumnFields(
            "Detection Confidence",
            `${pdfFormatNumber(
                report.detection_confidence
            )}%`,
            "Inspection Time",
            `${pdfFormatNumber(
                report.inspection_time
            )} s`
        );

        // ========================================================
        // SEVERITY ASSESSMENT
        // ========================================================

        addSectionTitle(
            "Severity Assessment"
        );

        addTwoColumnFields(
            "Defect Size",
            pdfFormatNumber(
                report.defect_size
            ),
            "Defect Location",
            pdfFormatNumber(
                report.defect_location
            )
        );

        addTwoColumnFields(
            "Defect Type",
            report.defect_type,
            "Detection Confidence",
            `${pdfFormatNumber(
                report.detection_confidence
            )}%`
        );

        addTwoColumnFields(
            "Severity Score",
            pdfFormatNumber(
                report.severity_score
            ),
            "Severity Level",
            report.severity_level
        );

        // ========================================================
        // SEVERITY WEIGHTS
        // ========================================================

        checkPage(25);

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(8);

        pdf.setTextColor(
            100,
            110,
            125
        );

        pdf.text(
            "Severity weighting: Defect Size 30% | Defect Location 25% | Defect Type 25% | Detection Confidence 20%",
            margin,
            y
        );

        y += 8;

        // ========================================================
        // OVERALL SEVERITY
        // ========================================================

        checkPage(25);

        pdf.setFillColor(
            241,
            245,
            249
        );

        pdf.roundedRect(
            margin,
            y,
            contentWidth,
            18,
            2,
            2,
            "F"
        );

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(9);

        pdf.setTextColor(
            70,
            80,
            95
        );

        pdf.text(
            "Overall Severity Score",
            margin + 6,
            y + 7
        );

        pdf.setFontSize(13);

        pdf.setTextColor(
            30,
            64,
            175
        );

        pdf.text(
            `${pdfFormatNumber(
                report.severity_score
            )} / 100`,
            margin + 6,
            y + 14
        );

        pdf.setFontSize(10);

        pdf.setTextColor(
            60,
            70,
            85
        );

        pdf.text(
            `Severity Level: ${safeValue(
                report.severity_level
            )}`,
            pageWidth - margin - 6,
            y + 11,
            {
                align: "right"
            }
        );

        y += 25;

        // ========================================================
        // DEFECT DETAILS
        // ========================================================

        addSectionTitle(
            "Defect Details"
        );

        addSingleField(
            "Defect Type",
            report.defect_type
        );

        addTwoColumnFields(
            "Number of Defects",
            report.number_of_defects ??
                0,
            "Pass / Fail",
            report.pass_fail
        );

        // ========================================================
        // AI INSPECTION IMAGE
        // ========================================================

        if (report.result_image_path) {
    try {

        const filename =
            String(report.result_image_path)
                .split(/[\\/]/)
                .pop();

        // Get image directly from FastAPI as Base64.
        // This avoids browser canvas/CORS restrictions.
        const imageResponse =
            await api.get(
                `/inspection-image-data/${encodeURIComponent(
                    filename
                )}`
            );

        const imageData =
            imageResponse.data.image;

        if (!imageData) {
            throw new Error(
                "Inspection image data was not returned."
            );
        }

        const dimensions =
            await new Promise(
                (resolve, reject) => {

                    const img =
                        new Image();

                    img.onload = () => {

                        resolve({
                            width:
                                img.naturalWidth,

                            height:
                                img.naturalHeight
                        });

                    };

                    img.onerror = () => {

                        reject(
                            new Error(
                                "Unable to read inspection image dimensions."
                            )
                        );

                    };

                    img.src =
                        imageData;
                }
            );

                addSectionTitle(
                    "AI Inspection Image"
                );

                checkPage(90);

                const maxWidth =
                    contentWidth;

                const maxHeight = 90;

                const ratio =
                    dimensions.width /
                    dimensions.height;

                let imageWidth =
                    maxWidth;

                let imageHeight =
                    imageWidth / ratio;

                if (
                    imageHeight >
                    maxHeight
                ) {
                    imageHeight =
                        maxHeight;

                    imageWidth =
                        imageHeight *
                        ratio;
                }

                const imageX =
                    margin +
                    (
                        contentWidth -
                        imageWidth
                    ) / 2;

                pdf.addImage(
                    imageData,
                    "PNG",
                    imageX,
                    y,
                    imageWidth,
                    imageHeight
                );

                y +=
                    imageHeight + 10;

            } catch (imageError) {
                console.error(
                    "Inspection image error:",
                    imageError
                );

                addSingleField(
                    "AI Inspection Image",
                    "Image could not be loaded."
                );
            }
        }


        // ================================================
// RECOMMENDED ACTION
// ================================================

addSectionTitle(
    "Recommended Action"
);

addSingleField(
    "Recommended Action",
    report.recommended_action
);


// ================================================
// MODEL INFORMATION
// ================================================

addSectionTitle(
    "Model Information"
);

addTwoColumnFields(
    "Model",
    report.model_name ||
        "ResNet18 + YOLOv8s",

    "Processing Time",
    report.inspection_time ??
        "-"
);

addTwoColumnFields(
    "Inspection ID",
    report.inspection_id,

    "Analysis ID",
    report.analysis_id
);


        // ================================================
        // Save PDF
        // ================================================

        pdf.save(
            `Quality_Report_${report.product_code}_${report.inspection_id}.pdf`
        );

    } catch (error) {
        console.error(
            "Error downloading report:",
            error
        );
    } finally {
        setDownloading(false);
    }
};

// ============================================================
// LOADING
// ============================================================


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="dashboard-container">

                <Sidebar />

                <div className="dashboard-main">

                    <DashboardHeader />

                    <div className="quality-report-page">

                        <div className="report-loading">

                            Loading Quality Reports...

                        </div>

                    </div>

                </div>

            </div>

        );

    }


    // ============================================================
    // PAGE
    // ============================================================

    return (

        <div className="dashboard-container">

            <Sidebar />

            <div className="dashboard-main">

                <DashboardHeader />


                <div className="quality-report-page">


                    {/* =================================================
                        PAGE HEADER
                    ================================================= */}

                    <div className="quality-report-header">

                        <div>

                            <h1>
                                Quality Reports
                            </h1>

                            <p>
                                Select an analysed product to view
                                its complete AI inspection report.
                            </p>

                        </div>

                    </div>


                    {/* =================================================
                        PRODUCT SELECTOR
                    ================================================= */}

                    <div className="report-selector-panel">

                        <label htmlFor="product-select">

                            Select Analysed Product

                        </label>


                        <select
                            id="product-select"
                            value={selectedId}
                            onChange={(e) =>
                                setSelectedId(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">

                                -- Select Product --

                            </option>


                            {reports.map((item) => (

                                <option
                                    key={item.analysis_id}
                                    value={item.analysis_id}
                                >

                                    ID {item.product_id}
                                    {" — "}
                                    {item.product_name}
                                    {" — "}
                                    {item.product_code}
                                    {" — Batch "}
                                    {item.batch_number}

                                </option>

                            ))}

                        </select>

                    </div>


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {error && (

                        <div className="report-error">

                            {error}

                        </div>

                    )}


                    {/* =================================================
                        NO REPORT SELECTED
                    ================================================= */}

                    {!selectedReport && !error && (

                        <div className="report-empty">

                            <h2>
                                Select a product
                            </h2>

                            <p>
                                Choose an analysed product from
                                the dropdown above to generate
                                its quality report.
                            </p>

                        </div>

                    )}


                    {/* =================================================
                        QUALITY REPORT
                    ================================================= */}

                    {selectedReport && (

                        <div className="quality-report">


                            {/* =================================================
                                REPORT TITLE
                            ================================================= */}

                            <div className="report-title">
    <div>
        <span>
            INSPECTION REPORT
        </span>

        <h2>
            {
                selectedReport.product_name
            }
        </h2>

        <p>
            Product ID:
            {" "}
            {
                selectedReport.product_id
            }
        </p>
    </div>

    <div className="report-title-actions">

        <button
            className="download-report-button"
            onClick={downloadReport}
            disabled={downloading}
        >
            {
                downloading
                    ? "Generating..."
                    : "Download Report"
            }
        </button>

        <div
            className={
                `report-status ${
                    getStatusClass(
                        selectedReport.pass_fail
                    )
                }`
            }
        >
            {
                selectedReport.pass_fail
            }
        </div>

    </div>
</div>


                            {/* =================================================
                                PRODUCT INFORMATION
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Product Information
                                </h3>


                                <div className="report-grid">

                                    <div className="report-field">

                                        <span>
                                            Product ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.product_id
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Product Code
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.product_code
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Product Name
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.product_name
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Category
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.category
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Batch Number
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.batch_number
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Production Line
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.production_line
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Manufacturing Date
                                        </span>

                                        <strong>
                                            {
                                                formatDate(
                                                    selectedReport.manufacturing_date
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Inspection Date
                                        </span>

                                        <strong>
                                            {
                                                formatDate(
                                                    selectedReport.inspection_date
                                                )
                                            }
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                AI INSPECTION SUMMARY
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    AI Inspection Summary
                                </h3>


                                <div className="report-metrics">

                                    <div className="report-metric">

                                        <span>
                                            Inspection Status
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.inspection_status
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Number of Defects
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.number_of_defects ??
                                                0
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Detection Confidence
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.detection_confidence
                                                )
                                            }%
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Inspection Time
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.inspection_time
                                                )
                                            }
                                            s
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                SEVERITY ASSESSMENT
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Severity Assessment
                                </h3>


                                <div className="severity-report-grid">


                                    <div className="severity-card">

                                        <span>
                                            Defect Size
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.defect_size
                                                )
                                            }
                                        </strong>

                                        <small>
                                            Weight: 30%
                                        </small>

                                    </div>


                                    <div className="severity-card">

                                        <span>
                                            Defect Location
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.defect_location
                                                )
                                            }
                                        </strong>

                                        <small>
                                            Weight: 25%
                                        </small>

                                    </div>


                                    <div className="severity-card">

                                        <span>
                                            Defect Type
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.defect_type
                                                )
                                            }
                                        </strong>

                                        <small>
                                            Weight: 25%
                                        </small>

                                    </div>


                                    <div className="severity-card">

                                        <span>
                                            Detection Confidence
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.detection_confidence
                                                )
                                            }
                                        </strong>

                                        <small>
                                            Weight: 20%
                                        </small>

                                    </div>

                                </div>


                                {/* =================================================
                                    OVERALL SEVERITY
                                ================================================= */}

                                <div className="overall-severity">

                                    <div>

                                        <span>
                                            Overall Severity Score
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport.severity_score
                                                )
                                            }
                                            / 100
                                        </strong>

                                    </div>


                                    <div
                                        className={
                                            `severity-level ${
                                                String(
                                                    selectedReport.severity_level
                                                )
                                                    .toLowerCase()
                                            }`
                                        }
                                    >

                                        {
                                            selectedReport.severity_level
                                        }

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                DEFECT DETAILS
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Defect Details
                                </h3>


                                <div className="defect-details-grid">

                                    <div>

                                        <span>
                                            Defect Type
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.defect_type
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Number of Defects
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.number_of_defects ??
                                                0
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Pass / Fail
                                        </span>

                                        <strong
                                            className={
                                                getStatusClass(
                                                    selectedReport.pass_fail
                                                )
                                            }
                                        >
                                            {
                                                selectedReport.pass_fail
                                            }
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                ANNOTATED IMAGE
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    AI Inspection Image
                                </h3>

                                <p className="section-description">

                                    Annotated image generated after
                                    YOLO defect detection.

                                </p>


                                {selectedReport.result_image_path ? (

                                    <div className="inspection-image-container">

                                        <img
    src={
        `http://localhost:8000/inspection-image/${
            selectedReport.result_image_path
                .split(/[\\/]/)
                .pop()
        }`
    }
    alt="AI inspection with bounding boxes"
/>

                                    </div>

                                ) : (

                                    <div className="image-unavailable">

                                        Annotated inspection image
                                        unavailable.

                                    </div>

                                )}

                            </div>


                            {/* =================================================
                                RECOMMENDED ACTION
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Recommended Action
                                </h3>


                                <div className="recommendation-box">

                                    {
                                        selectedReport.recommended_action
                                    }

                                </div>

                            </div>


                            {/* =================================================
                                MODEL INFORMATION
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Model Information
                                </h3>


                                <div className="report-grid">

                                    <div className="report-field">

                                        <span>
                                            Model
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.model_name
                                                || "ResNet18 + YOLOv8s"
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Processing Time
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.inspection_time ??
                                                "-"
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Inspection ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.inspection_id
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Analysis ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport.analysis_id
                                            }
                                        </strong>

                                    </div>

                                </div>

                            </div>


                        </div>

                    )}

                </div>

            </div>

        </div>

    );

}


export default QualityReports;