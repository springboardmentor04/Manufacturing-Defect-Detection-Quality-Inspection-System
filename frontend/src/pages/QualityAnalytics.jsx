import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/QualityAnalytics.css";

const clean = (value) => String(value ?? "").trim();

const getDate = (item) =>
  item?.uploaded_at ||
  item?.created_at ||
  item?.inspected_at ||
  item?.timestamp ||
  item?.date ||
  null;

const getPrediction = (item) =>
  clean(
    item?.prediction ||
      item?.predicted_class ||
      item?.classification ||
      item?.result
  );

const getStatus = (item) =>
  clean(item?.status || item?.quality_decision || item?.decision);

const getSeverity = (item) =>
  clean(item?.severity || item?.defect_severity || item?.severity_level);

const getRisk = (item) =>
  clean(item?.risk_level || item?.risk || item?.riskLevel);

const getDefect = (item) =>
  clean(
    item?.defect_category ||
      item?.defect ||
      item?.defect_type ||
      item?.detected_defect ||
      item?.defect_name
  );

const getProduct = (item) =>
  clean(item?.product_category || item?.product || item?.category);

const getConfidence = (item) => {
  const value = Number(
    item?.confidence ??
      item?.detection_confidence ??
      item?.prediction_confidence
  );

  return Number.isFinite(value) ? value : null;
};

const isNormal = (item) =>
  getPrediction(item).toLowerCase() === "normal";

const isDefective = (item) => {
  const prediction = getPrediction(item).toLowerCase();
  const status = getStatus(item).toLowerCase();
  const defect = getDefect(item).toLowerCase();

  return (
    prediction.includes("defect") ||
    prediction.includes("abnormal") ||
    prediction.includes("fail") ||
    status === "fail" ||
    status === "failed" ||
    (defect &&
      defect !== "none" &&
      defect !== "normal" &&
      defect !== "no defect" &&
      defect !== "defect detected")
  );
};

const isPassed = (item) => {
  const status = getStatus(item).toLowerCase();

  return (
    status === "pass" ||
    status === "passed" ||
    (!status && isNormal(item))
  );
};

const isFailed = (item) => {
  const status = getStatus(item).toLowerCase();

  return status === "fail" || status === "failed";
};

const formatPercent = (value) =>
  value === null ||
  value === undefined ||
  !Number.isFinite(Number(value))
    ? "—"
    : `${Number(value).toFixed(1)}%`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return clean(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatUpdated = (value) => {
  if (!value) return "Not synced yet";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSemanticTone = (value) => {
  const text = clean(value).toLowerCase();

  if (
    text.includes("fail") ||
    text.includes("defect") ||
    text.includes("critical") ||
    text === "high"
  ) {
    return "fail";
  }

  if (
    text.includes("warning") ||
    text.includes("medium") ||
    text.includes("moderate") ||
    text.includes("major")
  ) {
    return "warning";
  }

  if (
    text.includes("pass") ||
    text.includes("normal") ||
    text.includes("low") ||
    text.includes("minor")
  ) {
    return "pass";
  }

  return "neutral";
};

const dateKey = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const countBy = (items, getter, ignored = []) => {
  const counts = new Map();

  items.forEach((item) => {
    const value = getter(item);

    if (!value || ignored.includes(value)) return;

    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

function QualityAnalytics() {
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  /*
   * ==========================================================
   * LOAD ANALYTICS
   * ==========================================================
   *
   * Used by the Refresh and Retry buttons.
   * The initial request is handled separately inside useEffect
   * so React's set-state-in-effect lint rule is satisfied.
   */
  const loadAnalytics = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/inspection/history");
      const data = response.data;

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.history)
        ? data.history
        : Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.data)
        ? data.data
        : null;

      if (!records) {
        throw new Error(
          "Inspection history response does not contain inspection records."
        );
      }

      setHistory(records);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Quality Analytics:", err);

      if (!silent) {
        setHistory([]);
      }

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load inspection history. Make sure the backend is running."
      );
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  /*
   * ==========================================================
   * INITIAL ANALYTICS LOAD
   * ==========================================================
   *
   * The async function lives inside the effect.
   * This avoids directly calling a function containing
   * synchronous setState calls from the effect body.
   */
  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      void loadAnalytics(true);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, loadAnalytics]);


  const filteredHistory = useMemo(() => {
    if (range === "all") return history;

    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : 90;

    const cutoff = new Date();

    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return history.filter((item) => {
      const value = getDate(item);

      if (!value) return false;

      const date = new Date(value);

      return (
        !Number.isNaN(date.getTime()) &&
        date >= cutoff
      );
    });
  }, [history, range]);

  const metrics = useMemo(() => {
    const total = filteredHistory.length;

    const normal =
      filteredHistory.filter(isNormal).length;

    const defective =
      filteredHistory.filter(isDefective).length;

    const passed =
      filteredHistory.filter(isPassed).length;

    const failed =
      filteredHistory.filter(isFailed).length;

    const highRisk =
      filteredHistory.filter(
        (item) =>
          getRisk(item).toLowerCase() === "high"
      ).length;

    const confidenceValues = filteredHistory
      .map(getConfidence)
      .filter((value) => value !== null);

    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce(
            (sum, value) => sum + value,
            0
          ) / confidenceValues.length
        : null;

    return {
      total,
      normal,
      defective,
      passed,
      failed,
      highRisk,
      averageConfidence,
      passRate:
        total > 0 ? (passed / total) * 100 : null,
      defectRate:
        total > 0 ? (defective / total) * 100 : null,
      highRiskRate:
        total > 0 ? (highRisk / total) * 100 : null,
    };
  }, [filteredHistory]);

  const productCategories = useMemo(
    () =>
      countBy(
        filteredHistory,
        getProduct,
        ["Unknown", "unknown"]
      ),
    [filteredHistory]
  );

  const defectCategories = useMemo(
    () =>
      countBy(
        filteredHistory,
        getDefect,
        [
          "None",
          "none",
          "Defect Detected",
          "Normal",
          "No defect",
        ]
      ),
    [filteredHistory]
  );

  const severityData = useMemo(
    () =>
      countBy(
        filteredHistory,
        getSeverity,
        ["None", "none"]
      ),
    [filteredHistory]
  );

  const riskData = useMemo(
    () => countBy(filteredHistory, getRisk),
    [filteredHistory]
  );

  const decisionData = useMemo(
    () => countBy(filteredHistory, getStatus),
    [filteredHistory]
  );

  const trendData = useMemo(() => {
    const map = new Map();

    filteredHistory.forEach((item) => {
      const key = dateKey(getDate(item));

      if (!key) return;

      const current = map.get(key) || {
        date: key,
        inspections: 0,
        passed: 0,
        failed: 0,
        defective: 0,
      };

      current.inspections += 1;

      if (isPassed(item)) {
        current.passed += 1;
      }

      if (isFailed(item)) {
        current.failed += 1;
      }

      if (isDefective(item)) {
        current.defective += 1;
      }

      map.set(key, current);
    });

    return [...map.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredHistory]);

  const trendMax = Math.max(
    1,
    ...trendData.map((item) => item.inspections)
  );

  const qualityHealth = useMemo(() => {
    const components = [];

    if (metrics.passRate !== null) {
      components.push(metrics.passRate * 0.6);
    }

    if (metrics.averageConfidence !== null) {
      components.push(metrics.averageConfidence * 0.25);
    }

    if (metrics.highRiskRate !== null) {
      components.push((100 - metrics.highRiskRate) * 0.15);
    }

    if (!components.length) return null;

    return Math.round(
      Math.max(0, Math.min(100, components.reduce((sum, value) => sum + value, 0)))
    );
  }, [metrics]);

const healthTone =
    qualityHealth === null
      ? "neutral"
      : qualityHealth >= 85
      ? "pass"
      : qualityHealth >= 70
      ? "warning"
      : "fail";

  const qualityMessage =
    qualityHealth === null
      ? "Waiting for enough quality data"
      : qualityHealth >= 85
      ? "Quality performance is healthy"
      : qualityHealth >= 70
      ? "Quality needs attention"
      : "Quality risk is elevated";

  const insights = useMemo(() => {
    const result = [];

    if (productCategories.length > 0) {
      result.push({
        label: "Most inspected product",
        value: productCategories[0][0],
        detail: `${productCategories[0][1]} inspection${
          productCategories[0][1] === 1 ? "" : "s"
        }`,
        icon: Target,
      });
    }

    if (defectCategories.length > 0) {
      result.push({
        label: "Most detected defect",
        value: defectCategories[0][0],
        detail: `${defectCategories[0][1]} occurrence${
          defectCategories[0][1] === 1 ? "" : "s"
        }`,
        icon: AlertTriangle,
      });
    }

    if (severityData.length > 0) {
      result.push({
        label: "Most common severity",
        value: severityData[0][0],
        detail: `${severityData[0][1]} inspection${
          severityData[0][1] === 1 ? "" : "s"
        }`,
        icon: ShieldAlert,
      });
    }

    if (riskData.length > 0) {
      result.push({
        label: "Most recorded risk",
        value: riskData[0][0],
        detail: `${riskData[0][1]} inspection${
          riskData[0][1] === 1 ? "" : "s"
        }`,
        icon: Activity,
      });
    }

    return result;
  }, [
    productCategories,
    defectCategories,
    severityData,
    riskData,
  ]);

  const exportCSV = () => {
    if (!filteredHistory.length) return;

    const headers = [
      "Inspection ID",
      "Filename",
      "Prediction",
      "Status",
      "Product Category",
      "Defect Category",
      "Severity",
      "Risk",
      "Confidence",
      "Inspection Date",
    ];

    const rows = filteredHistory.map((item) => [
      clean(item?._id),
      clean(item?.filename),
      getPrediction(item),
      getStatus(item),
      getProduct(item),
      getDefect(item),
      getSeverity(item),
      getRisk(item),
      getConfidence(item) ?? "",
      getDate(item) || "",
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        row.map(escapeCSV).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `visioninspect-quality-analytics-${new Date()
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
          <Navbar title="Quality Analytics" />

          <main className="analytics-container">
            <div className="analytics-state">
              <div className="analytics-spinner" />

              <h2>Loading Quality Analytics</h2>

              <p>
                Retrieving real inspection records
                from VisionInspect.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SidebarSupervisor />

        <div className="dashboard">
          <Navbar title="Quality Analytics" />

          <main className="analytics-container">
            <div className="analytics-error">
              <AlertTriangle size={25} />

              <h2>Analytics unavailable</h2>

              <p>{error}</p>

              <button onClick={loadAnalytics}>
                <RefreshCw size={15} />
                Retry
              </button>
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
        <Navbar title="Quality Analytics" />

        <main className="analytics-container">

          {/* HEADER */}

          <section className="analytics-header">
            <div>
              <span className="analytics-eyebrow">
                FACTORY SUPERVISOR
              </span>

              <div className="analytics-title-row">
                <h1>Quality Analytics</h1>
                <span className="analytics-live-pill">
                  <span className="analytics-live-dot" />
                  LIVE
                </span>
              </div>

              <p>
                Production quality intelligence
                based only on recorded AI inspection data.
              </p>
            </div>

            <div className="analytics-header-actions">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                aria-label="Analytics date range"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              <button
                className="analytics-refresh-button"
                onClick={() => loadAnalytics(false)}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "analytics-spin-icon" : ""}
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </section>

          <section className={`analytics-command-strip ${healthTone}`}>
            <div className="analytics-command-copy">
              <span className="analytics-command-eyebrow">QUALITY COMMAND CENTER</span>
              <strong>{qualityMessage}</strong>
              <small>
                {metrics.total
                  ? `${metrics.total} inspection${metrics.total === 1 ? "" : "s"} in the selected range`
                  : "No inspection records in the selected range"}
                {" · "}
                Last sync {formatUpdated(lastUpdated)}
              </small>
            </div>

            <div className="analytics-health">
              <div
                className={`analytics-health-ring ${healthTone}`}
                style={{ "--health": `${qualityHealth ?? 0}%` }}
              >
                <span>{qualityHealth === null ? "—" : qualityHealth}</span>
              </div>
              <div>
                <span>QUALITY HEALTH</span>
                <strong>
                  {qualityHealth === null ? "Awaiting data" : `${qualityHealth}/100`}
                </strong>
              </div>
            </div>
          </section>

          <section className="analytics-toolbar">
            <div>
              <span className="analytics-toolbar-status">
                <span className="analytics-status-dot" />
                DATA CONNECTED
              </span>
              <small>
                {metrics.total} visible record{metrics.total === 1 ? "" : "s"}
              </small>
            </div>

            <label className="analytics-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="analytics-toggle-track" />
              <span>Auto-refresh 60s</span>
            </label>
          </section>

          <section className="analytics-insight-strip">
            <div className="analytics-insight-strip-item pass">
              <span>PASS PERFORMANCE</span>
              <strong>{formatPercent(metrics.passRate)}</strong>
            </div>
            <div className="analytics-insight-strip-item fail">
              <span>DEFECT EXPOSURE</span>
              <strong>{formatPercent(metrics.defectRate)}</strong>
            </div>
            <div className="analytics-insight-strip-item warning">
              <span>HIGH-RISK EXPOSURE</span>
              <strong>{formatPercent(metrics.highRiskRate)}</strong>
            </div>
            <div className="analytics-insight-strip-item neutral">
              <span>AVG AI CONFIDENCE</span>
              <strong>{formatPercent(metrics.averageConfidence)}</strong>
            </div>
          </section>

          {/* KPI */}

          <section className="analytics-kpi-grid">

            <KpiCard
              title="TOTAL INSPECTIONS"
              value={metrics.total}
              caption={
                range === "all"
                  ? "All stored records"
                  : `Filtered to ${range}`
              }
              color="blue"
            />

            <KpiCard
              title="PASS RATE"
              value={formatPercent(metrics.passRate)}
              caption={`${metrics.passed} passed / ${metrics.failed} failed`}
              color="green"
            />

            <KpiCard
              title="DEFECT RATE"
              value={formatPercent(metrics.defectRate)}
              caption={`${metrics.defective} defective inspections`}
              color="red"
            />

            <KpiCard
              title="AVG AI CONFIDENCE"
              value={formatPercent(
                metrics.averageConfidence
              )}
              caption="Recorded confidence values"
              color="purple"
            />

            <KpiCard
              title="HIGH-RISK RATE"
              value={formatPercent(metrics.highRiskRate)}
              caption={`${metrics.highRisk} high-risk records`}
              color="orange"
            />

            <KpiCard
              title="NORMAL PRODUCTS"
              value={metrics.normal}
              caption="AI classified as Normal"
              color="cyan"
            />

          </section>

          {/* TREND */}

          <section className="analytics-panel">

            <PanelHeader
              eyebrow="TREND MONITORING"
              title="Inspection Volume"
              right={`${trendData.length} active date${
                trendData.length === 1 ? "" : "s"
              }` }
            />

            {trendData.length === 0 ? (
              <EmptyState text="No dated inspection data available for this range." />
            ) : (
              <div className="trend-chart">

                {trendData.map((item) => {

                  const height = Math.max(
                    7,
                    (item.inspections /
                      trendMax) *
                      100
                  );

                  return (
                    <div
                      className="trend-column"
                      key={item.date}
                    >

                      <strong>
                        {item.inspections}
                      </strong>

                      <div className="trend-bar-area">

                        <div
                          className="trend-bar"
                          style={{
                            height: `${height}%`,
                          }}
                          title={`${item.inspections} inspections`}
                        />

                      </div>

                      <span>
                        {formatDate(item.date)}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

          {/* DISTRIBUTIONS */}

          <section className="analytics-two-column">

            <DistributionCard
              eyebrow="DEFECT ANALYTICS"
              title="Defect Distribution"
              data={defectCategories}
              empty="No recorded defect categories."
              type="defect"
            />

            <DistributionCard
              eyebrow="PRODUCT ANALYTICS"
              title="Product Categories"
              data={productCategories}
              empty="No recorded product categories."
              type="product"
            />

          </section>

          {/* QUALITY */}

          <section className="analytics-three-column">

            <ListCard
              eyebrow="QUALITY"
              title="Severity"
              data={severityData}
              empty="No severity values recorded."
            />

            <ListCard
              eyebrow="QUALITY"
              title="Risk"
              data={riskData}
              empty="No risk values recorded."
            />

            <ListCard
              eyebrow="QUALITY CONTROL"
              title="Decisions"
              data={decisionData}
              empty="No quality decisions recorded."
            />

          </section>

          {/* INSIGHTS */}

          <section className="analytics-panel">

            <PanelHeader
              eyebrow="OPERATIONAL INSIGHTS"
              title="Quality Intelligence"
              right="Derived from real inspection records"
            />

            {insights.length === 0 ? (
              <EmptyState text="Not enough recorded data to generate insights." />
            ) : (
              <div className="insights-grid">

                {insights.map((item) => {

                  const Icon = item.icon;

                  return (
                    <div
                      className={`insight-card ${getSemanticTone(item.value)}`}
                      key={item.label}
                    >

                      <div className="insight-icon">
                        <Icon size={18} />
                      </div>

                      <span>
                        {item.label}
                      </span>

                      <strong>
                        {item.value}
                      </strong>

                      <small>
                        {item.detail}
                      </small>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

          {/* SUMMARY */}

          <section className="analytics-panel">

            <PanelHeader
              eyebrow="QUALITY OVERVIEW"
              title="Current Inspection Performance"
            />

            <div className="summary-metrics">

              <Metric
                label="Passed"
                value={metrics.passed}
                icon={CheckCircle2}
              />

              <Metric
                label="Failed"
                value={metrics.failed}
                icon={XCircle}
              />

              <Metric
                label="Defective"
                value={metrics.defective}
                icon={TrendingDown}
              />

              <Metric
                label="High Risk"
                value={metrics.highRisk}
                icon={ShieldAlert}
              />

              <Metric
                label="AI Confidence"
                value={formatPercent(
                  metrics.averageConfidence
                )}
                icon={BarChart3}
              />

              <Metric
                label="Inspections"
                value={metrics.total}
                icon={TrendingUp}
              />

            </div>

          </section>

          {/* EXPORT */}

          <div className="analytics-export">

            <button
              onClick={exportCSV}
              disabled={!filteredHistory.length}
            >
              <Download size={15} />
              Export CSV
            </button>

          </div>

        </main>
      </div>
    </>
  );
}

function KpiCard({
  title,
  value,
  caption,
  color,
}) {
  return (
    <div
      className={`analytics-kpi-card ${color}`}
    >
      <span>{title}</span>

      <strong>{value}</strong>

      <small>{caption}</small>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  right,
}) {
  return (
    <div className="analytics-panel-header">

      <div>
        <span>{eyebrow}</span>

        <h2>{title}</h2>
      </div>

      {right && <small>{right}</small>}

    </div>
  );
}

function DistributionCard({
  eyebrow,
  title,
  data,
  empty,
  type,
}) {
  const max = Math.max(
    1,
    ...data.map(
      ([, value]) =>
        Number(value) || 0
    )
  );

  return (
    <div className="analytics-panel">

      <PanelHeader
        eyebrow={eyebrow}
        title={title}
        right={`${data.length} ${
          data.length === 1
            ? "category"
            : "categories"
        }`}
      />

      {data.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <div className="analytics-bars">

          {data.map(([name, value]) => {

            const width = Math.max(
              3,
              (Number(value) / max) *
                100
            );

            return (
              <div
                className="analytics-bar-row"
                key={name}
              >

                <div className="analytics-bar-label">

                  <span>{name}</span>

                  <strong>{value}</strong>

                </div>

                <div className="analytics-bar-track">

                  <div
                    className={`analytics-bar-fill ${type}`}
                    style={{
                      width: `${width}%`,
                    }}
                  />

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

function ListCard({
  eyebrow,
  title,
  data,
  empty,
}) {
  return (
    <div className="analytics-panel">

      <PanelHeader
        eyebrow={eyebrow}
        title={title}
      />

      {data.length === 0 ? (
        <EmptyState
          text={empty}
          compact
        />
      ) : (
        <div className="analytics-list">

          {data.map(([name, value]) => (

            <div
              className={`analytics-list-row ${getSemanticTone(name)}`}
              key={name}
            >
              <span>
                <i className="analytics-list-dot" />
                {name}
              </span>

              <strong>
                {value}
              </strong>
            </div>

          ))}

        </div>
      )}

    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="summary-metric">

      <Icon size={16} />

      <span>{label}</span>

      <strong>{value}</strong>

    </div>
  );
}

function EmptyState({
  text,
  compact = false,
}) {
  return (
    <div
      className={`analytics-empty ${
        compact ? "compact" : ""
      }`}
    >
      {text}
    </div>
  );
}

export default QualityAnalytics;