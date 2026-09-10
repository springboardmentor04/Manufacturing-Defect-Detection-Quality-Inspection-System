import { useRef, useState } from "react";
import { AlertTriangle, CalendarClock, Check, ChevronDown, ChevronRight, Minus, Plus, ScanSearch } from "lucide-react";

function suggestedActionForSeverity(score) {
  const selected = arguments[1];
  if (score === 0) return { level: "Low", issue: "Pass", recommendation: selected?.recommendation || "Product generally acceptable" };
  if (score >= 80) return { level: "Critical", issue: "Major structural defect", recommendation: "Product rejection required", urgency: "Immediate action required" };
  if (score >= 60) return { level: "High", issue: "Significant quality issue", recommendation: "Repair or rework recommended" };
  if (score >= 40) return { level: "Medium", issue: "Moderate quality concern", recommendation: "Inspection review required" };
  return { level: "Low", issue: "Minor cosmetic defect", recommendation: "Product generally acceptable" };
}

function formatReviewDayAndDate(dateStr) {
  if (!dateStr) return "Monday, 07 Sep 2026, 06:05 PM IST";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${weekday}, ${day} ${month} ${year}, ${strHours}:${minutes} ${ampm} IST`;
  } catch {
    return dateStr;
  }
}

export default function DefectDetailsWorkspace({ batch, selected, products, activeProduct, reviewedProductIds, allReviews = [], batches, dateRange, onChangeDateRange, onSelectBatch, onSelectProduct, onMarkReviewed, onReviewDecision }) {
  const [view, setView] = useState("gradcam");
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef(null);
  const currentProductIndex = Math.max(0, (products || []).findIndex((product) => product.id === activeProduct?.id));
  const nextProduct = (products || [])[(currentProductIndex + 1) % (products?.length || 1)] || products?.[0] || { id: "", name: "" };
  
  const handleDecision = (decision) => {
    if (onReviewDecision) {
      onReviewDecision(decision);
    } else if (onMarkReviewed) {
      onMarkReviewed(decision);
    }
  };

  const currentBatch = batch || (batches || []).find((b) => b.id === (selected?.batch || activeProduct?.batchId)) || batches?.[0];
  const activeReview = (allReviews || []).find((r) => r.productId === activeProduct?.id);
  const isActivePassed = activeProduct?.status === "Passed";
  const isActiveFailed = activeProduct?.status === "Failed";
  const activeProductReviewed = activeProduct ? (reviewedProductIds.has(activeProduct.id) || Boolean(activeReview)) : false;

  const effectiveDefectType = isActivePassed ? "Not defective" : (selected?.defect || "Not defective");
  const effectiveArea = isActivePassed ? "0.0%" : (selected?.area || "0.0%");
  const isGood = isActivePassed || effectiveDefectType === "Not defective";

  const resolvedReviewer = activeReview?.reviewerName || activeReview?.reviewerId || "Quality Engineer";
  const resolvedVerdict = activeReview?.decision === "Pass" || (activeProductReviewed && isActivePassed) ? "Marked Good" : "Confirmed Defect";
  const isVerdictPass = activeReview?.decision === "Pass" || (activeProductReviewed && isActivePassed);
  const resolvedTimestamp = activeReview?.reviewedAt || new Date().toISOString();

  const rawDefect = selected?.defects?.[0] || {};
  const effectiveSizeScore = isGood ? 0 : (selected?.sizeScore ?? rawDefect.size_score ?? (selected?.area && parseFloat(selected.area) > 0 ? Math.round(parseFloat(selected.area) * 3.5) : 85));
  const effectiveLocationScore = isGood ? 0 : (selected?.locationScore ?? rawDefect.location_score ?? 90);
  const effectiveTypeScore = isGood ? 0 : (selected?.defectTypeScore ?? rawDefect.type_score ?? 95);
  const effectiveConfidenceScore = selected?.confidence ? Math.round(selected.confidence) : 100;
  const effectiveSeverityScore = isGood ? 0 : (selected?.severityScore ?? rawDefect.severity_score ?? 46.5);
  const suggestedAction = suggestedActionForSeverity(effectiveSeverityScore, { ...selected, defect: effectiveDefectType });
  const effectiveSeverityLevel = isGood ? "Low" : (suggestedAction.level || "Low");

  const setZoomLevel = (nextZoom) => {
    const clampedZoom = Math.min(160, Math.max(80, nextZoom));
    setZoom(clampedZoom);
    if (clampedZoom <= 100) setPan({ x: 0, y: 0 });
  };
  const startPan = (event) => {
    if (event.button !== 0 || zoom <= 100) return;
    dragStart.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    setIsPanning(true);
  };
  const movePan = (event) => {
    if (!dragStart.current) return;
    setPan({ x: Math.max(-120, Math.min(120, event.clientX - dragStart.current.x)), y: Math.max(-120, Math.min(120, event.clientY - dragStart.current.y)) });
  };
  const stopPan = () => { dragStart.current = null; setIsPanning(false); };

  return <section className="qe-section qe-detail-workspace">
    <div className="qe-detail-layout">
      <article className="qe-inspection-canvas-card">
        <header className="qe-inspection-canvas-head">
          <div>
            <b>{selected.id} · {activeProduct?.id || selected.productId}</b>
            <small>{selected.mode} · {selected.product}</small>
          </div>
          <div className="qe-view-switch" aria-label="Evidence view">
            <button type="button" className={view === "gradcam" ? "active" : ""} onClick={() => setView("gradcam")}>Grad-CAM</button>
            <button type="button" className={view === "segmentation" ? "active" : ""} onClick={() => setView("segmentation")}>Segmentation</button>
            <button type="button" className={view === "bounding-box" ? "active" : ""} onClick={() => setView("bounding-box")}>Bounding box</button>
          </div>
        </header>
        <div className={`qe-inspection-canvas qe-canvas-${view}`}>
          <div className={`qe-canvas-evidence${zoom > 100 ? " is-pannable" : ""}${isPanning ? " is-panning" : ""}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }} onMouseDown={startPan} onMouseMove={movePan} onMouseUp={stopPan} onMouseLeave={stopPan} aria-label={zoom > 100 ? "Zoomed inspection evidence. Drag with the left mouse button to pan." : "Inspection evidence"}>
            <img src={selected?.image || "/manus-storage/hazelnut_cap_defective.png"} alt={`${activeProduct?.name || "Product"} inspection evidence showing ${effectiveDefectType}`} draggable="false" />
            {view === "gradcam" && selected?.gradcamImage && !isActivePassed && <img src={selected.gradcamImage} className="qe-gradcam-image" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} alt="Grad-CAM map" />}
            {view === "gradcam" && !selected?.gradcamImage && !isActivePassed && <span className="qe-gradcam-area" style={selected?.marker} />}
            {view === "segmentation" && selected?.segmentationImage && !isActivePassed && <img src={selected.segmentationImage} className="qe-segment-image" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} alt="Segmentation mask" />}
            {view === "segmentation" && !selected?.segmentationImage && !isActivePassed && <span className="qe-segment-area" style={selected?.marker} />}
            {view === "bounding-box" && selected?.bboxImage && !isActivePassed && (
              <img src={selected.bboxImage} className="qe-bbox-image" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} alt="Bounding box detection" />
            )}
            {view === "bounding-box" && !selected?.bboxImage && !isActivePassed && effectiveDefectType !== "Not defective" && (
              <div className="qe-bbox-overlay" style={{
                position: "absolute",
                left: selected?.marker?.left || "35%",
                top: selected?.marker?.top || "30%",
                width: selected?.marker?.width || "30%",
                height: selected?.marker?.height || "30%",
                border: "2px solid #ef4444",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
                pointerEvents: "none",
                zIndex: 10
              }}>
                <span style={{
                  position: "absolute",
                  top: "-22px",
                  left: "-2px",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "1px 6px",
                  borderRadius: "2px",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-mono, monospace)"
                }}>
                  {effectiveDefectType !== "Not defective" ? effectiveDefectType.toLowerCase() : "defective"}
                </span>
              </div>
            )}
          </div>
          <div className="qe-canvas-status">
            <ScanSearch size={14} />
            <span>{view === "gradcam" ? "Grad-CAM attention map" : view === "segmentation" ? "Segmentation mask" : "Bounding box detection"}</span>
          </div>
        </div>
        <footer className="qe-canvas-tools">
          <div className="qe-zoom-stepper" aria-label="Canvas zoom">
            <button type="button" onClick={() => setZoomLevel(zoom - 20)} disabled={zoom <= 80} aria-label="Zoom out"><Minus size={16} /></button>
            <output aria-live="polite">{zoom}%</output>
            <button type="button" onClick={() => setZoomLevel(zoom + 20)} disabled={zoom >= 160} aria-label="Zoom in"><Plus size={16} /></button>
          </div>

          {/* Verified by details embedded directly in center of toolbar */}
          {(activeReview || activeProductReviewed) && (
            <div className="qe-canvas-center-audit">
              <span className={`qe-audit-status-dot ${isVerdictPass ? "pass" : "fail"}`} />
              <span className="qe-audit-text">
                Verified by <b>{resolvedReviewer}</b>
                {" · "}
                <span className={`qe-audit-verdict ${isVerdictPass ? "pass" : "fail"}`}>
                  {resolvedVerdict}
                </span>
                {" · "}
                <span className="qe-audit-timestamp">
                  {formatReviewDayAndDate(resolvedTimestamp)}
                </span>
              </span>
            </div>
          )}

          <div className="qe-canvas-meta-group">
            <span>Defect area <b>{effectiveArea}</b></span>
            <span>Model confidence <b>{selected?.confidence || 100}%</b></span>
          </div>
        </footer>
      </article>

      <aside className="qe-defect-panel">
        <div className="qe-detail-selects">
          <label className="qe-detail-batch-select">
            <span>Batch</span>
            <select value={selected?.batch} onChange={(event) => onSelectBatch(event.target.value)} aria-label="Select a processed batch from the selected date range">
              {(batches || []).map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.name}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="qe-detail-date-select" title={`Filter batches: ${dateRange}`}>
            <CalendarClock size={14} />
            <select value={dateRange} onChange={(event) => onChangeDateRange(event.target.value)} aria-label="Filter Defect Details batches by date">
              <option>Today</option>
              <option>Last 7 days</option>
              <option>Last 15 days</option>
              <option>Last 30 days</option>
            </select>
          </label>
        </div>

        <div className="qe-defect-panel-title">
          <h3>Defects</h3>
          <span className={`qe-verdict-badge ${isActivePassed ? "pass" : "fail"}`}>
            {isActivePassed ? "PASSED" : "FAILED"}
          </span>
        </div>

        <dl className="qe-defect-metrics">
          <div><dt>Type</dt><dd>{effectiveDefectType}</dd></div>
          <div><dt>Size Score</dt><dd>{effectiveSizeScore}</dd></div>
          <div><dt>Location Score</dt><dd>{effectiveLocationScore}</dd></div>
          <div><dt>Defect Type Score</dt><dd>{effectiveTypeScore}</dd></div>
          <div><dt>Confidence Score</dt><dd>{effectiveConfidenceScore}</dd></div>
          <div><dt>Severity</dt><dd>{effectiveSeverityLevel} · {effectiveSeverityScore}</dd></div>
        </dl>

        <div className={`qe-review-context qe-action-${suggestedAction.level.toLowerCase()}`}>
          <span><AlertTriangle size={15} /> Suggested action</span>
          <b>{suggestedAction.issue}</b>
          <p>{suggestedAction.recommendation}</p>
          {suggestedAction.urgency && <small>{suggestedAction.urgency}</small>}
        </div>

        <div className="qe-defect-list-head">
          <span>Products</span>
          <small>{(products || []).length} products</small>
        </div>

        <div className="qe-product-list">
          {(products || []).map((product) => {
            const isReviewed = reviewedProductIds.has(product.id) || (allReviews || []).some(r => r.productId === product.id);
            const isPassed = product.status === "Passed";
            return (
              <button
                type="button"
                key={product.id}
                className={product.id === activeProduct?.id ? "active" : ""}
                onClick={() => onSelectProduct(product.id)}
                aria-pressed={product.id === activeProduct?.id}
              >
                <span className={`qe-finding-dot ${isPassed ? "low" : "high"}`} />
                <div>
                  <b>{product.id}</b>
                  <small>{isReviewed ? (isPassed ? "Reviewed · Good" : "Reviewed · Defect") : (isPassed ? "Passed" : "Failed")}</small>
                </div>
                <span className={`qe-prod-tag ${isPassed ? "tag-pass" : "tag-fail"}`}>
                  {isPassed ? "PASS" : "FAIL"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action buttons in right sidebar */}
        <div className="qe-defect-panel-actions">
          <button
            className={`qe-btn-action-good ${isActivePassed ? "selected" : ""}`}
            type="button"
            onClick={() => handleDecision("Pass")}
          >
            <Check size={14} strokeWidth={2.5} /> Mark as Good
          </button>
          <button
            className={`qe-btn-action-defective ${isActiveFailed ? "selected" : ""}`}
            type="button"
            onClick={() => handleDecision("Fail")}
          >
            <AlertTriangle size={14} strokeWidth={2.5} /> Mark as Defective
          </button>
        </div>

        <div className="qe-defect-panel-nav">
          <button type="button" className="qe-btn-next-product" onClick={() => onSelectProduct(nextProduct.id)}>
            Next product ({nextProduct.id}) <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  </section>;
}
