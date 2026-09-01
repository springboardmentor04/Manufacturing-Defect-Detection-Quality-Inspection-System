import { useRef, useState } from "react";
import { AlertTriangle, CalendarClock, Check, ChevronDown, ChevronRight, Minus, Plus, ScanSearch } from "lucide-react";

export function suggestedActionForSeverity(score) {
  const selected = arguments[1];
  if (score === 0) return { level: "Low", issue: "Pass", recommendation: selected?.recommendation || "Product generally acceptable" };
  if (score >= 80) return { level: "Critical", issue: "Major structural defect", recommendation: "Product rejection required", urgency: "Immediate action required" };
  if (score >= 60) return { level: "High", issue: "Significant quality issue", recommendation: "Repair or rework recommended" };
  if (score >= 40) return { level: "Medium", issue: "Moderate quality concern", recommendation: "Inspection review required" };
  return { level: "Low", issue: "Minor cosmetic defect", recommendation: "Product generally acceptable" };
}

export default function DefectDetailsWorkspace({ selected, products, activeProduct, reviewedProductIds, batches, dateRange, onChangeDateRange, onSelectBatch, onSelectProduct, onMarkReviewed }) {
  const [view, setView] = useState("gradcam");
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef(null);
  const currentProductIndex = Math.max(0, (products || []).findIndex((product) => product.id === activeProduct?.id));
  const nextProduct = (products || [])[(currentProductIndex + 1) % (products?.length || 1)] || products?.[0] || { id: "", name: "" };
  const suggestedAction = suggestedActionForSeverity(selected?.severityScore || 0, selected);
  const activeProductReviewed = activeProduct ? reviewedProductIds.has(activeProduct.id) : false;
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
          <div><b>{selected.id}</b><small>{selected.mode} · {selected.product}</small></div>
          <div className="qe-view-switch" aria-label="Evidence view"><button type="button" className={view === "gradcam" ? "active" : ""} onClick={() => setView("gradcam")}>Grad-CAM</button><button type="button" className={view === "segmentation" ? "active" : ""} onClick={() => setView("segmentation")}>Segmentation</button><button type="button" className={view === "bounding-box" ? "active" : ""} onClick={() => setView("bounding-box")}>Bounding box</button></div>
        </header>
        <div className={`qe-inspection-canvas qe-canvas-${view}`}>
          <div className={`qe-canvas-evidence${zoom > 100 ? " is-pannable" : ""}${isPanning ? " is-panning" : ""}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }} onMouseDown={startPan} onMouseMove={movePan} onMouseUp={stopPan} onMouseLeave={stopPan} aria-label={zoom > 100 ? "Zoomed inspection evidence. Drag with the left mouse button to pan." : "Inspection evidence"}>
            <img src={selected?.image || "/manus-storage/hazelnut_cap_defective.png"} alt={`${activeProduct?.name || "Product"} inspection evidence showing ${selected?.defect || "defect"}`} draggable="false" />
            {view === "gradcam" && selected?.gradcamImage && <img src={selected.gradcamImage} className="qe-gradcam-image" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} alt="Grad-CAM map" />}
            {view === "gradcam" && !selected?.gradcamImage && <span className="qe-gradcam-area" style={selected?.marker} />}
            {view === "segmentation" && selected?.segmentationImage && <img src={selected.segmentationImage} className="qe-segment-image" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} alt="Segmentation mask" />}
            {view === "segmentation" && !selected?.segmentationImage && <span className="qe-segment-area" style={selected?.marker} />}
          </div>
          <div className="qe-canvas-status"><ScanSearch size={14} /><span>{view === "gradcam" ? "Grad-CAM attention map" : view === "segmentation" ? "Segmentation mask" : "Bounding box detection"}</span></div>
        </div>
        <footer className="qe-canvas-tools"><div className="qe-zoom-stepper" aria-label="Canvas zoom"><button type="button" onClick={() => setZoomLevel(zoom - 20)} disabled={zoom <= 80} aria-label="Zoom out"><Minus size={16} /></button><output aria-live="polite">{zoom}%</output><button type="button" onClick={() => setZoomLevel(zoom + 20)} disabled={zoom >= 160} aria-label="Zoom in"><Plus size={16} /></button></div><span>Model confidence <b>{selected?.confidence || 100}%</b></span></footer>
      </article>

      <aside className="qe-defect-panel">
        <div className="qe-detail-selects"><label className="qe-detail-batch-select"><span>Batch</span><select value={selected?.batch} onChange={(event) => onSelectBatch(event.target.value)} aria-label="Select a processed batch from the selected date range">{(batches || []).map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.name}</option>)}</select><ChevronDown size={14} /></label><label className="qe-detail-date-select" title={`Filter batches: ${dateRange}`}><CalendarClock size={14} /><select value={dateRange} onChange={(event) => onChangeDateRange(event.target.value)} aria-label="Filter Defect Details batches by date"><option>Today</option><option>Last 7 days</option><option>Last 15 days</option><option>Last 30 days</option></select></label></div>
        <div className="qe-defect-panel-title"><h3>Defects</h3></div>
        <dl className="qe-defect-metrics"><div><dt>Confidence</dt><dd>{selected?.confidence || 100}%</dd></div><div><dt>Defect area</dt><dd>{selected?.area || "0.0%"}</dd></div><div><dt>Defect type</dt><dd>{selected?.defect || "Not defective"}</dd></div><div><dt>Severity</dt><dd>{suggestedAction.level} · {selected?.severityScore || 0}</dd></div></dl>
        <div className={`qe-review-context qe-action-${suggestedAction.level.toLowerCase()}`}><span><AlertTriangle size={15} /> Suggested action</span><b>{suggestedAction.issue}</b><p>{suggestedAction.recommendation}</p>{suggestedAction.urgency && <small>{suggestedAction.urgency}</small>}</div>
        <div className="qe-defect-list-head"><span>Products</span><small>{(products || []).length} products</small></div>
        <div className="qe-product-list">{(products || []).map((product) => { const isReviewed = reviewedProductIds.has(product.id); return <button type="button" key={product.id} className={product.id === activeProduct?.id ? "active" : ""} onClick={() => onSelectProduct(product.id)} aria-pressed={product.id === activeProduct?.id}><span className={`qe-finding-dot ${isReviewed ? "reviewed" : product.status === "Failed" ? "high" : "low"}`} /><div><b>{product.id}</b><small>{isReviewed ? "Reviewed" : "In review"}</small></div><span>{isReviewed ? <Check size={13} /> : `${product.confidence}%`}</span></button>; })}</div>
        <div className="qe-defect-panel-actions"><button className="qe-approve" type="button" disabled={activeProductReviewed} onClick={onMarkReviewed}><Check size={15} /> {activeProductReviewed ? "Reviewed" : "Mark reviewed"}</button><button type="button" onClick={() => onSelectProduct(nextProduct.id)}>Next product <ChevronRight size={15} /></button></div>
      </aside>
    </div>
  </section>;
}
