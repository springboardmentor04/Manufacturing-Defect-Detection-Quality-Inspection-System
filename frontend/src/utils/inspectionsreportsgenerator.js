import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Format IST Date Time String
 */
function getFormattedISTDate(dateInput = new Date()) {
  const now = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcMs + 5.5 * 60 * 60 * 1000);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(istDate.getDate()).padStart(2, "0");
  const month = months[istDate.getMonth()];
  const year = istDate.getFullYear();
  let hours = istDate.getHours();
  const minutes = String(istDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month}, ${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm} IST`;
}

/**
 * Generates an industrial-grade Batch Inspection Records & Audit Report PDF
 */
export async function generateInspectionsReport({
  batches = [],
  allBatches = [],
  metrics = null,
  dateRange = "Last 30 days",
  lineFilter = "All lines",
  statusFilter = "All",
  searchQuery = "",
  supervisor = "Factory Supervisor"
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Use all scoped batches if provided, else fallback to filtered batches
  const scopedBatches = allBatches.length > 0 ? allBatches : batches;

  // Derive core executive metrics (from metrics prop or computed directly)
  const totalBatches = metrics?.totalBatches ?? scopedBatches.length;
  const defectedBatches = metrics?.defectedBatches ?? scopedBatches.filter(b => {
    const flags = b.flagCount ?? (b.products?.filter(p => p.status === "Failed" || p.status === "FAIL").length || 0);
    return flags > 0 || b.verdict === "Hold" || b.verdict === "Fail" || b.severity === "High" || b.severity === "Medium";
  }).length;
  const batchesPassRate = metrics?.batchesPassRate ?? (totalBatches > 0 ? Math.round(((totalBatches - defectedBatches) / totalBatches) * 100) : 100);

  const totalProducts = metrics?.totalProducts ?? scopedBatches.reduce((acc, b) => acc + (b.products?.length || 1), 0);
  const defectedProducts = metrics?.defectedProducts ?? scopedBatches.reduce((acc, b) => acc + (b.products?.filter(p => p.status === "Failed" || p.status === "FAIL").length || 0), 0);
  const productsPassRate = metrics?.productsPassRate ?? (totalProducts > 0 ? Number((((totalProducts - defectedProducts) / totalProducts) * 100).toFixed(1)) : 100);

  const avgConfidence = metrics?.avgConfidence ?? (scopedBatches.length > 0 ? (scopedBatches.reduce((a, b) => a + (b.confidence || 0), 0) / scopedBatches.length).toFixed(1) : "0.0");

  const targetYield = 90.0;
  const isApproved = productsPassRate >= targetYield && defectedProducts === 0;
  const isConditional = productsPassRate >= targetYield && defectedProducts > 0;

  const activeBatchCode = batches.length === 1 ? batches[0].id : (batches[0]?.id || "BT-LOG");
  const trackingId = `BIR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${activeBatchCode}`;
  const timestampStr = getFormattedISTDate();

  // Color constants (Matching VisionInspect AI Design System)
  const primaryTeal = [15, 47, 50];
  const accentTeal = [27, 126, 120];
  const textDark = [30, 41, 45];
  const textMuted = [100, 116, 120];
  const lineBorder = [218, 226, 224];
  const cardBg = [248, 250, 249];

  // Helper function for adding headers on every page
  function drawPageHeader() {
    // Top Bar Background
    doc.setFillColor(15, 47, 50);
    doc.rect(margin, 22, contentWidth, 3, "F");

    // Brand & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...primaryTeal);
    doc.text("VisionInspect AI", margin, 43);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...accentTeal);
    doc.text("Batch Inspection Records & Audit Telemetry  |  Factory Supervision", margin, 54);

    // Right-side Document Tracking Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryTeal);
    doc.text(`TRACKING ID: ${trackingId}`, pageWidth - margin, 43, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`Generated: ${timestampStr}`, pageWidth - margin, 54, { align: "right" });

    // Meta Ribbon (4 clean columns)
    const ribbonY = 64;
    const ribbonH = 22;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(margin, ribbonY, contentWidth, ribbonH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...textDark);

    const colW = contentWidth / 4;
    const textY = ribbonY + 14;

    // Col 1: Scope / Date Range
    doc.text("SCOPE:", margin + 10, textY);
    doc.setFont("helvetica", "normal");
    doc.text(dateRange, margin + 44, textY);

    // Col 2: Production Line
    doc.setFont("helvetica", "bold");
    doc.text("LINE FILTER:", margin + colW + 10, textY);
    doc.setFont("helvetica", "normal");
    doc.text(lineFilter, margin + colW + 62, textY);

    // Col 3: Status / Filter
    doc.setFont("helvetica", "bold");
    doc.text("STATUS:", margin + colW * 2 + 10, textY);
    doc.setFont("helvetica", "normal");
    doc.text(`${statusFilter} ${searchQuery ? `("${searchQuery}")` : ""}`.trim(), margin + colW * 2 + 46, textY);

    // Col 4: Supervisor
    doc.setFont("helvetica", "bold");
    doc.text("SUPERVISOR:", margin + colW * 3 + 10, textY);
    doc.setFont("helvetica", "normal");
    doc.text(supervisor, margin + colW * 3 + 66, textY);
  }

  // Helper function for adding footers on all pages
  function drawPageFooter(currentPage, totalPages) {
    const footerY = pageHeight - 18;
    doc.setDrawColor(...lineBorder);
    doc.line(margin, footerY - 7, pageWidth - margin, footerY - 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);

    doc.text("VisionInspect AI  •  Batch Inspection Records Report  |  Factory Supervision Internal Data", margin, footerY);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & INSPECTION RECORDS
  // ==========================================
  drawPageHeader();

  let currentY = 100;

  // 1. Executive Inspection Verdict Banner
  let verdictBg, verdictBorder, verdictText, verdictTitle, verdictDesc;
  if (isApproved) {
    verdictBg = [234, 248, 239]; // light green
    verdictBorder = [39, 131, 127]; // teal green
    verdictText = [18, 102, 60];
    verdictTitle = "ALL INSPECTIONS COMPLIANT — 100% RELEASE READY";
    verdictDesc = "All inspected units pass quality benchmarks. No active line anomalies detected across MongoDB records.";
  } else if (isConditional) {
    verdictBg = [254, 247, 230]; // light amber
    verdictBorder = [217, 119, 6];
    verdictText = [180, 83, 9];
    verdictTitle = "OPERATIONAL STATUS: ACCEPTABLE WITH MINOR DEFECTS";
    verdictDesc = `Product yield (${productsPassRate}%) satisfies threshold. ${defectedProducts} defective unit${defectedProducts === 1 ? "" : "s"} quarantined for rework.`;
  } else {
    verdictBg = [254, 242, 242]; // light red
    verdictBorder = [220, 38, 38];
    verdictText = [185, 28, 28];
    verdictTitle = "ACTION REQUIRED: ELEVATED DEFECT INCIDENCE";
    verdictDesc = `Yield (${productsPassRate}%) is below nominal standard (${targetYield}%). Supervisor audit and tooling calibration recommended.`;
  }

  doc.setFillColor(...verdictBg);
  doc.setDrawColor(...verdictBorder);
  doc.roundedRect(margin, currentY, contentWidth, 48, 4, 4, "FD");

  // Verdict Title & Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...verdictText);
  doc.text("PLANT INSPECTION STATUS VERDICT", margin + 12, currentY + 14);

  doc.setFontSize(10.5);
  doc.text(verdictTitle, margin + 12, currentY + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(60, 70, 72);
  doc.text(verdictDesc, margin + 12, currentY + 40);

  // Yield Comparison on right side of the banner
  const rightBoxX = pageWidth - margin - 145;
  doc.setDrawColor(...verdictBorder);
  doc.line(rightBoxX, currentY + 6, rightBoxX, currentY + 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("TARGET YIELD", rightBoxX + 12, currentY + 16);
  doc.text("ACTUAL YIELD", rightBoxX + 78, currentY + 16);

  doc.setFontSize(12);
  doc.setTextColor(...primaryTeal);
  doc.text(`${targetYield.toFixed(1)}%`, rightBoxX + 12, currentY + 32);

  doc.setTextColor(...verdictText);
  doc.text(`${productsPassRate}%`, rightBoxX + 78, currentY + 32);

  currentY += 60;

  // ==========================================
  // SECTION 1: 7-CARD EXECUTIVE KPI GRID
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryTeal);
  doc.text("1. EXECUTIVE INSPECTION KPI METRICS", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("Aggregated telemetry metrics recorded across active inspection batches.", margin, currentY + 10);

  currentY += 18;

  const cardSpacing = 7;
  const colCount4 = 4;
  const cardW4 = (contentWidth - cardSpacing * (colCount4 - 1)) / colCount4;
  const cardH = 38;

  // Row 1: 4 Cards (Total Batches, Defected Batches, Batches Pass Rate, Avg Confidence)
  const kpisRow1 = [
    { title: "TOTAL BATCHES INSPECTED", val: `${totalBatches}`, sub: "Live stored in MongoDB", color: primaryTeal },
    { title: "TOTAL DEFECTED BATCHES", val: `${defectedBatches}`, sub: defectedBatches > 0 ? "Flagged batches" : "Zero flagged", color: defectedBatches > 0 ? [185, 28, 28] : [22, 138, 88] },
    { title: "BATCHES PASS RATE", val: `${batchesPassRate}%`, sub: "Real-time calculation", color: batchesPassRate >= targetYield ? [22, 138, 88] : [185, 28, 28] },
    { title: "AVG. AI CONFIDENCE", val: `${avgConfidence}%`, sub: "AI Model Certainty", color: primaryTeal },
  ];

  kpisRow1.forEach((kpi, i) => {
    const x = margin + i * (cardW4 + cardSpacing);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(x, currentY, cardW4, cardH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(kpi.title, x + 7, currentY + 10);

    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 7, currentY + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, x + 7, currentY + 32);
  });

  currentY += cardH + cardSpacing;

  // Row 2: 3 Cards (Total Products, Defected Products, Products Pass Rate)
  const colCount3 = 3;
  const cardW3 = (contentWidth - cardSpacing * (colCount3 - 1)) / colCount3;

  const kpisRow2 = [
    { title: "TOTAL PRODUCTS INSPECTED", val: `${totalProducts}`, sub: "Live images evaluated", color: primaryTeal },
    { title: "TOTAL DEFECTED PRODUCTS", val: `${defectedProducts}`, sub: defectedProducts > 0 ? "Active defect units" : "Zero defects", color: defectedProducts > 0 ? [185, 28, 28] : [22, 138, 88] },
    { title: "PRODUCTS PASS RATE", val: `${productsPassRate}%`, sub: "Real-time quality rate", color: productsPassRate >= targetYield ? [22, 138, 88] : [185, 28, 28] },
  ];

  kpisRow2.forEach((kpi, i) => {
    const x = margin + i * (cardW3 + cardSpacing);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(x, currentY, cardW3, cardH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(kpi.title, x + 7, currentY + 10);

    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 7, currentY + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, x + 7, currentY + 32);
  });

  currentY += cardH + 18;

  // ==========================================
  // SECTION 2: BATCH INSPECTION RECORDS TABLE
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryTeal);
  doc.text("2. BATCH INSPECTION TELEMETRY & RECORDS", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text(`Showing ${batches.length} of ${scopedBatches.length} batch records matching filter criteria [Line: ${lineFilter} | Status: ${statusFilter}${searchQuery ? ` | Search: "${searchQuery}"` : ""}]`, margin, currentY + 10);

  currentY += 16;

  // Prepare table rows
  const tableData = batches.map((batch) => {
    const flags = batch.products?.filter(p => p.status === "Failed" || p.status === "FAIL").length || 0;
    const total = batch.products?.length || 1;
    const pRate = Math.round(((total - flags) / total) * 100);
    const isFail = flags > 0 || batch.verdict === "Hold" || batch.verdict === "Fail";
    const statusText = isFail ? "FAIL" : "PASS";
    const confidenceStr = batch.confidence ? `${batch.confidence}%` : "95.0%";
    const capturedTime = batch.captured || "Recent";

    return [
      batch.id || "N/A",
      batch.name || "Production Batch",
      batch.line || "Line 01",
      String(total),
      String(flags),
      statusText,
      `${pRate}%`,
      confidenceStr,
      capturedTime
    ];
  });

  // Render Batch Records with AutoTable
  autoTable(doc, {
    startY: currentY,
    head: [["Batch Code", "Batch Name", "Line", "Items", "Defects", "Verdict", "Pass Rate", "Confidence", "Captured Time"]],
    body: tableData.length > 0 ? tableData : [["-", "No inspection records match the current filters.", "-", "-", "-", "-", "-", "-", "-"]],
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 5,
      textColor: textDark,
      lineColor: lineBorder,
      lineWidth: 0.4,
      valign: "middle"
    },
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 251]
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 105 },
      2: { cellWidth: 46 },
      3: { cellWidth: 36, halign: "center" },
      4: { cellWidth: 40, halign: "center" },
      5: { cellWidth: 45, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 48, halign: "center", fontStyle: "bold" },
      7: { cellWidth: 55, halign: "center" },
      8: { cellWidth: "auto" }
    },
    didDrawPage: (data) => {
      // Draw header on subsequent pages if table overflows
      if (data.pageNumber > 1) {
        drawPageHeader();
      }
    },
    didParseCell: (data) => {
      // Style Verdict column dynamically (Col index 5)
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === "PASS") {
          data.cell.styles.textColor = [18, 102, 60]; // Green
          data.cell.styles.fontStyle = "bold";
        } else if (val === "FAIL") {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Style Defects column (Col index 4)
      if (data.section === "body" && data.column.index === 4) {
        const val = Number(data.cell.raw);
        if (val > 0) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 18;

  // If table ended too close to page bottom, create a new page for notes & signatures
  if (finalY > pageHeight - 140) {
    doc.addPage();
    drawPageHeader();
    finalY = 100;
  }

  // ==========================================
  // SECTION 3: SUPERVISORY SUMMARY & ACTION ITEMS
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryTeal);
  doc.text("3. SUPERVISORY FINDINGS & RECOMMENDED ACTIONS", margin, finalY);

  finalY += 14;

  const recBoxW = (contentWidth - 10) / 2;
  const recBoxH = 46;

  // Left Recommendation Box (Telemetry Diagnosis)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(margin, finalY, recBoxW, recBoxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryTeal);
  doc.text("Inspection Telemetry Diagnosis", margin + 8, finalY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...textDark);
  const diagText = defectedBatches === 0
    ? "All optical inspection streams operating within nominal tolerance. Zero defect spikes recorded."
    : `${defectedBatches} batch(es) flagged with defective parts. Review camera alignment and feeder positioning.`;
  doc.text(doc.splitTextToSize(diagText, recBoxW - 16), margin + 8, finalY + 23);

  // Right Recommendation Box (Supervisor Action)
  const rightRecX = margin + recBoxW + 10;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(rightRecX, finalY, recBoxW, recBoxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryTeal);
  doc.text("Supervisor Action Directives", rightRecX + 8, finalY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...textDark);
  const actionText = defectedBatches === 0
    ? "Maintain standard conveyor speeds. Authorize continuation of scheduled manufacturing batches."
    : "Issue maintenance notice for flagged line. Coordinate manual re-inspection with Quality Engineering.";
  doc.text(doc.splitTextToSize(actionText, recBoxW - 16), rightRecX + 8, finalY + 23);

  finalY += recBoxH + 16;

  // If signature box doesn't fit on this page, add page
  if (finalY > pageHeight - 110) {
    doc.addPage();
    drawPageHeader();
    finalY = 100;
  }

  // ==========================================
  // SECTION 4: FORMAL AUTHORIZATION & SIGN-OFF
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryTeal);
  doc.text("4. FORMAL AUDIT SIGN-OFF & AUTHORIZATION", margin, finalY);

  finalY += 14;

  const sigColW = (contentWidth - 14) / 3;
  const sigH = 58;

  const signees = [
    { role: "Factory Supervisor", name: supervisor || "Factory Supervisor" },
    { role: "Quality Engineering Lead", name: "Quality Lead (QE)" },
    { role: "Plant Operations Manager", name: "Plant Manager" }
  ];

  signees.forEach((sig, idx) => {
    const sigX = margin + idx * (sigColW + 7);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(sigX, finalY, sigColW, sigH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...primaryTeal);
    doc.text(sig.role, sigX + 8, finalY + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    doc.text(`Name:  ${sig.name}`, sigX + 8, finalY + 22);

    doc.setDrawColor(...lineBorder);
    doc.line(sigX + 8, finalY + 38, sigX + sigColW - 8, finalY + 38);
    doc.setFontSize(5.8);
    doc.setTextColor(...textMuted);
    doc.text("Digital Sign-off / Signature", sigX + 8, finalY + 46);
    doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`, sigX + sigColW - 55, finalY + 46);
  });

  // Calculate total pages and draw footers across all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  // File naming and download
  const sanitizedRange = dateRange.replace(/\s+/g, "_");
  const fileName = `VisionInspect_Inspection_Reports_${sanitizedRange}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}

export default generateInspectionsReport;
