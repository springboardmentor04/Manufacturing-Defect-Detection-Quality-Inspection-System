export const MAX_BATCH_IMAGES = 50;
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
  { id: "upload", label: "Capture & Stage", hint: "Live camera & upload", icon: "upload" },
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

export function isBatchFail(batch) {
  if (!batch) return false;
  const flags = batch.flagCount ?? (batch.products?.filter((p) => p.status === "Failed" || p.status === "Hold" || p.status === "Rejected").length || 0);
  return (
    flags > 0 ||
    batch.verdict === "Hold" ||
    batch.verdict === "Fail" ||
    batch.status === "Failed" ||
    batch.result === "Hold" ||
    batch.result === "Fail" ||
    ["Critical", "High", "Medium"].includes(batch.severity)
  );
}

export function filterBatchesBySeverity(batches, filter) {
  if (!filter || filter === "All" || filter === "All severity") {
    return [...batches].sort((left, right) => (right.sortOrder ?? 0) - (left.sortOrder ?? 0));
  }
  if (filter === "Pass" || filter === "PASS") {
    return batches
      .filter((batch) => !isBatchFail(batch))
      .sort((left, right) => (right.sortOrder ?? 0) - (left.sortOrder ?? 0));
  }
  if (filter === "Fail" || filter === "FAIL") {
    return batches
      .filter((batch) => isBatchFail(batch))
      .sort((left, right) => (right.sortOrder ?? 0) - (left.sortOrder ?? 0));
  }
  const bySeverity = filter === "High and medium" ? batches.filter((batch) => ["High", "Medium"].includes(batch.severity)) : batches.filter((batch) => batch.severity === filter.replace(" only", ""));
  return [...bySeverity].sort((left, right) => (right.sortOrder ?? 0) - (left.sortOrder ?? 0));
}

export const inspectionDateFilters = ["Today", "Last 7 days", "Last 30 days"];
export const historyDateFilters = ["Today", "Last 7 days", "Last 15 days", "Last 30 days"];
export const historyExportColumns = ["Batch", "Product and line", "Status", "Item count", "Flags", "Verdict", "Completed"];

export function isBatchInDateRange(batch, dateRange) {
  if (!dateRange || dateRange === "All" || dateRange === "All time" || dateRange === "All batches") return true;

  // 1. Try ISO date or timestamp
  const rawDate = batch.createdAt || batch.capturedAt || batch.timestamp || batch.date || batch.rawDate;
  let batchDate = null;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) batchDate = parsed;
  }

  // 2. Try parsing captured or completed strings (e.g., "Manual review complete · 08/09/26, 12:24:29 pm")
  if (!batchDate && (batch.captured || batch.completed)) {
    try {
      const fullStr = `${batch.captured || ""} ${batch.completed || ""}`;
      const dateMatch = fullStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        let day = parseInt(dateMatch[1], 10);
        let month = parseInt(dateMatch[2], 10) - 1;
        let year = parseInt(dateMatch[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) batchDate = d;
      }
    } catch {}
  }

  // 3. Try parsing batch code format like BATCH-LINE04-20260908-1224
  if (!batchDate && (batch.name || batch.id || batch.product)) {
    try {
      const codeStr = `${batch.name || ""} ${batch.id || ""} ${batch.product || ""}`;
      const match = codeStr.match(/(\d{4})(\d{2})(\d{2})/);
      if (match) {
        const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
        if (!isNaN(d.getTime())) batchDate = d;
      }
    } catch {}
  }

  if (!batchDate) {
    if (typeof batch.ageDays === "number") {
      const days = dateRange === "Today" ? 1 : dateRange === "Last 7 days" ? 7 : dateRange === "Last 15 days" ? 15 : 30;
      return batch.ageDays <= days;
    }
    return true;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const batchTime = batchDate.getTime();
  const batchDayStart = new Date(batchDate.getFullYear(), batchDate.getMonth(), batchDate.getDate()).getTime();

  if (dateRange === "Today") {
    return batchDayStart === startOfToday || (batchTime >= startOfToday && batchTime <= (now.getTime() + 120000));
  }

  const daysLimit = dateRange === "Last 7 days" ? 7 : dateRange === "Last 15 days" ? 15 : dateRange === "Last 30 days" ? 30 : 365;
  const thresholdStart = startOfToday - (daysLimit - 1) * 24 * 60 * 60 * 1000;
  return batchTime >= thresholdStart && batchTime <= (now.getTime() + 120000);
}

export function filterInspectionBatches(batches, severity, dateRange, line) {
  return filterBatchesBySeverity(batches, severity).filter(
    (batch) => isBatchInDateRange(batch, dateRange) && (line === "All lines" || batch.line === line)
  );
}

export function filterHistoryRowsByDate(rows, dateRange) {
  return rows.filter((row) => isBatchInDateRange(row, dateRange));
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
  const isFail = flags > 0 || row.result === "Hold" || row.result === "Fail" || row.verdict === "FAIL" || row.verdict === "Fail";

  if (row.status !== "Complete") {
    return {
      label: "Manual review required",
      tone: "review",
      flaggedLabel,
      reason: row.failureReason || (flags ? `The model flagged ${flags} defective item(s) that require quality engineer verification.` : "Manual verification is in progress for this batch."),
      recommendation: isFail
        ? "Inspect all flagged defect regions in Defect Details. Determine whether rework or rejection is required."
        : "Complete visual verification for all batch items to close inspection review."
    };
  }

  if (isFail) {
    const sev = row.severity || (flags >= 2 ? "High" : "Medium");
    let recText = "Route batch to Rework Station. Quarantine flagged units and log corrective action.";
    if (sev === "Critical" || flags >= 3) {
      recText = "Quarantine Entire Batch: Trigger Line Alert for tooling / fixture calibration. Reject defective parts.";
    } else if (sev === "High" || flags >= 1) {
      recText = "Hold & Rework: Isolate flagged component(s) for repair. Re-inspect after rework.";
    }

    return {
      label: "Batch failed",
      tone: "fail",
      flaggedLabel,
      reason: row.failureReason || `The batch failed quality standards because ${flags} item${flags === 1 ? "" : "s"} did not pass visual inspection criteria.`,
      recommendation: recText
    };
  }

  return {
    label: "Batch passed",
    tone: "pass",
    flaggedLabel,
    reason: "All inspected items passed the recorded visual inspection criteria.",
    recommendation: "Approved for Release: Auto-approve batch to next manufacturing stage and packaging."
  };
}

export function getManualReviewProgress(products, reviewedProductIds = new Set()) {
  const isReviewed = (productId) => reviewedProductIds instanceof Set ? reviewedProductIds.has(productId) : reviewedProductIds.includes(productId);
  const reviewed = products.filter((product) => isReviewed(product.id)).length;
  return { total: products.length, reviewed, complete: products.length > 0 && reviewed === products.length };
}

export function getBatchOutcome(products = []) {
  const flags = products.filter((product) => product.status === "Failed" || product.status === "Hold" || product.status === "Rejected").length;
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
