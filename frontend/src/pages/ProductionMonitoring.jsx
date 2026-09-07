import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/ProductionMonitoring.css";

const clean = (value) =>
  String(value ?? "").trim();

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return clean(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRangeDays = (range) => {
  if (range === "7d") {
    return 7;
  }

  if (range === "30d") {
    return 30;
  }

  if (range === "90d") {
    return 90;
  }

  return null;
};

const getFilteredMonitoring = (
  monitoring,
  range,
  search
) => {
  let records = Array.isArray(monitoring)
    ? monitoring
    : [];

  const days = getRangeDays(range);

  if (days !== null) {
    const cutoff = new Date();

    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(
      cutoff.getDate() - days
    );

    records = records.filter((item) => {
      if (!item?.date) {
        return false;
      }

      const date = new Date(
        `${item.date}T00:00:00`
      );

      return (
        !Number.isNaN(date.getTime()) &&
        date >= cutoff
      );
    });
  }

  const query = clean(search).toLowerCase();

  if (!query) {
    return records;
  }

  return records.filter((item) =>
    [
      item?.date,
      item?.inspections,
      item?.normal,
      item?.defective,
      item?.passed,
      item?.failed,
      item?.warnings,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
};

function ProductionMonitoring() {
  const [monitoring, setMonitoring] = useState([]);
  const [, setTotals] = useState({
    inspections: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  });

  const [totalDays, setTotalDays] = useState(0);

  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMonitoring = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/production/monitoring"
        );

        const data = response.data;

        if (!data || typeof data !== "object") {
          throw new Error(
            "Production monitoring response is invalid."
          );
        }

        const records = Array.isArray(
          data.monitoring
        )
          ? data.monitoring
          : [];

        const responseTotals =
          data.totals &&
          typeof data.totals === "object"
            ? data.totals
            : {};

        setMonitoring(records);

        setTotals({
          inspections:
            Number(
              responseTotals.inspections
            ) || 0,

          passed:
            Number(
              responseTotals.passed
            ) || 0,

          failed:
            Number(
              responseTotals.failed
            ) || 0,

          warnings:
            Number(
              responseTotals.warnings
            ) || 0,
        });

        setTotalDays(
          Number(data.total_days) || 0
        );
        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "Production Monitoring:",
          err
        );

        setMonitoring([]);

        setTotals({
          inspections: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
        });

        setTotalDays(0);

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load production monitoring data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const fetchMonitoring = async () => {
      try {
        const response = await api.get(
          "/production/monitoring"
        );

        if (cancelled) {
          return;
        }

        const data = response.data;

        if (!data || typeof data !== "object") {
          throw new Error(
            "Production monitoring response is invalid."
          );
        }

        const records = Array.isArray(
          data.monitoring
        )
          ? data.monitoring
          : [];

        const responseTotals =
          data.totals &&
          typeof data.totals === "object"
            ? data.totals
            : {};

        setMonitoring(records);

        setTotals({
          inspections:
            Number(
              responseTotals.inspections
            ) || 0,

          passed:
            Number(
              responseTotals.passed
            ) || 0,

          failed:
            Number(
              responseTotals.failed
            ) || 0,

          warnings:
            Number(
              responseTotals.warnings
            ) || 0,
        });

        setTotalDays(
          Number(data.total_days) || 0
        );
        setLastUpdated(new Date());

        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Production Monitoring:",
          err
        );

        setMonitoring([]);

        setTotals({
          inspections: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
        });

        setTotalDays(0);

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load production monitoring data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const timer = window.setTimeout(fetchMonitoring, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = window.setInterval(() => {
      void loadMonitoring(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadMonitoring]);

  const filteredMonitoring = useMemo(
    () =>
      getFilteredMonitoring(
        monitoring,
        range,
        search
      ),
    [monitoring, range, search]
  );

  const metrics = useMemo(() => {
    const inspections =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.inspections) || 0),
        0
      );

    const normal =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.normal) || 0),
        0
      );

    const defective =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.defective) || 0),
        0
      );

    const passed =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.passed) || 0),
        0
      );

    const failed =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.failed) || 0),
        0
      );

    const warnings =
      filteredMonitoring.reduce(
        (sum, item) =>
          sum +
          (Number(item?.warnings) || 0),
        0
      );

    const passRate =
      inspections > 0
        ? (passed / inspections) * 100
        : null;

    const defectRate =
      inspections > 0
        ? (defective / inspections) * 100
        : null;

    return {
      inspections,
      normal,
      defective,
      passed,
      failed,
      warnings,
      passRate,
      defectRate,
    };
  }, [filteredMonitoring]);

  const maxDaily = useMemo(
    () =>
      Math.max(
        1,
        ...filteredMonitoring.map(
          (item) =>
            Number(item?.inspections) || 0
        )
      ),
    [filteredMonitoring]
  );

  const recentMonitoring = useMemo(
    () =>
      [...filteredMonitoring]
        .sort((a, b) =>
          clean(b?.date).localeCompare(
            clean(a?.date)
          )
        )
        .slice(0, 12),
    [filteredMonitoring]
  );

  const qualityRate =
    metrics.inspections > 0
      ? (metrics.normal /
          metrics.inspections) *
        100
      : null;

  const highRiskEquivalent =
    metrics.failed + metrics.warnings;

  const exportCSV = useCallback(() => {
    if (!filteredMonitoring.length) {
      return;
    }

    const headers = [
      "Date",
      "Inspections",
      "Normal",
      "Defective",
      "Passed",
      "Failed",
      "Warnings",
    ];

    const rows = filteredMonitoring.map(
      (item) => [
        clean(item?.date),
        Number(item?.inspections) || 0,
        Number(item?.normal) || 0,
        Number(item?.defective) || 0,
        Number(item?.passed) || 0,
        Number(item?.failed) || 0,
        Number(item?.warnings) || 0,
      ]
    );

    const escapeCSV = (value) =>
      `"${String(value ?? "").replaceAll(
        '"',
        '""'
      )}"`;

    const csv = [
      headers
        .map(escapeCSV)
        .join(","),
      ...rows.map((row) =>
        row
          .map(escapeCSV)
          .join(",")
      ),
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
      `visioninspect-production-monitoring-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }, [filteredMonitoring]);

  if (loading) {
    return (
      <>
        <SidebarSupervisor />

        <div className="dashboard">
          <Navbar title="Production Monitoring" />

          <main className="monitoring-container">
            <div className="monitor-state">
              <div className="monitor-spinner" />

              <h2>
                Loading Production Monitoring
              </h2>

              <p>
                Retrieving production monitoring
                data from VisionInspect.
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
          <Navbar title="Production Monitoring" />

          <main className="monitoring-container">
            <div className="monitor-error">
              <AlertTriangle size={26} />

              <h2>
                Monitoring unavailable
              </h2>

              <p>{error}</p>

              <button
                onClick={loadMonitoring}
              >
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
        <Navbar title="Production Monitoring" />

        <main className="monitoring-container">
          <header className="monitoring-header">
            <div>
              <span className="section-label">
                PRODUCTION CONTROL
              </span>

              <h2>
                Production Monitoring
              </h2>

              <p>
                Monitor daily production
                inspection activity and quality
                decisions from recorded data.
              </p>
            </div>

            <div className="monitoring-actions">
              <div className="monitoring-status">
                <span className="monitoring-status-dot" />
                LIVE MONITORING
              </div>

              <button
                type="button"
                className={`monitor-auto-refresh ${autoRefresh ? "active" : ""}`}
                onClick={() => setAutoRefresh((value) => !value)}
                aria-pressed={autoRefresh}
              >
                AUTO {autoRefresh ? "ON" : "OFF"}
              </button>

              <select
                value={range}
                onChange={(event) =>
                  setRange(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Time
                </option>

                <option value="7d">
                  Last 7 Days
                </option>

                <option value="30d">
                  Last 30 Days
                </option>

                <option value="90d">
                  Last 90 Days
                </option>
              </select>

              <button
                className="monitor-refresh"
                onClick={() => void loadMonitoring(false)}
                disabled={loading || refreshing}
              >
                <RefreshCw className={refreshing ? "monitor-refresh-spin" : ""} size={14} />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </header>

          <section className="monitor-command-strip">
            <div>
              <span>PRODUCTION CONTROL CENTER</span>
              <strong>Live inspection activity and quality decisions</strong>
            </div>
            <div className="monitor-command-meta">
              <div><small>LAST SYNC</small><strong>{lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></div>
              <div><small>QUALITY RATE</small><strong>{qualityRate !== null ? `${qualityRate.toFixed(1)}%` : "—"}</strong></div>
              <div><small>ATTENTION EVENTS</small><strong className={highRiskEquivalent > 0 ? "warning-text" : "success-text"}>{highRiskEquivalent}</strong></div>
            </div>
          </section>

          <section className="monitoring-summary">
            <div className="monitor-card active-lines-card">
              <h3>
                Inspections
              </h3>

              <h2>
                {metrics.inspections.toLocaleString()}
              </h2>

              <span className="monitor-caption">
                Daily production inspection
                volume
              </span>
            </div>

            <div className="monitor-card products-card">
              <h3>
                Normal Results
              </h3>

              <h2>
                {metrics.normal.toLocaleString()}
              </h2>

              <span className="monitor-caption">
                AI classified normal
              </span>
            </div>

            <div className="monitor-card defects-monitor-card">
              <h3>
                Defective Results
              </h3>

              <h2>
                {metrics.defective.toLocaleString()}
              </h2>

              <span className="monitor-caption">
                Defects detected
              </span>
            </div>

            <div className="monitor-card confidence-card">
              <h3>
                Pass Rate
              </h3>

              <h2>
                {metrics.passRate !== null
                  ? `${metrics.passRate.toFixed(
                      1
                    )}%`
                  : "—"}
              </h2>

              <span className="monitor-caption">
                Quality decisions marked PASS
              </span>
            </div>
          </section>

          <section className="monitoring-grid">
            <div className="production-table-card activity-panel">
              <div className="monitor-section-heading">
                <div>
                  <span className="section-label">
                    DAILY PRODUCTION STREAM
                  </span>

                  <h2>
                    Recent Production Activity
                  </h2>
                </div>

                <span className="line-count">
                  {recentMonitoring.length} DAYS
                </span>
              </div>

              <div className="monitor-search">
                <Search size={15} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search date, inspections, results..."
                />
              </div>

              {recentMonitoring.length ===
              0 ? (
                <div className="monitor-empty">
                  <Activity size={22} />

                  <strong>
                    No production activity
                    found
                  </strong>

                  <span>
                    No daily monitoring records
                    match the current filters.
                  </span>
                </div>
              ) : (
                <div className="production-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Production Date
                        </th>

                        <th>
                          Inspections
                        </th>

                        <th>
                          Normal
                        </th>

                        <th>
                          Defective
                        </th>

                        <th>
                          Passed
                        </th>

                        <th>
                          Failed
                        </th>

                        <th>
                          Warnings
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentMonitoring.map(
                        (item, index) => {
                          const inspections =
                            Number(
                              item?.inspections
                            ) || 0;

                          const defective =
                            Number(
                              item?.defective
                            ) || 0;

                          return (
                            <tr
                              key={`${item?.date}-${index}`}
                            >
                              <td>
                                <div className="line-name">
                                  <span
                                    className={`line-indicator ${
                                      defective >
                                      0
                                        ? "indicator-defect"
                                        : "indicator-normal"
                                    }`}
                                  />

                                  <div>
                                    <strong>
                                      {formatDate(
                                        item?.date
                                      )}
                                    </strong>

                                    <small>
                                      Daily production
                                      summary
                                    </small>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span className="result-value">
                                  {inspections}
                                </span>
                              </td>

                              <td>
                                <span className="result-value">
                                  {Number(
                                    item?.normal
                                  ) || 0}
                                </span>
                              </td>

                              <td>
                                <span className="result-value">
                                  {defective}
                                </span>
                              </td>

                              <td>
                                <span className="monitor-status monitor-status-running">
                                  <span className="monitor-status-dot-small" />

                                  {Number(
                                    item?.passed
                                  ) || 0}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`monitor-status ${
                                    Number(
                                      item?.failed
                                    ) > 0
                                      ? "monitor-status-defect"
                                      : "monitor-status-neutral"
                                  }`}
                                >
                                  <span className="monitor-status-dot-small" />

                                  {Number(
                                    item?.failed
                                  ) || 0}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`monitor-status ${
                                    Number(
                                      item?.warnings
                                    ) > 0
                                      ? "monitor-status-neutral"
                                      : "monitor-status-running"
                                  }`}
                                >
                                  <span className="monitor-status-dot-small" />

                                  {Number(
                                    item?.warnings
                                  ) || 0}
                                </span>
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

            <aside className="monitor-side-column">
              <div className="production-table-card">
                <div className="monitor-section-heading">
                  <div>
                    <span className="section-label">
                      DAILY ACTIVITY
                    </span>

                    <h2>
                      Inspection Trend
                    </h2>
                  </div>

                  <BarChart3 size={19} />
                </div>

                {filteredMonitoring.length ===
                0 ? (
                  <div className="monitor-empty compact">
                    No dated production
                    records available.
                  </div>
                ) : (
                  <div className="daily-bars">
                    {filteredMonitoring
                      .slice(-10)
                      .map((item) => {
                        const inspections =
                          Number(
                            item?.inspections
                          ) || 0;

                        const width =
                          Math.max(
                            5,
                            (inspections /
                              maxDaily) *
                              100
                          );

                        return (
                          <div
                            className="daily-bar-row"
                            key={item.date}
                          >
                            <span>
                              {formatDate(
                                item.date
                              )}
                            </span>

                            <div className="daily-track">
                              <div
                                className="daily-fill"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            </div>

                            <strong>
                              {inspections}
                            </strong>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="production-table-card">
                <div className="monitor-section-heading">
                  <div>
                    <span className="section-label">
                      QUALITY STATUS
                    </span>

                    <h2>
                      Current Overview
                    </h2>
                  </div>

                  <ShieldCheck size={19} />
                </div>

                <div className="quality-status-list">
                  <div>
                    <CheckCircle2 size={16} />

                    <span>
                      Normal / Passed
                    </span>

                    <strong>
                      {metrics.normal}
                    </strong>
                  </div>

                  <div>
                    <XCircle size={16} />

                    <span>
                      Defective
                    </span>

                    <strong>
                      {metrics.defective}
                    </strong>
                  </div>

                  <div>
                    <AlertTriangle size={16} />

                    <span>
                      Failed
                    </span>

                    <strong>
                      {metrics.failed}
                    </strong>
                  </div>

                  <div>
                    <Activity size={16} />

                    <span>
                      Warnings
                    </span>

                    <strong>
                      {metrics.warnings}
                    </strong>
                  </div>

                  <div>
                    <BarChart3 size={16} />

                    <span>
                      Quality Rate
                    </span>

                    <strong>
                      {qualityRate !== null
                        ? `${qualityRate.toFixed(
                            1
                          )}%`
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="production-table-card">
            <div className="monitor-section-heading">
              <div>
                <span className="section-label">
                  PRODUCTION SUMMARY
                </span>

                <h2>
                  Quality Decision Summary
                </h2>
              </div>

              <span className="line-count">
                {totalDays} TOTAL DAYS
              </span>
            </div>

            <div className="product-performance-grid">
              <div className="product-performance-card">
                <div>
                  <span>
                    Passed
                  </span>

                  <strong>
                    {metrics.passed}
                  </strong>
                </div>

                <div className="product-performance-bar">
                  <div
                    style={{
                      width: `${
                        metrics.inspections
                          ? Math.max(
                              4,
                              (metrics.passed /
                                metrics.inspections) *
                                100
                            )
                          : 4
                      }%`,
                    }}
                  />
                </div>

                <small>
                  PASS quality decisions
                </small>
              </div>

              <div className="product-performance-card">
                <div>
                  <span>
                    Failed
                  </span>

                  <strong>
                    {metrics.failed}
                  </strong>
                </div>

                <div className="product-performance-bar">
                  <div
                    style={{
                      width: `${
                        metrics.inspections
                          ? Math.max(
                              4,
                              (metrics.failed /
                                metrics.inspections) *
                                100
                            )
                          : 4
                      }%`,
                    }}
                  />
                </div>

                <small>
                  FAIL quality decisions
                </small>
              </div>

              <div className="product-performance-card">
                <div>
                  <span>
                    Warnings
                  </span>

                  <strong>
                    {metrics.warnings}
                  </strong>
                </div>

                <div className="product-performance-bar">
                  <div
                    style={{
                      width: `${
                        metrics.inspections
                          ? Math.max(
                              4,
                              (metrics.warnings /
                                metrics.inspections) *
                                100
                            )
                          : 4
                      }%`,
                    }}
                  />
                </div>

                <small>
                  WARNING quality decisions
                </small>
              </div>

              <div className="product-performance-card">
                <div>
                  <span>
                    Attention Events
                  </span>

                  <strong>
                    {highRiskEquivalent}
                  </strong>
                </div>

                <div className="product-performance-bar">
                  <div
                    style={{
                      width: `${
                        metrics.inspections
                          ? Math.max(
                              4,
                              (highRiskEquivalent /
                                metrics.inspections) *
                                100
                            )
                          : 4
                      }%`,
                    }}
                  />
                </div>

                <small>
                  Failed + warning decisions
                </small>
              </div>
            </div>
          </section>

          <div className="monitoring-footer-actions">
            <button
              className="monitor-export"
              onClick={exportCSV}
              disabled={
                !filteredMonitoring.length
              }
            >
              <Download size={15} />

              Export Monitoring CSV
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

export default ProductionMonitoring;