import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/ProductionOverview.css";

const EMPTY_OBJECT = {};

function ProductionOverview() {
  const navigate = useNavigate();

  const [productionOverview, setProductionOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const fetchProductionData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const [productionResponse, analyticsResponse] =
        await Promise.all([
          api.get("/production/overview"),
          api.get("/inspection/analytics"),
        ]);

      if (!productionResponse.data) {
        throw new Error(
          "No production overview data received."
        );
      }

      if (!analyticsResponse.data) {
        throw new Error(
          "No inspection analytics data received."
        );
      }

      setProductionOverview(productionResponse.data);
      setAnalytics(analyticsResponse.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(
        "Production overview data error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load production quality analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchProductionData();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchProductionData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      void fetchProductionData(true);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchProductionData]);

  const overview = useMemo(
    () => ({
      ...(analytics?.overview || EMPTY_OBJECT),
      ...(productionOverview || EMPTY_OBJECT),
    }),
    [analytics, productionOverview]
  );

  const trends = useMemo(
    () =>
      Array.isArray(analytics?.trends)
        ? analytics.trends
        : [],
    [analytics]
  );

  const productCategories = useMemo(
    () =>
      analytics?.product_categories ||
      EMPTY_OBJECT,
    [analytics]
  );

  const defectCategories = useMemo(
    () =>
      analytics?.defect_categories ||
      EMPTY_OBJECT,
    [analytics]
  );

  const severityDistribution = useMemo(
    () =>
      analytics?.severity_distribution ||
      EMPTY_OBJECT,
    [analytics]
  );

  const riskDistribution = useMemo(
    () =>
      analytics?.risk_distribution ||
      EMPTY_OBJECT,
    [analytics]
  );

  const qualityDecisions = useMemo(
    () =>
      analytics?.quality_decisions ||
      EMPTY_OBJECT,
    [analytics]
  );

  const maxTrendInspections = useMemo(() => {
    if (!trends.length) {
      return 1;
    }

    return Math.max(
      ...trends.map(
        (item) =>
          Number(item?.inspections) || 0
      ),
      1
    );
  }, [trends]);

  const productCategoryEntries = useMemo(
    () =>
      Object.entries(productCategories).filter(
        ([key, value]) =>
          key !== "Unknown" &&
          Number(value) > 0
      ),
    [productCategories]
  );

  const topProductCategory = useMemo(() => {
    if (!productCategoryEntries.length) {
      return null;
    }

    return [...productCategoryEntries].sort(
      (a, b) =>
        Number(b[1]) - Number(a[1])
    )[0];
  }, [productCategoryEntries]);

  const defectCategoryEntries = useMemo(
    () =>
      Object.entries(defectCategories).filter(
        ([key, value]) =>
          key !== "None" &&
          Number(value) > 0
      ),
    [defectCategories]
  );

  const topDefectCategory = useMemo(() => {
    if (!defectCategoryEntries.length) {
      return null;
    }

    return [...defectCategoryEntries].sort(
      (a, b) =>
        Number(b[1]) - Number(a[1])
    )[0];
  }, [defectCategoryEntries]);

  const severityEntries = useMemo(
    () =>
      Object.entries(
        severityDistribution
      ).filter(
        ([key, value]) =>
          key !== "None" &&
          Number(value) > 0
      ),
    [severityDistribution]
  );

  const activeSeverity = useMemo(() => {
    if (!severityEntries.length) {
      return null;
    }

    return [...severityEntries].sort(
      (a, b) =>
        Number(b[1]) - Number(a[1])
    )[0];
  }, [severityEntries]);

  const riskEntries = useMemo(
    () =>
      Object.entries(
        riskDistribution
      ).filter(
        ([, value]) =>
          Number(value) > 0
      ),
    [riskDistribution]
  );

  const activeRisk = useMemo(() => {
    if (!riskEntries.length) {
      return null;
    }

    return [...riskEntries].sort(
      (a, b) =>
        Number(b[1]) - Number(a[1])
    )[0];
  }, [riskEntries]);

  const totalInspections =
    Number(
      overview?.total_inspections
    ) || 0;

  const passed =
    Number(overview?.passed) || 0;

  const failed =
    Number(overview?.failed) || 0;

  const defective =
    Number(
      overview?.defective ??
        overview?.defective_products
    ) || 0;

  const passRate =
    Number(overview?.pass_rate) || 0;

  const defectRate =
    Number(overview?.defect_rate) || 0;

  const highRiskRate =
    Number(
      overview?.high_risk_rate
    ) || 0;

  const qualityStatus =
    productionOverview?.quality_status ||
    "";

  const currentQualityStatus =
    passRate >= 80
      ? "Good"
      : passRate >= 60
        ? "Needs Attention"
        : "Critical";

  const qualityStatusClass =
    passRate >= 80
      ? "good"
      : passRate >= 60
        ? "warning"
        : "critical";

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
      }
    );
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const qualityScore = Math.round(
    Math.min(passRate, 100) * 0.6 +
      Math.min(100, highRiskRate === 0 ? 100 : Math.max(0, 100 - highRiskRate)) * 0.25 +
      Math.min(100, passRate + (100 - Math.min(defectRate, 100))) * 0.15
  );

  const statusTone =
    passRate >= 80 ? "good" : passRate >= 60 ? "warning" : "critical";

  const qualityMessage =
    passRate >= 80
      ? "Production quality is on track."
      : passRate >= 60
        ? "Production quality needs attention."
        : "Production quality requires immediate review.";

  return (
    <>
      <SidebarSupervisor />

      <div className="dashboard">
        <Navbar title="Production Overview" />

        <main className="production-container">
          <header className="production-header">
            <div>
              <span className="production-eyebrow">
                FACTORY SUPERVISOR
              </span>

              <h1>
                Production Overview
              </h1>

              <p>
                Real-time quality and inspection
                performance based on recorded
                inspection data.
              </p>
            </div>

            <div className="production-header-actions">
              <div className={`production-live-pill ${autoRefresh ? "active" : ""}`}>
                <span />
                {autoRefresh ? "LIVE MONITORING" : "SYSTEM ONLINE"}
              </div>

              <button
                type="button"
                className="production-refresh"
                onClick={() => void fetchProductionData(true)}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "production-spin" : ""}
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </header>

          <section className="production-command-panel">
            <div className="production-command-copy">
              <div className="production-command-kicker">
                <Activity size={14} />
                OPERATIONAL QUALITY
              </div>
              <h2>{qualityMessage}</h2>
              <p>
                {totalInspections
                  ? `${totalInspections} inspections recorded with a ${passRate.toFixed(1)}% overall pass rate.`
                  : "Complete an inspection to start building your production quality picture."}
              </p>

              <div className="production-command-meta">
                <div>
                  <span>Last sync</span>
                  <strong>{lastUpdated ? formatDateTime(lastUpdated) : "Synchronizing..."}</strong>
                </div>
                <div>
                  <span>Defect rate</span>
                  <strong className="fail-text">{loading ? "—" : `${defectRate.toFixed(1)}%`}</strong>
                </div>
                <div>
                  <span>Risk exposure</span>
                  <strong className={highRiskRate > 10 ? "warning-text" : "good-text"}>
                    {loading ? "—" : `${highRiskRate.toFixed(1)}% high risk`}
                  </strong>
                </div>
              </div>
            </div>

            <div
              className={`production-health-ring ${statusTone}`}
              aria-label={`Production quality score ${qualityScore}%`}
            >
              <div
                className="production-health-ring-track"
                style={{
                  background: `conic-gradient(#22c55e 0 ${qualityScore}%, rgba(44,62,72,.55) ${qualityScore}% 100%)`,
                }}
              />
              <div className="production-health-ring-value">
                <Gauge size={17} />
                <strong>{loading ? "—" : `${qualityScore}%`}</strong>
                <span>health score</span>
              </div>
            </div>
          </section>

          <div className="production-toolbar">
            <div className="production-sync-status">
              <Activity size={14} />
              <span>Data status</span>
              <strong>
                {lastUpdated ? `Synced ${formatDateTime(lastUpdated)}` : "Synchronizing..."}
              </strong>
            </div>

            <label className="production-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              <span className="production-toggle-track" />
              <span>Auto refresh · 60s</span>
            </label>
          </div>

          {error && (
            <div className="production-error">
              <AlertTriangle size={18} />

              <span>{error}</span>

              <button
                onClick={fetchProductionData}
              >
                Retry
              </button>
            </div>
          )}

          <section className="production-kpi-grid">
            <div className="production-kpi-card blue">
              <div className="production-kpi-icon">
                <ClipboardCheck size={21} />
              </div>

              <div>
                <span>
                  Total Inspections
                </span>

                <strong>
                  {loading
                    ? "—"
                    : totalInspections}
                </strong>

                <small>
                  Recorded inspection volume
                </small>
              </div>
            </div>

            <div className="production-kpi-card green">
              <div className="production-kpi-icon">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <span>Passed</span>

                <strong>
                  {loading
                    ? "—"
                    : passed}
                </strong>

                <small>
                  {loading
                    ? "—"
                    : `${passRate.toFixed(
                        1
                      )}% pass rate`}
                </small>
              </div>
            </div>

            <div className="production-kpi-card red">
              <div className="production-kpi-icon">
                <XCircle size={21} />
              </div>

              <div>
                <span>Failed</span>

                <strong>
                  {loading
                    ? "—"
                    : failed}
                </strong>

                <small>
                  {loading
                    ? "—"
                    : `${defectRate.toFixed(
                        1
                      )}% defect rate`}
                </small>
              </div>
            </div>

            <div className="production-kpi-card purple">
              <div className="production-kpi-icon">
                <ShieldCheck size={21} />
              </div>

              <div>
                <span>
                  High Risk Rate
                </span>

                <strong>
                  {loading
                    ? "—"
                    : `${highRiskRate.toFixed(
                        1
                      )}%`}
                </strong>

                <small>
                  High and critical risk
                  inspections
                </small>
              </div>
            </div>
          </section>

          <section className="production-insight-strip">
            <div className="production-insight-card pass">
              <CheckCircle2 size={16} />
              <div>
                <span>PASS PERFORMANCE</span>
                <strong>{loading ? "—" : `${passRate.toFixed(1)}%`}</strong>
              </div>
              <small>Overall accepted inspections</small>
            </div>

            <div className="production-insight-card fail">
              <XCircle size={16} />
              <div>
                <span>DEFECT EXPOSURE</span>
                <strong>{loading ? "—" : `${defectRate.toFixed(1)}%`}</strong>
              </div>
              <small>Current defective rate</small>
            </div>

            <div className="production-insight-card warning">
              <AlertTriangle size={16} />
              <div>
                <span>HIGH-RISK EXPOSURE</span>
                <strong>{loading ? "—" : `${highRiskRate.toFixed(1)}%`}</strong>
              </div>
              <small>High and critical risk</small>
            </div>

            <div className="production-insight-card neutral">
              <ClipboardCheck size={16} />
              <div>
                <span>TOP PRODUCT</span>
                <strong>{loading ? "—" : topProductCategory ? topProductCategory[0] : "—"}</strong>
              </div>
              <small>{topProductCategory ? `${topProductCategory[1]} records` : "No category data"}</small>
            </div>
          </section>

          <section className="production-main-grid">
            <div className="production-panel">
              <div className="production-section-heading">
                <div>
                  <span>
                    QUALITY PERFORMANCE
                  </span>

                  <h2>
                    Inspection Performance
                  </h2>
                </div>

                <BarChart3 size={20} />
              </div>

              {loading ? (
                <div className="production-empty">
                  Loading performance data...
                </div>
              ) : !totalInspections ? (
                <div className="production-empty">
                  <ClipboardCheck size={30} />

                  <strong>
                    No inspection data
                  </strong>

                  <span>
                    Performance will appear
                    after inspections are
                    recorded.
                  </span>
                </div>
              ) : (
                <div className="performance-content">
                  <div className="performance-row">
                    <div className="performance-label">
                      <span>Passed</span>

                      <strong>
                        {passed}
                      </strong>
                    </div>

                    <div className="performance-track">
                      <div
                        className="performance-fill pass"
                        style={{
                          width: `${Math.min(
                            passRate,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <span className="performance-value">
                      {passRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="performance-row">
                    <div className="performance-label">
                      <span>
                        Defective
                      </span>

                      <strong>
                        {defective}
                      </strong>
                    </div>

                    <div className="performance-track">
                      <div
                        className="performance-fill defect"
                        style={{
                          width: `${Math.min(
                            defectRate,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <span className="performance-value">
                      {defectRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="performance-divider" />

                  <div className="performance-metric">
                    <span>
                      Current quality status
                    </span>

                    <strong
                      className={
                        qualityStatusClass
                      }
                    >
                      {currentQualityStatus}
                    </strong>
                  </div>

                  {qualityStatus && (
                    <div className="performance-metric">
                      <span>
                        Production status
                      </span>

                      <strong>
                        {qualityStatus}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="production-panel">
              <div className="production-section-heading">
                <div>
                  <span>
                    DATA SNAPSHOT
                  </span>

                  <h2>
                    Quality Signals
                  </h2>
                </div>

                <Activity size={20} />
              </div>

              <div className="signal-grid">
                <div className="signal-item">
                  <span>
                    Product Category
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : topProductCategory
                        ? topProductCategory[0]
                        : "No classified category"}
                  </strong>

                  {topProductCategory && (
                    <small>
                      {topProductCategory[1]} record
                      {Number(
                        topProductCategory[1]
                      ) !== 1
                        ? "s"
                        : ""}
                    </small>
                  )}
                </div>

                <div className="signal-item">
                  <span>
                    Defect Category
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : topDefectCategory
                        ? topDefectCategory[0]
                        : "No detected defect"}
                  </strong>

                  {topDefectCategory && (
                    <small>
                      {topDefectCategory[1]} record
                      {Number(
                        topDefectCategory[1]
                      ) !== 1
                        ? "s"
                        : ""}
                    </small>
                  )}
                </div>

                <div className="signal-item">
                  <span>Severity</span>

                  <strong>
                    {loading
                      ? "—"
                      : activeSeverity
                        ? activeSeverity[0]
                        : "None recorded"}
                  </strong>
                </div>

                <div className="signal-item">
                  <span>Risk Level</span>

                  <strong>
                    {loading
                      ? "—"
                      : activeRisk
                        ? activeRisk[0]
                        : "None recorded"}
                  </strong>
                </div>
              </div>

              <div className="signal-note">
                <ShieldCheck size={16} />

                <span>
                  All values are derived from
                  recorded inspection results.
                </span>
              </div>
            </div>
          </section>

          <section className="production-panel trend-panel">
            <div className="production-section-heading">
              <div>
                <span>
                  TREND MONITORING
                </span>

                <h2>
                  Inspection Trend
                </h2>
              </div>

              <TrendingUp size={20} />
            </div>

            {loading ? (
              <div className="production-empty">
                Loading trend data...
              </div>
            ) : !trends.length ? (
              <div className="production-empty">
                <Activity size={30} />

                <strong>
                  No trend data available
                </strong>

                <span>
                  Daily inspection trends will
                  appear here when available.
                </span>
              </div>
            ) : (
              <div className="trend-chart">
                {trends.map(
                  (item, index) => {
                    const inspections =
                      Number(
                        item?.inspections
                      ) || 0;

                    const height =
                      Math.max(
                        (inspections /
                          maxTrendInspections) *
                          100,
                        3
                      );

                    return (
                      <div
                        className="trend-column"
                        key={
                          item?.date ||
                          index
                        }
                      >
                        <div className="trend-bar-area">
                          <span className="trend-count">
                            {inspections}
                          </span>

                          <div
                            className="trend-bar"
                            style={{
                              height: `${height}%`,
                            }}
                          />
                        </div>

                        <span className="trend-date">
                          {formatDate(
                            item?.date
                          )}
                        </span>

                        <div className="trend-breakdown">
                          <span className="trend-pass">
                            {item?.passed ??
                              0}
                          </span>

                          <span className="trend-fail">
                            {item?.failed ??
                              0}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {!loading &&
              trends.length > 0 && (
                <div className="trend-legend">
                  <span>
                    <i className="legend-total" />
                    Total inspections
                  </span>

                  <span>
                    <i className="legend-pass" />
                    Passed
                  </span>

                  <span>
                    <i className="legend-fail" />
                    Failed
                  </span>
                </div>
              )}
          </section>

          <section className="distribution-grid">
            <div className="production-panel">
              <div className="production-section-heading">
                <div>
                  <span>
                    DEFECT ANALYSIS
                  </span>

                  <h2>
                    Defect Categories
                  </h2>
                </div>

                <AlertTriangle size={20} />
              </div>

              <div className="distribution-list">
                {Object.entries(
                  defectCategories
                )
                  .filter(
                    ([, value]) =>
                      Number(value) > 0
                  )
                  .map(
                    ([label, value]) => {
                      const total =
                        totalInspections || 1;

                      const percentage =
                        (Number(value) /
                          total) *
                        100;

                      return (
                        <div
                          className="distribution-row"
                          key={label}
                        >
                          <div className="distribution-label">
                            <span>
                              {label}
                            </span>

                            <strong>
                              {value}
                            </strong>
                          </div>

                          <div className="distribution-track">
                            <div
                              className={
                                label ===
                                "None"
                                  ? "distribution-fill neutral"
                                  : "distribution-fill defect"
                              }
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}

                {!Object.entries(
                  defectCategories
                ).some(
                  ([, value]) =>
                    Number(value) > 0
                ) && (
                  <div className="production-empty">
                    No defect category data
                    available.
                  </div>
                )}
              </div>
            </div>

            <div className="production-panel">
              <div className="production-section-heading">
                <div>
                  <span>
                    QUALITY DECISIONS
                  </span>

                  <h2>
                    Inspection Decisions
                  </h2>
                </div>

                <ShieldCheck size={20} />
              </div>

              <div className="decision-grid">
                <div className="decision-item pass">
                  <CheckCircle2 size={19} />

                  <div>
                    <span>PASS</span>

                    <strong>
                      {loading
                        ? "—"
                        : qualityDecisions.PASS ??
                          0}
                    </strong>
                  </div>
                </div>

                <div className="decision-item warning">
                  <AlertTriangle size={19} />

                  <div>
                    <span>WARNING</span>

                    <strong>
                      {loading
                        ? "—"
                        : qualityDecisions.WARNING ??
                          0}
                    </strong>
                  </div>
                </div>

                <div className="decision-item fail">
                  <XCircle size={19} />

                  <div>
                    <span>FAIL</span>

                    <strong>
                      {loading
                        ? "—"
                        : qualityDecisions.FAIL ??
                          0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="production-actions">
            <div>
              <span>
                SUPERVISOR TOOLS
              </span>

              <h2>
                Continue Quality Monitoring
              </h2>
            </div>

            <div className="production-action-buttons">
              <button
                onClick={() =>
                  navigate(
                    "/factory-supervisor/inspection-reports"
                  )
                }
              >
                <ClipboardCheck size={17} />

                Inspection Reports
              </button>

              <button
                onClick={() =>
                  navigate(
                    "/factory-supervisor/defect-trends"
                  )
                }
              >
                <TrendingDown size={17} />

                Defect Trends
              </button>

              <button
                onClick={() =>
                  navigate(
                    "/factory-supervisor/quality-analytics"
                  )
                }
              >
                <BarChart3 size={17} />

                Quality Analytics
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default ProductionOverview;