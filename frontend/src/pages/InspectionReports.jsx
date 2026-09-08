import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";

import jsPDF from "jspdf";
import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";
import "../styles/QualityReports.css";


function InspectionsReports() {

    // ============================================================
    // STATE
    // ============================================================

    const [reports, setReports] = useState([]);
    const [selectedId, setSelectedId] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);


    // ============================================================
    // LOAD INSPECTION REPORTS
    // ============================================================

    useEffect(() => {

        const loadReports = async () => {

            try {

                setLoading(true);
                setError("");

                /*
                 * Uses the same database-backed report endpoint
                 * already used by QualityReports.jsx.
                 *
                 * If your backend has a dedicated
                 * /inspection-reports endpoint, replace only
                 * the URL below.
                 */
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
                    "Inspection Reports Error:",
                    err
                );

                setError(
                    "Unable to load inspection reports."
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
                String(item.inspection_id) ===
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

            const formatted =
                new Date(date);

            if (
                Number.isNaN(
                    formatted.getTime()
                )
            ) {
                return String(date);
            }

            return formatted.toLocaleString();

        }
        catch {

            return String(date);

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
    // SAFE VALUE
    // ============================================================

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


    // ============================================================
    // STATUS CLASS
    // ============================================================

    const getStatusClass = (status) => {

        const value =
            String(status)
                .toUpperCase();

        if (value === "PASS") {
            return "report-pass";
        }

        if (value === "FAIL") {
            return "report-fail";
        }

        return "";

    };


    // ============================================================
    // SEVERITY CLASS
    // ============================================================

    const getSeverityClass = (severity) => {

        if (!severity) {
            return "";
        }

        return String(severity)
            .toLowerCase();

    };


    // ============================================================
    // GET DEFECT LIST
    // ============================================================

    const getDefects = (report) => {

        if (
            report &&
            Array.isArray(report.defects)
        ) {
            return report.defects;
        }

        return [];

    };


    // ============================================================
    // GET BOUNDING BOX TEXT
    // ============================================================

    const getBoundingBox = (defect) => {

        if (!defect) {
            return "-";
        }

        /*
         * Supports:
         *
         * bbox_x
         * bbox_y
         * bbox_width
         * bbox_height
         */

        if (
            defect.bbox_x !== undefined &&
            defect.bbox_y !== undefined &&
            defect.bbox_width !== undefined &&
            defect.bbox_height !== undefined
        ) {

            return (
                `X: ${formatNumber(defect.bbox_x)}, ` +
                `Y: ${formatNumber(defect.bbox_y)}, ` +
                `Width: ${formatNumber(defect.bbox_width)}, ` +
                `Height: ${formatNumber(defect.bbox_height)}`
            );

        }

        /*
         * Also supports a preformatted bounding_box
         * field if your backend returns one.
         */

        if (defect.bounding_box) {
            return defect.bounding_box;
        }

        return "-";

    };


    // ============================================================
    // GET DEFECT SIZE
    // ============================================================

    const getDefectSize = (defect) => {

        if (!defect) {
            return "-";
        }

        if (
            defect.defect_size !== undefined &&
            defect.defect_size !== null
        ) {
            return formatNumber(
                defect.defect_size
            );
        }

        if (
            defect.bbox_width !== undefined &&
            defect.bbox_height !== undefined
        ) {

            return formatNumber(
                Number(defect.bbox_width) *
                Number(defect.bbox_height)
            );

        }

        return "-";

    };


    // ============================================================
    // GET DEFECT LOCATION
    // ============================================================

    const getDefectLocation = (defect) => {

        if (!defect) {
            return "-";
        }

        if (defect.defect_location) {
            return defect.defect_location;
        }

        if (
            defect.bbox_x !== undefined &&
            defect.bbox_y !== undefined
        ) {

            return (
                `X: ${formatNumber(defect.bbox_x)}, ` +
                `Y: ${formatNumber(defect.bbox_y)}`
            );

        }

        return "-";

    };


    // ============================================================
    // DOWNLOAD COMPLETE PDF REPORT
    // ============================================================

    const downloadReport = async () => {

        if (!selectedReport) {
            return;
        }

        setDownloading(true);

        try {

            const report =
                selectedReport;

            const pdf =
                new jsPDF(
                    "p",
                    "mm",
                    "a4"
                );


            const pageWidth = 210;
            const pageHeight = 297;

            const margin = 15;

            const contentWidth =
                pageWidth -
                margin * 2;

            let y = 18;


            // ========================================================
            // PDF HELPERS
            // ========================================================

            const pdfSafeValue = (
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

                    const date =
                        new Date(value);

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


            const pdfFormatNumber = (value) => {

                if (
                    value === null ||
                    value === undefined ||
                    value === ""
                ) {
                    return "-";
                }

                const number =
                    Number(value);

                if (
                    Number.isNaN(number)
                ) {
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
                    pdfSafeValue(value);

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

                y +=
                    height + 4;

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
                    (
                        contentWidth -
                        gap
                    ) / 2;

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
                "Industrial Inspection Report",
                margin,
                22
            );


            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(9);

            pdf.text(
                `Inspection #${pdfSafeValue(
                    report.inspection_id
                )}`,
                pageWidth - margin,
                14,
                {
                    align: "right"
                }
            );


            pdf.text(
                `Product ${pdfSafeValue(
                    report.product_code
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
                "Inspection Report",
                margin,
                y
            );

            y += 8;


            // ========================================================
            // PASS / FAIL
            // ========================================================

            const passFail =
                pdfSafeValue(
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
            // INSPECTION INFORMATION
            // ========================================================

            addSectionTitle(
                "Inspection Information"
            );


            addTwoColumnFields(
                "Inspection ID",
                report.inspection_id,
                "Inspection Status",
                report.inspection_status
            );


            addTwoColumnFields(
                "PASS / FAIL",
                report.pass_fail,
                "Inspection Time",
                report.inspection_time !==
                null &&
                report.inspection_time !==
                undefined
                    ? `${pdfFormatNumber(
                        report.inspection_time
                    )} s`
                    : "-"
            );


            // ========================================================
            // AI INSPECTION
            // ========================================================

            addSectionTitle(
                "AI Inspection"
            );


            addTwoColumnFields(
                "Defect Type",
                report.defect_type ||
                    "No defect detected",
                "Detection Confidence",
                `${pdfFormatNumber(
                    report.detection_confidence
                )}%`
            );


            addTwoColumnFields(
                "Severity Score",
                report.severity_score !==
                null &&
                report.severity_score !==
                undefined
                    ? `${pdfFormatNumber(
                        report.severity_score
                    )} / 100`
                    : "-",
                "Severity Level",
                report.severity_level
            );


            addTwoColumnFields(
                "Number of Defects",
                report.number_of_defects ??
                    0,
                "AI Model",
                report.model_name ||
                    "ResNet18 + YOLOv8s"
            );


            // ========================================================
            // DEFECT DETAILS
            // ========================================================

            addSectionTitle(
                "Defect Details"
            );


            const pdfDefects =
                getDefects(report);


            if (
                pdfDefects.length > 0
            ) {

                pdfDefects.forEach(
                    (defect, index) => {

                        checkPage(40);

                        pdf.setFont(
                            "helvetica",
                            "bold"
                        );

                        pdf.setFontSize(10);

                        pdf.setTextColor(
                            30,
                            64,
                            175
                        );

                        pdf.text(
                            `Defect ${index + 1}`,
                            margin,
                            y
                        );

                        y += 7;


                        addTwoColumnFields(
                            "Defect Type",
                            defect.defect_type ||
                                report.defect_type,
                            "Confidence",
                            `${pdfFormatNumber(
                                defect.confidence
                            )}%`
                        );


                        addTwoColumnFields(
                            "Severity",
                            defect.severity,
                            "Defect Size",
                            getDefectSize(
                                defect
                            )
                        );


                        addSingleField(
                            "Bounding Box",
                            getBoundingBox(
                                defect
                            )
                        );


                        addSingleField(
                            "Defect Location",
                            getDefectLocation(
                                defect
                            )
                        );


                        y += 3;

                    }
                );

            }
            else {

                /*
                 * Fallback for the existing
                 * /quality-reports response.
                 */

                addTwoColumnFields(
                    "Defect Type",
                    report.defect_type ||
                        "No defect detected",
                    "Number of Defects",
                    report.number_of_defects ??
                        0
                );


                addTwoColumnFields(
                    "Severity",
                    report.severity_level,
                    "Confidence",
                    `${pdfFormatNumber(
                        report.detection_confidence
                    )}%`
                );


                if (
                    report.defect_size !==
                    undefined &&
                    report.defect_size !==
                    null
                ) {

                    addSingleField(
                        "Defect Size",
                        pdfFormatNumber(
                            report.defect_size
                        )
                    );

                }


                if (
                    report.defect_location !==
                    undefined &&
                    report.defect_location !==
                    null
                ) {

                    addSingleField(
                        "Defect Location",
                        pdfFormatNumber(
                            report.defect_location
                        )
                    );

                }

            }


            // ========================================================
            // AI ANNOTATED IMAGE
            // ========================================================

            if (
                report.result_image_path
            ) {

                try {

                    const filename =
                        String(
                            report.result_image_path
                        )
                            .split(/[\\/]/)
                            .pop();


                    const imageResponse =
                        await api.get(
                            `/inspection-image-data/${encodeURIComponent(
                                filename
                            )}`
                        );


                    const imageData =
                        imageResponse
                            .data
                            .image;


                    if (!imageData) {

                        throw new Error(
                            "Inspection image data was not returned."
                        );

                    }


                    const dimensions =
                        await new Promise(
                            (
                                resolve,
                                reject
                            ) => {

                                const img =
                                    new Image();


                                img.onload =
                                    () => {

                                        resolve({
                                            width:
                                                img.naturalWidth,

                                            height:
                                                img.naturalHeight
                                        });

                                    };


                                img.onerror =
                                    () => {

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
                        "AI Annotated Inspection Image"
                    );


                    checkPage(95);


                    const maxWidth =
                        contentWidth;

                    const maxHeight =
                        90;


                    const ratio =
                        dimensions.width /
                        dimensions.height;


                    let imageWidth =
                        maxWidth;

                    let imageHeight =
                        imageWidth /
                        ratio;


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

                }
                catch (imageError) {

                    console.error(
                        "Inspection image error:",
                        imageError
                    );


                    addSingleField(
                        "AI Annotated Image",
                        "Image could not be loaded."
                    );

                }

            }


            // ========================================================
            // RECOMMENDED ACTION
            // ========================================================

            addSectionTitle(
                "Recommended Action"
            );


            addSingleField(
                "Recommended Action",
                report.recommended_action ||
                    "No recommendation available."
            );


            // ========================================================
            // MODEL INFORMATION
            // ========================================================

            addSectionTitle(
                "Model Information"
            );


            addTwoColumnFields(
                "Model",
                report.model_name ||
                    "ResNet18 + YOLOv8s",
                "Processing Time",
                report.inspection_time !==
                null &&
                report.inspection_time !==
                undefined
                    ? `${pdfFormatNumber(
                        report.inspection_time
                    )} s`
                    : report.inspection_time !==
                      null &&
                      report.inspection_time !==
                      undefined
                        ? `${pdfFormatNumber(
                            report.inspection_time
                        )} s`
                        : "-"
            );


            addTwoColumnFields(
                "Inspection ID",
                report.inspection_id,
                "Analysis ID",
                report.analysis_id
            );


            // ========================================================
            // PDF FOOTER
            // ========================================================

            const totalPages =
                pdf.internal
                    .getNumberOfPages();


            for (
                let page = 1;
                page <= totalPages;
                page++
            ) {

                pdf.setPage(page);

                pdf.setFont(
                    "helvetica",
                    "normal"
                );

                pdf.setFontSize(8);

                pdf.setTextColor(
                    120,
                    130,
                    145
                );

                pdf.text(
                    "VisionInspectAI — Industrial Visual Inspection System",
                    margin,
                    pageHeight - 10
                );

                pdf.text(
                    `Page ${page} of ${totalPages}`,
                    pageWidth - margin,
                    pageHeight - 10,
                    {
                        align: "right"
                    }
                );

            }


            // ========================================================
            // SAVE PDF
            // ========================================================

            pdf.save(
                `Inspection_Report_${safeValue(
                    report.product_code,
                    "Product"
                )}_${safeValue(
                    report.inspection_id,
                    "Inspection"
                )}.pdf`
            );

        }
        catch (error) {

            console.error(
                "Error downloading inspection report:",
                error
            );

            setError(
                "Unable to generate the inspection report PDF."
            );

        }
        finally {

            setDownloading(false);

        }

    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="dashboard-container">

                <SupervisorSidebar />

                <div className="dashboard-main">

                    <SupervisorHeader />

                    <div className="quality-report-page">

                        <div className="report-loading">

                            Loading Inspection Reports...

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

            <SupervisorSidebar />

            <div className="dashboard-main">

                <SupervisorHeader />


                <div className="quality-report-page">


                    {/* =================================================
                        PAGE HEADER
                    ================================================= */}

                    <div className="quality-report-header">

                        <div>

                            <h1>
                                Inspection Reports
                            </h1>

                            <p>
                                Select an inspection to view
                                the complete inspection details,
                                AI results, defects, and
                                recommendation.
                            </p>

                        </div>

                    </div>


                    {/* =================================================
                        INSPECTION SELECTOR
                    ================================================= */}

                    <div className="report-selector-panel">

                        <label htmlFor="inspection-select">

                            Select Inspection

                        </label>


                        <select
                            id="inspection-select"
                            value={selectedId}
                            onChange={(e) =>
                                setSelectedId(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">

                                -- Select Inspection --

                            </option>


                            {reports.map(
                                (item) => (

                                    <option
                                        key={
                                            item.inspection_id
                                        }
                                        value={
                                            item.inspection_id
                                        }
                                    >

                                        Inspection #
                                        {
                                            item.inspection_id
                                        }

                                        {" — "}

                                        {
                                            item.product_name
                                        }

                                        {" — "}

                                        {
                                            item.product_code
                                        }

                                        {" — "}

                                        {
                                            item.pass_fail
                                        }

                                    </option>

                                )
                            )}

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
                        NO INSPECTION SELECTED
                    ================================================= */}

                    {!selectedReport &&
                        !error && (

                            <div className="report-empty">

                                <h2>
                                    Select an inspection
                                </h2>

                                <p>
                                    Choose an inspection from
                                    the dropdown above to view
                                    its complete inspection
                                    report.
                                </p>

                            </div>

                        )}


                    {/* =================================================
                        SELECTED INSPECTION REPORT
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
                                            selectedReport
                                                .product_name
                                        }
                                    </h2>

                                    <p>
                                        Inspection ID:
                                        {" "}
                                        {
                                            selectedReport
                                                .inspection_id
                                        }
                                    </p>

                                </div>


                                <div className="report-title-actions">

                                    <button
                                        className="download-report-button"
                                        onClick={
                                            downloadReport
                                        }
                                        disabled={
                                            downloading
                                        }
                                    >

                                        {
                                            downloading
                                                ? "Generating..."
                                                : "Download PDF"
                                        }

                                    </button>


                                    <div
                                        className={
                                            `report-status ${
                                                getStatusClass(
                                                    selectedReport
                                                        .pass_fail
                                                )
                                            }`
                                        }
                                    >

                                        {
                                            selectedReport
                                                .pass_fail
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
                                                selectedReport
                                                    .product_id
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Product Code
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .product_code
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Product Name
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .product_name
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Category
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .category
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Batch Number
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .batch_number
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Production Line
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .production_line
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
                                                    selectedReport
                                                        .manufacturing_date
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
                                                    selectedReport
                                                        .inspection_date
                                                )
                                            }
                                        </strong>

                                    </div>


                                </div>

                            </div>


                            {/* =================================================
                                INSPECTION INFORMATION
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    Inspection Information
                                </h3>


                                <div className="report-metrics">


                                    <div className="report-metric">

                                        <span>
                                            Inspection ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .inspection_id
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Inspection Status
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .inspection_status
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            PASS / FAIL
                                        </span>

                                        <strong
                                            className={
                                                getStatusClass(
                                                    selectedReport
                                                        .pass_fail
                                                )
                                            }
                                        >
                                            {
                                                selectedReport
                                                    .pass_fail
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Inspection Time
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport
                                                        .inspection_time
                                                )
                                            }
                                            {" "}
                                            s
                                        </strong>

                                    </div>


                                </div>

                            </div>


                            {/* =================================================
                                AI INSPECTION
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    AI Inspection
                                </h3>


                                <div className="report-metrics">


                                    <div className="report-metric">

                                        <span>
                                            Defect Type
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .defect_type ||
                                                "No defect detected"
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
                                                    selectedReport
                                                        .detection_confidence
                                                )
                                            }
                                            %
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Severity Score
                                        </span>

                                        <strong>
                                            {
                                                formatNumber(
                                                    selectedReport
                                                        .severity_score
                                                )
                                            }
                                            {" "}
                                            / 100
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Severity Level
                                        </span>

                                        <strong
                                            className={
                                                getSeverityClass(
                                                    selectedReport
                                                        .severity_level
                                                )
                                            }
                                        >
                                            {
                                                selectedReport
                                                    .severity_level ||
                                                "-"
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            Number of Defects
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .number_of_defects ??
                                                0
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-metric">

                                        <span>
                                            AI Model
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .model_name ||
                                                "ResNet18 + YOLOv8s"
                                            }
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
                                                    selectedReport
                                                        .defect_size
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
                                                    selectedReport
                                                        .defect_location
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
                                                selectedReport
                                                    .defect_type ||
                                                "None"
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
                                                    selectedReport
                                                        .detection_confidence
                                                )
                                            }
                                            %
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
                                                    selectedReport
                                                        .severity_score
                                                )
                                            }
                                            {" "}
                                            / 100
                                        </strong>

                                    </div>


                                    <div
                                        className={
                                            `severity-level ${
                                                String(
                                                    selectedReport
                                                        .severity_level ||
                                                    ""
                                                ).toLowerCase()
                                            }`
                                        }
                                    >

                                        {
                                            selectedReport
                                                .severity_level ||
                                            "-"
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


                                {
                                    getDefects(
                                        selectedReport
                                    ).length > 0
                                        ? (

                                            <div className="defect-details-list">

                                                {
                                                    getDefects(
                                                        selectedReport
                                                    ).map(
                                                        (
                                                            defect,
                                                            index
                                                        ) => (

                                                            <div
                                                                className="defect-detail-card"
                                                                key={
                                                                    defect.defect_id ||
                                                                    index
                                                                }
                                                            >

                                                                <div className="defect-detail-header">

                                                                    <strong>
                                                                        Defect #
                                                                        {
                                                                            index + 1
                                                                        }
                                                                    </strong>

                                                                    <span
                                                                        className={
                                                                            getStatusClass(
                                                                                defect.severity
                                                                            )
                                                                        }
                                                                    >
                                                                        {
                                                                            defect.severity ||
                                                                            "-"
                                                                        }
                                                                    </span>

                                                                </div>


                                                                <div className="report-grid">


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Defect Type
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                defect.defect_type ||
                                                                                "-"
                                                                            }
                                                                        </strong>

                                                                    </div>


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Confidence
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                formatNumber(
                                                                                    defect.confidence
                                                                                )
                                                                            }
                                                                            %
                                                                        </strong>

                                                                    </div>


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Severity
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                defect.severity ||
                                                                                "-"
                                                                            }
                                                                        </strong>

                                                                    </div>


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Defect Size
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                getDefectSize(
                                                                                    defect
                                                                                )
                                                                            }
                                                                        </strong>

                                                                    </div>


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Bounding Box
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                getBoundingBox(
                                                                                    defect
                                                                                )
                                                                            }
                                                                        </strong>

                                                                    </div>


                                                                    <div className="report-field">

                                                                        <span>
                                                                            Defect Location
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                getDefectLocation(
                                                                                    defect
                                                                                )
                                                                            }
                                                                        </strong>

                                                                    </div>


                                                                </div>

                                                            </div>

                                                        )
                                                    )
                                                }

                                            </div>

                                        )
                                        : (

                                            <div className="defect-details-grid">

                                                <div>

                                                    <span>
                                                        Defect Type
                                                    </span>

                                                    <strong>
                                                        {
                                                            selectedReport
                                                                .defect_type ||
                                                            "No defect detected"
                                                        }
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Number of Defects
                                                    </span>

                                                    <strong>
                                                        {
                                                            selectedReport
                                                                .number_of_defects ??
                                                            0
                                                        }
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Detection Confidence
                                                    </span>

                                                    <strong>
                                                        {
                                                            formatNumber(
                                                                selectedReport
                                                                    .detection_confidence
                                                            )
                                                        }
                                                        %
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Pass / Fail
                                                    </span>

                                                    <strong
                                                        className={
                                                            getStatusClass(
                                                                selectedReport
                                                                    .pass_fail
                                                            )
                                                        }
                                                    >
                                                        {
                                                            selectedReport
                                                                .pass_fail
                                                        }
                                                    </strong>

                                                </div>

                                            </div>

                                        )
                                }

                            </div>


                            {/* =================================================
                                AI ANNOTATED IMAGE
                            ================================================= */}

                            <div className="report-section">

                                <h3>
                                    AI Inspection Image
                                </h3>

                                <p className="section-description">

                                    Annotated image generated after
                                    AI defect detection.

                                </p>


                                {
                                    selectedReport
                                        .result_image_path
                                        ? (

                                            <div className="inspection-image-container">

                                                <img
                                                    src={
                                                        `http://localhost:8000/inspection-image/${
                                                            selectedReport
                                                                .result_image_path
                                                                .split(/[\\/]/)
                                                                .pop()
                                                        }`
                                                    }
                                                    alt="AI inspection with bounding boxes"
                                                />

                                            </div>

                                        )
                                        : (

                                            <div className="image-unavailable">

                                                Annotated inspection image
                                                unavailable.

                                            </div>

                                        )
                                }

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
                                        selectedReport
                                            .recommended_action ||
                                        "No recommendation available."
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
                                            AI Model
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .model_name ||
                                                "ResNet18 + YOLOv8s"
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Processing Time
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .inspection_time ??
                                                selectedReport
                                                    .inspection_time ??
                                                "-"
                                            }
                                            {" "}
                                            s
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Inspection ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .inspection_id
                                            }
                                        </strong>

                                    </div>


                                    <div className="report-field">

                                        <span>
                                            Analysis ID
                                        </span>

                                        <strong>
                                            {
                                                selectedReport
                                                    .analysis_id
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


export default InspectionsReports;