import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  Users,
  XCircle,
} from "lucide-react";

import {
  PredictionBadge,
  ConfidenceBadge,
  SeverityBadge,
  RiskBadge,
  DecisionBadge,
} from "../components/StatusBadge";

import "../styles/FactorySupervisorDashboard.css";

const EMPTY_STATS = {
  total_inspections: 0,
  passed: 0,
  failed: 0,
  pass_rate: 0,
  average_confidence: 0,
};

const getTimestamp = (item) =>
  item?.created_at ||
  item?.uploaded_at ||
  item?.timestamp ||
  item?.inspection_date ||
  item?.date ||
  null;

const getFileName = (item) =>
  item?.filename ||
  item?.file_name ||
  item?.image_name ||
  item?.inspection_id ||
  "Inspection";

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (value) => {
  if (!value) return "Unknown";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
};

const number = (value) => Number(value) || 0;

function FactorySupervisorDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await api.get("/inspection/dashboard");
      const data = response.data || {};
      setStats({
        total_inspections: number(data.total_inspections),
        passed: number(data.passed),
        failed: number(data.failed),
        pass_rate: number(data.pass_rate),
        average_confidence: number(data.average_confidence),
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Supervisor dashboard error:", err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRecentInspections = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await api.get("/inspection/history");
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.inspections)
          ? response.data.inspections
          : [];

      const sorted = [...data].sort(
        (a, b) =>
          new Date(getTimestamp(b) || 0) - new Date(getTimestamp(a) || 0)
      );

      setHistory(sorted.slice(0, 8));
    } catch (err) {
      console.error("Inspection history error:", err);
      setHistoryError("Unable to load recent inspections.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([fetchDashboardData(true), fetchRecentInspections()]);
  }, [fetchDashboardData, fetchRecentInspections]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void Promise.all([
        fetchDashboardData(),
        fetchRecentInspections(),
      ]);
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchDashboardData, fetchRecentInspections]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = window.setInterval(refreshDashboard, 60000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshDashboard]);

  const defectRate = useMemo(() => {
    if (!stats.total_inspections) return 0;
    return (stats.failed / stats.total_inspections) * 100;
  }, [stats.failed, stats.total_inspections]);

  const highRiskCount = useMemo(
    () => history.filter((item) => String(item.risk_level || "").toLowerCase() === "high").length,
    [history]
  );

  const mediumRiskCount = useMemo(
    () => history.filter((item) => String(item.risk_level || "").toLowerCase() === "medium").length,
    [history]
  );

  const defectiveCount = useMemo(
    () => history.filter((item) => String(item.prediction || "").toLowerCase() === "defective").length,
    [history]
  );

  const recentPassRate = useMemo(() => {
    if (!history.length) return 0;
    const passed = history.filter(
      (item) => String(item.prediction || "").toLowerCase() === "non-defective"
    ).length;
    return (passed / history.length) * 100;
  }, [history]);

  const qualityScore = useMemo(() => {
    if (!stats.total_inspections) return 0;
    const passComponent = Math.min(stats.pass_rate, 100) * 0.55;
    const confidenceComponent = Math.min(stats.average_confidence, 100) * 0.25;
    const defectComponent = Math.max(0, 100 - Math.min(defectRate, 100)) * 0.2;
    return Math.round(passComponent + confidenceComponent + defectComponent);
  }, [stats, defectRate]);

  const recentBars = useMemo(
    () =>
      [...history].reverse().map((item) => {
        const confidence = number(item.confidence);
        const defective = String(item.prediction || "").toLowerCase() === "defective";
        return { confidence, defective };
      }),
    [history]
  );

  const openInspection = (item) => {
    sessionStorage.setItem("inspectionResult", JSON.stringify(item));
    navigate("/inspection-results");
  };

  const exportHistory = () => {
    if (!history.length) return;
    const headers = [
      "Inspection",
      "Product",
      "Result",
      "Confidence",
      "Severity",
      "Risk",
      "Decision",
      "Date",
    ];
    const rows = history.map((item) => [
      getFileName(item),
      item.product_category || "Not available",
      item.prediction || "Not available",
      item.confidence ?? "Not available",
      item.severity ?? "Not available",
      item.risk_level || "Not available",
      item.quality_decision || "Not available",
      formatDate(getTimestamp(item)),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "visioninspect-recent-inspections.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SidebarSupervisor />

      <div className="dashboard">
        <Navbar title="Factory Supervisor Dashboard" />

        <main className="supervisor-dashboard">
          <header className="supervisor-page-header">
            <div>
              <div className="supervisor-breadcrumb">
                <span className="supervisor-breadcrumb-dot" />
                FACTORY SUPERVISOR
                <span>/</span>
                QUALITY CONTROL
              </div>
              <h1>Factory Quality Command Center</h1>
              <p>One view for inspection health, defect risk, and production quality.</p>
            </div>

            <div className="supervisor-header-actions">
              <div className={`supervisor-live-pill ${autoRefresh ? "active" : ""}`}>
                <span />
                {autoRefresh ? "LIVE MONITORING" : "SYSTEM ONLINE"}
              </div>
              <button
                type="button"
                className="supervisor-refresh-button"
                onClick={refreshDashboard}
                disabled={loading || refreshing}
              >
                <RefreshCw size={15} className={refreshing ? "spinning" : ""} />
                {refreshing ? "Refreshing" : "Refresh data"}
              </button>
            </div>
          </header>

          <section className="supervisor-command-panel">
            <div className="supervisor-command-copy">
              <div className="supervisor-command-kicker"><Activity size={14} /> OPERATIONAL QUALITY</div>
              <h2>Production quality is <span>{qualityScore >= 75 ? "on track" : "being watched"}.</span></h2>
              <p>
                {stats.total_inspections
                  ? `${stats.total_inspections} inspections recorded with a ${stats.pass_rate.toFixed(1)}% overall pass rate.`
                  : "Complete an inspection to start building your quality picture."}
              </p>

              <div className="supervisor-command-meta">
                <div><span>Last sync</span><strong>{lastUpdated ? formatRelative(lastUpdated) : "Loading..."}</strong></div>
                <div><span>AI confidence</span><strong>{loading ? "—" : `${stats.average_confidence.toFixed(1)}%`}</strong></div>
                <div><span>High-risk records</span><strong>{historyLoading ? "—" : highRiskCount}</strong></div>
              </div>
            </div>

            <div className="supervisor-health-ring" aria-label={`Quality health score ${qualityScore}%`}>
              <div className="supervisor-health-ring-track" style={{ background: `conic-gradient(#17c8ff 0 ${qualityScore}%, rgba(38,62,76,.65) ${qualityScore}% 100%)` }} />
              <div className="supervisor-health-ring-value">
                <Gauge size={18} />
                <strong>{loading ? "—" : `${qualityScore}%`}</strong>
                <span>health score</span>
              </div>
            </div>
          </section>

          <div className="supervisor-toolbar">
            <div className="supervisor-updated">
              <Activity size={14} />
              <span>Data status</span>
              <strong>{lastUpdated ? `Synced ${formatDate(lastUpdated)}` : "Synchronizing..."}</strong>
            </div>
            <label className="supervisor-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              <span className="supervisor-toggle-track" />
              <span>Auto refresh · 60s</span>
            </label>
          </div>

          {error && (
            <div className="supervisor-dashboard-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button type="button" onClick={refreshDashboard}>Retry</button>
            </div>
          )}

          <section className="supervisor-kpi-grid">
            <article className="supervisor-kpi-card inspections">
              <div className="supervisor-kpi-top"><span>Total inspections</span><ClipboardCheck size={17} /></div>
              <strong>{loading ? "—" : stats.total_inspections}</strong>
              <div className="supervisor-kpi-bottom"><span>All recorded inspections</span><b>100%</b></div>
            </article>

            <article className="supervisor-kpi-card passed">
              <div className="supervisor-kpi-top"><span>Passed</span><CheckCircle2 size={17} /></div>
              <strong>{loading ? "—" : stats.passed}</strong>
              <div className="supervisor-kpi-bottom"><span>Quality accepted</span><b>{loading ? "—" : `${stats.pass_rate.toFixed(1)}%`}</b></div>
            </article>

            <article className="supervisor-kpi-card failed">
              <div className="supervisor-kpi-top"><span>Failed</span><XCircle size={17} /></div>
              <strong>{loading ? "—" : stats.failed}</strong>
              <div className="supervisor-kpi-bottom"><span>Defect rate</span><b>{loading ? "—" : `${defectRate.toFixed(1)}%`}</b></div>
            </article>

            <article className="supervisor-kpi-card confidence">
              <div className="supervisor-kpi-top"><span>AI confidence</span><Activity size={17} /></div>
              <strong>{loading ? "—" : `${stats.average_confidence.toFixed(1)}%`}</strong>
              <div className="supervisor-kpi-bottom"><span>Prediction confidence</span><b>{stats.average_confidence >= 80 ? "Strong" : "Watch"}</b></div>
            </article>
          </section>

          <section className="supervisor-insight-grid">
            <article className="supervisor-panel supervisor-performance-panel">
              <div className="supervisor-panel-heading">
                <div><span>QUALITY PERFORMANCE</span><h2>Inspection health</h2></div>
                <BarChart3 size={19} />
              </div>

              <div className="supervisor-performance-content">
                <div className="supervisor-performance-bars">
                  <div className="supervisor-performance-row">
                    <div className="supervisor-performance-label"><span>Pass rate</span><strong>{loading ? "—" : `${stats.pass_rate.toFixed(1)}%`}</strong></div>
                    <div className="supervisor-progress"><div className="supervisor-progress-fill pass" style={{ width: `${Math.min(stats.pass_rate, 100)}%` }} /></div>
                  </div>
                  <div className="supervisor-performance-row">
                    <div className="supervisor-performance-label"><span>Defect rate</span><strong>{loading ? "—" : `${defectRate.toFixed(1)}%`}</strong></div>
                    <div className="supervisor-progress"><div className="supervisor-progress-fill fail" style={{ width: `${Math.min(defectRate, 100)}%` }} /></div>
                  </div>
                  <div className="supervisor-performance-row">
                    <div className="supervisor-performance-label"><span>AI confidence</span><strong>{loading ? "—" : `${stats.average_confidence.toFixed(1)}%`}</strong></div>
                    <div className="supervisor-progress"><div className="supervisor-progress-fill confidence" style={{ width: `${Math.min(stats.average_confidence, 100)}%` }} /></div>
                  </div>
                </div>

                <div className="supervisor-mini-chart">
                  <div className="supervisor-mini-chart-title"><span>Recent confidence</span><b>8 records</b></div>
                  <div className="supervisor-bars" aria-label="Recent confidence chart">
                    {recentBars.length ? recentBars.map((bar, index) => (
                      <div className={`supervisor-bar ${bar.defective ? "defective" : ""}`} key={`${index}-${bar.confidence}`}>
                        <i style={{ height: `${Math.max(8, Math.min(bar.confidence, 100))}%` }} />
                      </div>
                    )) : <span className="supervisor-chart-empty">No recent data</span>}
                  </div>
                </div>
              </div>
            </article>

            <article className="supervisor-panel supervisor-risk-panel">
              <div className="supervisor-panel-heading">
                <div><span>RISK WATCH</span><h2>Recent inspection mix</h2></div>
                <ShieldAlert size={19} />
              </div>

              <div className="supervisor-risk-content">
                <div className="supervisor-risk-stat primary"><span>Recent records</span><strong>{historyLoading ? "—" : history.length}</strong><small>Latest inspections</small></div>
                <div className="supervisor-risk-stat danger"><span>Defective</span><strong>{historyLoading ? "—" : defectiveCount}</strong><small>Needs attention</small></div>
                <div className="supervisor-risk-stat warning"><span>High risk</span><strong>{historyLoading ? "—" : highRiskCount}</strong><small>Immediate review</small></div>
                <div className="supervisor-risk-stat medium"><span>Medium risk</span><strong>{historyLoading ? "—" : mediumRiskCount}</strong><small>Keep watching</small></div>
              </div>

              <div className="supervisor-risk-footer">
                <div><span>Recent pass rate</span><strong>{historyLoading ? "—" : `${recentPassRate.toFixed(0)}%`}</strong></div>
                <button type="button" onClick={() => navigate("/defect-trends")}>Open risk trends <ChevronRight size={14} /></button>
              </div>
            </article>
          </section>

          <section className="supervisor-recent-card supervisor-panel">
            <div className="supervisor-panel-heading recent-heading">
              <div><span>INSPECTION ACTIVITY</span><h2>Recent inspections</h2></div>
              <div className="supervisor-section-actions">
                <button type="button" className="supervisor-outline-button" onClick={exportHistory} disabled={!history.length}>
                  <Download size={14} /> Export CSV
                </button>
                <button type="button" className="supervisor-outline-button primary" onClick={() => navigate("/inspection-history")}>
                  View all <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {historyLoading ? (
              <div className="supervisor-empty-state">Loading recent inspections...</div>
            ) : historyError ? (
              <div className="supervisor-empty-state error"><AlertTriangle size={26} /><strong>Unable to load inspections</strong><span>{historyError}</span></div>
            ) : history.length === 0 ? (
              <div className="supervisor-empty-state"><ClipboardCheck size={27} /><strong>No inspections available</strong><span>Recorded inspections will appear here.</span></div>
            ) : (
              <div className="supervisor-table-wrapper">
                <table className="supervisor-inspection-table">
                  <thead>
                    <tr><th>Inspection</th><th>Product</th><th>Result</th><th>Confidence</th><th>Severity</th><th>Risk</th><th>Decision</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {history.map((item, index) => (
                      <tr
                        key={item._id || item.id || item.inspection_id || index}
                        onClick={() => openInspection(item)}
                        tabIndex={0}
                        onKeyDown={(event) => { if (event.key === "Enter") openInspection(item); }}
                      >
                        <td><div className="supervisor-inspection-name"><FileText size={14} /><span>{getFileName(item)}</span></div></td>
                        <td>{item.product_category || "Not available"}</td>
                        <td>
                          <div className={`supervisor-result-status ${(() => {
                            const decision = String(item.quality_decision || "").toLowerCase();
                            const status = String(item.status || "").toLowerCase();
                            const prediction = String(item.prediction || "").toLowerCase();
                            if (decision.includes("fail") || status === "fail" || prediction.includes("defective")) return "fail";
                            if (decision.includes("warning") || status === "warning") return "warning";
                            if (decision.includes("pass") || status === "pass" || prediction.includes("normal") || prediction.includes("non-defective")) return "pass";
                            return "neutral";
                          })()}`}>
                            <span className="supervisor-result-dot" />
                            <PredictionBadge value={item.prediction || "Not available"} />
                          </div>
                        </td>
                        <td><ConfidenceBadge value={item.confidence} /></td>
                        <td><SeverityBadge value={item.severity} /></td>
                        <td><RiskBadge value={item.risk_level} /></td>
                        <td><DecisionBadge value={item.quality_decision} /></td>
                        <td><div className="supervisor-date-cell"><strong>{formatDate(getTimestamp(item))}</strong><small>{formatRelative(getTimestamp(item))}</small></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="supervisor-actions-card">
            <div className="supervisor-actions-copy"><span>WORKSPACE</span><h2>Quality control tools</h2><p>Move from monitoring to action.</p></div>
            <div className="supervisor-action-buttons">
              <button type="button" onClick={() => navigate("/inspection-reports")}><FileText size={16} /><span>Inspection Reports</span><ChevronRight size={14} /></button>
              <button type="button" onClick={() => navigate("/quality-analytics")}><BarChart3 size={16} /><span>Quality Analytics</span><ChevronRight size={14} /></button>
              <button type="button" onClick={() => navigate("/defect-trends")}><TrendingDown size={16} /><span>Defect Trends</span><ChevronRight size={14} /></button>
              <button type="button" onClick={() => navigate("/factory-supervisor/user-management")}><Users size={16} /><span>User Management</span><ChevronRight size={14} /></button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default FactorySupervisorDashboard;
