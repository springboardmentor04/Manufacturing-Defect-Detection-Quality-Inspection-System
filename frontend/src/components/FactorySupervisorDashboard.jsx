import { Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart3, Bell, CalendarClock, Check, ChevronDown, ChevronRight, Clock, Download, Factory, Filter, Gauge, LayoutDashboard, ListFilter, LogOut, Menu, Minus, MoreHorizontal, PanelLeft, Search, Settings, TrendingDown, TrendingUp, UserRound, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import {
  supervisorSections, readFSSidebarExpandedPreference, writeFSSidebarExpandedPreference,
  productionLines, shiftPerformance, overviewKPIs,
  inspectionDateFilters, defectTrendRanges, defectTypeFilters, lineFilters, statusFilters, shiftFilters, severityFilters,
  dailyDefects, defectCategories, defectHeatmap, defectRateTrend, defectRateThreshold,
  paretoDefects, statisticalMetrics, passRateSparkline, confidenceSparkline, yieldSparkline,
  hourlyThroughput, productionAlerts, shiftHandoff,
  formatNumber, getSeverityClass, getHeatmapIntensity
} from "@/lib/factorySupervisorDashboard";

const icons = {
  overview: LayoutDashboard,
  inspections: BarChart3,
  defects: TrendingUp,
  analytics: Gauge,
  monitoring: Activity,
};

export default function FactorySupervisorDashboard({ user, onSignOut, isSigningOut }) {
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem("fs_active_tab") || "overview"; } catch { return "overview"; }
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => readFSSidebarExpandedPreference());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  // Filters state
  const [overviewDateRange, setOverviewDateRange] = useState("Last 7 days");
  const [overviewLine, setOverviewLine] = useState("All lines");
  const [overviewShift, setOverviewShift] = useState("All shifts");
  const [inspDateRange, setInspDateRange] = useState("Last 30 days");
  const [inspLine, setInspLine] = useState("All lines");
  const [inspSeverity, setInspSeverity] = useState("All severity");
  const [inspStatus, setInspStatus] = useState("All");
  const [inspSearch, setInspSearch] = useState("");
  const [defectRange, setDefectRange] = useState("7 days");
  const [defectType, setDefectType] = useState("All types");
  const [defectLine, setDefectLine] = useState("All lines");
  const [analyticsRange, setAnalyticsRange] = useState("Last 30 days");
  const [analyticsLine, setAnalyticsLine] = useState("All lines");
  const [monitorLine, setMonitorLine] = useState("All lines");
  const [monitorShift, setMonitorShift] = useState("All shifts");

  // Fetch live batches for inspection reports
  const [liveBatches, setLiveBatches] = useState([]);
  useEffect(() => {
    async function fetchBatches() {
      try {
        const res = await fetch("http://localhost:8000/api/batches");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.batches?.length > 0) {
            setLiveBatches(data.batches.map(b => ({
              id: b._id,
              name: b.name,
              line: b.line,
              captured: b.capturedAt,
              severity: b.overallSeverity || "Low",
              confidence: b.overallConfidence || 95.0,
              status: b.status,
              products: b.products || [],
              findings: b.findings || [],
            })));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch batches for supervisor dashboard:", err);
      }
    }
    fetchBatches();
  }, []);

  useEffect(() => { writeFSSidebarExpandedPreference(sidebarExpanded); }, [sidebarExpanded]);

  const selectSection = (id) => {
    setActive(id);
    try { sessionStorage.setItem("fs_active_tab", id); } catch { }
    setMobileNav(false);
  };

  const expandFromRail = (event) => {
    if (!sidebarExpanded && event.target === event.currentTarget) setSidebarExpanded(true);
  };

  const notify = (msg) => setActionMessage(msg);

  // Filtered inspection data
  const filteredBatches = useMemo(() => {
    return liveBatches.filter(b => {
      if (inspLine !== "All lines" && b.line !== inspLine) return false;
      if (inspSeverity !== "All severity" && b.severity !== inspSeverity) return false;
      if (inspStatus === "PASS" && (b.severity === "High" || b.severity === "Medium")) return false;
      if (inspStatus === "FAIL" && b.severity === "Low") return false;
      if (inspSearch.trim()) {
        const q = inspSearch.toLowerCase();
        if (!`${b.id} ${b.name} ${b.line}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [liveBatches, inspLine, inspSeverity, inspStatus, inspSearch]);

  // Filtered production lines
  const filteredLines = useMemo(() => {
    return productionLines.filter(l => {
      if (overviewLine !== "All lines" && l.name !== overviewLine) return false;
      if (overviewShift !== "All shifts" && l.shift !== overviewShift) return false;
      return true;
    });
  }, [overviewLine, overviewShift]);

  // Filtered monitoring lines
  const monitoredLines = useMemo(() => {
    return productionLines.filter(l => {
      if (monitorLine !== "All lines" && l.name !== monitorLine) return false;
      return true;
    });
  }, [monitorLine]);

  return (
    <main className={`fs-app ${sidebarExpanded ? "side-expanded" : ""}`}>
      {/* ─── Sidebar ─── */}
      <aside className={`fs-side ${mobileNav ? "open" : ""} ${sidebarExpanded ? "expanded" : "collapsed"}`} onClick={expandFromRail} aria-label="Factory Supervisor dashboard navigation">
        <div className="fs-side-top"><div className="fs-side-brand"><BrandMark interactive={false} /><button className="fs-side-toggle" type="button" onClick={(e) => { e.stopPropagation(); setSidebarExpanded(v => !v); }} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-pressed={sidebarExpanded} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}><PanelLeft size={17} strokeWidth={1.8} /></button></div></div>
        <nav className="fs-nav">
          {supervisorSections.map((section) => {
            const Icon = icons[section.icon];
            return <button type="button" key={section.id} onClick={() => selectSection(section.id)} className={active === section.id ? "active" : ""} data-label={section.label} aria-label={sidebarExpanded ? undefined : section.label}><Icon size={17} /><span><b>{section.label}</b></span></button>;
          })}
        </nav>
        <div className="fs-side-bottom"><div className="fs-side-profile-wrap"><button className="fs-side-profile" type="button" onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(v => !v); }} aria-label="Open account menu" aria-expanded={profileMenuOpen}><span>{(user.name || "FS").split(" ").map(p => p[0]).slice(0, 2).join("")}</span><div><b>{user.name || "Factory Supervisor"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Factory Supervisor"}</small></div></button>{profileMenuOpen && <div className="fs-profile-menu" role="menu"><button type="button" onClick={() => { notify("Account options will be available in a later build."); setProfileMenuOpen(false); }} role="menuitem"><UserRound size={16} />Account</button><button type="button" onClick={() => { notify("Settings will be available in a later build."); setProfileMenuOpen(false); }} role="menuitem"><Settings size={16} />Settings</button><button className="fs-profile-signout" type="button" onClick={onSignOut} disabled={isSigningOut} role="menuitem"><LogOut size={16} />{isSigningOut ? "Signing out…" : "Sign out"}</button></div>}</div></div>
      </aside>

      {/* ─── Main content ─── */}
      <section className="fs-main">
        <header className="fs-head">
          <button className="fs-menu" type="button" onClick={() => setMobileNav(v => !v)} aria-label="Toggle dashboard navigation"><Menu size={20} /></button>
          <div className="fs-head-title"><span className="fs-kicker">Factory supervision</span><h1>{supervisorSections.find(s => s.id === active)?.label}</h1></div>
          <div className="fs-head-actions"><div className="fs-user"><span>{(user.name || "FS").split(" ").map(p => p[0]).slice(0, 2).join("")}</span><div><b>{user.name || "Factory Supervisor"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Factory Supervisor"}</small></div><ChevronDown size={14} /></div></div>
        </header>

        {actionMessage && <div className="fs-action-feedback" role="status"><Check size={15} /><span>{actionMessage}</span><button type="button" onClick={() => setActionMessage("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        <div className="fs-content">
          <section className="fs-stage">
            {active === "overview" && <ProductionOverview lines={filteredLines} dateRange={overviewDateRange} setDateRange={setOverviewDateRange} line={overviewLine} setLine={setOverviewLine} shift={overviewShift} setShift={setOverviewShift} />}
            {active === "inspections" && <InspectionReports batches={filteredBatches} liveBatches={liveBatches} dateRange={inspDateRange} setDateRange={setInspDateRange} line={inspLine} setLine={setInspLine} severity={inspSeverity} setSeverity={setInspSeverity} status={inspStatus} setStatus={setInspStatus} search={inspSearch} setSearch={setInspSearch} notify={notify} />}
            {active === "defects" && <DefectTrends range={defectRange} setRange={setDefectRange} type={defectType} setType={setDefectType} line={defectLine} setLine={setDefectLine} />}
            {active === "analytics" && <QualityAnalytics dateRange={analyticsRange} setDateRange={setAnalyticsRange} line={analyticsLine} setLine={setAnalyticsLine} />}
            {active === "monitoring" && <ProductionMonitoring line={monitorLine} setLine={setMonitorLine} shift={monitorShift} setShift={setMonitorShift} notify={notify} lines={monitoredLines} />}
          </section>
        </div>
      </section>
    </main>
  );
}

/* ═══════════════════════════════════════════════════
   Section 1: Production Overview
   ═══════════════════════════════════════════════════ */
function ProductionOverview({ lines, dateRange, setDateRange, line, setLine, shift, setShift }) {
  return <>
    {/* KPI summary row */}
    <div className="fs-context fs-overview-context">
      {overviewKPIs.map(kpi => (
        <article className={`fs-kpi-card fs-kpi-${kpi.id}`} key={kpi.id}>
          <span>{kpi.id === "units" && <Factory size={14} />}{kpi.id === "yield" && <TrendingUp size={14} />}{kpi.id === "defects" && <AlertTriangle size={14} />}{kpi.id === "lines" && <Activity size={14} />}{kpi.label}</span>
          <strong>{typeof kpi.value === "number" ? formatNumber(kpi.value) : kpi.value}</strong>
          <p>{kpi.trend === "up" && <i className="up">↑</i>}{kpi.trend === "down" && <i className="down">↓</i>}{kpi.detail}</p>
        </article>
      ))}
    </div>

    {/* Filters bar */}
    <div className="fs-queue-bar">
      <span>Production lines</span>
      <div className="fs-result-filters">
        <label className="fs-filter-btn fs-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">{inspectionDateFilters.map(r => <option key={r}>{r}</option>)}</select><ChevronDown size={14} /></label>
        <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Production line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
        <label className="fs-filter-btn fs-result-filter"><Clock size={15} /><select value={shift} onChange={e => setShift(e.target.value)} aria-label="Shift">{shiftFilters.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></label>
      </div>
    </div>

    {/* Production line status table */}
    <section className="fs-section">
      <div className="fs-table-wrap">
        <div className="fs-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div><span className="fs-kicker">Line status</span><h3>Production Line Performance</h3></div>
        </div>
        <table>
          <thead><tr><th>Line</th><th>Product</th><th>Status</th><th>OEE</th><th>Units Today</th><th>Yield</th><th>Downtime</th></tr></thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id}>
                <td><b>{l.name}</b><small>{l.id}</small></td>
                <td><b>{l.product}</b></td>
                <td><span className={`fs-line-status-badge ${l.status.toLowerCase()}`}>{l.status}</span></td>
                <td><b>{l.oee}%</b></td>
                <td><b className="fs-history-count">{formatNumber(l.unitsToday)}</b></td>
                <td><span className={`fs-yield-badge ${l.yield >= 95 ? "good" : l.yield >= 90 ? "warn" : "bad"}`}>{l.yield}%</span></td>
                <td><span className="fs-date">{l.downtime} min</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <div className="fs-history-empty"><Search size={20} /><p>No lines match the current filters.</p></div>}
      </div>
    </section>

    {/* Shift performance */}
    <section className="fs-section" style={{ marginTop: "18px" }}>
      <div className="fs-card-top" style={{ marginBottom: "16px" }}>
        <div><span className="fs-kicker">Shift comparison</span><h3>Shift Performance Summary</h3></div>
      </div>
      <div className="fs-shift-grid">
        {shiftPerformance.map(s => (
          <article className="fs-shift-card" key={s.shift}>
            <span className="fs-kicker"><Clock size={13} />{s.shift}</span>
            <div className="fs-shift-metrics">
              <div><dt>Units</dt><dd>{formatNumber(s.units)}</dd></div>
              <div><dt>Defects</dt><dd>{s.defects}</dd></div>
              <div><dt>Yield</dt><dd>{s.yield}%</dd></div>
              <div><dt>OEE</dt><dd>{s.oee}%</dd></div>
            </div>
            <div className="fs-shift-bar"><i style={{ width: `${s.oee}%` }} /><span>{s.oee}% OEE</span></div>
          </article>
        ))}
      </div>
    </section>
  </>;
}

/* ═══════════════════════════════════════════════════
   Section 2: Inspection Reports
   ═══════════════════════════════════════════════════ */
function InspectionReports({ batches, liveBatches, dateRange, setDateRange, line, setLine, severity, setSeverity, status, setStatus, search, setSearch, notify }) {
  const totalInspections = liveBatches.length;
  const totalProducts = liveBatches.reduce((acc, b) => acc + (b.products?.length || 1), 0);
  const totalDefects = liveBatches.reduce((acc, b) => acc + (b.products?.filter(p => p.status === "Failed").length || 0), 0);
  const passRate = totalProducts > 0 ? Math.round(((totalProducts - totalDefects) / totalProducts) * 100) : 100;
  const avgConfidence = liveBatches.length > 0 ? (liveBatches.reduce((a, b) => a + (b.confidence || 0), 0) / liveBatches.length).toFixed(1) : "0.0";

  return <>
    {/* KPI cards */}
    <div className="fs-report-kpis">
      <article><span>Total Inspections</span><b>{totalInspections}</b><p><i className="up">↑ Live</i> from MongoDB</p></article>
      <article><span>Total Defects</span><b>{totalDefects}</b><p><i className="down">↓ Active</i> findings tracked</p></article>
      <article><span>Pass Rate</span><b>{passRate}<em>%</em></b><p><i className="up">↑ Real-time</i> calculation</p></article>
      <article><span>Avg Confidence</span><b>{avgConfidence}<em>%</em></b><p>Model certainty</p></article>
    </div>

    {/* Filters */}
    <div className="fs-history-heading" style={{ marginTop: "22px" }}>
      <h2>Inspection records</h2>
      <label className="fs-filter-btn fs-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">{inspectionDateFilters.map(r => <option key={r}>{r}</option>)}</select><ChevronDown size={14} /></label>
    </div>
    <div className="fs-history-tools">
      <label><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch, line, or product" /></label>
      <div className="fs-result-filters" style={{ gap: "7px" }}>
        <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
        <label className="fs-filter-btn fs-result-filter"><ListFilter size={15} /><select value={severity} onChange={e => setSeverity(e.target.value)} aria-label="Severity">{severityFilters.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></label>
      </div>
      <div>{statusFilters.map(s => <button key={s} type="button" className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>)}</div>
      <button type="button" onClick={() => notify("PDF export will be implemented in a future release.")}><Download size={15} /> Export</button>
    </div>

    {/* Table */}
    <div className="fs-table-wrap">
      <table>
        <thead><tr><th>Batch Code</th><th>Batch Name</th><th>Line</th><th>Items</th><th>Defects</th><th>Status</th><th>Pass Rate</th><th>Confidence</th></tr></thead>
        <tbody>
          {batches.map(batch => {
            const flags = batch.products?.filter(p => p.status === "Failed").length || 0;
            const total = batch.products?.length || 1;
            const pRate = Math.round(((total - flags) / total) * 100);
            return (
              <tr key={batch.id}>
                <td><b>{batch.id}</b></td>
                <td><b>{batch.name}</b></td>
                <td>{batch.line}</td>
                <td><b className="fs-history-count">{total}</b></td>
                <td><span className={`fs-history-flags ${flags ? "flagged" : "clear"}`}>{flags}</span></td>
                <td><span className={`fs-verdict ${flags ? "fail" : "pass"}`}>{flags ? "FAIL" : "PASS"}</span></td>
                <td><b>{pRate}%</b></td>
                <td><b>{batch.confidence}%</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {batches.length === 0 && <div className="fs-history-empty"><Search size={20} /><p>No inspection records match the current filters.</p></div>}
    </div>
  </>;
}

/* ═══════════════════════════════════════════════════
   Section 3: Defect Trends
   ═══════════════════════════════════════════════════ */
function DefectTrends({ range, setRange, type, setType, line, setLine }) {
  const maxCount = Math.max(...dailyDefects.map(d => d.count));
  const maxRate = Math.max(...defectRateTrend);

  return <>
    <div className="fs-section-head">
      <div><h2>Defect <em>trends.</em></h2><p>Visualize defect frequency, distribution, and patterns across production lines and time periods.</p></div>
      <div className="fs-range">{defectTrendRanges.map(r => <button key={r} type="button" className={r === range ? "active" : ""} onClick={() => setRange(r)}>{r}</button>)}</div>
    </div>

    {/* Filters */}
    <div className="fs-result-filters" style={{ marginBottom: "16px" }}>
      <label className="fs-filter-btn fs-result-filter"><ListFilter size={15} /><select value={type} onChange={e => setType(e.target.value)} aria-label="Defect type">{defectTypeFilters.map(t => <option key={t}>{t}</option>)}</select><ChevronDown size={14} /></label>
      <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Production line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
    </div>

    <div className="fs-report-grid">
      {/* Bar chart: daily defect count */}
      <article className="fs-chart">
        <div className="fs-card-top"><div><span className="fs-kicker">Daily frequency</span><h3>Defect count by day</h3></div><span>{range}</span></div>
        <div className="fs-chart-layout" style={{ display: "flex", gap: "10px", margin: "22px 0 0", alignItems: "stretch" }}>
          <div className="fs-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>Count</div>
          <div className="fs-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", paddingBottom: "21px", fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "6px", textAlign: "right" }}>
            <span>{maxCount}</span><span>{Math.round(maxCount * 0.75)}</span><span>{Math.round(maxCount * 0.5)}</span><span>{Math.round(maxCount * 0.25)}</span><span>0</span>
          </div>
          <div className="fs-bars" style={{ flex: 1, margin: 0 }}>
            {dailyDefects.map((d, i) => <div key={i}><i style={{ height: `${(d.count / maxCount) * 100}%` }} /><span>{d.day}</span></div>)}
          </div>
        </div>
        <footer><p><span className="fs-live-dot" />Total: {dailyDefects.reduce((a, d) => a + d.count, 0)} defects</p><b>{maxCount}</b></footer>
      </article>

      {/* Donut: defect category distribution */}
      <article className="fs-mix">
        <div className="fs-card-top"><div><span className="fs-kicker">Distribution</span><h3>Defect categories</h3></div><button type="button" aria-label="More options"><MoreHorizontal size={17} /></button></div>
        <div className="fs-donut"><div><b>{defectCategories.reduce((a, c) => a + c.value, 0)}</b><span>% total</span></div></div>
        <ul>{defectCategories.map(c => <li key={c.label}><span style={{ background: c.color }} /><b>{c.label}</b><em>{c.value}%</em></li>)}</ul>
      </article>

      {/* Defect rate trend with threshold */}
      <article className="fs-chart" style={{ gridColumn: "1 / -1" }}>
        <div className="fs-card-top"><div><span className="fs-kicker">Rate analysis</span><h3>Defect rate trend</h3></div><span>Threshold: {defectRateThreshold}%</span></div>
        <div className="fs-rate-chart">
          <div className="fs-rate-threshold" style={{ bottom: `${(defectRateThreshold / maxRate) * 100}%` }}><span>Threshold {defectRateThreshold}%</span></div>
          <div className="fs-rate-bars">
            {defectRateTrend.map((rate, i) => (
              <div key={i} className="fs-rate-bar-wrap">
                <div className={`fs-rate-bar ${rate > defectRateThreshold ? "over" : "under"}`} style={{ height: `${(rate / maxRate) * 100}%` }} />
                <span>{dailyDefects[i]?.day}</span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>

    {/* Heatmap: defects by line x day */}
    <section className="fs-section" style={{ marginTop: "18px" }}>
      <div className="fs-card-top" style={{ marginBottom: "16px" }}>
        <div><span className="fs-kicker">Pattern analysis</span><h3>Defect Heatmap · Line × Day</h3></div>
      </div>
      <div className="fs-heatmap">
        <div className="fs-heatmap-header"><span />{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
        {defectHeatmap.map(row => (
          <div className="fs-heatmap-row" key={row.line}>
            <span className="fs-heatmap-label">{row.line}</span>
            {row.values.map((v, i) => <span key={i} className={`fs-heatmap-cell ${getHeatmapIntensity(v)}`} title={`${v} defects`}>{v}</span>)}
          </div>
        ))}
        <div className="fs-heatmap-legend">
          <span>Low</span>
          <span className="fs-heatmap-cell none" />
          <span className="fs-heatmap-cell low" />
          <span className="fs-heatmap-cell medium" />
          <span className="fs-heatmap-cell high" />
          <span className="fs-heatmap-cell critical" />
          <span>High</span>
        </div>
      </div>
    </section>
  </>;
}

/* ═══════════════════════════════════════════════════
   Section 4: Quality Analytics
   ═══════════════════════════════════════════════════ */
function QualityAnalytics({ dateRange, setDateRange, line, setLine }) {
  const qualityScore = 96.8;
  const maxPareto = Math.max(...paretoDefects.map(d => d.count));

  return <>
    <div className="fs-section-head">
      <div><h2>Quality <em>analytics.</em></h2><p>Statistical process control, Pareto analysis, and capability metrics for data-driven quality improvement.</p></div>
      <div className="fs-result-filters">
        <label className="fs-filter-btn fs-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">{inspectionDateFilters.map(r => <option key={r}>{r}</option>)}</select><ChevronDown size={14} /></label>
        <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
      </div>
    </div>

    {/* Quality Score gauge + sparklines */}
    <div className="fs-analytics-top">
      <article className="fs-gauge-card">
        <span className="fs-kicker"><Gauge size={14} />Overall quality score</span>
        <div className="fs-gauge-ring">
          <svg viewBox="0 0 120 120" className="fs-gauge-svg">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(21,62,66,0.1)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={qualityScore >= 95 ? "var(--pass)" : qualityScore >= 85 ? "var(--warn)" : "var(--fail)"} strokeWidth="8" strokeDasharray={`${(qualityScore / 100) * 326.7} 326.7`} strokeLinecap="round" transform="rotate(-90 60 60)" />
          </svg>
          <div className="fs-gauge-value"><b>{qualityScore}</b><span>%</span></div>
        </div>
        <p className="fs-gauge-status">{qualityScore >= 95 ? "Excellent" : qualityScore >= 85 ? "Good" : "Needs Improvement"}</p>
      </article>

      <div className="fs-sparkline-grid">
        <SparklineCard label="Pass Rate" data={passRateSparkline} current={passRateSparkline[passRateSparkline.length - 1]} unit="%" color="var(--pass)" />
        <SparklineCard label="Avg Confidence" data={confidenceSparkline} current={confidenceSparkline[confidenceSparkline.length - 1]} unit="%" color="var(--teal)" />
        <SparklineCard label="Yield Rate" data={yieldSparkline} current={yieldSparkline[yieldSparkline.length - 1]} unit="%" color="#27837f" />
      </div>
    </div>

    {/* Pareto chart */}
    <section className="fs-section" style={{ marginTop: "18px" }}>
      <div className="fs-card-top" style={{ marginBottom: "16px" }}>
        <div><span className="fs-kicker">Pareto analysis</span><h3>Top Defect Types by Frequency</h3></div>
        <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>80/20 rule</span>
      </div>
      <div className="fs-pareto">
        <div className="fs-pareto-bars">
          {paretoDefects.map((d, i) => (
            <div key={i} className="fs-pareto-item">
              <div className="fs-pareto-bar-wrap">
                <div className="fs-pareto-bar" style={{ height: `${(d.count / maxPareto) * 100}%` }} />
                <div className="fs-pareto-cum" style={{ bottom: `${d.cumPct}%` }} />
              </div>
              <span className="fs-pareto-label">{d.type}</span>
              <span className="fs-pareto-count">{d.count}</span>
            </div>
          ))}
        </div>
        <div className="fs-pareto-legend">
          <span><i style={{ background: "var(--teal)" }} /> Count</span>
          <span><i style={{ background: "var(--warn)" }} /> Cumulative %</span>
        </div>
      </div>
    </section>

    {/* Statistical metrics table */}
    <section className="fs-section" style={{ marginTop: "18px" }}>
      <div className="fs-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <div><span className="fs-kicker">SPC Metrics</span><h3>Statistical Process Control</h3></div>
      </div>
      <div className="fs-table-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table>
          <thead><tr><th>Line</th><th>Mean Yield (%)</th><th>Std Dev</th><th>Cp</th><th>Cpk</th><th>Capability</th></tr></thead>
          <tbody>
            {statisticalMetrics.filter(m => m.mean > 0).map(m => (
              <tr key={m.line}>
                <td><b>{m.line}</b></td>
                <td><b>{m.mean}%</b></td>
                <td>{m.stdDev}</td>
                <td><b>{m.cp.toFixed(2)}</b></td>
                <td><b>{m.cpk.toFixed(2)}</b></td>
                <td><span className={`fs-capability ${m.cpk >= 1.33 ? "excellent" : m.cpk >= 1.0 ? "adequate" : "poor"}`}>{m.cpk >= 1.33 ? "Excellent" : m.cpk >= 1.0 ? "Adequate" : "Needs Work"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}

function SparklineCard({ label, data, current, unit, color }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const prev = data[data.length - 2];
  const diff = (current - prev).toFixed(1);
  const isUp = current >= prev;

  return (
    <article className="fs-sparkline-card">
      <span className="fs-kicker">{label}</span>
      <div className="fs-sparkline-row">
        <div><b>{current}{unit}</b><small className={isUp ? "up" : "down"}>{isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{isUp ? "+" : ""}{diff}{unit}</small></div>
        <svg viewBox={`0 0 ${w} ${h}`} className="fs-sparkline-svg" preserveAspectRatio="none">
          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════
   Section 5: Production Monitoring
   ═══════════════════════════════════════════════════ */
function ProductionMonitoring({ line, setLine, shift, setShift, notify, lines }) {
  const [alertStates, setAlertStates] = useState(() => {
    const s = {};
    productionAlerts.forEach(a => { s[a.id] = a.acknowledged; });
    return s;
  });

  const acknowledgeAlert = (id) => {
    setAlertStates(prev => ({ ...prev, [id]: true }));
    notify(`Alert ${id} acknowledged.`);
  };

  const maxHourly = Math.max(...hourlyThroughput.map(h => h.units));

  return <>
    <div className="fs-section-head">
      <div><h2>Production <em>monitoring.</em></h2><p>Real-time production line status, throughput tracking, alerts, and shift handoff summary.</p></div>
      <div className="fs-result-filters">
        <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
        <label className="fs-filter-btn fs-result-filter"><Clock size={15} /><select value={shift} onChange={e => setShift(e.target.value)} aria-label="Shift">{shiftFilters.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></label>
      </div>
    </div>

    {/* Line status cards */}
    <div className="fs-line-cards">
      {lines.map(l => (
        <article className={`fs-line-card ${l.status.toLowerCase()}`} key={l.id}>
          <div className="fs-line-card-head">
            <span className={`fs-line-dot ${l.status.toLowerCase()}`} />
            <div><b>{l.name}</b><small>{l.product}</small></div>
            <span className={`fs-line-status-badge ${l.status.toLowerCase()}`}>{l.status}</span>
          </div>
          <div className="fs-line-card-metrics">
            <div><dt>OEE</dt><dd>{l.oee}%</dd></div>
            <div><dt>Units</dt><dd>{formatNumber(l.unitsToday)}</dd></div>
            <div><dt>Yield</dt><dd>{l.yield}%</dd></div>
          </div>
          <div className="fs-oee-bar"><i style={{ width: `${l.oee}%` }} className={l.oee >= 85 ? "good" : l.oee >= 70 ? "warn" : "bad"} /></div>
        </article>
      ))}
    </div>

    <div className="fs-monitor-grid">
      {/* Hourly throughput chart */}
      <article className="fs-chart">
        <div className="fs-card-top"><div><span className="fs-kicker">Throughput</span><h3>Hourly output</h3></div><span>Today</span></div>
        <div className="fs-chart-layout" style={{ display: "flex", gap: "10px", margin: "22px 0 0", alignItems: "stretch" }}>
          <div className="fs-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>Units</div>
          <div className="fs-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", paddingBottom: "21px", fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "6px", textAlign: "right" }}>
            <span>{maxHourly}</span><span>{Math.round(maxHourly * 0.75)}</span><span>{Math.round(maxHourly * 0.5)}</span><span>{Math.round(maxHourly * 0.25)}</span><span>0</span>
          </div>
          <div className="fs-bars" style={{ flex: 1, margin: 0 }}>
            {hourlyThroughput.map((h, i) => <div key={i}><i style={{ height: `${(h.units / maxHourly) * 100}%` }} /><span>{h.hour}</span></div>)}
          </div>
        </div>
        <footer><p><span className="fs-live-dot" />Peak: {maxHourly} units/hr</p><b>{hourlyThroughput.reduce((a, h) => a + h.units, 0)}</b></footer>
      </article>

      {/* Alerts panel */}
      <article className="fs-alert-panel">
        <div className="fs-card-top"><div><span className="fs-kicker"><Bell size={13} />Alerts</span><h3>Production alerts</h3></div><span className="fs-alert-count">{productionAlerts.filter(a => !alertStates[a.id]).length} active</span></div>
        <div className="fs-alert-list">
          {productionAlerts.map(a => (
            <div key={a.id} className={`fs-alert-item ${a.severity} ${alertStates[a.id] ? "ack" : ""}`}>
              <span className={`fs-alert-dot ${a.severity}`} />
              <div>
                <b>{a.line}</b>
                <p>{a.message}</p>
                <small>{a.time}</small>
              </div>
              {!alertStates[a.id] && <button type="button" onClick={() => acknowledgeAlert(a.id)} title="Acknowledge"><Check size={14} /></button>}
              {alertStates[a.id] && <span className="fs-alert-ack-badge">ACK</span>}
            </div>
          ))}
        </div>
      </article>
    </div>

    {/* Shift handoff */}
    <section className="fs-section fs-handoff" style={{ marginTop: "18px" }}>
      <div className="fs-card-top" style={{ marginBottom: "14px" }}>
        <div><span className="fs-kicker"><Zap size={13} />Shift handoff</span><h3>{shiftHandoff.outgoing} → {shiftHandoff.incoming} at {shiftHandoff.handoffTime}</h3></div>
      </div>
      <p className="fs-handoff-notes">{shiftHandoff.notes}</p>
      <div className="fs-handoff-actions">
        <span className="fs-kicker">Pending actions</span>
        <ul>
          {shiftHandoff.pendingActions.map((action, i) => (
            <li key={i}><ChevronRight size={13} />{action}</li>
          ))}
        </ul>
      </div>
    </section>
  </>;
}
