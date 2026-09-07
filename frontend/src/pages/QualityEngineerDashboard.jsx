import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileBarChart,
  History,
  Layers3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";
import PassFailChart from "../components/PassFailChart";
import RecentInspections from "../components/RecentInspections";

import api from "../utils/api";

import "../styles/Dashboard.css";

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(toNumber(value), min), max);
}

function formatDateLabel(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function normalizeStatus(item) {
  const status = String(
    item?.status ?? item?.quality_decision ?? ""
  ).trim().toLowerCase();

  if (status === "pass" || status === "passed") return "pass";
  if (status === "fail" || status === "failed") return "fail";
  return "warning";
}

function QualityEngineerDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = useCallback(async () => {
    const response = await api.get("/inspection/dashboard");

    if (
      !response?.data ||
      typeof response.data !== "object"
    ) {
      throw new Error("Invalid dashboard response.");
    }

    return response.data;
  }, []);

  const fetchHistory = useCallback(async () => {
    const response = await api.get("/inspection/history");

    if (!Array.isArray(response?.data)) {
      throw new Error("Invalid inspection history response.");
    }

    return response.data;
  }, []);

  const loadDashboard = useCallback(async () => {
    const [dashboardResult, historyResult] =
      await Promise.allSettled([
        fetchDashboard(),
        fetchHistory(),
      ]);

    if (dashboardResult.status === "rejected") {
      throw dashboardResult.reason;
    }

    return {
      dashboard: dashboardResult.value,
      history:
        historyResult.status === "fulfilled"
          ? historyResult.value
          : [],
      historyError:
        historyResult.status === "rejected"
          ? historyResult.reason
          : null,
    };
  }, [fetchDashboard, fetchHistory]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const result = await loadDashboard();

        if (cancelled) return;

        setStats(result.dashboard);
        setHistory(result.history);
        setAnalyticsError(
          result.historyError
            ? "Detailed analytics are temporarily unavailable."
            : ""
        );
        setError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled) return;

        console.error("Dashboard error:", err);
        setStats(null);
        setHistory([]);
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load dashboard data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setError("");

    try {
      const result = await loadDashboard();

      setStats(result.dashboard);
      setHistory(result.history);
      setAnalyticsError(
        result.historyError
          ? "Detailed analytics are temporarily unavailable."
          : ""
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard refresh error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to refresh dashboard data."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = useMemo(() => {
    if (!stats) return null;

    const total = toNumber(stats.total_inspections);
    const passed = toNumber(stats.passed);
    const failed = toNumber(stats.failed);

    const normalProducts = toNumber(
      stats.normal_products,
      toNumber(stats.normal)
    );

    const defectiveProducts = toNumber(
      stats.defective_products,
      toNumber(stats.defective)
    );

    const warningsFromStats = toNumber(stats.warnings);

    const averageConfidence =
      stats.average_confidence !== undefined &&
      stats.average_confidence !== null
        ? toNumber(stats.average_confidence, null)
        : null;

    const passRate =
      stats.pass_rate !== undefined &&
      stats.pass_rate !== null
        ? toNumber(stats.pass_rate, null)
        : total > 0
          ? (passed / total) * 100
          : null;

    const defectRate =
      stats.defect_rate !== undefined &&
      stats.defect_rate !== null
        ? toNumber(stats.defect_rate, null)
        : total > 0
          ? (defectiveProducts / total) * 100
          : null;

    return {
      total,
      passed,
      failed,
      normalProducts,
      defectiveProducts,
      warnings: warningsFromStats,
      averageConfidence,
      passRate,
      defectRate,
      qualityStatus: stats.quality_status ?? null,
    };
  }, [stats]);

  const derivedAnalytics = useMemo(() => {
    const safeHistory = Array.isArray(history) ? history : [];

    const categoryCounts = {};
    const severityCounts = {};
    const riskCounts = {};
    const trendMap = {};

    let warningCount = 0;
    let highRiskCount = 0;

    safeHistory.forEach((item) => {
      const category =
        item?.product_category ||
        item?.category ||
        "Unknown";

      if (category !== "Unknown") {
        categoryCounts[category] =
          (categoryCounts[category] || 0) + 1;
      }

      const severity =
        item?.severity ||
        item?.severity_level ||
        "Unknown";

      if (severity !== "Unknown") {
        severityCounts[severity] =
          (severityCounts[severity] || 0) + 1;
      }

      const risk =
        item?.risk_level ||
        item?.risk ||
        "Unknown";

      if (risk !== "Unknown") {
        riskCounts[risk] =
          (riskCounts[risk] || 0) + 1;
      }

      const status = normalizeStatus(item);

      if (status === "warning") {
        warningCount += 1;
      }

      if (
        String(risk).toLowerCase() === "high" ||
        String(risk).toLowerCase() === "critical"
      ) {
        highRiskCount += 1;
      }

      const rawDate =
        item?.uploaded_at ||
        item?.created_at ||
        item?.date;

      if (rawDate) {
        const date = new Date(rawDate);

        if (!Number.isNaN(date.getTime())) {
          const key = date.toISOString().slice(0, 10);

          if (!trendMap[key]) {
            trendMap[key] = {
              date: key,
              inspections: 0,
              passed: 0,
              failed: 0,
              warnings: 0,
            };
          }

          trendMap[key].inspections += 1;

          if (status === "pass") {
            trendMap[key].passed += 1;
          } else if (status === "fail") {
            trendMap[key].failed += 1;
          } else {
            trendMap[key].warnings += 1;
          }
        }
      }
    });

    const trends = Object.values(trendMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const severities = [
      "Critical",
      "High",
      "Medium",
      "Low",
    ].map((name) => [
      name,
      toNumber(severityCounts[name]),
    ]);

    const risks = [
      "Critical",
      "High",
      "Medium",
      "Low",
    ].map((name) => [
      name,
      toNumber(riskCounts[name]),
    ]);

    const total = safeHistory.length;

    return {
      total,
      trends,
      topCategories,
      severities,
      risks,
      warningCount,
      highRiskCount,
    };
  }, [history]);

  const calculatedPassPercentage =
    metrics && metrics.total > 0
      ? (metrics.passed / metrics.total) * 100
      : null;

  const calculatedFailPercentage =
    metrics && metrics.total > 0
      ? (metrics.failed / metrics.total) * 100
      : null;

  const displayedPassRate =
    metrics?.passRate !== null &&
    metrics?.passRate !== undefined
      ? metrics.passRate
      : calculatedPassPercentage;

  const effectiveWarningCount =
    metrics && metrics.warnings > 0
      ? metrics.warnings
      : derivedAnalytics.warningCount;

  const effectiveHighRiskCount =
    derivedAnalytics.highRiskCount;

  const updatedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const insight = useMemo(() => {
    if (!metrics) return null;

    const passRate = clamp(
      metrics.passRate ??
        calculatedPassPercentage ??
        0
    );

    if (metrics.total === 0) {
      return {
        tone: "neutral",
        icon: Activity,
        title: "Inspection workspace ready",
        text: "Run a new inspection to start building quality intelligence.",
      };
    }

    if (effectiveHighRiskCount > 0) {
      return {
        tone: "danger",
        icon: ShieldAlert,
        title: "High-risk items need attention",
        text: `${effectiveHighRiskCount} inspection${
          effectiveHighRiskCount === 1 ? "" : "s"
        } are marked High or Critical risk.`,
      };
    }

    if (passRate >= 95) {
      return {
        tone: "positive",
        icon: ShieldCheck,
        title: "Quality performance is strong",
        text: `Current pass rate is ${passRate.toFixed(
          1
        )}%. Keep monitoring new inspections for changes.`,
      };
    }

    if (passRate >= 85) {
      return {
        tone: "watch",
        icon: TrendingUp,
        title: "Quality performance is being maintained",
        text: `Current pass rate is ${passRate.toFixed(
          1
        )}%. Review failed and warning inspections regularly.`,
      };
    }

    return {
      tone: "danger",
      icon: TrendingDown,
      title: "Quality performance needs review",
      text: `Current pass rate is ${passRate.toFixed(
        1
      )}%. Investigate recent failed inspections.`,
    };
  }, [
    calculatedPassPercentage,
    effectiveHighRiskCount,
    metrics,
  ]);

  const InsightIcon = insight?.icon || Activity;

  if (loading && !stats) {
    return (
      <>
        <Sidebar />
        <main className="dashboard">
          <Navbar />
          <section className="dashboard-state loading-state">
            <RefreshCw
              size={25}
              className="spinning"
            />
            <div>
              <h3>Loading inspection data</h3>
              <p>
                Fetching the latest quality
                statistics.
              </p>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (error && !stats) {
    return (
      <>
        <Sidebar />
        <main className="dashboard">
          <Navbar />
          <section className="dashboard-state error-state">
            <div className="state-icon">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3>Dashboard unavailable</h3>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="state-action"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                size={14}
                className={
                  refreshing ? "spinning" : ""
                }
              />
              Try Again
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="dashboard">
        <Navbar />

        <section className="dashboard-heading">
          <div>
            <span className="dashboard-eyebrow">
              QUALITY CONTROL
            </span>

            <h1>Inspection Overview</h1>

            <p>
              Monitor AI-powered product
              inspections and quality performance.
            </p>

            {updatedTime && (
              <span className="dashboard-updated">
                <Activity size={12} />
                Updated at {updatedTime}
              </span>
            )}
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "spinning" : ""
              }
            />
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </section>

        {error && stats && (
          <section className="dashboard-state error-state">
            <div className="state-icon">
              <AlertTriangle size={18} />
            </div>

            <div>
              <h3>Refresh failed</h3>
              <p>{error}</p>
            </div>

            <button
              type="button"
              className="state-action"
              onClick={handleRefresh}
            >
              Retry
            </button>
          </section>
        )}

        {metrics && (
          <>
            <section className="cards">
              <DashboardCard
                title="Total Inspections"
                value={metrics.total}
              />

              <DashboardCard
                title="Passed"
                value={metrics.passed}
              />

              <DashboardCard
                title="Failed"
                value={metrics.failed}
              />

              <DashboardCard
                title="Average Confidence"
                value={
                  metrics.averageConfidence !==
                  null
                    ? `${metrics.averageConfidence}%`
                    : "Not available"
                }
              />
            </section>

            <section className="dashboard-insight">
              <div
                className={`insight-icon ${insight?.tone || "neutral"}`}
              >
                <InsightIcon size={18} />
              </div>

              <div className="insight-copy">
                <span className="section-label">
                  AI QUALITY SIGNAL
                </span>
                <h2>
                  {insight?.title ||
                    "Quality intelligence"}
                </h2>
                <p>
                  {insight?.text ||
                    "Quality signals will appear as inspection data becomes available."}
                </p>
              </div>

              <button
                type="button"
                className="insight-action"
                onClick={() =>
                  navigate("/inspection-history")
                }
              >
                Review history
                <ArrowRight size={14} />
              </button>
            </section>

            <section className="performance-grid">
              <div className="performance-card">
                <div className="performance-header">
                  <div>
                    <span className="section-label">
                      QUALITY PERFORMANCE
                    </span>
                    <h2>Pass Rate</h2>
                  </div>

                  <strong className="performance-value">
                    {displayedPassRate !== null
                      ? `${toNumber(
                          displayedPassRate
                        ).toFixed(1)}%`
                      : "Not available"}
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width:
                        displayedPassRate !== null
                          ? `${clamp(
                              displayedPassRate
                            )}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="progress-info">
                  <span>
                    {metrics.passed} passed
                  </span>
                  <span>
                    {metrics.failed} failed
                  </span>
                </div>
              </div>

              <div className="performance-card">
                <div className="performance-header">
                  <div>
                    <span className="section-label">
                      INSPECTION STATUS
                    </span>
                    <h2>Distribution</h2>
                  </div>

                  <div className="total-label">
                    TOTAL
                    <strong>{metrics.total}</strong>
                  </div>
                </div>

                <div className="distribution">
                  <div className="distribution-item">
                    <div className="distribution-title">
                      <span className="status-dot passed-dot" />
                      Passed
                      <strong>
                        {calculatedPassPercentage !==
                        null
                          ? `${calculatedPassPercentage.toFixed(
                              1
                            )}%`
                          : "—"}
                      </strong>
                    </div>

                    <div className="distribution-track">
                      <div
                        className="distribution-fill passed-fill"
                        style={{
                          width:
                            calculatedPassPercentage !==
                            null
                              ? `${clamp(
                                  calculatedPassPercentage
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="distribution-item">
                    <div className="distribution-title">
                      <span className="status-dot failed-dot" />
                      Failed
                      <strong>
                        {calculatedFailPercentage !==
                        null
                          ? `${calculatedFailPercentage.toFixed(
                              1
                            )}%`
                          : "—"}
                      </strong>
                    </div>

                    <div className="distribution-track">
                      <div
                        className="distribution-fill failed-fill"
                        style={{
                          width:
                            calculatedFailPercentage !==
                            null
                              ? `${clamp(
                                  calculatedFailPercentage
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="quality-metrics-grid">
              <div className="quality-metric-card">
                <div className="quality-metric-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span>NORMAL PRODUCTS</span>
                  <strong>
                    {metrics.normalProducts}
                  </strong>
                </div>
              </div>

              <div className="quality-metric-card">
                <div className="quality-metric-icon">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span>DEFECTIVE PRODUCTS</span>
                  <strong>
                    {metrics.defectiveProducts}
                  </strong>
                </div>
              </div>

              <div className="quality-metric-card">
                <div className="quality-metric-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <span>WARNINGS</span>
                  <strong>
                    {effectiveWarningCount}
                  </strong>
                </div>
              </div>

              <div className="quality-metric-card">
                <div className="quality-metric-icon">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span>HIGH-RISK ITEMS</span>
                  <strong>
                    {effectiveHighRiskCount}
                  </strong>
                </div>
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-card analytics-trend-card">
                <div className="analytics-heading">
                  <div>
                    <span className="section-label">
                      ACTIVITY TREND
                    </span>
                    <h2>Inspection activity</h2>
                  </div>
                  <BarChart3 size={18} />
                </div>

                {derivedAnalytics.trends.length ? (
                  <div className="trend-chart">
                    <div className="trend-y-labels">
                      <span>
                        {Math.max(
                          ...derivedAnalytics.trends.map(
                            (item) =>
                              item.inspections
                          ),
                          1
                        )}
                      </span>
                      <span>0</span>
                    </div>

                    <div className="trend-plot">
                      <div className="trend-grid-line top" />
                      <div className="trend-grid-line middle" />
                      <div className="trend-grid-line bottom" />

                      <svg
                        className="trend-svg"
                        viewBox="0 0 700 210"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label="Inspection activity trend"
                      >
                        {(() => {
                          const data =
                            derivedAnalytics.trends;
                          const maxValue =
                            Math.max(
                              ...data.map(
                                (item) =>
                                  item.inspections
                              ),
                              1
                            );

                          const points = data.map(
                            (item, index) => {
                              const x =
                                data.length === 1
                                  ? 350
                                  : (index /
                                      (data.length -
                                        1)) *
                                    700;

                              const y =
                                190 -
                                (item.inspections /
                                  maxValue) *
                                  155;

                              return `${x},${y}`;
                            }
                          );

                          return (
                            <>
                              <polyline
                                className="trend-line"
                                points={points.join(" ")}
                              />
                              {data.map(
                                (
                                  item,
                                  index
                                ) => {
                                  const x =
                                    data.length ===
                                    1
                                      ? 350
                                      : (index /
                                          (data.length -
                                            1)) *
                                        700;

                                  const y =
                                    190 -
                                    (item.inspections /
                                      maxValue) *
                                      155;

                                  return (
                                    <circle
                                      key={`${item.date}-${index}`}
                                      className="trend-point"
                                      cx={x}
                                      cy={y}
                                      r="4"
                                    />
                                  );
                                }
                              )}
                            </>
                          );
                        })()}
                      </svg>

                      <div className="trend-labels">
                        {derivedAnalytics.trends.map(
                          (item) => (
                            <span key={item.date}>
                              {formatDateLabel(
                                item.date
                              )}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="analytics-empty">
                    <Layers3 size={22} />
                    <p>
                      No dated inspection activity
                      is available yet.
                    </p>
                  </div>
                )}

                <div className="trend-legend">
                  <span>
                    <i className="legend-dot inspections" />
                    Inspections
                  </span>
                  <span>
                    {derivedAnalytics.total} records
                  </span>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-heading">
                  <div>
                    <span className="section-label">
                      PRODUCT MIX
                    </span>
                    <h2>Top categories</h2>
                  </div>
                  <Layers3 size={18} />
                </div>

                {derivedAnalytics.topCategories.length ? (
                  <div className="category-list">
                    {derivedAnalytics.topCategories.map(
                      ([name, count]) => {
                        const max =
                          derivedAnalytics.topCategories[0]?.[1] ||
                          1;
                        const percentage =
                          (count / max) * 100;

                        return (
                          <div
                            className="category-row"
                            key={name}
                          >
                            <div className="category-row-head">
                              <span>
                                {name.replace(
                                  /_/g,
                                  " "
                                )}
                              </span>
                              <strong>{count}</strong>
                            </div>
                            <div className="category-track">
                              <div
                                className="category-fill"
                                style={{
                                  width: `${clamp(
                                    percentage
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="analytics-empty compact">
                    <Layers3 size={20} />
                    <p>
                      Category analytics will
                      appear after inspections.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-heading">
                  <div>
                    <span className="section-label">
                      SEVERITY MONITOR
                    </span>
                    <h2>Defect severity</h2>
                  </div>
                  <AlertTriangle size={18} />
                </div>

                <div className="severity-list">
                  {derivedAnalytics.severities.map(
                    ([name, count]) => {
                      const percentage =
                        metrics.total > 0
                          ? (count /
                              metrics.total) *
                            100
                          : 0;

                      return (
                        <div
                          className={`severity-row severity-${name.toLowerCase()}`}
                          key={name}
                        >
                          <div className="severity-head">
                            <span>{name}</span>
                            <strong>
                              {count}
                            </strong>
                          </div>
                          <div className="severity-track">
                            <div
                              className="severity-fill"
                              style={{
                                width: `${clamp(
                                  percentage
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-heading">
                  <div>
                    <span className="section-label">
                      RISK MONITOR
                    </span>
                    <h2>Risk distribution</h2>
                  </div>
                  <ShieldAlert size={18} />
                </div>

                <div className="risk-grid">
                  {derivedAnalytics.risks.map(
                    ([name, count]) => (
                      <div
                        className={`risk-item risk-${name.toLowerCase()}`}
                        key={name}
                      >
                        <span>{name}</span>
                        <strong>{count}</strong>
                      </div>
                    )
                  )}
                </div>

                <div className="risk-summary">
                  <Zap size={15} />
                  <span>
                    {effectiveHighRiskCount} High/Critical
                    item
                    {effectiveHighRiskCount === 1
                      ? ""
                      : "s"} requiring attention
                  </span>
                </div>
              </div>
            </section>

            {analyticsError && (
              <div className="analytics-notice">
                <AlertTriangle size={15} />
                <span>{analyticsError}</span>
                <button
                  type="button"
                  onClick={handleRefresh}
                >
                  Retry
                </button>
              </div>
            )}

            <section className="chart-section pass-fail-section">
              <div className="chart-heading">
                <div>
                  <span className="section-label">
                    INSPECTION ANALYTICS
                  </span>
                  <h2>Pass vs Fail</h2>
                </div>

                <span className="chart-total">
                  {metrics.total} inspections
                </span>
              </div>

              <PassFailChart
                passed={metrics.passed}
                failed={metrics.failed}
              />
            </section>

            <section className="quick-actions">
              <div className="quick-actions-header">
                <div>
                  <span className="section-label">
                    QUICK ACTIONS
                  </span>
                  <h2>Inspection Tools</h2>
                </div>
              </div>

              <div className="action-grid">
                <button
                  type="button"
                  className="action-card"
                  onClick={() =>
                    navigate("/upload")
                  }
                >
                  <div className="action-icon blue">
                    <Upload size={18} />
                  </div>
                  <div>
                    <h3>New Inspection</h3>
                    <p>
                      Upload a product image
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="action-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="action-card"
                  onClick={() =>
                    navigate(
                      "/inspection-history"
                    )
                  }
                >
                  <div className="action-icon purple">
                    <History size={18} />
                  </div>
                  <div>
                    <h3>Inspection History</h3>
                    <p>
                      Review previous inspections
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="action-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="action-card"
                  onClick={() =>
                    navigate("/quality-reports")
                  }
                >
                  <div className="action-icon cyan">
                    <FileBarChart size={18} />
                  </div>
                  <div>
                    <h3>Quality Reports</h3>
                    <p>
                      View quality reports
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="action-arrow"
                  />
                </button>
              </div>
            </section>

            <section className="recent-section">
              <div className="recent-heading">
                <div>
                  <span className="section-label">
                    ACTIVITY
                  </span>
                  <h2>Recent Inspections</h2>
                </div>

                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() =>
                    navigate(
                      "/inspection-history"
                    )
                  }
                >
                  View All
                  <ArrowRight size={14} />
                </button>
              </div>

              <RecentInspections />
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default QualityEngineerDashboard;
