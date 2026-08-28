import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";

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
                                                selectedReport.processing_time ??
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