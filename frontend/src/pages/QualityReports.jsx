import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/QualityReports.css";

function QualityReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total_inspections: 0,
    passed: 0,
    failed: 0,
    pass_rate: 0,
    average_confidence: 0,
  });

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [decisionFilter, setDecisionFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [historyResponse, statsResponse] =
        await Promise.all([
          api.get("/inspection/history"),
          api.get("/inspection/dashboard"),
        ]);

      setReports(
        Array.isArray(historyResponse.data)
          ? historyResponse.data
          : []
      );

      setStats(
        statsResponse.data || {
          total_inspections: 0,
          passed: 0,
          failed: 0,
          pass_rate: 0,
          average_confidence: 0,
        }
      );
    } catch (err) {
      console.error(
        "Failed to load quality reports:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load quality reports from the inspection service."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError("");

        const [historyResponse, statsResponse] =
          await Promise.all([
            api.get("/inspection/history"),
            api.get("/inspection/dashboard"),
          ]);

        if (!cancelled) {
          setReports(
            Array.isArray(historyResponse.data)
              ? historyResponse.data
              : []
          );

          setStats(
            statsResponse.data || {
              total_inspections: 0,
              passed: 0,
              failed: 0,
              pass_rate: 0,
              average_confidence: 0,
            }
          );
        }
      } catch (err) {
        console.error(
          "Failed to load quality reports:",
          err
        );

        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              "Unable to load quality reports from the inspection service."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const assessment = useMemo(() => {
    const result = {
      severity: {
        None: 0,
        Low: 0,
        Medium: 0,
        High: 0,
        Critical: 0,
      },
      risk: {
        Low: 0,
        Medium: 0,
        High: 0,
        Critical: 0,
      },
      decisions: {
        PASS: 0,
        WARNING: 0,
        FAIL: 0,
      },
      totalSeverityScore: 0,
      scoredInspections: 0,
    };

    reports.forEach((report) => {
      const severity =
        String(report.severity || "None");

      const risk =
        String(report.risk_level || "Low");

      const decision =
        String(
          report.quality_decision || ""
        ).toUpperCase();

      if (
        Object.prototype.hasOwnProperty.call(
          result.severity,
          severity
        )
      ) {
        result.severity[severity] += 1;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          result.risk,
          risk
        )
      ) {
        result.risk[risk] += 1;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          result.decisions,
          decision
        )
      ) {
        result.decisions[decision] += 1;
      }

      const score = Number(
        report.severity_score
      );

      if (Number.isFinite(score)) {
        result.totalSeverityScore += score;
        result.scoredInspections += 1;
      }
    });

    return {
      ...result,
      averageSeverityScore:
        result.scoredInspections > 0
          ? result.totalSeverityScore /
            result.scoredInspections
          : 0,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return reports.filter((report) => {
      const inspectionId =
        String(report._id || "").toLowerCase();

      const filename =
        String(report.filename || "").toLowerCase();

      const prediction =
        String(report.prediction || "").toLowerCase();

      const status =
        String(report.status || "").toLowerCase();

      const defectCategory =
        String(
          report.defect_category || ""
        ).toLowerCase();

      const severity =
        String(report.severity || "None");

      const risk =
        String(report.risk_level || "Low");

      const decision =
        String(
          report.quality_decision || ""
        ).toUpperCase();

      const matchesSearch =
        !query ||
        inspectionId.includes(query) ||
        filename.includes(query) ||
        prediction.includes(query) ||
        status.includes(query) ||
        defectCategory.includes(query);

      const matchesSeverity =
        severityFilter === "All" ||
        severity === severityFilter;

      const matchesRisk =
        riskFilter === "All" ||
        risk === riskFilter;

      const matchesDecision =
        decisionFilter === "All" ||
        decision === decisionFilter;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesRisk &&
        matchesDecision
      );
    });
  }, [
    reports,
    search,
    severityFilter,
    riskFilter,
    decisionFilter,
  ]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatScore = (value) => {
    const score = Number(value);

    if (!Number.isFinite(score)) return "—";

    return score.toFixed(2);
  };

  const getReportDate = (report) =>
    report?.uploaded_at ||
    report?.created_at ||
    report?.inspection_date ||
    report?.timestamp ||
    report?.date ||
    null;

  const downloadReport = async (filename) => {
    if (!filename) {
      window.alert(
        "No generated report is available for this inspection."
      );
      return;
    }

    try {
      const response = await api.get(
        `/inspection/report/${encodeURIComponent(filename)}`,
        { responseType: "blob" }
      );

      if (!response.data || response.data.size === 0) {
        throw new Error("The inspection report is empty.");
      }

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.error("Quality report download error:", err);
      window.alert(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to download the inspection report."
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSeverityFilter("All");
    setRiskFilter("All");
    setDecisionFilter("All");
  };

  if (loading) {
    return (
      <>
        <Sidebar />

        <div className="dashboard">
          <Navbar title="Quality Reports" />

          <div className="reports-container">
            <div className="reports-loading">
              <RefreshCw
                size={25}
                className="quality-report-spin"
              />

              <p>
                Loading real quality assessment data...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <div className="dashboard">
        <Navbar title="Quality Reports" />

        <div className="reports-container">

          {/* HEADER */}

          <div className="reports-header">
            <div>
              <span className="quality-report-eyebrow">
                QUALITY CONTROL
              </span>

              <h2>
                Severity & Risk Assessment Reports
              </h2>

              <p>
                Real-time quality assessment generated
                from recorded VisionInspect AI inspections.
              </p>
            </div>

            <button
              className="quality-report-refresh"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "quality-report-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>


          {/* ERROR */}

          {error && (
            <div className="reports-error">
              <AlertTriangle size={17} />

              <p>{error}</p>

              <button
                onClick={() => loadData(true)}
              >
                Retry
              </button>
            </div>
          )}


          {/* SUMMARY */}

          <div className="summary-cards">

            <div className="summary-card">
              <div className="summary-icon">
                <ShieldAlert size={19} />
              </div>

              <div>
                <h3>Total Inspections</h3>

                <h2>
                  {stats.total_inspections}
                </h2>
              </div>
            </div>


            <div className="summary-card">
              <div className="summary-icon">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <h3>Passed</h3>

                <h2>
                  {stats.passed}
                </h2>
              </div>
            </div>


            <div className="summary-card">
              <div className="summary-icon">
                <XCircle size={19} />
              </div>

              <div>
                <h3>Failed</h3>

                <h2>
                  {stats.failed}
                </h2>
              </div>
            </div>


            <div className="summary-card">
              <div className="summary-icon">
                <AlertTriangle size={19} />
              </div>

              <div>
                <h3>High Risk</h3>

                <h2>
                  {assessment.risk.High +
                    assessment.risk.Critical}
                </h2>
              </div>
            </div>

          </div>


          {/* ASSESSMENT SNAPSHOT */}

          <section className="assessment-report-card">

            <div className="assessment-report-heading">

              <div>
                <span className="quality-report-eyebrow">
                  QUALITY ASSESSMENT
                </span>

                <h3>
                  Severity & Risk Snapshot
                </h3>
              </div>

              <div className="assessment-score">

                <span>
                  AVG SEVERITY SCORE
                </span>

                <strong>
                  {assessment.averageSeverityScore.toFixed(
                    2
                  )}
                </strong>

              </div>

            </div>


            <div className="assessment-columns">

              <div className="assessment-column">

                <div className="assessment-column-title">

                  <span>SEVERITY</span>

                  <strong>
                    {reports.length} records
                  </strong>

                </div>

                {Object.entries(
                  assessment.severity
                ).map(([name, count]) => (
                  <div
                    className="assessment-row"
                    key={name}
                  >

                    <span>{name}</span>

                    <div className="assessment-bar">

                      <div
                        style={{
                          width:
                            reports.length > 0
                              ? `${Math.min(
                                  (count /
                                    reports.length) *
                                    100,
                                  100
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                    <strong>{count}</strong>

                  </div>
                ))}

              </div>


              <div className="assessment-column">

                <div className="assessment-column-title">

                  <span>RISK</span>

                  <strong>
                    {reports.length} records
                  </strong>

                </div>

                {Object.entries(
                  assessment.risk
                ).map(([name, count]) => (
                  <div
                    className="assessment-row"
                    key={name}
                  >

                    <span>{name}</span>

                    <div className="assessment-bar">

                      <div
                        style={{
                          width:
                            reports.length > 0
                              ? `${Math.min(
                                  (count /
                                    reports.length) *
                                    100,
                                  100
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                    <strong>{count}</strong>

                  </div>
                ))}

              </div>


              <div className="assessment-column">

                <div className="assessment-column-title">

                  <span>QUALITY DECISION</span>

                  <strong>
                    {reports.length} records
                  </strong>

                </div>

                {Object.entries(
                  assessment.decisions
                ).map(([name, count]) => (
                  <div
                    className="assessment-row"
                    key={name}
                  >

                    <span>{name}</span>

                    <div className="assessment-bar">

                      <div
                        style={{
                          width:
                            reports.length > 0
                              ? `${Math.min(
                                  (count /
                                    reports.length) *
                                    100,
                                  100
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                    <strong>{count}</strong>

                  </div>
                ))}

              </div>

            </div>


            <div className="assessment-method-note">

              <ShieldAlert size={15} />

              <p>
                Severity and risk values shown here are
                calculated and stored by the current
                VisionInspect quality-assessment service.
                No values are fabricated in the frontend.
              </p>

            </div>

          </section>


          {/* FILTERS */}

          <div className="report-filters">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                aria-label="Search inspection records"
                placeholder="Search inspection, filename, defect..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value)
              }
            >
              <option value="All">
                All Severities
              </option>

              <option value="None">
                None
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>

              <option value="Critical">
                Critical
              </option>
            </select>


            <select
              value={riskFilter}
              onChange={(e) =>
                setRiskFilter(e.target.value)
              }
            >
              <option value="All">
                All Risk Levels
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>

              <option value="Critical">
                Critical
              </option>
            </select>


            <select
              value={decisionFilter}
              onChange={(e) =>
                setDecisionFilter(e.target.value)
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


            <button
              className="clear-report-filters"
              onClick={clearFilters}
            >
              Clear
            </button>

          </div>


          {/* REPORT TABLE */}

          <div className="table-card">

            <div className="table-header">

              <div>

                <span className="quality-report-eyebrow">
                  INSPECTION RECORDS
                </span>

                <h3>
                  Quality Assessment Log
                </h3>

              </div>

              <div className="report-count">
                {filteredReports.length} record
                {filteredReports.length !== 1
                  ? "s"
                  : ""}
              </div>

            </div>


            {filteredReports.length === 0 ? (

              <div className="empty-reports">

                <div className="empty-icon">
                  <ShieldAlert size={25} />
                </div>

                <h3>
                  No inspection records found
                </h3>

                <p>
                  {reports.length === 0
                    ? "Complete an inspection to generate quality assessment data."
                    : "No records match the current filters."}
                </p>

              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>
                      <th>Inspection</th>
                      <th>Prediction</th>
                      <th>Defect</th>
                      <th>Severity</th>
                      <th>Score</th>
                      <th>Risk</th>
                      <th>Decision</th>
                      <th>Date</th>
                      <th>Report</th>
                    </tr>

                  </thead>


                  <tbody>

                    {filteredReports.map(
                      (report) => {

                        const prediction =
                          String(
                            report.prediction || ""
                          );

                        const severity =
                          String(
                            report.severity ||
                              "None"
                          );

                        const risk =
                          String(
                            report.risk_level ||
                              "Low"
                          );

                        const decision =
                          String(
                            report.quality_decision ||
                              "—"
                          ).toUpperCase();

                        return (
                          <tr
                            key={report._id}
                          >

                            <td>
                              <span className="inspection-id">
                                {report._id
                                  ? report._id.substring(
                                      0,
                                      8
                                    )
                                  : "—"}
                              </span>
                            </td>


                            <td>

                              <span
                                className={
                                  prediction.toLowerCase() ===
                                  "defective"
                                    ? "prediction defective"
                                    : "prediction normal"
                                }
                              >
                                {prediction || "—"}
                              </span>

                            </td>


                            <td>

                              <span className="defect-category-cell">
                                {report.defect_category ||
                                  "None"}
                              </span>

                            </td>


                            <td>

                              <span
                                className={`assessment-badge severity-${severity.toLowerCase()}`}
                              >
                                {severity}
                              </span>

                            </td>


                            <td>

                              <strong className="severity-score-cell">
                                {formatScore(
                                  report.severity_score
                                )}
                              </strong>

                            </td>


                            <td>

                              <span
                                className={`assessment-badge risk-${risk.toLowerCase()}`}
                              >
                                {risk}
                              </span>

                            </td>


                            <td>

                              <span
                                className={`decision-badge decision-${decision.toLowerCase()}`}
                              >
                                {decision}
                              </span>

                            </td>


                            <td>
                              {formatDate(
                                getReportDate(report)
                              )}
                            </td>


                            <td>

                              <button
                                className="download-btn"
                                onClick={() =>
                                  downloadReport(
                                    report.report
                                  )
                                }
                              >

                                <Download size={14} />

                                Download

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

          </div>

        </div>
      </div>
    </>
  );
}

export default QualityReports;