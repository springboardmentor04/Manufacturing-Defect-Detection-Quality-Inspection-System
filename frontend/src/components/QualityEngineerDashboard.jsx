import { Activity, AlertTriangle, BarChart3, CalendarClock, Check, ChevronDown, ChevronRight, CircleDotDashed, Download, FileCheck2, FileImage, Files, Filter, Gauge, History, ImagePlus, LayoutDashboard, ListFilter, LogOut, Menu, MoreHorizontal, PanelLeft, Search, Settings, ShieldCheck, UploadCloud, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import DefectDetailsWorkspace from "./DefectDetailsWorkspace.jsx";
import { bytesLabel, dashboardSections, defectMix, filterHistoryRowsByDate, filterInspectionBatches, getBatchOutcome, getHistoryBatchSummary, getHistoryExportRows, getManualReviewProgress, historyDateFilters, historyExportColumns, historyExportFilename, historyRows, inspectionBatches, inspectionDateFilters, inspectionResults, inspectionSummary, readSidebarExpandedPreference, reportTrend, validateBatchFiles, writeSidebarExpandedPreference } from "@/lib/qualityDashboard";

const icons = { upload: ImagePlus, results: LayoutDashboard, details: CircleDotDashed, reports: BarChart3, history: History };

function Severity({ value }) {
  return <span className={`qe-pill qe-${value.toLowerCase()}`}>{value}</span>;
}

function Notice({ tone = "info", children }) {
  if (!children) return null;
  return <p className={`qe-note qe-note-${tone}`} role="status">{tone === "error" ? <AlertTriangle size={14} /> : <Check size={14} />}{children}</p>;
}

export default function QualityEngineerDashboard({ user, onSignOut, isSigningOut }) {
  const [active, setActive] = useState(() => {
    try {
      return sessionStorage.getItem("vi_active_tab") || "results";
    } catch {
      return "results";
    }
  });
  const [liveBatches, setLiveBatches] = useState(inspectionBatches);
  const [liveResults, setLiveResults] = useState(inspectionResults);
  const [isUploading, setIsUploading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => readSidebarExpandedPreference());
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const defaultSelected = {
    id: "IR-NONE",
    productId: "PRD-NONE",
    product: "NO-BATCH",
    line: "Line 01",
    batch: "BT-NONE",
    defect: "No defects",
    severity: "Low",
    severityScore: 0,
    confidence: 100.0,
    area: "0.0%",
    decision: "Pass",
    mode: "Detection",
    time: "Now",
    image: "/manus-storage/hazelnut_cap_defective.png",
    marker: { left: "58%", top: "38%", width: "23%", height: "28%" }
  };

  const [selectedId, setSelectedId] = useState(liveResults[0]?.id || "IR-NONE");
  const [reportRange, setReportRange] = useState("7 days");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All batches");
  const [historyDateRange, setHistoryDateRange] = useState("Last 7 days");
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [resultFilter, setResultFilter] = useState("All severity");
  const [resultDateRange, setResultDateRange] = useState("Last 30 days");
  const [resultLine, setResultLine] = useState("All lines");
  const [detailDateRange, setDetailDateRange] = useState("Last 30 days");
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(liveBatches[0]?.products?.[0]?.id || "PRD-NONE");
  const [reviewedProductIds, setReviewedProductIds] = useState(() => new Set());
  const [actionMessage, setActionMessage] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const inputRef = useRef(null);

  const baseFindingForSelectedId = liveResults.find((item) => item.id === selectedId) || liveResults[0] || defaultSelected;
  const detailBatch = liveBatches.find((batch) => batch.id === baseFindingForSelectedId?.batch) || liveBatches[0] || { id: "BT-NONE", name: "No Batches", line: "Line 01", products: [] };
  const selected = liveResults.find((item) => item.batch === detailBatch?.id && item.productId === selectedProductId) || baseFindingForSelectedId || defaultSelected;
  const detailBatches = useMemo(() => filterInspectionBatches(liveBatches, "All severity", detailDateRange, "All lines"), [liveBatches, detailDateRange]);
  const detailFindings = useMemo(() => liveResults.filter((item) => item.batch === detailBatch?.id), [liveResults, detailBatch?.id]);
  const activeProduct = detailBatch?.products?.find((product) => product.id === selectedProductId) || detailBatch?.products?.[0] || { id: "PRD-NONE", name: "Product Component" };

  const manualHistoryRows = useMemo(() => {
    const combinedHistory = [...liveBatches.map(b => ({
      id: b.id,
      product: b.name,
      line: b.line,
      status: b.status === "Passed" || b.status === "Complete" ? "Complete" : "In review",
      completed: b.captured,
      ageDays: b.ageDays ?? 0,
      result: b.severity === "High" ? "Hold" : b.severity === "Medium" ? "Review" : "Pass",
      itemCount: b.products?.length || 1,
      flags: b.products?.filter(p => p.status === "Failed").length || 0,
      failureReason: b.failureReason
    })), ...historyRows.filter(h => !liveBatches.some(b => b.id === h.id))];

    return combinedHistory.map((row) => {
      const batch = liveBatches.find((item) => item.id === row.id);
      const outcome = batch ? getBatchOutcome(batch.products) : { itemCount: row.itemCount || 0, flags: row.flags || 0 };
      const verdict = outcome.flags > 0 ? "Fail" : "Pass";
      if (!batch) return { ...row, ...outcome, verdict };
      const progress = getManualReviewProgress(batch.products, reviewedProductIds);
      return { ...row, ...outcome, verdict, status: progress.complete ? "Complete" : "In review", completed: progress.complete ? `Manual review complete · ${batch.captured}` : "In review" };
    });
  }, [liveBatches, reviewedProductIds]);

  const stagedSize = files.reduce((total, file) => total + file.size, 0);
  const filteredHistory = useMemo(() => filterHistoryRowsByDate(manualHistoryRows, historyDateRange).filter((row) => {
    const matchSearch = `${row.id} ${row.product} ${row.line}`.toLowerCase().includes(historySearch.trim().toLowerCase());
    const matchFilter = historyFilter === "All batches" || row.status === historyFilter;
    return matchSearch && matchFilter;
  }), [historyDateRange, historyFilter, historySearch, manualHistoryRows]);

  const resultLines = useMemo(() => ["All lines", ...new Set(liveBatches.map((batch) => batch.line))], [liveBatches]);
  const filteredBatches = useMemo(() => filterInspectionBatches(liveBatches, resultFilter, resultDateRange, resultLine), [liveBatches, resultDateRange, resultFilter, resultLine]);
  const selectedBatch = liveBatches.find((batch) => batch.id === selectedBatchId) || null;

  useEffect(() => {
    writeSidebarExpandedPreference(sidebarExpanded);
  }, [sidebarExpanded]);

  function formatCapturedTime(isoString) {
    if (!isoString) return "Just now";
    try {
      let dateStr = String(isoString).trim();
      if (dateStr.includes("T") && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
        dateStr += "Z";
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  useEffect(() => {
    async function fetchLiveData() {
      try {
        const response = await fetch("http://localhost:8000/api/batches");
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.batches?.length > 0) {
            const loadedBatches = [];
            const loadedResults = [];

            resData.batches.forEach(b => {
              const formattedTime = formatCapturedTime(b.capturedAt);
              loadedBatches.push({
                id: b._id,
                name: b.name,
                line: b.line,
                captured: formattedTime,
                ageDays: 0,
                sortOrder: b.sortOrder || 1,
                severity: b.overallSeverity || "Low",
                confidence: b.overallConfidence || 95.0,
                status: b.status,
                mode: b.mode || "Detection",
                image: b.image ? (b.image.startsWith("http") ? b.image : `http://localhost:8000${b.image}`) : "/manus-storage/hazelnut_cap_defective.png",
                products: (b.products || []).map(p => ({
                  id: p._id,
                  name: p.name,
                  status: p.status,
                  confidence: p.confidence,
                  captured: formatCapturedTime(p.capturedAt || b.capturedAt)
                }))
              });

              (b.findings || []).forEach((f, idx) => {
                const prod = (b.products || [])[idx] || (b.products || [])[0] || {};
                const gUrl = f.gradcamUrl || (f.rawOutput && f.rawOutput.gradcamUrl);
                const sUrl = f.segmentationUrl || (f.rawOutput && f.rawOutput.segmentationUrl);
                const gradcamImg = gUrl ? (gUrl.startsWith("http") ? gUrl : `http://localhost:8000${gUrl}`) : null;
                const segImg = sUrl ? (sUrl.startsWith("http") ? sUrl : `http://localhost:8000${sUrl}`) : null;

                loadedResults.push({
                  id: f.findingCode || f._id,
                  productId: prod._id || f.productId,
                  product: b.name,
                  line: b.line,
                  batch: b._id,
                  defect: f.defectType,
                  severity: f.severity,
                  severityScore: f.severityScore,
                  confidence: f.confidence,
                  area: f.defectArea,
                  decision: f.decision,
                  mode: b.mode || "Detection",
                  time: "Recently",
                  image: b.image ? (b.image.startsWith("http") ? b.image : `http://localhost:8000${b.image}`) : "/manus-storage/hazelnut_cap_defective.png",
                  gradcamImage: gradcamImg,
                  segmentationImage: segImg,
                  marker: f.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" }
                });
              });
            });

            setLiveBatches(loadedBatches);
            if (loadedResults.length > 0) {
              setLiveResults(loadedResults);
              setSelectedId(loadedResults[0].id);
              setSelectedProductId(loadedResults[0].productId);
            }
          }
        }

        // Fetch stored manual reviews from MongoDB
        const revRes = await fetch("http://localhost:8000/api/reviews/list");
        if (revRes.ok) {
          const revData = await revRes.json();
          if (revData.success && revData.reviews?.length > 0) {
            const savedReviewedIds = new Set(revData.reviews.map((r) => r.productId));
            setReviewedProductIds(savedReviewedIds);
          }
        }
      } catch (err) {
        console.warn("FastAPI backend live fetch:", err);
      }
    }
    fetchLiveData();
  }, []);

  const chooseFiles = (fileList) => {
    const { accepted, rejected } = validateBatchFiles(fileList, files.map((file) => file.name));
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    if (rejected.length) {
      setMessage(rejected[0]);
      setMessageTone("error");
    } else if (accepted.length) {
      setMessage(`${accepted.length} image${accepted.length === 1 ? "" : "s"} staged for this review batch.`);
      setMessageTone("info");
    }
  };

  const selectSection = (id) => {
    setActive(id);
    try {
      sessionStorage.setItem("vi_active_tab", id);
    } catch { }
    setMobileNav(false);
  };

  const expandFromRail = (event) => {
    if (!sidebarExpanded && event.target === event.currentTarget) setSidebarExpanded(true);
  };

  const queueBatch = async () => {
    if (!files.length) {
      setMessage("Stage at least one image before creating a review batch.");
      setMessageTone("error");
      return;
    }
    setIsUploading(true);
    setMessage("Uploading batch and executing AI model inference...");
    setMessageTone("info");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("line", "Line 04");

      const response = await fetch("http://localhost:8000/api/batches/create", {
        method: "POST",
        body: formData,
      });
      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.detail || "Failed to create inspection batch.");
      }

      const { batch, products, findings, images } = resData.data;

      const formattedTime = formatCapturedTime(batch.capturedAt);
      const newUIBatch = {
        id: batch._id,
        name: batch.name,
        line: batch.line,
        captured: formattedTime,
        ageDays: 0,
        sortOrder: batch.sortOrder || 10,
        severity: batch.overallSeverity || "Low",
        confidence: batch.overallConfidence || 95.0,
        status: batch.status,
        mode: batch.mode || "Detection + segmentation",
        image: images[0]?.url ? `http://localhost:8000${images[0].url}` : "/manus-storage/hazelnut_cap_defective.png",
        marker: findings[0]?.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" },
        products: products.map((p) => ({
          id: p._id,
          name: p.name,
          status: p.status,
          confidence: p.confidence,
          captured: formatCapturedTime(p.capturedAt || batch.capturedAt)
        }))
      };

      const newUIResults = findings.map((f, idx) => {
        const prod = products[idx] || products[0];
        const img = images[idx] || images[0];
        return {
          id: f.findingCode || f._id,
          productId: prod._id,
          product: batch.name,
          line: batch.line,
          batch: batch._id,
          defect: f.defectType,
          severity: f.severity,
          severityScore: f.severityScore,
          confidence: f.confidence,
          area: f.defectArea,
          decision: f.decision,
          mode: batch.mode || "Detection + segmentation",
          time: "Just now",
          image: img?.url ? `http://localhost:8000${img.url}` : "/manus-storage/hazelnut_cap_defective.png",
          marker: f.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" }
        };
      });

      setLiveBatches((prev) => [newUIBatch, ...prev]);
      setLiveResults((prev) => [...newUIResults, ...prev]);
      setFiles([]);
      setSelectedId(newUIResults[0]?.id || selectedId);
      setSelectedProductId(newUIBatch.products[0]?.id || selectedProductId);
      setMessage(`Batch ${batch._id} created with ${files.length} image(s) and saved to MongoDB!`);
      setMessageTone("info");
      notify(`Created batch ${batch._id} with ${files.length} image(s). Added to Review Queue.`);
      setActive("results");
    } catch (err) {
      setMessage(`Upload failed: ${err.message}`);
      setMessageTone("error");
    } finally {
      setIsUploading(false);
    }
  };

  const notify = (nextMessage) => setActionMessage(nextMessage);
  const exportHistory = async () => {
    if (!filteredHistory.length || isExportingHistory) return;
    setIsExportingHistory(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setTextColor(21, 62, 66);
      document.setFontSize(18);
      document.text("VisionInspect AI — Inspection History", 40, 42);
      document.setTextColor(99, 119, 121);
      document.setFontSize(9);
      document.text(`Date range: ${historyDateRange}   •   Status: ${historyFilter}   •   Search: ${historySearch.trim() || "All records"}`, 40, 60);
      autoTable(document, {
        head: [historyExportColumns],
        body: getHistoryExportRows(filteredHistory),
        startY: 78,
        margin: { left: 40, right: 40 },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 6, textColor: [21, 62, 66], lineColor: [218, 226, 220], lineWidth: 0.4 },
        headStyles: { fillColor: [21, 62, 66], textColor: [250, 249, 240], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 247, 242] },
        columnStyles: { 0: { cellWidth: 74 }, 1: { cellWidth: 135 }, 2: { cellWidth: 72 }, 3: { halign: "center", cellWidth: 58 }, 4: { halign: "center", cellWidth: 45 }, 5: { halign: "center", cellWidth: 55 }, 6: { cellWidth: 120 } },
      });
      document.save(historyExportFilename(historyDateRange));
      notify(`Downloaded ${filteredHistory.length} filtered history record${filteredHistory.length === 1 ? "" : "s"} as a PDF.`);
    } catch {
      notify("The history PDF could not be generated. Please try again.");
    } finally {
      setIsExportingHistory(false);
    }
  };
  const selectDetailBatch = (batchId) => {
    const firstFinding = liveResults.find((item) => item.batch === batchId);
    const batch = liveBatches.find((item) => item.id === batchId);
    if (firstFinding) setSelectedId(firstFinding.id);
    if (batch?.products?.[0]) setSelectedProductId(batch.products[0].id);
  };
  const selectDetailDateRange = (range) => {
    const availableBatches = filterInspectionBatches(liveBatches, "All severity", range, "All lines");
    setDetailDateRange(range);
    if (!availableBatches.some((batch) => batch.id === selected.batch)) selectDetailBatch(availableBatches[0]?.id);
  };
  const openDetailedReview = (batchId) => {
    setDetailDateRange("Last 30 days");
    selectDetailBatch(batchId);
    setSelectedBatchId(null);
    setActive("details");
  };
  const markProductReviewed = async () => {
    if (!activeProduct || reviewedProductIds.has(activeProduct.id)) return;

    try {
      await fetch("http://localhost:8000/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: detailBatch.id,
          productId: activeProduct.id,
          findingId: selected?.id,
          decision: "Accept",
          note: "Manually verified by quality engineer"
        })
      });
      console.log(`[ManualReview] Saved review document for product ${activeProduct.id} in MongoDB 'manualReviews' collection!`);
    } catch (err) {
      console.warn("Failed to persist manual review to MongoDB:", err);
    }

    const nextReviewed = new Set(reviewedProductIds);
    nextReviewed.add(activeProduct.id);
    const progress = getManualReviewProgress(detailBatch.products, nextReviewed);
    setReviewedProductIds(nextReviewed);

    if (progress.complete) {
      setLiveBatches((prev) => prev.map((b) => (b.id === detailBatch.id ? { ...b, status: "Complete" } : b)));
    }

    notify(progress.complete
      ? `${detailBatch.id} is COMPLETE. All ${progress.total} products have been manually verified.`
      : `${activeProduct.id} marked reviewed. ${detailBatch.id} remains IN REVIEW (${progress.reviewed} of ${progress.total} products).`);
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/batches/${batchId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setLiveBatches((prev) => prev.filter((b) => b.id !== batchId));
        setLiveResults((prev) => prev.filter((r) => r.batch !== batchId));
        setActionMessage(`Batch ${batchId} deleted successfully from MongoDB.`);
      } else {
        const err = await res.json();
        setActionMessage(err.detail || "Failed to delete batch.");
      }
    } catch (err) {
      setActionMessage("Network error while deleting batch.");
    }
  };

  return (
    <main className={`qe-app ${sidebarExpanded ? "side-expanded" : ""} ${active === "details" ? "qe-detail-app" : ""}`}>
      <aside className={`qe-side ${mobileNav ? "open" : ""} ${sidebarExpanded ? "expanded" : "collapsed"}`} onClick={expandFromRail} aria-label="Quality Engineer dashboard navigation">
        <div className="qe-side-top"><div className="qe-side-brand"><BrandMark interactive={false} /><button className="qe-side-toggle" type="button" onClick={(event) => { event.stopPropagation(); setSidebarExpanded((value) => !value); }} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-pressed={sidebarExpanded} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}><PanelLeft size={17} strokeWidth={1.8} /></button></div></div>
        <nav className="qe-nav">
          {dashboardSections.map((section) => {
            const Icon = icons[section.icon];
            return <button type="button" key={section.id} onClick={() => selectSection(section.id)} className={active === section.id ? "active" : ""} data-label={section.label} aria-label={sidebarExpanded ? undefined : section.label}><Icon size={17} /><span><b>{section.label}</b></span></button>;
          })}
        </nav>
        <div className="qe-side-bottom"><div className="qe-side-profile-wrap"><button className="qe-side-profile" type="button" onClick={(event) => { event.stopPropagation(); setProfileMenuOpen((value) => !value); }} aria-label="Open account menu" aria-expanded={profileMenuOpen}><span>{(user.name || "QE").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><b>{user.name || "Quality Engineer"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Quality Engineer"}</small></div></button>{profileMenuOpen && <div className="qe-profile-menu" role="menu"><button type="button" onClick={() => { notify("Account options will be available in a later build."); setProfileMenuOpen(false); }} role="menuitem"><UserRound size={16} />Account</button><button type="button" onClick={() => { notify("Settings will be available in a later build."); setProfileMenuOpen(false); }} role="menuitem"><Settings size={16} />Settings</button><button className="qe-profile-signout" type="button" onClick={onSignOut} disabled={isSigningOut} role="menuitem"><LogOut size={16} />{isSigningOut ? "Signing out…" : "Sign out"}</button></div>}</div></div>
      </aside>

      <section className="qe-main">
        <header className="qe-head">
          <button className="qe-menu" type="button" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle dashboard navigation"><Menu size={20} /></button>
          <div className="qe-head-title"><span className="qe-kicker">Quality engineering</span><h1>{dashboardSections.find((section) => section.id === active)?.label}</h1></div>
          <div className="qe-head-actions"><div className="qe-user"><span>{(user.name || "QE").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><b>{user.name || "Quality Engineer"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Quality Engineer"}</small></div><ChevronDown size={14} /></div></div>
        </header>

        {actionMessage && <div className="qe-action-feedback" role="status"><Check size={15} /><span>{actionMessage}</span><button type="button" onClick={() => setActionMessage("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        <div className={`qe-content ${active === "details" ? "qe-detail-content" : ""}`}>
          <section className={`qe-stage ${active === "details" ? "qe-detail-stage" : ""}`}>
            {active === "results" && <ResultsContext batches={liveBatches} />}
            {active === "upload" && <UploadSection files={files} stagedSize={stagedSize} inputRef={inputRef} chooseFiles={chooseFiles} removeFile={(name) => setFiles((current) => current.filter((file) => file.name !== name))} clearFiles={() => { setFiles([]); setMessage("Batch staging cleared."); setMessageTone("info"); }} queueBatch={queueBatch} message={message} messageTone={messageTone} />}
            {active === "results" && <ResultsSection filter={resultFilter} setFilter={setResultFilter} dateRange={resultDateRange} setDateRange={setResultDateRange} line={resultLine} setLine={setResultLine} lines={resultLines} batches={filteredBatches} openBatch={setSelectedBatchId} onDeleteBatch={handleDeleteBatch} />}
            {active === "details" && <DefectDetailsWorkspace selected={selected} findings={detailFindings} products={detailBatch.products} activeProduct={activeProduct} reviewedProductIds={reviewedProductIds} batches={detailBatches} dateRange={detailDateRange} onChangeDateRange={selectDetailDateRange} onSelectBatch={selectDetailBatch} onSelectProduct={setSelectedProductId} onMarkReviewed={markProductReviewed} />}
            {active === "reports" && <ReportsSection reportRange={reportRange} setReportRange={setReportRange} notify={notify} />}
            {active === "history" && <HistorySection search={historySearch} setSearch={setHistorySearch} filter={historyFilter} setFilter={setHistoryFilter} dateRange={historyDateRange} setDateRange={setHistoryDateRange} rows={filteredHistory} onExport={exportHistory} isExporting={isExportingHistory} openBatch={setSelectedHistoryRow} />}
          </section>
        </div>
        {selectedBatch && <BatchResultsDialog batch={selectedBatch} onClose={() => setSelectedBatchId(null)} onDetailedReview={openDetailedReview} />}
        {selectedHistoryRow && <HistoryBatchSummaryDialog row={selectedHistoryRow} onClose={() => setSelectedHistoryRow(null)} />}
      </section>
    </main>
  );
}

function ResultsContext({ batches }) {
  const summaryIcons = { total: FileCheck2, passed: Check, failed: X };

  const total = (batches || []).length;
  const passed = (batches || []).filter(b => b.status === "Passed" || b.severity === "Low").length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;

  const dynamicSummary = [
    { id: "total", label: "Total inspections", value: total, detail: "Last 7 days" },
    { id: "passed", label: "Passed", value: passed, detail: `${passRate}% pass rate` },
    { id: "failed", label: "Failed", value: failed, detail: `${failRate}% fail rate` }
  ];

  return <div className="qe-context qe-results-context">{dynamicSummary.map((metric) => {
    const MetricIcon = summaryIcons[metric.id];
    return <article className={`qe-inspection-summary qe-summary-${metric.id}`} key={metric.id}><span><MetricIcon size={16} /> {metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p></article>;
  })}</div>;
}

function UploadSection({ files, stagedSize, inputRef, chooseFiles, removeFile, clearFiles, queueBatch, message, messageTone }) {
  const onDrop = (event) => { event.preventDefault(); chooseFiles(event.dataTransfer.files); };
  return <section className="qe-section qe-upload"><div className="qe-section-head"><div><h2>Stage a <em>review batch.</em></h2><p>Choose multiple images for one inspection review batch.</p></div></div><div className="qe-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input ref={inputRef} type="file" accept="image/*" multiple onChange={(event) => { chooseFiles(event.target.files); event.target.value = ""; }} /><UploadCloud size={31} /><h3>Drop a batch of images here</h3><p>JPG, PNG, WEBP · up to 8 MB per image · maximum 24 images</p><button type="button" onClick={() => inputRef.current?.click()}>Choose images <Files size={15} /></button></div><Notice tone={messageTone}>{message}</Notice><div className="qe-batch"><div className="qe-batch-head"><div><span className="qe-kicker">Staged batch</span><h3>{files.length ? `${files.length} images ready for review` : "No images staged yet"}</h3></div><div><span>{bytesLabel(stagedSize)} total</span>{Boolean(files.length) && <button type="button" onClick={clearFiles}>Clear batch</button>}</div></div>{files.length ? <ul className="qe-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><span className="qe-file-icon"><FileImage size={18} /></span><div><b>{file.name}</b><small>{bytesLabel(file.size)} · image {String(index + 1).padStart(2, "0")}</small></div><span className="qe-file-ready"><Check size={14} /> Ready</span><button type="button" onClick={() => removeFile(file.name)} aria-label={`Remove ${file.name}`}><X size={16} /></button></li>)}</ul> : <div className="qe-empty-batch"><FileCheck2 size={22} /><p>Batch composition and validation feedback will appear here once images are added.</p></div>}<div className="qe-batch-foot"><p><ShieldCheck size={15} /> Images remain staged in this browser during this dashboard demonstration.</p><button type="button" onClick={queueBatch}>Create review batch <ChevronRight size={16} /></button></div></div></section>;
}

function ResultsSection({ filter, setFilter, dateRange, setDateRange, line, setLine, lines, batches, openBatch, onDeleteBatch }) {
  const [menuOpenBatchId, setMenuOpenBatchId] = useState(null);
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState(null);

  useEffect(() => {
    const closeMenu = () => setMenuOpenBatchId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  return <section className="qe-section qe-results-section">
    <div className="qe-queue-bar">
      <span>Review queue</span>
      <div className="qe-result-filters">
        <label className="qe-filter-btn qe-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter batches by date">{inspectionDateFilters.map((range) => <option key={range}>{range}</option>)}</select><ChevronDown size={14} /></label>
        <label className="qe-filter-btn qe-result-filter"><Filter size={15} /><select value={line} onChange={(event) => setLine(event.target.value)} aria-label="Filter batches by line">{lines.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></label>
        <label className="qe-filter-btn qe-result-filter"><ListFilter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter batches by overall severity"><option>All severity</option><option>High and medium</option><option>High only</option><option>Medium only</option><option>Low only</option><option>Critical only</option></select><ChevronDown size={14} /></label>
      </div>
    </div>
    {batches.length ? <div className="qe-result-grid">
      {batches.map((batch) => {
        const isFail = batch.verdict === "Hold" || batch.status === "Hold for review" || batch.severity === "High" || batch.severity === "Medium";
        return (
          <article className="qe-result qe-batch-result" key={batch.id}>
            <div className="qe-result-img">
              <img src={batch.image} alt={`${batch.name} batch evidence`} />
              <div style={{ justifyContent: "flex-end" }}>
                {/* 1. Pink mode badge REMOVED */}
                {/* 2. Changed High/Medium/Low tag to PASS / FAIL badge */}
                <span className={`qe-verdict-badge ${isFail ? "fail" : "pass"}`}>
                  {isFail ? "FAIL" : "PASS"}
                </span>
              </div>
            </div>
            <div className="qe-result-copy">
              <div><span>{batch.id} · {batch.line}</span><button type="button" onClick={() => openBatch(batch.id)}>Open <ChevronRight size={14} /></button></div>
              <h3>{batch.name}</h3>
              <p>{batch.captured}</p>
              <footer>
                <b>{batch.confidence}% confidence</b>
                {/* 3. Three-dot menu for batch deletion */}
                <div className="qe-batch-menu-container" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="qe-three-dots-btn" onClick={() => setMenuOpenBatchId(menuOpenBatchId === batch.id ? null : batch.id)} aria-label="Batch actions">
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenBatchId === batch.id && (
                    <div className="qe-batch-dropdown">
                      <button type="button" onClick={() => { setMenuOpenBatchId(null); setConfirmDeleteBatchId(batch.id); }}>
                        Delete batch
                      </button>
                    </div>
                  )}
                </div>
              </footer>
            </div>
          </article>
        );
      })}
    </div> : <div className="qe-result-empty"><ListFilter size={22} /><h3>No matching batches</h3><p>Try another date, production line, or severity filter.</p></div>}

    {/* Center Popup Confirmation Dialog */}
    {confirmDeleteBatchId && (
      <div className="qe-batch-dialog-backdrop" role="presentation">
        <section className="qe-delete-confirm-dialog" role="dialog" aria-modal="true">
          <h3>Delete Batch?</h3>
          <p>Are you sure you want to delete batch <b>{confirmDeleteBatchId}</b>? This action will remove all associated inspection records and evidence from MongoDB.</p>
          <div className="qe-delete-confirm-actions">
            <button type="button" className="qe-btn-cancel" onClick={() => setConfirmDeleteBatchId(null)}>Cancel</button>
            <button type="button" className="qe-btn-delete" onClick={() => { const id = confirmDeleteBatchId; setConfirmDeleteBatchId(null); onDeleteBatch(id); }}>Delete</button>
          </div>
        </section>
      </div>
    )}
  </section>;
}

function BatchResultsDialog({ batch, onClose, onDetailedReview }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="qe-batch-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="qe-batch-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-dialog-title"><header><div><span>{batch.id} · {batch.line}</span><h2 id="batch-dialog-title">{batch.name}</h2></div><button type="button" onClick={onClose} aria-label="Close batch results"><X size={19} /></button></header><div className="qe-batch-dialog-meta"><span><Severity value={batch.severity} /> Overall severity</span><span>{batch.confidence}% overall confidence</span><span>{batch.products.length} products inspected</span><button className="qe-batch-detailed-review" type="button" onClick={() => onDetailedReview(batch.id)}>Detailed review <ChevronRight size={14} /></button></div><div className="qe-batch-dialog-table"><div className="qe-batch-dialog-head"><span>Product no.</span><span>Status</span><span>Confidence</span><span>Captured</span></div>{batch.products.map((product) => <div className="qe-batch-dialog-row" key={product.id}><b>{product.id}</b><span className={`qe-batch-product-status ${product.status.toLowerCase()}`}>{product.status}</span><span>{product.confidence}%</span><span>{product.captured}</span></div>)}</div></section></div>;
}

function ReportsSection({ reportRange, setReportRange, notify, batches = [] }) {
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("http://localhost:8000/api/reports/summary");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReportData(data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch report summary:", err);
      }
    }
    fetchReport();
  }, [reportRange]);

  const metrics = reportData?.metrics || {
    totalInspections: batches.length || 0,
    totalProducts: batches.reduce((acc, b) => acc + (b.products?.length || 1), 0),
    totalDefects: batches.reduce((acc, b) => acc + (b.products?.filter(p => p.status === "Failed").length || 0), 0),
    passRate: 100.0,
    topDefect: "None",
    topDefectPct: 0.0
  };

  const trend = reportData?.trend || [65, 78, 72, 85, 91, metrics.passRate];
  const mix = reportData?.defectMix || [
    { label: "Surface", value: 42, color: "#27837f" },
    { label: "Assembly", value: 28, color: "#fcbe5a" },
    { label: "Dimensional", value: 19, color: "#ba4a31" },
    { label: "Packaging", value: 11, color: "#799a98" }
  ];
  const summaryText = reportData?.summary || `Over the selected period, ${metrics.totalInspections} inspection batches were evaluated. Pass rate stands at ${metrics.passRate}%.`;

  return <section className="qe-section">
    <div className="qe-section-head">
      <div><h2>Report &amp; Charts</h2><p>Review live trends, defect mix, and quality report breakdown from MongoDB.</p></div>
      <div className="qe-range">{["7 days", "30 days", "Today"].map((range) => <button key={range} type="button" className={range === reportRange ? "active" : ""} onClick={() => setReportRange(range)}>{range}</button>)}</div>
    </div>
    <div className="qe-report-kpis">
      <article><span>Total Inspections</span><b>{metrics.totalInspections}</b><p><i className="up">↑ Live</i> stored in MongoDB</p></article>
      <article><span>Total Defects</span><b>{metrics.totalDefects}</b><p><i className="down">↓ Active</i> findings tracked</p></article>
      <article><span>Pass Rate</span><b>{metrics.passRate}<em>%</em></b><p><i className="up">↑ Real-time</i> calculation</p></article>
      <article><span>Top Defect</span><b>{metrics.topDefect}</b><p>Representing {metrics.topDefectPct}% of findings</p></article>
    </div>
    <div className="qe-report-grid">
      <article className="qe-chart">
        <div className="qe-card-top"><div><span className="qe-kicker">Review completion</span><h3>Batch coverage trend</h3></div><span>{reportRange}</span></div>
        <div className="qe-chart-layout" style={{ display: "flex", gap: "10px", margin: "22px 0 0", alignItems: "stretch" }}>
          <div className="qe-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>Pass Rate (%)</div>
          <div className="qe-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", paddingBottom: "21px", fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "6px", textAlign: "right" }}><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div>
          <div className="qe-bars" style={{ flex: 1, margin: 0 }}>{trend.map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{["MON", "TUE", "WED", "THU", "FRI", "SAT"][index] || ""}</span></div>)}</div>
        </div>
        <footer><p><span className="qe-live-dot" /> Goal threshold: 90%</p><b>{metrics.passRate}%</b></footer>
      </article>
      <article className="qe-mix">
        <div className="qe-card-top"><div><span className="qe-kicker">Finding mix</span><h3>Defect categories</h3></div><button type="button" onClick={() => notify("Live defect categories aggregated from MongoDB findings.")} aria-label="More report options"><MoreHorizontal size={17} /></button></div>
        <div className="qe-donut"><div><b>{metrics.totalDefects}</b><span>findings</span></div></div>
        <ul>{mix.map((item) => <li key={item.label}><span style={{ background: item.color }} /><b>{item.label}</b><em>{item.value}%</em></li>)}</ul>
      </article>
      <article className="qe-report-note">
        <span><FileCheck2 size={18} /> Quality Summary</span>
        <h3>Findings report for <em>{reportRange}.</em></h3>
        <p>{summaryText}</p>
        <button type="button" onClick={() => notify("Quality Report PDF generation requested. Downloading report document...")}><Download size={15} /> Export report</button>
      </article>
    </div>

    <div className="qe-table-wrap" style={{ marginTop: "24px" }}>
      <div className="qe-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <div><span className="qe-kicker">Report breakdown</span><h3>Quality Reports Table</h3></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Batch Name</th>
            <th>Line</th>
            <th>Items Inspected</th>
            <th>Defects Found</th>
            <th>Status</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          {(batches || []).map((batch) => {
            const flags = batch.products?.filter(p => p.status === "Failed").length || 0;
            const total = batch.products?.length || 1;
            const passPct = Math.round(((total - flags) / total) * 100);
            return (
              <tr key={batch.id}>
                <td><b>{batch.id}</b></td>
                <td><b>{batch.name}</b></td>
                <td>{batch.line}</td>
                <td><b className="qe-history-count">{total}</b></td>
                <td><span className={`qe-history-flags ${flags ? "flagged" : "clear"}`}>{flags}</span></td>
                <td><span className={`qe-verdict ${flags ? "hold" : "pass"}`}>{flags ? "FAIL" : "PASS"}</span></td>
                <td><b>{passPct}%</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(!batches || !batches.length) && <div className="qe-history-empty" style={{ padding: "30px", textAlign: "center" }}><Search size={20} /><p>No inspection report records stored yet.</p></div>}
    </div>
  </section>;
}

function HistorySection({ search, setSearch, filter, setFilter, dateRange, setDateRange, rows, onExport, isExporting, openBatch }) {
  return <section className="qe-section"><div className="qe-history-heading"><h2>History records</h2><label className="qe-filter-btn qe-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter Inspection History records by date">{historyDateFilters.map((range) => <option key={range}>{range}</option>)}</select><ChevronDown size={14} /></label></div><div className="qe-history-tools"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, line, or product" /></label><div>{["All batches", "In review", "Complete"].map((status) => <button type="button" key={status} onClick={() => setFilter(status)} className={status === filter ? "active" : ""}>{status}</button>)}</div><button type="button" onClick={onExport} disabled={!rows.length || isExporting}><Download size={15} /> {isExporting ? "Exporting…" : "Export"}</button></div><div className="qe-table-wrap"><table><thead><tr><th>Batch</th><th>Product and line</th><th>Status</th><th>Item count</th><th>Flags</th><th>Verdict</th><th>Completed</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.id}</b><small>{row.result}</small></td><td><b>{row.product}</b><small>{row.line}</small></td><td><span className={`qe-status ${row.status === "Complete" ? "complete" : "review"}`}>{row.status}</span></td><td><b className="qe-history-count">{row.itemCount}</b></td><td><span className={`qe-history-flags ${row.flags ? "flagged" : "clear"}`}>{row.flags}</span></td><td><span className={`qe-verdict ${row.verdict.toLowerCase()}`}>{row.verdict}</span></td><td><span className="qe-date">{row.completed}</span></td><td><button type="button" onClick={() => openBatch(row)} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!rows.length && <div className="qe-history-empty"><Search size={20} /><p>No batches match the current filters.</p></div>}</div></section>;
}

function HistoryBatchSummaryDialog({ row, onClose }) {
  const summary = getHistoryBatchSummary(row);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="qe-batch-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="qe-history-summary-dialog" role="dialog" aria-modal="true" aria-labelledby={`history-summary-${row.id}`}><header><div><span>{row.id} · {row.line}</span><h2 id={`history-summary-${row.id}`}>{row.product}</h2></div><button type="button" onClick={onClose} aria-label="Close batch summary"><X size={19} /></button></header><div className={`qe-history-summary-state ${summary.tone}`}><span>{summary.label}</span><b>{summary.flaggedLabel}</b><p>{summary.reason}</p></div><dl className="qe-history-summary-metrics"><div><dt>Items inspected</dt><dd>{row.itemCount}</dd></div><div><dt>Failed items</dt><dd>{row.flags}</dd></div><div><dt>Verdict</dt><dd>{row.verdict}</dd></div></dl><footer><span>{row.status}</span><span>{row.completed}</span></footer></section></div>;
}
