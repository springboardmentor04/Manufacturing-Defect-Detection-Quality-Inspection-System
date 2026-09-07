import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import {
    StatusBadge,
    DecisionBadge,
    SeverityBadge,
    RiskBadge,
    PredictionBadge,
    ConfidenceBadge,
} from "../components/StatusBadge";

import "../styles/InspectionResults.css";
import api from "../utils/api";

function getSavedInspectionResult() {
    try {
        const sessionResult =
            sessionStorage.getItem("inspectionResult");

        const localResult =
            localStorage.getItem("inspectionResult");

        const savedResult =
            sessionResult || localResult;

        if (!savedResult) {
            return null;
        }

        return JSON.parse(savedResult);
    } catch (error) {
        console.error(
            "Inspection result loading error:",
            error
        );

        return null;
    }
}

function formatInspectionDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatConfidence(value) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return Number(value).toFixed(2);
}

function InspectionResults() {
    const navigate = useNavigate();

    const [result, setResult] = useState(
        getSavedInspectionResult
    );

    const [imageUrl, setImageUrl] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;

        const loadImage = async () => {
            if (!result?.filename) {
                setImageError(true);
                return;
            }

            try {
                setImageError(false);

                const response = await api.get(
                    `/inspection/image/${encodeURIComponent(
                        result.filename
                    )}`,
                    {
                        responseType: "blob",
                    }
                );

                if (
                    !response.data ||
                    response.data.size === 0
                ) {
                    throw new Error(
                        "The inspection image is empty."
                    );
                }

                objectUrl =
                    window.URL.createObjectURL(
                        response.data
                    );

                if (!cancelled) {
                    setImageUrl(objectUrl);
                }
            } catch (error) {
                console.error(
                    "Inspection image loading error:",
                    error
                );

                if (!cancelled) {
                    setImageError(true);
                    setImageUrl(null);
                }
            }
        };

        loadImage();

        return () => {
            cancelled = true;

            if (objectUrl) {
                window.URL.revokeObjectURL(
                    objectUrl
                );
            }
        };
    }, [result]);

    const normalized = useMemo(() => {
        if (!result) {
            return null;
        }

        const prediction =
            result.prediction || "Not available";

        const status =
            result.status || "Not available";

        const confidence =
            result.confidence !== undefined &&
            result.confidence !== null
                ? Number(result.confidence)
                : null;

        const productCategory =
            result.product_category ||
            "Not available";

        const categoryConfidence =
            result.category_confidence !== undefined &&
            result.category_confidence !== null
                ? Number(result.category_confidence)
                : null;

        const defectCategory =
            result.defect_category ||
            (prediction.toLowerCase() === "normal"
                ? "None"
                : "Not available");

        const defectConfidence =
            result.defect_confidence !== undefined &&
            result.defect_confidence !== null
                ? Number(result.defect_confidence)
                : null;

        const severity =
            result.severity || "Not available";

        const severityScore =
            result.severity_score !== undefined &&
            result.severity_score !== null
                ? Number(result.severity_score)
                : null;

        const riskLevel =
            result.risk_level ||
            "Not available";

        const qualityDecision =
            result.quality_decision ||
            "Not available";

        const recommendation =
            result.recommendation ||
            "No recommendation available.";

        const predictionLower =
            prediction.toLowerCase();

        const statusLower =
            status.toLowerCase();

        const isNormal =
            predictionLower === "normal";

        const isDefective =
            predictionLower === "defective";

        const isPassed =
            statusLower === "pass";

        const imageFilename =
            result.filename || null;

        const reportFilename =
            result.report || null;

        const inspectionDate =
            formatInspectionDate(
                result.uploaded_at ||
                    result.created_at ||
                    result.inspection_date ||
                    result.timestamp ||
                    result.date
            );

        return {
            prediction,
            status,
            confidence,
            productCategory,
            categoryConfidence,
            defectCategory,
            defectConfidence,
            severity,
            severityScore,
            riskLevel,
            qualityDecision,
            recommendation,
            isNormal,
            isDefective,
            isPassed,
            imageFilename,
            reportFilename,
            inspectionDate,
        };
    }, [result]);

    const clearResultAndStartNew = () => {
        sessionStorage.removeItem(
            "inspectionResult"
        );

        localStorage.removeItem(
            "inspectionResult"
        );

        setResult(null);

        navigate("/upload");
    };

    const openReport = async () => {
        if (
            !normalized?.reportFilename ||
            reportLoading
        ) {
            return;
        }

        const reportWindow = window.open(
            "",
            "_blank"
        );

        if (!reportWindow) {
            window.alert(
                "Please allow pop-ups to view the inspection report."
            );

            return;
        }

        reportWindow.document.title =
            "VisionInspect AI Report";

        reportWindow.document.body.innerHTML = `
            <div style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#05080a;
                color:#dce8ed;
                font-family:Arial,sans-serif;
            ">
                <div style="text-align:center;">
                    <div style="
                        width:34px;
                        height:34px;
                        margin:0 auto 16px;
                        border:3px solid #1d303a;
                        border-top-color:#00aeff;
                        border-radius:50%;
                        animation:spin 0.8s linear infinite;
                    "></div>

                    <strong>
                        Loading inspection report...
                    </strong>
                </div>
            </div>

            <style>
                @keyframes spin {
                    to {
                        transform:rotate(360deg);
                    }
                }
            </style>
        `;

        try {
            setReportLoading(true);

            const response = await api.get(
                `/inspection/report/${encodeURIComponent(
                    normalized.reportFilename
                )}`,
                {
                    responseType: "blob",
                }
            );

            if (
                !response.data ||
                response.data.size === 0
            ) {
                throw new Error(
                    "The inspection report is empty."
                );
            }

            const blobUrl =
                window.URL.createObjectURL(
                    response.data
                );

            reportWindow.location.href = blobUrl;

            window.setTimeout(() => {
                window.URL.revokeObjectURL(
                    blobUrl
                );
            }, 60000);
        } catch (error) {
            console.error(
                "Report open error:",
                error
            );

            reportWindow.close();

            window.alert(
                error?.response?.data?.detail ||
                    error?.message ||
                    "Unable to open the inspection report."
            );
        } finally {
            setReportLoading(false);
        }
    };

    const viewDefectDetails = () => {
        if (!result) {
            return;
        }

        sessionStorage.setItem(
            "inspectionResult",
            JSON.stringify(result)
        );

        localStorage.setItem(
            "inspectionResult",
            JSON.stringify(result)
        );

        navigate("/defect-details");
    };

    if (!result || !normalized) {
        return (
            <>
                <Sidebar />

                <div className="dashboard">
                    <Navbar title="Inspection Results" />

                    <main className="results-container">
                        <section className="result-state-card">
                            <div className="result-state-icon">
                                !
                            </div>

                            <span className="results-eyebrow">
                                QUALITY ENGINEER
                            </span>

                            <h1>
                                No Inspection Result
                            </h1>

                            <p>
                                Complete an AI inspection
                                before viewing inspection
                                results.
                            </p>

                            <button
                                type="button"
                                className="result-primary-btn"
                                onClick={() =>
                                    navigate("/upload")
                                }
                            >
                                New Inspection
                            </button>
                        </section>
                    </main>
                </div>
            </>
        );
    }

    const confidenceValue =
        normalized.confidence !== null &&
        Number.isFinite(normalized.confidence)
            ? Math.min(
                  Math.max(
                      normalized.confidence,
                      0
                  ),
                  100
              )
            : 0;

    const categoryConfidenceText =
        formatConfidence(
            normalized.categoryConfidence
        );

    const defectConfidenceText =
        formatConfidence(
            normalized.defectConfidence
        );

    const severityScoreText =
        normalized.severityScore !== null &&
        Number.isFinite(normalized.severityScore)
            ? normalized.severityScore.toFixed(2)
            : "N/A";

    return (
        <>
            <Sidebar />

            <div className="dashboard">
                <Navbar title="Inspection Results" />

                <main className="results-container">

                    {/* PAGE HEADER */}
                    <section className="results-page-header">
                        <div className="results-title-block">
                            <span className="results-eyebrow">
                                QUALITY ENGINEER
                            </span>

                            <h1>
                                Inspection Results
                            </h1>

                            <p>
                                AI-powered quality assessment
                                for the inspected product.
                            </p>
                        </div>

                        <div className="results-header-actions">
                            {normalized.reportFilename && (
                                <button
                                    type="button"
                                    className="result-secondary-btn"
                                    onClick={openReport}
                                    disabled={
                                        reportLoading
                                    }
                                >
                                    {reportLoading
                                        ? "Opening..."
                                        : "View Report"}
                                </button>
                            )}

                            <button
                                type="button"
                                className="result-primary-btn"
                                onClick={
                                    clearResultAndStartNew
                                }
                            >
                                + New Inspection
                            </button>
                        </div>
                    </section>

                    {/* RESULT HERO */}
                    <section
                        className={`result-hero ${
                            normalized.isPassed
                                ? "result-pass"
                                : "result-fail"
                        }`}
                    >
                        <div className="result-hero-main">
                            <div className="result-status-icon">
                                {normalized.isPassed
                                    ? "✓"
                                    : "!"}
                            </div>

                            <div className="result-hero-content">
                                <span className="result-hero-label">
                                    QUALITY DECISION
                                </span>

                                <h2>
                                    {normalized.isPassed
                                        ? "PASSED"
                                        : "FAILED"}
                                </h2>

                                <p>
                                    {normalized.isNormal
                                        ? "No defect was detected by the current AI inspection."
                                        : normalized.isDefective
                                        ? "A defective product was detected by the AI inspection system."
                                        : "The inspection result is available for review."}
                                </p>
                            </div>
                        </div>

                        <div className="result-hero-badges">
                            <StatusBadge
                                value={
                                    normalized.status
                                }
                            />

                            <PredictionBadge
                                value={
                                    normalized.prediction
                                }
                            />
                        </div>
                    </section>

                    {/* IMAGE + OVERVIEW */}
                    <section className="result-main-grid">

                        {/* IMAGE */}
                        <article className="result-image-card">
                            <div className="result-card-header">
                                <div>
                                    <span className="result-card-eyebrow">
                                        INSPECTION IMAGE
                                    </span>

                                    <h2>
                                        Product Image
                                    </h2>
                                </div>

                                <span className="image-live-indicator">
                                    AI INPUT
                                </span>
                            </div>

                            <div className="result-image-wrapper">
                                {imageUrl &&
                                !imageError ? (
                                    <img
                                        src={imageUrl}
                                        alt="Inspected product"
                                        className="result-product-image"
                                    />
                                ) : (
                                    <div className="image-unavailable">
                                        <div className="image-unavailable-icon">
                                            !
                                        </div>

                                        <strong>
                                            Image unavailable
                                        </strong>

                                        <p>
                                            The inspection
                                            result is still
                                            available.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="image-meta">
                                <span>
                                    Filename
                                </span>

                                <strong
                                    title={
                                        result.filename ||
                                        ""
                                    }
                                >
                                    {result.filename ||
                                        "Not available"}
                                </strong>
                            </div>
                        </article>

                        {/* OVERVIEW */}
                        <article className="result-overview-card">
                            <div className="result-card-header">
                                <div>
                                    <span className="result-card-eyebrow">
                                        AI CLASSIFICATION
                                    </span>

                                    <h2>
                                        Detection Overview
                                    </h2>
                                </div>
                            </div>

                            <div className="overview-result">
                                <div>
                                    <span className="overview-label">
                                        Prediction
                                    </span>

                                    <strong
                                        className={`overview-prediction ${
                                            normalized.isDefective
                                                ? "is-defective"
                                                : "is-normal"
                                        }`}
                                    >
                                        {
                                            normalized.prediction
                                        }
                                    </strong>
                                </div>

                                <PredictionBadge
                                    value={
                                        normalized.prediction
                                    }
                                />
                            </div>

                            <div className="overview-confidence">
                                <div className="overview-confidence-header">
                                    <span>
                                        Detection Confidence
                                    </span>

                                    <ConfidenceBadge
                                        value={
                                            normalized.confidence
                                        }
                                    />
                                </div>

                                <div className="confidence-bar">
                                    <div
                                        className="confidence-bar-fill"
                                        style={{
                                            width: `${confidenceValue}%`,
                                        }}
                                    />
                                </div>

                                <div className="confidence-scale">
                                    <span>
                                        0%
                                    </span>

                                    <span>
                                        100%
                                    </span>
                                </div>
                            </div>

                            <div className="overview-grid">
                                <div className="overview-item">
                                    <span>
                                        Product Category
                                    </span>

                                    <strong>
                                        {
                                            normalized.productCategory
                                        }
                                    </strong>

                                    {categoryConfidenceText && (
                                        <small>
                                            {
                                                categoryConfidenceText
                                            }
                                            % confidence
                                        </small>
                                    )}
                                </div>

                                <div className="overview-item">
                                    <span>
                                        Defect Category
                                    </span>

                                    <strong>
                                        {
                                            normalized.defectCategory
                                        }
                                    </strong>

                                    {defectConfidenceText && (
                                        <small>
                                            {
                                                defectConfidenceText
                                            }
                                            % confidence
                                        </small>
                                    )}
                                </div>
                            </div>
                        </article>
                    </section>

                    {/* QUALITY ASSESSMENT */}
                    <section className="quality-assessment-card">
                        <div className="result-card-header">
                            <div>
                                <span className="result-card-eyebrow">
                                    QUALITY ASSESSMENT
                                </span>

                                <h2>
                                    Inspection Decision
                                </h2>
                            </div>
                        </div>

                        <div className="assessment-grid">

                            <div className="assessment-item">
                                <span>
                                    Severity
                                </span>

                                <SeverityBadge
                                    value={
                                        normalized.severity
                                    }
                                />
                            </div>

                            <div className="assessment-item">
                                <span>
                                    Severity Score
                                </span>

                                <div className="severity-score-display">
                                    <strong>
                                        {
                                            severityScoreText
                                        }
                                    </strong>

                                    <span>
                                        / 100
                                    </span>
                                </div>
                            </div>

                            <div className="assessment-item">
                                <span>
                                    Risk Level
                                </span>

                                <RiskBadge
                                    value={
                                        normalized.riskLevel
                                    }
                                />
                            </div>

                            <div className="assessment-item">
                                <span>
                                    Quality Decision
                                </span>

                                <DecisionBadge
                                    value={
                                        normalized.qualityDecision
                                    }
                                />
                            </div>

                        </div>
                    </section>

                    {/* METADATA */}
                    <section className="inspection-information-card">
                        <div className="result-card-header">
                            <div>
                                <span className="result-card-eyebrow">
                                    INSPECTION INFORMATION
                                </span>

                                <h2>
                                    Inspection Metadata
                                </h2>
                            </div>
                        </div>

                        <div className="metadata-grid">

                            <div className="metadata-item">
                                <span>
                                    Inspection ID
                                </span>

                                <strong>
                                    {result.inspection_id ||
                                        "Not available"}
                                </strong>
                            </div>

                            <div className="metadata-item">
                                <span>
                                    Filename
                                </span>

                                <strong>
                                    {result.filename ||
                                        "Not available"}
                                </strong>
                            </div>

                            <div className="metadata-item">
                                <span>
                                    Category Type
                                </span>

                                <strong>
                                    {result.category_type ||
                                        "Not available"}
                                </strong>
                            </div>

                            <div className="metadata-item">
                                <span>
                                    Inspection Date
                                </span>

                                <strong>
                                    {normalized.inspectionDate ||
                                        "Not available"}
                                </strong>
                            </div>

                            <div className="metadata-item">
                                <span>
                                    AI Model
                                </span>

                                <strong>
                                    ResNet18 AI
                                </strong>
                            </div>

                            <div className="metadata-item">
                                <span>
                                    Classification
                                </span>

                                <strong>
                                    Normal / Defective
                                </strong>
                            </div>

                        </div>
                    </section>

                    {/* RECOMMENDATION */}
                    <section
                        className={`recommendation-card ${
                            normalized.isDefective
                                ? "recommendation-warning"
                                : "recommendation-success"
                        }`}
                    >
                        <div className="recommendation-icon">
                            {normalized.isDefective
                                ? "!"
                                : "✓"}
                        </div>

                        <div className="recommendation-content">
                            <span>
                                QUALITY RECOMMENDATION
                            </span>

                            <h2>
                                Recommended Action
                            </h2>

                            <p>
                                {
                                    normalized.recommendation
                                }
                            </p>
                        </div>
                    </section>

                    {/* LOCALIZATION */}
                    {normalized.isDefective && (
                        <section className="localization-notice">
                            <div className="localization-icon">
                                i
                            </div>

                            <div>
                                <h3>
                                    Defect Localization
                                </h3>

                                <p>
                                    Defect localization or
                                    bounding-box coordinates
                                    are not available from
                                    the current AI inspection
                                    pipeline. The result page
                                    therefore does not display
                                    an artificial defect
                                    location.
                                </p>
                            </div>
                        </section>
                    )}

                    {/* ACTIONS */}
                    <section className="result-actions">

                        <button
                            type="button"
                            className="result-secondary-btn"
                            onClick={() =>
                                navigate(
                                    "/inspection-history"
                                )
                            }
                        >
                            View Inspection History
                        </button>

                        {normalized.isDefective && (
                            <button
                                type="button"
                                className="result-secondary-btn"
                                onClick={
                                    viewDefectDetails
                                }
                            >
                                View Defect Details
                            </button>
                        )}

                        {normalized.reportFilename && (
                            <button
                                type="button"
                                className="result-primary-btn"
                                onClick={openReport}
                                disabled={
                                    reportLoading
                                }
                            >
                                {reportLoading
                                    ? "Opening..."
                                    : "Open Quality Report"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="result-primary-btn"
                            onClick={
                                clearResultAndStartNew
                            }
                        >
                            Inspect Another Product
                        </button>

                    </section>

                </main>
            </div>
        </>
    );
}

export default InspectionResults;