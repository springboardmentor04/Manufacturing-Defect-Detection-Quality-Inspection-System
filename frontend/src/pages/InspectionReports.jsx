import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/InspectionReports.css";

function InspectionReports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] =
    useState("All");
  const [predictionFilter, setPredictionFilter] =
    useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/inspection/history"
        );

        setReports(
          Array.isArray(response.data)
            ? response.data
            : []
        );
        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "Failed to load inspection reports:",
          err
        );

        setReports([]);

        setError(
          err?.response?.data?.detail ||
            "Unable to load inspection reports from the inspection service."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadReports();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadReports]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      void loadReports(true);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, loadReports]);

  const summary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let defective = 0;
    let normal = 0;
    let warnings = 0;
    let confidenceTotal = 0;
    let confidenceCount = 0;

    reports.forEach((report) => {
      const prediction = String(
        report?.prediction || ""
      ).toLowerCase();

      const decision = String(
        report?.quality_decision || ""
      ).toUpperCase();

      if (prediction === "normal") {
        normal += 1;
      }

      if (prediction === "defective") {
        defective += 1;
      }

      if (decision === "PASS") {
        passed += 1;
      }

      if (decision === "FAIL") {
        failed += 1;
      }

      if (decision === "WARNING") {
        warnings += 1;
      }

      const confidence = Number(
        report?.confidence
      );

      if (Number.isFinite(confidence)) {
        confidenceTotal += confidence;
        confidenceCount += 1;
      }
    });

    return {
      total: reports.length,
      passed,
      failed,
      warnings,
      defective,
      normal,
      averageConfidence:
        confidenceCount > 0
          ? confidenceTotal / confidenceCount
          : 0,
      passRate:
        reports.length > 0
          ? (passed / reports.length) * 100
          : 0,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return reports.filter((report) => {
      const inspectionId = String(
        report?._id || ""
      ).toLowerCase();

      const filename = String(
        report?.filename || ""
      ).toLowerCase();

      const prediction = String(
        report?.prediction || ""
      );

      const defectCategory = String(
        report?.defect_category || ""
      ).toLowerCase();

      const decision = String(
        report?.quality_decision || ""
      ).toUpperCase();

      const matchesSearch =
        !query ||
        inspectionId.includes(query) ||
        filename.includes(query) ||
        prediction
          .toLowerCase()
          .includes(query) ||
        defectCategory.includes(query);

      const matchesDecision =
        decisionFilter === "All" ||
        decision === decisionFilter;

      const matchesPrediction =
        predictionFilter === "All" ||
        prediction === predictionFilter;

      return (
        matchesSearch &&
        matchesDecision &&
        matchesPrediction
      );
    });
  }, [
    reports,
    search,
    decisionFilter,
    predictionFilter,
  ]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return (
      <>
        <span className="report-date">
          {date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>

        <span className="report-time">
          {date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </>
    );
  };

  const formatUpdated = (value) => {
    if (!value) return "Not synced yet";
    return value.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskClass = (risk) => {
    const value = String(risk || "").toLowerCase();
    if (value.includes("high")) return "report-risk-high";
    if (value.includes("medium") || value.includes("moderate")) return "report-risk-warning";
    if (value.includes("low")) return "report-risk-low";
    return "report-risk-neutral";
  };

  const getDecisionClass = (decision) => {
    const value = String(
      decision || ""
    ).toUpperCase();

    if (value === "PASS") {
      return "report-decision-pass";
    }

    if (value === "FAIL") {
      return "report-decision-fail";
    }

    if (value === "WARNING") {
      return "report-decision-warning";
    }

    return "report-decision-neutral";
  };

  const getPredictionClass = (prediction) => {
    const value = String(
      prediction || ""
    ).toLowerCase();

    if (value === "normal") {
      return "report-prediction-normal";
    }

    if (value === "defective") {
      return "report-prediction-defective";
    }

    return "report-prediction-neutral";
  };

  const openReport = async (report) => {
    const filename =
      report?.report ||
      (report?.filename
        ? `${report.filename}.pdf`
        : null);

    if (!filename) {
      window.alert(
        "No generated PDF report is available for this inspection."
      );
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
        font-family: Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
      ">
        <p>Loading inspection report...</p>
      </div>
    `;

    try {
      const response = await api.get(
        `/inspection/report/${encodeURIComponent(
          filename
        )}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            response.headers?.[
              "content-type"
            ] || "application/pdf",
        }
      );

      const reportUrl =
        URL.createObjectURL(blob);

      reportWindow.location.href =
        reportUrl;

      window.setTimeout(() => {
        URL.revokeObjectURL(reportUrl);
      }, 60000);
    } catch (err) {
      console.error(
        "Failed to open inspection report:",
        err
      );

      reportWindow.close();

      window.alert(
        err?.response?.status === 401
          ? "Your session has expired. Please log in again."
          : err?.response?.data?.detail ||
              "Unable to open the inspection report."
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDecisionFilter("All");
    setPredictionFilter("All");
  };

  const exportCSV = () => {
    if (filteredReports.length === 0) {
      window.alert(
        "There are no inspection records to export."
      );
      return;
    }

    const headers = [
      "Inspection ID",
      "Filename",
      "Prediction",
      "Status",
      "Confidence",
      "Defect Category",
      "Severity",
      "Severity Score",
      "Risk",
      "Quality Decision",
      "Inspection Date",
    ];

    const escapeCSV = (value) => {
      const text = String(
        value ?? ""
      ).replace(/"/g, '""');

      return `"${text}"`;
    };

    const rows = filteredReports.map(
      (report) =>
        [
          report?._id || "",
          report?.filename || "",
          report?.prediction || "",
          report?.status || "",
          report?.confidence ?? "",
          report?.defect_category || "",
          report?.severity || "",
          report?.severity_score ?? "",
          report?.risk_level || "",
          report?.quality_decision || "",
          report?.uploaded_at || "",
        ]
          .map(escapeCSV)
          .join(",")
    );

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows,
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `visioninspect-quality-reports-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <SidebarSupervisor />

        <div className="dashboard">
          <Navbar title="Inspection Reports" />

          <main className="inspection-reports-container">
            <div className="inspection-reports-loading">
              <RefreshCw
                size={27}
                className="inspection-report-spin"
              />

              <h3>
                Loading Inspection Reports
              </h3>

              <p>
                Retrieving real production
                inspection records from
                VisionInspect AI.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SidebarSupervisor />

      <div className="dashboard">
        <Navbar title="Inspection Reports" />

        <main className="inspection-reports-container">
          <header className="inspection-reports-header">
            <div>
              <span className="inspection-reports-eyebrow">
                MANUFACTURING ANALYTICS
              </span>

              <h1>
                Production Quality Reports
              </h1>

              <p>
                Centralized inspection records
                and production quality reporting
                from completed AI inspections.
              </p>
            </div>

            <div className="inspection-report-header-actions">
              <span className="inspection-report-live-pill">
                <span className="live-dot" />
                REPORTS LIVE
              </span>
              <button
                className="inspection-report-secondary-btn"
                onClick={() =>
                  loadReports(true)
                }
                disabled={refreshing}
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? "inspection-report-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <button
                type="button"
                className={`inspection-auto-refresh ${autoRefresh ? "active" : ""}`}
                onClick={() => setAutoRefresh((value) => !value)}
                aria-pressed={autoRefresh}
                title="Refresh inspection reports every 60 seconds"
              >
                <span className="auto-refresh-indicator" />
                Auto
              </button>

              <button
                className="inspection-report-primary-btn"
                onClick={exportCSV}
              >
                <Download size={15} />

                Export CSV
              </button>
            </div>
          </header>

          {error && (
            <div className="inspection-reports-error">
              <ShieldAlert size={17} />

              <p>{error}</p>

              <button
                onClick={() =>
                  loadReports(true)
                }
              >
                Retry
              </button>
            </div>
          )}

          <section className="inspection-report-command-strip">
            <div className="command-strip-main">
              <div className="command-strip-icon">
                <Gauge size={17} />
              </div>
              <div>
                <span>QUALITY REPORT CENTER</span>
                <strong>Inspection records are ready for operational review.</strong>
              </div>
            </div>
            <div className="command-strip-meta">
              <div>
                <span>LAST SYNC</span>
                <strong>{formatUpdated(lastUpdated)}</strong>
              </div>
              <div>
                <span>VISIBLE</span>
                <strong>{filteredReports.length}/{summary.total}</strong>
              </div>
              <div>
                <span>AVG AI CONFIDENCE</span>
                <strong>{summary.averageConfidence.toFixed(1)}%</strong>
              </div>
            </div>
          </section>

          <section className="inspection-report-summary">
            <div className="inspection-summary-card summary-blue">
              <div className="inspection-summary-icon">
                <FileText size={19} />
              </div>

              <div>
                <span>
                  Total Inspections
                </span>

                <strong>
                  {summary.total}
                </strong>
              </div>
            </div>

            <div className="inspection-summary-card summary-green">
              <div className="inspection-summary-icon">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <span>Passed</span>

                <strong>
                  {summary.passed}
                </strong>
              </div>
            </div>

            <div className="inspection-summary-card summary-red">
              <div className="inspection-summary-icon">
                <XCircle size={19} />
              </div>

              <div>
                <span>Failed</span>

                <strong>
                  {summary.failed}
                </strong>
              </div>
            </div>

            <div className="inspection-summary-card summary-amber">
              <div className="inspection-summary-icon">
                <ShieldAlert size={19} />
              </div>

              <div>
                <span>Pass Rate</span>

                <strong>
                  {summary.passRate.toFixed(
                    1
                  )}
                  %
                </strong>
              </div>
            </div>
          </section>

          <section className="production-quality-card">
            <div className="production-quality-heading">
              <div>
                <span className="inspection-reports-eyebrow">
                  PRODUCTION QUALITY
                </span>

                <h2>
                  Current Quality Snapshot
                </h2>
              </div>

              <span className="production-quality-records">
                {summary.total} recorded
                inspection
                {summary.total === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="production-quality-grid">
              <div className="quality-metric">
                <span>
                  Normal Products
                </span>

                <div className="quality-metric-value">
                  <strong>
                    {summary.normal}
                  </strong>

                  <span>
                    {summary.total > 0
                      ? `${(
                          (summary.normal /
                            summary.total) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>

                <div className="quality-meter">
                  <div
                    className="meter-normal"
                    style={{
                      width:
                        summary.total > 0
                          ? `${(
                              (summary.normal /
                                summary.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="quality-metric">
                <span>
                  Defective Products
                </span>

                <div className="quality-metric-value">
                  <strong>
                    {summary.defective}
                  </strong>

                  <span>
                    {summary.total > 0
                      ? `${(
                          (summary.defective /
                            summary.total) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>

                <div className="quality-meter">
                  <div
                    className="meter-defective"
                    style={{
                      width:
                        summary.total > 0
                          ? `${(
                              (summary.defective /
                                summary.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="quality-metric">
                <span>
                  Warning Decisions
                </span>

                <div className="quality-metric-value">
                  <strong>
                    {summary.warnings}
                  </strong>

                  <span>
                    {summary.total > 0
                      ? `${(
                          (summary.warnings /
                            summary.total) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>

                <div className="quality-meter">
                  <div
                    className="meter-warning"
                    style={{
                      width:
                        summary.total > 0
                          ? `${(
                              (summary.warnings /
                                summary.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="quality-metric">
                <span>
                  Average Confidence
                </span>

                <div className="quality-metric-value">
                  <strong>
                    {summary.averageConfidence.toFixed(
                      1
                    )}
                    %
                  </strong>

                  <span>AI</span>
                </div>

                <div className="quality-meter">
                  <div
                    className="meter-confidence"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          summary.averageConfidence,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="inspection-report-filters">
            <div className="inspection-search">
              <Search size={16} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search inspection, filename, defect..."
              />
            </div>

            <select
              value={decisionFilter}
              onChange={(event) =>
                setDecisionFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All Decisions
              </option>

              <option value="PASS">
                PASS
              </option>

              <option value="WARNING">
                WARNING
              </option>

              <option value="FAIL">
                FAIL
              </option>
            </select>

            <select
              value={predictionFilter}
              onChange={(event) =>
                setPredictionFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All Predictions
              </option>

              <option value="Normal">
                Normal
              </option>

              <option value="Defective">
                Defective
              </option>
            </select>

            <button
              className="inspection-clear-btn"
              onClick={clearFilters}
            >
              Clear
            </button>

            <span className="filter-result-pill">
              {filteredReports.length} {filteredReports.length === 1 ? "record" : "records"}
            </span>
          </section>

          <section className="inspection-reports-table-card">
            <div className="inspection-table-heading">
              <div>
                <span className="inspection-reports-eyebrow">
                  INSPECTION RECORDS
                </span>

                <h2>
                  Production Inspection Log
                </h2>
              </div>

              <span className="inspection-result-count">
                {filteredReports.length} shown
              </span>
            </div>

            {filteredReports.length ===
            0 ? (
              <div className="inspection-empty-state">
                <div className="inspection-empty-icon">
                  <FileText size={23} />
                </div>

                <h3>
                  No inspection records found
                </h3>

                <p>
                  {reports.length === 0
                    ? "Completed inspection reports will appear here."
                    : "No records match the selected filters."}
                </p>
              </div>
            ) : (
              <div className="inspection-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Inspection ID
                      </th>

                      <th>Filename</th>

                      <th>Prediction</th>

                      <th>Decision</th>

                      <th>Confidence</th>

                      <th>
                        Defect Category
                      </th>

                      <th>Severity</th>

                      <th>Risk</th>

                      <th>Date</th>

                      <th>Report</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReports.map(
                      (report) => {
                        const decision =
                          String(
                            report?.quality_decision ||
                              ""
                          ).toUpperCase();

                        return (
                          <tr
                            key={report?._id}
                          >
                            <td>
                              <span className="inspection-id">
                                {report?._id
                                  ? report._id.slice(
                                      -8
                                    )
                                  : "-"}
                              </span>
                            </td>

                            <td>
                              <span
                                className="inspection-filename"
                                title={
                                  report?.filename ||
                                  ""
                                }
                              >
                                {report?.filename ||
                                  "-"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`report-prediction-badge ${getPredictionClass(
                                  report?.prediction
                                )}`}
                              >
                                <span className="report-status-dot" />

                                {report?.prediction ||
                                  "-"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`report-decision-badge ${getDecisionClass(
                                  decision
                                )}`}
                              >
                                {decision || "—"}
                              </span>
                            </td>

                            <td>
                              <div className="report-confidence">
                                <div className="confidence-topline">
                                  <strong className="confidence-value">
                                    {report?.confidence != null
                                      ? `${report.confidence}%`
                                      : "-"}
                                  </strong>
                                </div>
                                {report?.confidence != null && (
                                  <span className="confidence-track">
                                    <span
                                      style={{
                                        width: `${Math.min(
                                          Math.max(Number(report.confidence) || 0, 0),
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <span className="defect-category">
                                {report?.defect_category ||
                                  "None"}
                              </span>
                            </td>

                            <td>
                              <span className="report-severity">
                                {report?.severity ||
                                  "None"}
                              </span>
                            </td>

                            <td>
                              <span className={`report-risk ${getRiskClass(
                                report?.risk_level
                              )}`}>
                                {report?.risk_level || "Low"}
                              </span>
                            </td>

                            <td>
                              <div className="report-date-wrapper">
                                {formatDate(
                                  report?.uploaded_at ||
                                    report?.created_at ||
                                    report?.inspection_date ||
                                    report?.timestamp ||
                                    report?.date
                                )}
                              </div>
                            </td>

                            <td>
                              <button
                                className="view-report-btn"
                                onClick={() =>
                                  openReport(
                                    report
                                  )
                                }
                              >
                                <FileText
                                  size={14}
                                />

                                View
                              </button>
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
        </main>
      </div>
    </>
  );
}

export default InspectionReports;