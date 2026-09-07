import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Activity,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import "../styles/DefectTrends.css";

/* ============================================================
   HELPERS
   ============================================================ */

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function getInspectionDate(item) {
  return (
    item?.uploaded_at ||
    item?.created_at ||
    item?.date ||
    item?.timestamp ||
    item?.inspected_at ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalize(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalize(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateOnly(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getPrediction(item) {
  return normalize(
    item?.prediction ||
      item?.predicted_class ||
      item?.classification ||
      item?.result
  );
}

function getStatus(item) {
  return normalize(
    item?.status ||
      item?.quality_decision ||
      item?.decision
  );
}

function getSeverity(item) {
  return normalize(
    item?.severity ||
      item?.defect_severity ||
      item?.severity_level
  );
}

function getRisk(item) {
  return normalize(
    item?.risk ||
      item?.risk_level ||
      item?.riskLevel
  );
}

function getDefectType(item) {
  return normalize(
    item?.defect_category ||
      item?.defect ||
      item?.defect_type ||
      item?.detected_defect ||
      item?.defect_name
  );
}

function getProduct(item) {
  return normalize(
    item?.product_category ||
      item?.product ||
      item?.category
  );
}

function getConfidence(item) {
  const value =
    item?.confidence ??
    item?.detection_confidence ??
    item?.prediction_confidence;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isDefective(item) {
  const prediction = normalizeLower(getPrediction(item));
  const status = normalizeLower(getStatus(item));
  const defect = normalizeLower(getDefectType(item));

  return (
    prediction.includes("defect") ||
    prediction.includes("abnormal") ||
    prediction.includes("fail") ||
    status === "fail" ||
    status === "failed" ||
    (defect !== "" &&
      defect !== "none" &&
      defect !== "normal" &&
      defect !== "no defect")
  );
}

function getSeverityClass(severity) {
  const value = normalizeLower(severity);

  if (
    value === "high" ||
    value === "critical"
  ) {
    return "severity-high";
  }

  if (
    value === "medium" ||
    value === "major"
  ) {
    return "severity-medium";
  }

  if (
    value === "low" ||
    value === "minor"
  ) {
    return "severity-low";
  }

  return "severity-neutral";
}

function getRiskClass(risk) {
  const value = normalizeLower(risk);

  if (value.includes("high")) {
    return "risk-high";
  }

  if (
    value.includes("medium") ||
    value.includes("moderate")
  ) {
    return "risk-medium";
  }

  if (value.includes("low")) {
    return "risk-low";
  }

  return "risk-none";
}

/* ============================================================
   COMPONENT
   ============================================================ */

function DefectTrends() {
  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");

  const [severityFilter, setSeverityFilter] =
    useState("All");

  const [riskFilter, setRiskFilter] =
    useState("All");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  /* ==========================================================
     LOAD REAL INSPECTION DATA
     ========================================================== */

  const loadHistory = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await api.get("/inspection/history");
      const data = response.data;
      setLastUpdated(new Date());

      /*
       * The current backend returns the inspection
       * records directly as an array.
       */

      if (Array.isArray(data)) {
        setHistory(data);
      }

      /*
       * Also support a wrapped response without
       * introducing dummy data.
       */

      else if (Array.isArray(data?.history)) {
        setHistory(data.history);
      }

      else if (Array.isArray(data?.records)) {
        setHistory(data.records);
      }

      else if (Array.isArray(data?.data)) {
        setHistory(data.data);
      }

      else {
        throw new Error(
          "The inspection history response does not contain records."
        );
      }
    } catch (err) {
      console.error(
        "Failed to load defect trends:",
        err
      );

      setHistory([]);

      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : err?.response?.data?.message ||
              err?.message ||
              "Failed to fetch inspection data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadHistory]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      void loadHistory(true);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, loadHistory]);

  /* ==========================================================
     ONLY REAL DEFECTIVE INSPECTIONS
     ========================================================== */

  const defectiveInspections = useMemo(() => {
    return history.filter((item) =>
      isDefective(item)
    );
  }, [history]);

  /* ==========================================================
     FILTER DATA
     ========================================================== */

  const filteredDefects = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return defectiveInspections
      .filter((item) => {
        const defect =
          getDefectType(item);

        const severity =
          getSeverity(item);

        const risk =
          getRisk(item);

        const product =
          getProduct(item);

        const prediction =
          getPrediction(item);

        const status =
          getStatus(item);

        const id =
          normalize(item?._id);

        const searchableText = [
          id,
          defect,
          severity,
          risk,
          product,
          prediction,
          status,
          normalize(item?.filename),
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          searchableText.includes(query);

        const matchesSeverity =
          severityFilter === "All" ||
          normalizeLower(severity) ===
            normalizeLower(severityFilter);

        const matchesRisk =
          riskFilter === "All" ||
          normalizeLower(risk) ===
            normalizeLower(riskFilter);

        const itemDate =
          getDateOnly(
            getInspectionDate(item)
          );

        const matchesFromDate =
          !fromDate ||
          (itemDate &&
            itemDate >= fromDate);

        const matchesToDate =
          !toDate ||
          (itemDate &&
            itemDate <= toDate);

        return (
          matchesSearch &&
          matchesSeverity &&
          matchesRisk &&
          matchesFromDate &&
          matchesToDate
        );
      })
      .sort((a, b) => {
        const dateA =
          new Date(
            getInspectionDate(a) || 0
          ).getTime();

        const dateB =
          new Date(
            getInspectionDate(b) || 0
          ).getTime();

        return dateB - dateA;
      });
  }, [
    defectiveInspections,
    search,
    severityFilter,
    riskFilter,
    fromDate,
    toDate,
  ]);

  /* ==========================================================
     REAL SUMMARY
     ========================================================== */

  const summary = useMemo(() => {
    let critical = 0;
    let major = 0;
    let minor = 0;

    defectiveInspections.forEach((item) => {
      const severity =
        normalizeLower(
          getSeverity(item)
        );

      if (
        severity === "critical" ||
        severity === "high"
      ) {
        critical++;
      }

      else if (
        severity === "major" ||
        severity === "medium"
      ) {
        major++;
      }

      else if (
        severity === "minor" ||
        severity === "low"
      ) {
        minor++;
      }
    });

    return {
      total: defectiveInspections.length,
      critical,
      major,
      minor,
    };
  }, [defectiveInspections]);

  /* ==========================================================
     REAL DEFECT DISTRIBUTION
     ========================================================== */

  const trendData = useMemo(() => {
    const counts = new Map();

    defectiveInspections.forEach((item) => {
      const defect =
        getDefectType(item);

      /*
       * Do not create fake defect names.
       * Records without a defect category are
       * simply excluded from the distribution.
       */

      if (!defect) {
        return;
      }

      const normalized =
        defect.toLowerCase();

      const existing =
        counts.get(normalized);

      if (existing) {
        existing.count++;
      }

      else {
        counts.set(
          normalized,
          {
            name: defect,
            count: 1,
          }
        );
      }
    });

    const total =
      Array.from(counts.values())
        .reduce(
          (sum, item) =>
            sum + item.count,
          0
        );

    return Array.from(
      counts.values()
    )
      .sort(
        (a, b) =>
          b.count - a.count
      )
      .map((item) => ({
        ...item,

        percentage:
          total > 0
            ? Number(
                (
                  (item.count / total) *
                  100
                ).toFixed(1)
              )
            : 0,
      }));
  }, [defectiveInspections]);

  /* ==========================================================
     REAL DAILY TREND
     ========================================================== */

  const dailyTrend = useMemo(() => {
    const counts = new Map();

    defectiveInspections.forEach((item) => {
      const rawDate =
        getInspectionDate(item);

      const date =
        getDateOnly(rawDate);

      if (!date) {
        return;
      }

      counts.set(
        date,
        (counts.get(date) || 0) + 1
      );
    });

    const values =
      Array.from(counts.entries())
        .sort(
          ([dateA], [dateB]) =>
            dateA.localeCompare(dateB)
        );

    const maximum =
      Math.max(
        1,
        ...values.map(
          ([, count]) => count
        )
      );

    return values.map(
      ([date, count]) => ({
        date,
        count,

        percentage:
          (count / maximum) * 100,
      })
    );
  }, [defectiveInspections]);

  /* ==========================================================
     FILTER OPTIONS FROM REAL DATA
     ========================================================== */

  const severityOptions = useMemo(() => {
    return Array.from(
      new Set(
        defectiveInspections
          .map((item) =>
            getSeverity(item)
          )
          .filter(Boolean)
      )
    ).sort();
  }, [defectiveInspections]);

  const riskOptions = useMemo(() => {
    return Array.from(
      new Set(
        defectiveInspections
          .map((item) =>
            getRisk(item)
          )
          .filter(Boolean)
      )
    ).sort();
  }, [defectiveInspections]);

  const defectRate = history.length
    ? (defectiveInspections.length / history.length) * 100
    : 0;

  const criticalRate = defectiveInspections.length
    ? (summary.critical / defectiveInspections.length) * 100
    : 0;

  const healthScore = Math.max(
    0,
    Math.min(100, 100 - defectRate - criticalRate * 0.35)
  );

  const topDefect = trendData[0]?.name || "No dominant defect";
  const latestDefectDate = filteredDefects[0]
    ? getInspectionDate(filteredDefects[0])
    : null;

  /* ==========================================================
     CLEAR FILTERS
     ========================================================== */

  const clearFilters = () => {
    setSearch("");
    setSeverityFilter("All");
    setRiskFilter("All");
    setFromDate("");
    setToDate("");
  };

  /* ==========================================================
     CSV EXPORT
     ========================================================== */

  const exportReport = () => {
    if (!filteredDefects.length) {
      return;
    }

    const headers = [
      "Inspection ID",
      "Filename",
      "Prediction",
      "Defect Type",
      "Severity",
      "Risk",
      "Product",
      "Confidence",
      "Status",
      "Date",
    ];

    const rows =
      filteredDefects.map((item) => [
        normalize(item?._id),

        normalize(item?.filename),

        getPrediction(item),

        getDefectType(item),

        getSeverity(item),

        getRisk(item),

        getProduct(item),

        getConfidence(item) !== null
          ? `${getConfidence(item)}%`
          : "",

        getStatus(item),

        formatDateTime(
          getInspectionDate(item)
        ),
      ]);

    const escapeCSV = (value) => {
      const stringValue =
        String(value ?? "");

      return `"${stringValue.replace(
        /"/g,
        '""'
      )}"`;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        row.map(escapeCSV).join(",")
      ),
    ].join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `visioninspect-defect-trends-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <>
      <SidebarSupervisor />

      <div className="dashboard">
        <Navbar title="Defect Trends" />

        <div className="trends-container">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="trends-header">
            <div>
              <span className="section-label">
                QUALITY ANALYTICS
              </span>

              <h2>
                Defect Trends
              </h2>

              <p>
                Monitor real defect patterns and
                inspection quality trends from your
                production data.
              </p>
            </div>

            <div className="trends-header-actions">
              <div className="trends-live-pill">
                <span className="trends-live-dot" />
                LIVE MONITORING
              </div>

              <div className="defect-count">
                <span className="defect-count-dot"></span>

                {summary.total}{" "}
                {summary.total === 1
                  ? "Defect"
                  : "Defects"}
              </div>

              <button
                type="button"
                className="trends-refresh-btn"
                onClick={loadHistory}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  size={14}
                  className={
                    loading
                      ? "refresh-spinning"
                      : ""
                  }
                />

                Refresh
              </button>
            </div>
          </div>

          <section className="trends-command-panel">
            <div className="trends-command-copy">
              <span className="section-label">DEFECT INTELLIGENCE</span>
              <h3>Production Risk Command Center</h3>
              <p>Real inspection evidence, severity exposure and defect concentration in one operational view.</p>
              <div className="trends-command-meta">
                <span><Activity size={12} /> {history.length} inspections analyzed</span>
                <span><ShieldCheck size={12} /> {lastUpdated ? `Synced ${formatDateTime(lastUpdated)}` : "Sync pending"}</span>
                <span><TrendingUp size={12} /> Top defect: {topDefect}</span>
              </div>
            </div>

            <div className="trends-health">
              <div className="trends-health-ring" style={{ "--health": `${healthScore}%` }}>
                <strong>{healthScore.toFixed(0)}</strong>
                <span>HEALTH</span>
              </div>
              <div className="trends-health-copy">
                <span>QUALITY HEALTH</span>
                <strong>{defectRate.toFixed(1)}% defect rate</strong>
                <small>{summary.critical} high / critical records</small>
              </div>
            </div>
          </section>

          <section className="trends-insight-strip">
            <div className="trend-insight blue"><Activity size={15} /><div><span>DEFECT RECORDS</span><strong>{summary.total}</strong></div></div>
            <div className="trend-insight red"><AlertCircle size={15} /><div><span>CRITICAL SHARE</span><strong>{criticalRate.toFixed(1)}%</strong></div></div>
            <div className="trend-insight orange"><TrendingUp size={15} /><div><span>TOP DEFECT</span><strong>{topDefect}</strong></div></div>
            <div className="trend-insight green"><ShieldCheck size={15} /><div><span>LATEST EVENT</span><strong>{latestDefectDate ? formatDate(latestDefectDate) : "—"}</strong></div></div>
          </section>

          <div className="trends-toolbar">
            <span className="trends-toolbar-status"><span /> {filteredDefects.length} matching records</span>
            <label className="trends-toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span className="trends-toggle-track"><span /></span>
              Auto-refresh
            </label>
          </div>

          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (
            <div className="trends-error">
              <AlertTriangle size={16} />

              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={loadHistory}
              >
                Retry
              </button>
            </div>
          )}

          {/* ==================================================
              LOADING
              ================================================== */}

          {loading ? (
            <div className="reports-state">
              <div className="reports-spinner"></div>

              <strong>
                Loading defect data
              </strong>

              <span>
                Fetching recorded inspection results
                from VisionInspect.
              </span>
            </div>
          ) : (
            <>
              {/* ==================================================
                  SUMMARY
                  ================================================== */}

              <div className="trend-summary">
                <div className="trend-card total-defects">
                  <h3>
                    Total Defects
                  </h3>

                  <h2>
                    {summary.total}
                  </h2>

                  <span className="card-caption">
                    Defective inspections
                  </span>
                </div>

                <div className="trend-card critical-defects">
                  <h3>
                    Critical
                  </h3>

                  <h2>
                    {summary.critical}
                  </h2>

                  <span className="card-caption">
                    High / critical severity
                  </span>
                </div>

                <div className="trend-card major-defects">
                  <h3>
                    Major
                  </h3>

                  <h2>
                    {summary.major}
                  </h2>

                  <span className="card-caption">
                    Medium / major severity
                  </span>
                </div>

                <div className="trend-card minor-defects">
                  <h3>
                    Minor
                  </h3>

                  <h2>
                    {summary.minor}
                  </h2>

                  <span className="card-caption">
                    Low / minor severity
                  </span>
                </div>
              </div>

              {/* ==================================================
                  FILTERS
                  ================================================== */}

              <div className="trends-controls">
                <div className="trends-search">
                  <Search size={16} />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search inspection, defect, product..."
                  />

                  {search && (
                    <button
                      type="button"
                      className="trends-clear-search"
                      onClick={() =>
                        setSearch("")
                      }
                      aria-label="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="trends-filter-field">
                  <label>
                    Severity
                  </label>

                  <select
                    value={severityFilter}
                    onChange={(e) =>
                      setSeverityFilter(
                        e.target.value
                      )
                    }
                  >
                    <option value="All">
                      All Severities
                    </option>

                    {severityOptions.map(
                      (severity) => (
                        <option
                          key={severity}
                          value={severity}
                        >
                          {severity}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="trends-filter-field">
                  <label>
                    Risk
                  </label>

                  <select
                    value={riskFilter}
                    onChange={(e) =>
                      setRiskFilter(
                        e.target.value
                      )
                    }
                  >
                    <option value="All">
                      All Risk Levels
                    </option>

                    {riskOptions.map(
                      (risk) => (
                        <option
                          key={risk}
                          value={risk}
                        >
                          {risk}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="trends-date-field">
                  <label>
                    <CalendarDays size={11} />
                    From
                  </label>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) =>
                      setFromDate(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="trends-date-field">
                  <label>
                    <CalendarDays size={11} />
                    To
                  </label>

                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) =>
                      setToDate(
                        e.target.value
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  className="trends-clear-filters"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>

              {/* ==================================================
                  DAILY TREND
                  ================================================== */}

              <div className="distribution-card">
                <div className="section-heading">
                  <div>
                    <span className="section-label">
                      TIME ANALYSIS
                    </span>

                    <h2>
                      Daily Defect Trend
                    </h2>
                  </div>

                  <span className="distribution-total">
                    {dailyTrend.length}{" "}
                    {dailyTrend.length === 1
                      ? "Day"
                      : "Days"}
                  </span>
                </div>

                {dailyTrend.length === 0 ? (
                  <div className="trends-empty-small">
                    <AlertTriangle size={20} />

                    <span>
                      No dated defect records are
                      available for the current filters.
                    </span>
                  </div>
                ) : (
                  <div className="daily-trend-list">
                    {dailyTrend.map(
                      (item) => (
                        <div
                          key={item.date}
                          className="daily-trend-item"
                        >
                          <div className="daily-trend-header">
                            <span>
                              {formatDate(
                                item.date
                              )}
                            </span>

                            <strong>
                              {item.count}{" "}
                              {item.count === 1
                                ? "defect"
                                : "defects"}
                            </strong>
                          </div>

                          <div className="distribution-track">
                            <div
                              className="distribution-progress"
                              style={{
                                width:
                                  `${item.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* ==================================================
                  DEFECT DISTRIBUTION
                  ================================================== */}

              <div className="distribution-card">
                <div className="section-heading">
                  <div>
                    <span className="section-label">
                      DEFECT ANALYSIS
                    </span>

                    <h2>
                      Defect Distribution
                    </h2>
                  </div>

                  <span className="distribution-total">
                    {trendData.length}{" "}
                    {trendData.length === 1
                      ? "Type"
                      : "Types"}
                  </span>
                </div>

                {trendData.length === 0 ? (
                  <div className="trends-empty-small">
                    <AlertTriangle size={20} />

                    <span>
                      No defect categories are
                      available in the recorded data.
                    </span>
                  </div>
                ) : (
                  <div className="distribution-list">
                    {trendData.map(
                      (item, index) => (
                        <div
                          key={item.name}
                          className="distribution-item"
                        >
                          <div className="distribution-header">
                            <div className="distribution-name">
                              <span className="distribution-index">
                                {String(
                                  index + 1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <span>
                                {item.name}
                              </span>
                            </div>

                            <strong>
                              {item.percentage}%

                              <small>
                                {" "}
                                ({item.count})
                              </small>
                            </strong>
                          </div>

                          <div className="distribution-track">
                            <div
                              className="distribution-progress"
                              style={{
                                width:
                                  `${item.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* ==================================================
                  RECENT DEFECTS
                  ================================================== */}

              <div className="recent-defects">
                <div className="section-heading">
                  <div>
                    <span className="section-label">
                      INSPECTION ALERTS
                    </span>

                    <h2>
                      Recent Defects
                    </h2>
                  </div>

                  <span className="recent-count">
                    {filteredDefects.length}{" "}
                    {filteredDefects.length === 1
                      ? "Record"
                      : "Records"}
                  </span>
                </div>

                {filteredDefects.length === 0 ? (
                  <div className="trends-empty-state">
                    <div className="trends-empty-icon">
                      <AlertTriangle size={21} />
                    </div>

                    <strong>
                      No defect records found
                    </strong>

                    <span>
                      There are no defective inspection
                      records matching the current filters.
                    </span>

                    {(search ||
                      severityFilter !== "All" ||
                      riskFilter !== "All" ||
                      fromDate ||
                      toDate) && (
                      <button
                        type="button"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="defects-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            INSPECTION
                          </th>

                          <th>
                            DEFECT
                          </th>

                          <th>
                            PRODUCT
                          </th>

                          <th>
                            CONFIDENCE
                          </th>

                          <th>
                            SEVERITY
                          </th>

                          <th>
                            RISK
                          </th>

                          <th>
                            DATE
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredDefects.map(
                          (item, index) => {
                            const id =
                              normalize(
                                item?._id
                              );

                            const severity =
                              getSeverity(item);

                            const risk =
                              getRisk(item);

                            const confidence =
                              getConfidence(item);

                            return (
                              <tr
                                key={
                                  id ||
                                  item?.filename ||
                                  item?.original_filename ||
                                  `${getInspectionDate(item) || "inspection"}-${index}`
                                }
                              >
                                <td>
                                  <span className="defect-id">
                                    {id
                                      ? id.slice(-8)
                                      : "—"}
                                  </span>
                                </td>

                                <td>
                                  <span className="defect-type">
                                    {getDefectType(
                                      item
                                    ) ||
                                      "Defect Detected"}
                                  </span>
                                </td>

                                <td>
                                  <span className="product-name">
                                    {getProduct(item) ||
                                      "—"}
                                  </span>
                                </td>

                                <td>
                                  <div className="confidence-cell">
                                    <strong className="confidence-value">
                                      {confidence !== null ? `${confidence}%` : "—"}
                                    </strong>
                                    {confidence !== null && (
                                      <span className="confidence-track">
                                        <span style={{ width: `${Math.min(Math.max(confidence, 0), 100)}%` }} />
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  <span
                                    className={`severity-badge ${getSeverityClass(
                                      severity
                                    )}`}
                                  >
                                    <span className="severity-dot"></span>

                                    {severity ||
                                      "Not recorded"}
                                  </span>
                                </td>

                                <td>
                                  <span
                                    className={`risk-value ${getRiskClass(
                                      risk
                                    )}`}
                                  >
                                    {risk ||
                                      "Not recorded"}
                                  </span>
                                </td>

                                <td>
                                  <div className="defect-date">
                                    <span>
                                      {formatDate(
                                        getInspectionDate(
                                          item
                                        )
                                      )}
                                    </span>

                                    <small>
                                      {formatDateTime(
                                        getInspectionDate(
                                          item
                                        )
                                      )}
                                    </small>
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
              </div>

              {/* ==================================================
                  EXPORT
                  ================================================== */}

              <div className="export-section">
                <button
                  type="button"
                  className="export-btn"
                  onClick={exportReport}
                  disabled={
                    filteredDefects.length === 0
                  }
                >
                  <Download size={15} />

                  Export Trend Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default DefectTrends;