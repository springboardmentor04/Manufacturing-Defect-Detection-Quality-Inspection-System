export const FS_SIDEBAR_PREFERENCE_KEY = "visioninspect.factorySidebarExpanded";

export function readFSSidebarExpandedPreference(storage = typeof window !== "undefined" ? window.localStorage : null) {
  try {
    return storage?.getItem(FS_SIDEBAR_PREFERENCE_KEY) === "expanded";
  } catch {
    return false;
  }
}

export function writeFSSidebarExpandedPreference(isExpanded, storage = typeof window !== "undefined" ? window.localStorage : null) {
  try {
    storage?.setItem(FS_SIDEBAR_PREFERENCE_KEY, isExpanded ? "expanded" : "collapsed");
  } catch {
    // Storage access can be unavailable in private or restricted browser contexts.
  }
}

export const supervisorSections = [
  { id: "overview", label: "Production overview", hint: "Line status", icon: "overview" },
  { id: "inspections", label: "Inspection reports", hint: "Batch records", icon: "inspections" },
  { id: "defects", label: "Defect trends", hint: "Trend signals", icon: "defects" },
  { id: "analytics", label: "Quality analytics", hint: "SPC metrics", icon: "analytics" },
  { id: "monitoring", label: "Production monitoring", hint: "Live status", icon: "monitoring" },
];

export function canAccessFactorySupervisorDashboard(role) {
  return ["factory_supervisor", "admin"].includes(role);
}

// --------------- Demo / seed data generators ---------------

export const productionLines = [
  { id: "L01", name: "Line 01", product: "Hazelnut Cap", status: "Running", oee: 87.2, unitsToday: 1248, yield: 96.4, shift: "Morning", downtime: 12 },
  { id: "L02", name: "Line 02", product: "Bracket Assembly", status: "Running", oee: 91.5, unitsToday: 986, yield: 98.1, shift: "Morning", downtime: 5 },
  { id: "L03", name: "Line 03", product: "Seal Ring", status: "Idle", oee: 0, unitsToday: 0, yield: 0, shift: "—", downtime: 480 },
  { id: "L04", name: "Line 04", product: "Motor Housing", status: "Running", oee: 78.6, unitsToday: 642, yield: 93.8, shift: "Afternoon", downtime: 38 },
];

export const shiftPerformance = [
  { shift: "Morning (06:00–14:00)", units: 1846, defects: 42, yield: 97.7, oee: 89.3 },
  { shift: "Afternoon (14:00–22:00)", units: 1524, defects: 58, yield: 96.2, oee: 84.1 },
  { shift: "Night (22:00–06:00)", units: 1102, defects: 31, yield: 97.2, oee: 81.7 },
];

export const overviewKPIs = [
  { id: "units", label: "Total units today", value: 4472, detail: "Across all lines", trend: "up" },
  { id: "yield", label: "Overall yield", value: "96.8%", detail: "Target: 95%", trend: "up" },
  { id: "defects", label: "Active defects", value: 131, detail: "24h window", trend: "down" },
  { id: "lines", label: "Active lines", value: "3 / 4", detail: "1 idle", trend: "neutral" },
];

export const inspectionDateFilters = ["Today", "Last 7 days", "Last 30 days"];
export const defectTrendRanges = ["7 days", "30 days", "90 days"];
export const defectTypeFilters = ["All types", "Surface", "Assembly", "Dimensional", "Packaging"];
export const lineFilters = ["All lines", "Line 01", "Line 02", "Line 03", "Line 04"];
export const statusFilters = ["All", "PASS", "FAIL"];
export const shiftFilters = ["All shifts", "Morning", "Afternoon", "Night"];
export const severityFilters = ["All severity", "High", "Medium", "Low"];

// Daily defect counts (last 7 days)
export const dailyDefects = [
  { day: "Mon", count: 18, rate: 3.2 },
  { day: "Tue", count: 24, rate: 4.1 },
  { day: "Wed", count: 15, rate: 2.7 },
  { day: "Thu", count: 21, rate: 3.6 },
  { day: "Fri", count: 29, rate: 5.0 },
  { day: "Sat", count: 12, rate: 2.1 },
  { day: "Sun", count: 8, rate: 1.4 },
];

// Defect category distribution
export const defectCategories = [
  { label: "Surface", value: 42, color: "#27837f" },
  { label: "Assembly", value: 28, color: "#fcbe5a" },
  { label: "Dimensional", value: 19, color: "#ba4a31" },
  { label: "Packaging", value: 11, color: "#799a98" },
];

// Defects by line x day-of-week heatmap (higher = worse)
export const defectHeatmap = [
  { line: "Line 01", values: [3, 5, 2, 4, 6, 2, 1] },
  { line: "Line 02", values: [1, 2, 1, 3, 2, 0, 1] },
  { line: "Line 03", values: [0, 0, 0, 0, 0, 0, 0] },
  { line: "Line 04", values: [4, 7, 3, 5, 8, 3, 2] },
];

// Defect rate trend (last 7 days) for line chart
export const defectRateTrend = [3.2, 4.1, 2.7, 3.6, 5.0, 2.1, 1.4];
export const defectRateThreshold = 3.5;

// Quality analytics - Pareto data (top defect types)
export const paretoDefects = [
  { type: "Surface scratch", count: 47, cumPct: 35.9 },
  { type: "Misalignment", count: 31, cumPct: 59.5 },
  { type: "Crack", count: 22, cumPct: 76.3 },
  { type: "Discoloration", count: 14, cumPct: 87.0 },
  { type: "Burr", count: 9, cumPct: 93.9 },
  { type: "Deformation", count: 5, cumPct: 97.7 },
  { type: "Other", count: 3, cumPct: 100 },
];

// Quality analytics - Statistical metrics per line
export const statisticalMetrics = [
  { line: "Line 01", mean: 96.4, stdDev: 1.2, cp: 1.34, cpk: 1.21 },
  { line: "Line 02", mean: 98.1, stdDev: 0.8, cp: 1.67, cpk: 1.55 },
  { line: "Line 03", mean: 0, stdDev: 0, cp: 0, cpk: 0 },
  { line: "Line 04", mean: 93.8, stdDev: 2.1, cp: 1.11, cpk: 0.98 },
];

// Quality analytics - Trend sparkline data (pass rate over last 12 periods)
export const passRateSparkline = [94.2, 95.1, 93.8, 96.0, 95.5, 97.1, 96.8, 95.9, 96.4, 97.0, 96.2, 96.8];
export const confidenceSparkline = [91.5, 92.3, 93.1, 91.8, 94.0, 93.5, 94.2, 93.8, 94.5, 95.0, 94.1, 94.8];
export const yieldSparkline = [95.0, 95.8, 94.5, 96.2, 95.9, 97.0, 96.5, 96.1, 96.8, 97.2, 96.4, 96.8];

// Production monitoring - hourly throughput (last 12 hours)
export const hourlyThroughput = [
  { hour: "06:00", units: 142 },
  { hour: "07:00", units: 178 },
  { hour: "08:00", units: 195 },
  { hour: "09:00", units: 201 },
  { hour: "10:00", units: 188 },
  { hour: "11:00", units: 192 },
  { hour: "12:00", units: 165 },
  { hour: "13:00", units: 183 },
  { hour: "14:00", units: 176 },
  { hour: "15:00", units: 190 },
  { hour: "16:00", units: 185 },
  { hour: "17:00", units: 172 },
];

// Production monitoring - alerts
export const productionAlerts = [
  { id: "A01", severity: "high", line: "Line 04", message: "Defect rate exceeds 5% threshold", time: "14 min ago", acknowledged: false },
  { id: "A02", severity: "medium", line: "Line 01", message: "OEE dropped below 85% target", time: "38 min ago", acknowledged: false },
  { id: "A03", severity: "low", line: "Line 02", message: "Scheduled maintenance in 2 hours", time: "1h ago", acknowledged: true },
  { id: "A04", severity: "high", line: "Line 03", message: "Line idle — no production activity", time: "2h ago", acknowledged: true },
];

// Shift handoff data
export const shiftHandoff = {
  outgoing: "Morning",
  incoming: "Afternoon",
  handoffTime: "14:00",
  notes: "Line 03 remains idle due to scheduled maintenance. Line 04 sensor calibration needed — defect rate trending higher. All other lines running nominal.",
  pendingActions: [
    "Complete sensor calibration on Line 04",
    "Review flagged batches from morning shift",
    "Verify Line 03 maintenance completion by 18:00",
  ],
};

// Helper: format a number with commas
export function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString("en-IN");
}

// Helper: get severity color class
export function getSeverityClass(severity) {
  if (!severity) return "";
  const s = severity.toLowerCase();
  if (s === "high" || s === "critical") return "high";
  if (s === "medium") return "medium";
  return "low";
}

// Helper: get heatmap intensity class (0-8 scale)
export function getHeatmapIntensity(value) {
  if (value === 0) return "none";
  if (value <= 2) return "low";
  if (value <= 4) return "medium";
  if (value <= 6) return "high";
  return "critical";
}
