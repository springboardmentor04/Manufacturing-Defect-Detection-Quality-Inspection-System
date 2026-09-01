export const MAX_BATCH_IMAGES = 24;
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
export const SIDEBAR_PREFERENCE_KEY = "visioninspect.qualitySidebarExpanded";

export function readSidebarExpandedPreference(storage = typeof window !== "undefined" ? window.localStorage : null) {
  try {
    return storage?.getItem(SIDEBAR_PREFERENCE_KEY) === "expanded";
  } catch {
    return false;
  }
}

export function writeSidebarExpandedPreference(isExpanded, storage = typeof window !== "undefined" ? window.localStorage : null) {
  try {
    storage?.setItem(SIDEBAR_PREFERENCE_KEY, isExpanded ? "expanded" : "collapsed");
  } catch {
    // Storage access can be unavailable in private or restricted browser contexts.
  }
}

export const dashboardSections = [
  { id: "upload", label: "Image upload", hint: "Stage a batch", icon: "upload" },
  { id: "results", label: "Inspection results", hint: "Review queue", icon: "results" },
  { id: "details", label: "Defect details", hint: "Evidence view", icon: "details" },
  { id: "reports", label: "Quality reports", hint: "Trend signals", icon: "reports" },
  { id: "history", label: "Inspection history", hint: "Past batches", icon: "history" },
];

export function canAccessQualityDashboard(role) {
  return ["quality_engineer", "admin"].includes(role);
}

export function filterResultsBySeverity(results, filter) {
  if (filter === "All severity") return results;
  if (filter === "High and medium") return results.filter((result) => ["High", "Medium"].includes(result.severity));
  const severity = filter.replace(" only", "");
  return results.filter((result) => result.severity === severity);
}

export function filterBatchesBySeverity(batches, filter) {
  const bySeverity = filter === "All severity" ? batches : filter === "High and medium" ? batches.filter((batch) => ["High", "Medium"].includes(batch.severity)) : batches.filter((batch) => batch.severity === filter.replace(" only", ""));
  return [...bySeverity].sort((left, right) => right.sortOrder - left.sortOrder);
}

export const inspectionDateFilters = ["Today", "Last 7 days", "Last 30 days"];
export const historyDateFilters = ["Today", "Last 7 days", "Last 15 days", "Last 30 days"];
export const historyExportColumns = ["Batch", "Product and line", "Status", "Item count", "Flags", "Verdict", "Completed"];

export function filterInspectionBatches(batches, severity, dateRange, line) {
  const days = dateRange === "Today" ? 1 : dateRange === "Last 7 days" ? 7 : dateRange === "Last 15 days" ? 15 : 30;
  return filterBatchesBySeverity(batches, severity).filter((batch) => (batch.ageDays ?? 0) <= days && (line === "All lines" || batch.line === line));
}

export function filterHistoryRowsByDate(rows, dateRange) {
  const days = dateRange === "Today" ? 1 : dateRange === "Last 7 days" ? 7 : dateRange === "Last 15 days" ? 15 : 30;
  return rows.filter((row) => (row.ageDays ?? 0) <= days);
}

export function getHistoryExportRows(rows = []) {
  return rows.map((row) => [
    `${row.id}\n${row.result}`,
    `${row.product}\n${row.line}`,
    row.status,
    String(row.itemCount ?? "—"),
    String(row.flags ?? "—"),
    row.verdict ?? "—",
    row.completed,
  ]);
}

export function historyExportFilename(dateRange) {
  return `visioninspect-history-${dateRange.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.pdf`;
}

export function getHistoryBatchSummary(row = {}) {
  const itemCount = Number(row.itemCount || 0);
  const flags = Number(row.flags || 0);
  const flaggedLabel = `${flags} of ${itemCount} item${itemCount === 1 ? "" : "s"} flagged`;

  if (row.status !== "Complete") {
    return {
      label: "Manual review required",
      tone: "review",
      flaggedLabel,
      reason: row.failureReason || (flags ? "The model identified a failed item that still requires manual verification." : "No failed items are currently recorded; manual verification is still required."),
    };
  }

  if (flags) {
    return {
      label: "Batch failed",
      tone: "fail",
      flaggedLabel,
      reason: row.failureReason || `The batch failed because ${flags} item${flags === 1 ? "" : "s"} did not meet the recorded visual inspection criteria.`,
    };
  }

  return {
    label: "Batch passed",
    tone: "pass",
    flaggedLabel,
    reason: "All inspected items passed the recorded visual inspection criteria.",
  };
}

export function getManualReviewProgress(products, reviewedProductIds = new Set()) {
  const isReviewed = (productId) => reviewedProductIds instanceof Set ? reviewedProductIds.has(productId) : reviewedProductIds.includes(productId);
  const reviewed = products.filter((product) => isReviewed(product.id)).length;
  return { total: products.length, reviewed, complete: products.length > 0 && reviewed === products.length };
}

export function getBatchOutcome(products = []) {
  const flags = products.filter((product) => product.status === "Failed").length;
  return { itemCount: products.length, flags, verdict: flags > 0 ? "Fail" : "Pass" };
}

export const inspectionResults = [];

export const inspectionBatches = [];

export const historyRows = [];

export const inspectionSummary = [
  { id: "total", label: "Total inspections", value: 0, detail: "Last 7 days" },
  { id: "passed", label: "Passed", value: 0, detail: "0% pass rate" },
  { id: "failed", label: "Failed", value: 0, detail: "0% fail rate" },
];

export const reportTrend = [0, 0, 0, 0, 0, 0];

export const defectMix = [
  { label: "Surface", value: 0, color: "#27837f" },
  { label: "Assembly", value: 0, color: "#fcbe5a" },
  { label: "Dimensional", value: 0, color: "#ba4a31" },
  { label: "Packaging", value: 0, color: "#799a98" },
];

export function bytesLabel(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateBatchFiles(fileList, existingNames = []) {
  const files = Array.from(fileList || []);
  const accepted = [];
  const rejected = [];
  const knownNames = new Set(existingNames);

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) rejected.push(`${file.name}: choose an image file.`);
    else if (file.size > MAX_IMAGE_SIZE_BYTES) rejected.push(`${file.name}: file is larger than 8 MB.`);
    else if (knownNames.has(file.name)) rejected.push(`${file.name}: already staged in this batch.`);
    else if (existingNames.length + accepted.length >= MAX_BATCH_IMAGES) rejected.push(`${file.name}: batch limit is ${MAX_BATCH_IMAGES} images.`);
    else {
      accepted.push(file);
      knownNames.add(file.name);
    }
  });

  return { accepted, rejected };
}
