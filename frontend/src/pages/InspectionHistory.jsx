import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import {
    PredictionBadge,
    StatusBadge,
    ConfidenceBadge,
    SeverityBadge,
    RiskBadge,
    DecisionBadge,
} from "../components/StatusBadge";

import api, { API_URL } from "../utils/api";

import "../styles/InspectionHistory.css";

function InspectionHistory() {
    const navigate = useNavigate();

    const [history, setHistory] = useState([]);
    const [search, setSearch] = useState("");

    const [predictionFilter, setPredictionFilter] =
        useState("All");

    const [statusFilter, setStatusFilter] =
        useState("All");

    const [severityFilter, setSeverityFilter] =
        useState("All");

    const [riskFilter, setRiskFilter] =
        useState("All");

    const [decisionFilter, setDecisionFilter] =
        useState("All");

    const [categoryFilter, setCategoryFilter] =
        useState("All");

    const [sortOrder, setSortOrder] =
        useState("newest");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [showFilters, setShowFilters] =
        useState(false);

    
    const loadHistory = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await api.get("/inspection/history");

            const data =
                Array.isArray(response.data)
                    ? response.data
                    : [];

            setHistory(data);
        } catch (err) {
            console.error(
                "Failed to load inspection history:",
                err
            );

            setHistory([]);

            setError(
                err.response?.data?.detail ||
                    "Unable to load inspection history."
            );
        } finally {
            setLoading(false);
        }
    };

    
    useEffect(() => {
        let cancelled = false;

        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await api.get("/inspection/history");

                if (cancelled) {
                    return;
                }

                const data =
                    Array.isArray(response.data)
                        ? response.data
                        : [];

                setHistory(data);
            } catch (err) {
                if (cancelled) {
                    return;
                }

                console.error(
                    "Failed to load inspection history:",
                    err
                );

                setHistory([]);

                setError(
                    err.response?.data?.detail ||
                        "Unable to load inspection history."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchHistory();

        return () => {
            cancelled = true;
        };
    }, []);

    
    const categories = useMemo(() => {
        return [
            ...new Set(
                history
                    .map(
                        (item) =>
                            item.product_category
                    )
                    .filter(
                        (value) =>
                            value &&
                            value !== "Unknown" &&
                            value !== "None"
                    )
            ),
        ].sort();
    }, [history]);

    
    const filteredHistory = useMemo(() => {
        const searchValue =
            search.trim().toLowerCase();

        const filtered = history.filter((item) => {
            const filename =
                item.filename?.toLowerCase() ||
                "";

            const prediction =
                item.prediction?.toLowerCase() ||
                "";

            const productCategory =
                item.product_category?.toLowerCase() ||
                "";

            const defectCategory =
                item.defect_category?.toLowerCase() ||
                "";

            const inspectionId =
                String(item._id || "").toLowerCase();

            const matchesSearch =
                !searchValue ||
                filename.includes(searchValue) ||
                prediction.includes(searchValue) ||
                productCategory.includes(searchValue) ||
                defectCategory.includes(searchValue) ||
                inspectionId.includes(searchValue);

            const matchesPrediction =
                predictionFilter === "All" ||
                prediction ===
                    predictionFilter.toLowerCase();

            const matchesStatus =
                statusFilter === "All" ||
                item.status?.toUpperCase() ===
                    statusFilter.toUpperCase();

            const matchesSeverity =
                severityFilter === "All" ||
                item.severity?.toLowerCase() ===
                    severityFilter.toLowerCase();

            const matchesRisk =
                riskFilter === "All" ||
                item.risk_level?.toLowerCase() ===
                    riskFilter.toLowerCase();

            const matchesDecision =
                decisionFilter === "All" ||
                item.quality_decision?.toUpperCase() ===
                    decisionFilter.toUpperCase();

            const matchesCategory =
                categoryFilter === "All" ||
                item.product_category ===
                    categoryFilter;

            return (
                matchesSearch &&
                matchesPrediction &&
                matchesStatus &&
                matchesSeverity &&
                matchesRisk &&
                matchesDecision &&
                matchesCategory
            );
        });

        return [...filtered].sort((a, b) => {
            const dateA = new Date(
                a.uploaded_at || 0
            ).getTime();

            const dateB = new Date(
                b.uploaded_at || 0
            ).getTime();

            if (sortOrder === "oldest") {
                return dateA - dateB;
            }

            return dateB - dateA;
        });
    }, [
        history,
        search,
        predictionFilter,
        statusFilter,
        severityFilter,
        riskFilter,
        decisionFilter,
        categoryFilter,
        sortOrder,
    ]);

    
    const resetFilters = () => {
        setSearch("");
        setPredictionFilter("All");
        setStatusFilter("All");
        setSeverityFilter("All");
        setRiskFilter("All");
        setDecisionFilter("All");
        setCategoryFilter("All");
        setSortOrder("newest");
    };

    const hasActiveFilters =
        Boolean(search) ||
        predictionFilter !== "All" ||
        statusFilter !== "All" ||
        severityFilter !== "All" ||
        riskFilter !== "All" ||
        decisionFilter !== "All" ||
        categoryFilter !== "All";

    
    const formatDate = (date) => {
        if (!date) {
            return "Not available";
        }

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return String(date);
        }

        return parsed.toLocaleString();
    };

    
    const getInspectionId = (id) => {
        if (!id) {
            return "Not available";
        }

        return String(id)
            .slice(-8)
            .toUpperCase();
    };

    const getOutcomeTone = (item) => {
        const decision = String(item?.quality_decision || "").toLowerCase();
        const status = String(item?.status || "").toLowerCase();
        const prediction = String(item?.prediction || "").toLowerCase();

        if (
            decision.includes("fail") ||
            status.includes("fail") ||
            prediction.includes("defective")
        ) {
            return "fail";
        }

        if (
            decision.includes("warning") ||
            status.includes("warning")
        ) {
            return "warning";
        }

        if (
            decision.includes("pass") ||
            status.includes("pass") ||
            prediction.includes("normal")
        ) {
            return "pass";
        }

        return "neutral";
    };

    
    const openInspection = (item) => {
        if (!item) {
            return;
        }

        try {
            sessionStorage.setItem(
                "inspectionResult",
                JSON.stringify(item)
            );

            
            localStorage.removeItem(
                "inspectionResult"
            );

            navigate("/inspection-results");
        } catch (error) {
            console.error(
                "Unable to open inspection:",
                error
            );
        }
    };

    
    const openDefectDetails = (item) => {
        if (!item) {
            return;
        }

        try {
            sessionStorage.setItem(
                "inspectionResult",
                JSON.stringify(item)
            );

            
            localStorage.setItem(
                "inspectionResult",
                JSON.stringify(item)
            );

            navigate("/defect-details");
        } catch (error) {
            console.error(
                "Unable to open defect details:",
                error
            );
        }
    };

    
    const openReport = (item) => {
        if (!item?.report) {
            return;
        }

        const reportUrl =
            `${API_URL}/inspection/report/${encodeURIComponent(
                item.report
            )}`;

        window.open(
            reportUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };

    
    const reinspect = () => {
        sessionStorage.removeItem(
            "inspectionResult"
        );

        localStorage.removeItem(
            "inspectionResult"
        );

        navigate("/upload");
    };

    return (
        <>
            <Sidebar />

            <div className="dashboard">
                <Navbar title="Inspection History" />

                <main className="history-container">

                    {}

                    <section className="history-page-header">
                        <div>
                            <span className="history-eyebrow">
                                QUALITY ENGINEER
                            </span>

                            <h1>
                                Inspection History
                            </h1>

                            <p>
                                Review previous AI quality
                                inspections and inspection
                                decisions.
                            </p>
                        </div>

                        <div className="history-header-actions">
                            <button
                                className="history-refresh-btn"
                                onClick={loadHistory}
                                disabled={loading}
                            >
                                <span
                                    className={
                                        loading
                                            ? "refresh-symbol spinning"
                                            : "refresh-symbol"
                                    }
                                >
                                    ↻
                                </span>

                                {loading
                                    ? "Refreshing..."
                                    : "Refresh"}
                            </button>

                            <button
                                className="new-inspection-btn"
                                onClick={reinspect}
                            >
                                + New Inspection
                            </button>
                        </div>
                    </section>

                    {}

                    {error && (
                        <section className="history-state error">
                            <div className="history-state-icon">
                                !
                            </div>

                            <div>
                                <h3>
                                    Unable to load inspection history
                                </h3>

                                <p>
                                    {error}
                                </p>
                            </div>

                            <button
                                onClick={loadHistory}
                                className="history-state-action"
                            >
                                Try Again
                            </button>
                        </section>
                    )}

                    {}

                    {loading && (
                        <section className="history-state loading">
                            <div className="history-loader"></div>

                            <div>
                                <h3>
                                    Loading inspection history
                                </h3>

                                <p>
                                    Fetching the latest records.
                                </p>
                            </div>
                        </section>
                    )}

                    {!loading && !error && (
                        <>
                            {}

                            <section className="history-summary">
                                <div className="summary-item">
                                    <span>
                                        Records
                                    </span>

                                    <strong>
                                        {
                                            filteredHistory.length
                                        }
                                    </strong>
                                </div>

                                <div className="summary-item">
                                    <span>
                                        Passed
                                    </span>

                                    <strong>
                                        {
                                            filteredHistory.filter(
                                                (item) =>
                                                    item.status?.toUpperCase() ===
                                                    "PASS"
                                            ).length
                                        }
                                    </strong>
                                </div>

                                <div className="summary-item">
                                    <span>
                                        Failed
                                    </span>

                                    <strong>
                                        {
                                            filteredHistory.filter(
                                                (item) =>
                                                    item.status?.toUpperCase() ===
                                                    "FAIL"
                                            ).length
                                        }
                                    </strong>
                                </div>

                                <div className="summary-item">
                                    <span>
                                        Defective
                                    </span>

                                    <strong>
                                        {
                                            filteredHistory.filter(
                                                (item) =>
                                                    item.prediction?.toLowerCase() ===
                                                    "defective"
                                            ).length
                                        }
                                    </strong>
                                </div>
                            </section>

                            {}

                            <section className="history-toolbar">
                                <div className="history-search">
                                    <span className="search-icon">
                                        ⌕
                                    </span>

                                    <input
                                        type="text"
                                        aria-label="Search inspection history"
                                        placeholder="Search filename, ID, product or defect..."
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(
                                                e.target.value
                                            )
                                        }
                                    />

                                    {search && (
                                        <button
                                            className="clear-search"
                                            onClick={() =>
                                                setSearch("")
                                            }
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                <button
                                    className={`filter-toggle ${
                                        showFilters
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setShowFilters(
                                            !showFilters
                                        )
                                    }
                                >
                                    ⚙ Filters
                                </button>

                                <select
                                    className="sort-select"
                                    value={sortOrder}
                                    onChange={(e) =>
                                        setSortOrder(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="newest">
                                        Newest First
                                    </option>

                                    <option value="oldest">
                                        Oldest First
                                    </option>
                                </select>
                            </section>

                            {showFilters && (
                                <section className="advanced-filters">

                                    <div className="filter-field">
                                        <label>
                                            Prediction
                                        </label>

                                        <select
                                            value={
                                                predictionFilter
                                            }
                                            onChange={(e) =>
                                                setPredictionFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            <option>
                                                Normal
                                            </option>

                                            <option>
                                                Defective
                                            </option>
                                        </select>
                                    </div>

                                    <div className="filter-field">
                                        <label>
                                            Status
                                        </label>

                                        <select
                                            value={
                                                statusFilter
                                            }
                                            onChange={(e) =>
                                                setStatusFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            <option>
                                                PASS
                                            </option>

                                            <option>
                                                FAIL
                                            </option>
                                        </select>
                                    </div>

                                    <div className="filter-field">
                                        <label>
                                            Severity
                                        </label>

                                        <select
                                            value={
                                                severityFilter
                                            }
                                            onChange={(e) =>
                                                setSeverityFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            <option>
                                                Low
                                            </option>

                                            <option>
                                                Medium
                                            </option>

                                            <option>
                                                High
                                            </option>

                                            <option>
                                                Critical
                                            </option>
                                        </select>
                                    </div>

                                    <div className="filter-field">
                                        <label>
                                            Risk
                                        </label>

                                        <select
                                            value={
                                                riskFilter
                                            }
                                            onChange={(e) =>
                                                setRiskFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            <option>
                                                Low
                                            </option>

                                            <option>
                                                Medium
                                            </option>

                                            <option>
                                                High
                                            </option>
                                        </select>
                                    </div>

                                    <div className="filter-field">
                                        <label>
                                            Quality Decision
                                        </label>

                                        <select
                                            value={
                                                decisionFilter
                                            }
                                            onChange={(e) =>
                                                setDecisionFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            <option>
                                                PASS
                                            </option>

                                            <option>
                                                WARNING
                                            </option>

                                            <option>
                                                FAIL
                                            </option>
                                        </select>
                                    </div>

                                    <div className="filter-field">
                                        <label>
                                            Product Category
                                        </label>

                                        <select
                                            value={
                                                categoryFilter
                                            }
                                            onChange={(e) =>
                                                setCategoryFilter(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option>
                                                All
                                            </option>

                                            {categories.map(
                                                (category) => (
                                                    <option
                                                        key={
                                                            category
                                                        }
                                                        value={
                                                            category
                                                        }
                                                    >
                                                        {
                                                            category
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    {hasActiveFilters && (
                                        <button
                                            className="reset-filters"
                                            onClick={
                                                resetFilters
                                            }
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </section>
                            )}

                            {}

                            <section className="history-card">
                                <div className="table-header">
                                    <div>
                                        <span className="table-eyebrow">
                                            INSPECTION RECORDS
                                        </span>

                                        <h2>
                                            Quality Inspection Log
                                        </h2>
                                    </div>

                                    <span className="record-count">
                                        {
                                            filteredHistory.length
                                        }{" "}
                                        record
                                        {filteredHistory.length !==
                                        1
                                            ? "s"
                                            : ""}
                                    </span>
                                </div>

                                {history.length === 0 ? (
                                    <div className="history-empty">
                                        <div className="empty-icon">
                                            —
                                        </div>

                                        <h3>
                                            No inspections available
                                        </h3>

                                        <p>
                                            Completed inspections
                                            will appear here.
                                        </p>

                                        <button
                                            onClick={
                                                reinspect
                                            }
                                            className="empty-action"
                                        >
                                            Start Inspection
                                        </button>
                                    </div>
                                ) : filteredHistory.length ===
                                  0 ? (
                                    <div className="history-empty">
                                        <div className="empty-icon">
                                            ⌕
                                        </div>

                                        <h3>
                                            No matching inspections
                                        </h3>

                                        <p>
                                            Try changing your
                                            search or filters.
                                        </p>

                                        <button
                                            onClick={
                                                resetFilters
                                            }
                                            className="empty-action"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table className="inspection-table">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        Inspection
                                                    </th>

                                                    <th>
                                                        Product
                                                    </th>

                                                    <th>
                                                        Result
                                                    </th>

                                                    <th>
                                                        Defect
                                                    </th>

                                                    <th>
                                                        Confidence
                                                    </th>

                                                    <th>
                                                        Severity
                                                    </th>

                                                    <th>
                                                        Risk
                                                    </th>

                                                    <th>
                                                        Decision
                                                    </th>

                                                    <th>
                                                        Date
                                                    </th>

                                                    <th>
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredHistory.map(
                                                    (item) => {
                                                        const isDefective =
                                                            item.prediction?.toLowerCase() ===
                                                            "defective";
                                                        const outcomeTone =
                                                            getOutcomeTone(item);

                                                        return (
                                                            <tr
                                                                key={
                                                                    item._id ||
                                                                    item.inspection_id ||
                                                                    item.filename
                                                                }
                                                            >
                                                                <td>
                                                                    <div className="inspection-id">
                                                                        #
                                                                        {getInspectionId(
                                                                            item._id ||
                                                                                item.inspection_id
                                                                        )}
                                                                    </div>

                                                                    <div className="inspection-file">
                                                                        {item.filename ||
                                                                            "Not available"}
                                                                    </div>
                                                                </td>

                                                                <td>
                                                                    <span className="category-name">
                                                                        {item.product_category &&
                                                                        item.product_category !==
                                                                            "Unknown"
                                                                            ? item.product_category
                                                                            : "Not available"}
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    <div
                                                                        className={`result-stack inspection-outcome ${outcomeTone}`}
                                                                    >
                                                                        <span className="outcome-indicator">
                                                                            <span className="outcome-dot" />
                                                                            {outcomeTone === "pass"
                                                                                ? "PASS"
                                                                                : outcomeTone === "fail"
                                                                                    ? "FAIL"
                                                                                    : outcomeTone === "warning"
                                                                                        ? "WARNING"
                                                                                        : "PENDING"}
                                                                        </span>

                                                                        <div className="outcome-badges">
                                                                            <PredictionBadge
                                                                                value={
                                                                                    item.prediction
                                                                                }
                                                                            />

                                                                            <StatusBadge
                                                                                value={
                                                                                    item.status
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td>
                                                                    {isDefective ? (
                                                                        <div className="defect-cell">
                                                                            <strong>
                                                                                {item.defect_category ||
                                                                                    "Not available"}
                                                                            </strong>

                                                                            {item.defect_confidence !==
                                                                                undefined &&
                                                                                item.defect_confidence !==
                                                                                    null && (
                                                                                    <small>
                                                                                        {
                                                                                            item.defect_confidence
                                                                                        }
                                                                                        %
                                                                                    </small>
                                                                                )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="muted">
                                                                            No
                                                                            defect
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    <ConfidenceBadge
                                                                        value={
                                                                            item.confidence
                                                                        }
                                                                    />
                                                                </td>

                                                                <td>
                                                                    <SeverityBadge
                                                                        value={
                                                                            item.severity
                                                                        }
                                                                    />
                                                                </td>

                                                                <td>
                                                                    <RiskBadge
                                                                        value={
                                                                            item.risk_level
                                                                        }
                                                                    />
                                                                </td>

                                                                <td>
                                                                    <div className={`decision-signal ${outcomeTone}`}>
                                                                        <DecisionBadge
                                                                            value={
                                                                                item.quality_decision
                                                                            }
                                                                        />
                                                                    </div>
                                                                </td>

                                                                <td>
                                                                    <span className="date-cell">
                                                                        {formatDate(
                                                                            item.uploaded_at ??
                                                                            item.created_at ??
                                                                            item.inspection_date ??
                                                                            item.timestamp ??
                                                                            item.date
                                                                        )}
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    <div className="row-actions">

                                                                        <button
                                                                            className="row-action view"
                                                                            title="View inspection"
                                                                             aria-label="View inspection"
                                                                            onClick={() =>
                                                                                openInspection(
                                                                                    item
                                                                                )
                                                                            }
                                                                        >
                                                                            View
                                                                        </button>

                                                                        {isDefective && (
                                                                            <button
                                                                                className="row-action details"
                                                                                title="View defect details"
                                                                                 aria-label="View defect details"
                                                                                onClick={() =>
                                                                                    openDefectDetails(
                                                                                        item
                                                                                    )
                                                                                }
                                                                            >
                                                                                Defect
                                                                            </button>
                                                                        )}

                                                                        {item.report && (
                                                                            <button
                                                                                className="row-action report"
                                                                                title="Open report"
                                                                                 aria-label="Open report"
                                                                                onClick={() =>
                                                                                    openReport(
                                                                                        item
                                                                                    )
                                                                                }
                                                                            >
                                                                                PDF
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

export default InspectionHistory;