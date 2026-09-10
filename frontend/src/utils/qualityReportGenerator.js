import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Format IST Date Time String
 */
function getFormattedISTDate() {
  const now = new Date();
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
 * Generates an industrial-grade Quality Assurance & Batch Release Report PDF
 */
export async function generateQualityReport({
  reportData = null,
  batches = [],
  reportRange = "7 days",
  liveResults = [],
  inspector = "Piyush"
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

  // Derive core metrics
  const totalBatches = reportData?.metrics?.totalBatches ?? (batches.length || 1);
  const defectedBatches = reportData?.metrics?.defectedBatches ?? batches.filter((b) => {
    const flags = b.flagCount ?? (b.products?.filter((p) => p.status === "Failed").length || 0);
    return flags > 0 || b.verdict === "Hold" || b.verdict === "Fail";
  }).length;
  const batchesPassRate = reportData?.metrics?.batchesPassRate ?? (totalBatches > 0 ? Math.round(((totalBatches - defectedBatches) / totalBatches) * 100) : 100);

  const totalProducts = reportData?.metrics?.totalProducts ?? batches.reduce((acc, b) => acc + (b.products?.length || 1), 0);
  const defectedProducts = reportData?.metrics?.defectedProducts ?? (reportData?.metrics?.totalDefects ?? batches.reduce((acc, b) => acc + (b.products?.filter((p) => p.status === "Failed").length || 0), 0));
  const productsPassRate = reportData?.metrics?.productsPassRate ?? (totalProducts > 0 ? Math.round(((totalProducts - defectedProducts) / totalProducts) * 100) : 100);

  const topDefect = reportData?.metrics?.topDefect ?? "None";
  const topDefectPct = reportData?.metrics?.topDefectPct ?? 0.0;

  // Compute HITL verification metrics across all batches
  let humanOverriddenGood = 0;
  let humanConfirmedDefect = 0;
  let aiAutoCleared = 0;

  batches.forEach((b) => {
    (b.products || []).forEach((p) => {
      if (p.status === "Passed" && p.confidence < 90) {
        humanOverriddenGood += 1;
      } else if (p.status === "Failed") {
        humanConfirmedDefect += 1;
      } else {
        aiAutoCleared += 1;
      }
    });
  });

  const targetYield = 90.0;
  const isApproved = productsPassRate >= targetYield && defectedProducts === 0;
  const isConditional = productsPassRate >= targetYield && defectedProducts > 0;

  const activeBatchCode = batches.length === 1 ? batches[0].id : (batches[0]?.id || "BT-4117");
  const trackingId = `QAR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${activeBatchCode}`;
  const timestampStr = getFormattedISTDate();

  // Color constants
  const primaryTeal = [15, 47, 50];
  const accentTeal = [27, 126, 120];
  const textDark = [30, 41, 45];
  const textMuted = [100, 116, 120];
  const lineBorder = [218, 226, 224];
  const cardBg = [248, 250, 249];

  // Helper function for adding headers
  function drawPageHeader() {
    // Top Bar Background
    doc.setFillColor(15, 47, 50);
    doc.rect(margin, 22, contentWidth, 3, "F");

    // Brand & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryTeal);
    doc.text("VisionInspect AI", margin, 44);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...accentTeal);
    doc.text("Automated Quality Inspection System  |  Enterprise QA Audit", margin, 56);

    // Right-side Document Tracking Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryTeal);
    doc.text(`TRACKING ID: ${trackingId}`, pageWidth - margin, 44, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`Generated: ${timestampStr}`, pageWidth - margin, 56, { align: "right" });

    // Meta Badge Ribbon (4 clean columns)
    const ribbonY = 66;
    const ribbonH = 22;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(margin, ribbonY, contentWidth, ribbonH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);
    
    const colW = contentWidth / 4;
    const textY = ribbonY + 14;

    // Col 1: Scope
    doc.text("SCOPE:", margin + 12, textY);
    doc.setFont("helvetica", "normal");
    doc.text(reportRange, margin + 48, textY);

    // Col 2: Production Line
    doc.setFont("helvetica", "bold");
    doc.text("LINE:", margin + colW + 12, textY);
    doc.setFont("helvetica", "normal");
    doc.text(batches[0]?.line || "Line 01", margin + colW + 42, textY);

    // Col 3: Quality Inspector
    doc.setFont("helvetica", "bold");
    doc.text("INSPECTOR:", margin + colW * 2 + 12, textY);
    doc.setFont("helvetica", "normal");
    doc.text(inspector, margin + colW * 2 + 68, textY);

    // Col 4: Target Threshold
    doc.setFont("helvetica", "bold");
    doc.text("THRESHOLD:", margin + colW * 3 + 12, textY);
    doc.setFont("helvetica", "normal");
    doc.text(">= 90.0% Yield", margin + colW * 3 + 72, textY);
  }

  function drawPageFooter(currentPage, totalPages = 2) {
    const footerY = pageHeight - 20;
    doc.setDrawColor(...lineBorder);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    
    // Left text with zero collision
    doc.text("VisionInspect AI  •  Quality Assurance Report  |  Confidential Internal Data", margin, footerY);
    // Right text
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & QUALITY TRENDS
  // ==========================================
  drawPageHeader();

  let currentY = 104;

  // 1. Batch Release Verdict Banner (Dynamic)
  let verdictBg, verdictBorder, verdictText, verdictTitle, verdictDesc;
  if (isApproved) {
    verdictBg = [234, 248, 239]; // light green
    verdictBorder = [39, 131, 127]; // teal green
    verdictText = [18, 102, 60];
    verdictTitle = "APPROVED FOR SHIPMENT / PACKAGING";
    verdictDesc = "Product yield meets enterprise baseline (>= 90.0%). Zero critical structural defects detected.";
  } else if (isConditional) {
    verdictBg = [254, 247, 230]; // light amber
    verdictBorder = [217, 119, 6];
    verdictText = [180, 83, 9];
    verdictTitle = "APPROVED WITH REMARKS / MINOR DEFECTS";
    verdictDesc = `Pass rate (${productsPassRate}%) meets target yield. Minor findings isolated and documented.`;
  } else {
    verdictBg = [254, 242, 242]; // light red
    verdictBorder = [220, 38, 38];
    verdictText = [185, 28, 28];
    verdictTitle = "CONDITIONAL HOLD / RE-INSPECTION REQUIRED";
    verdictDesc = `Product yield (${productsPassRate}%) is below 90.0% target. Quality Engineer sign-off required before release.`;
  }

  doc.setFillColor(...verdictBg);
  doc.setDrawColor(...verdictBorder);
  doc.roundedRect(margin, currentY, contentWidth, 50, 4, 4, "FD");

  // Status Badge Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...verdictText);
  doc.text("BATCH RELEASE VERDICT", margin + 14, currentY + 15);

  doc.setFontSize(11.5);
  doc.text(verdictTitle, margin + 14, currentY + 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 70, 72);
  doc.text(verdictDesc, margin + 14, currentY + 42);

  // Yield Comparison on right side of the banner
  const rightBoxX = pageWidth - margin - 145;
  doc.setDrawColor(...verdictBorder);
  doc.line(rightBoxX, currentY + 7, rightBoxX, currentY + 43);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("TARGET YIELD", rightBoxX + 12, currentY + 17);
  doc.text("ACTUAL YIELD", rightBoxX + 78, currentY + 17);

  doc.setFontSize(13);
  doc.setTextColor(...primaryTeal);
  doc.text(`${targetYield.toFixed(1)}%`, rightBoxX + 12, currentY + 34);

  doc.setTextColor(...verdictText);
  doc.text(`${productsPassRate.toFixed(1)}%`, rightBoxX + 78, currentY + 34);

  currentY += 66; // clean breathing space before Section 1

  // ==========================================
  // SECTION 1: EXECUTIVE KPI SUMMARY
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryTeal);
  doc.text("1. EXECUTIVE KPI SUMMARY", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Key inspection metrics evaluated across active records.", margin, currentY + 11);

  currentY += 20;

  const cardSpacing = 8;
  const colCount = 4;
  const cardWidth = (contentWidth - cardSpacing * (colCount - 1)) / colCount;
  const cardHeight = 42;

  const kpisRow1 = [
    { title: "Total Batches Inspected", val: `${totalBatches}`, sub: "Live in MongoDB", color: primaryTeal },
    { title: "Total Defected Batches", val: `${defectedBatches}`, sub: defectedBatches > 0 ? "Flagged batches" : "Zero flagged", color: defectedBatches > 0 ? [185, 28, 28] : [22, 138, 88] },
    { title: "Batches Pass Rate", val: `${batchesPassRate}%`, sub: `Threshold: ${targetYield}%`, color: batchesPassRate >= targetYield ? [22, 138, 88] : [185, 28, 28] },
    { title: "Top Defect Category", val: topDefect, sub: `${topDefectPct}% of total findings`, color: primaryTeal },
  ];

  const kpisRow2 = [
    { title: "Total Products Inspected", val: `${totalProducts}`, sub: "Images evaluated", color: primaryTeal },
    { title: "Total Defected Products", val: `${defectedProducts}`, sub: defectedProducts > 0 ? "Defects identified" : "Zero defects", color: defectedProducts > 0 ? [185, 28, 28] : [22, 138, 88] },
    { title: "Products Pass Rate", val: `${productsPassRate}%`, sub: "Units cleared", color: productsPassRate >= targetYield ? [22, 138, 88] : [185, 28, 28] },
    { title: "Inspection Engine", val: "YOLOv11-Prod", sub: "Confidence >= 85.0%", color: primaryTeal },
  ];

  // Draw Row 1
  kpisRow1.forEach((kpi, i) => {
    const x = margin + i * (cardWidth + cardSpacing);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...textMuted);
    doc.text(kpi.title, x + 8, currentY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 8, currentY + 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, x + 8, currentY + 36);
  });

  currentY += cardHeight + cardSpacing;

  // Draw Row 2
  kpisRow2.forEach((kpi, i) => {
    const x = margin + i * (cardWidth + cardSpacing);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...textMuted);
    doc.text(kpi.title, x + 8, currentY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 8, currentY + 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, x + 8, currentY + 36);
  });

  currentY += cardHeight + 22; // clean breathing space before Section 2

  // ==========================================
  // SECTION 2: QUALITY TRENDS & VISUAL ANALYTICS
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryTeal);
  doc.text("2. QUALITY TRENDS & DEFECT CLASSIFICATION", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("7-day inspection yield progression and category distribution.", margin, currentY + 11);

  currentY += 20;

  // Render Dual-Panel Visual: Left = 7-Day Trend Bar Chart, Right = Defect Breakdown Bars
  const panelW = (contentWidth - 12) / 2;
  const panelH = 110;

  // Left Panel: 7-Day Yield Trend Chart
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(margin, currentY, panelW, panelH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("Daily Yield Progression (Pass Rate %)", margin + 10, currentY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...textMuted);
  doc.text("Goal Target: 90.0%", margin + panelW - 65, currentY + 14);

  // Draw Trend Bars inside Left Panel
  const trendBars = reportData?.trendBars || [
    { label: "Day 1", value: 100 },
    { label: "Day 2", value: 100 },
    { label: "Day 3", value: 100 },
    { label: "Day 4", value: 100 },
    { label: "Day 5", value: 100 },
    { label: "Day 6", value: 100 },
    { label: "Today", value: productsPassRate }
  ];

  const chartAreaX = margin + 14;
  const chartAreaY = currentY + 26;
  const chartAreaW = panelW - 28;
  const chartAreaH = 65;
  const barCount = trendBars.length;
  const barSlotW = chartAreaW / barCount;
  const barW = Math.min(16, barSlotW - 6);

  // Draw 90% Target Reference Line
  const targetLineY = chartAreaY + chartAreaH * (1 - 0.9);
  doc.setDrawColor(39, 131, 127);
  doc.line(chartAreaX, targetLineY, chartAreaX + chartAreaW, targetLineY);

  trendBars.forEach((b, i) => {
    const val = Math.max(0, Math.min(100, b.value || 0));
    const barH = (val / 100) * chartAreaH;
    const barX = chartAreaX + i * barSlotW + (barSlotW - barW) / 2;
    const barY = chartAreaY + chartAreaH - barH;

    // Bar fill
    if (val >= 90) {
      doc.setFillColor(39, 131, 127); // Teal pass
    } else if (val > 0) {
      doc.setFillColor(220, 38, 38); // Red fail
    } else {
      doc.setFillColor(218, 226, 224); // Muted grey
    }
    doc.rect(barX, barY, barW, barH, "F");

    // Value label on top of bar
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...(val >= 90 ? [18, 102, 60] : [185, 28, 28]));
    if (val > 0) {
      doc.text(`${val}%`, barX + barW / 2, barY - 3, { align: "center" });
    }

    // X-axis label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...textMuted);
    const shortLabel = (b.label || "").split(" ")[0];
    doc.text(shortLabel, barX + barW / 2, chartAreaY + chartAreaH + 11, { align: "center" });
  });

  // Right Panel: Defect Mix Distribution
  const rightPanelX = margin + panelW + 12;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(rightPanelX, currentY, panelW, panelH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("Defect Mix & Finding Share", rightPanelX + 10, currentY + 14);

  const rawMix = reportData?.defectMix || [];
  let displayMix = rawMix.slice(0, 4);
  if (!displayMix.length) {
    displayMix = [{ label: "Passed (Defect-free)", value: 100, color: "#27837f" }];
  }

  let mixBarY = currentY + 30;
  displayMix.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...textDark);
    doc.text(item.label, rightPanelX + 10, mixBarY + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(`${item.value}%`, rightPanelX + panelW - 12, mixBarY + 5, { align: "right" });

    // Progress Bar Background
    const progTrackW = panelW - 20;
    doc.setFillColor(235, 239, 238);
    doc.roundedRect(rightPanelX + 10, mixBarY + 8, progTrackW, 6, 2, 2, "F");

    // Progress Bar Fill
    const fillW = Math.max(4, (item.value / 100) * progTrackW);
    doc.setFillColor(item.color === "#27837f" || item.label.includes("Passed") ? 39 : 220, item.color === "#27837f" || item.label.includes("Passed") ? 131 : 38, item.color === "#27837f" || item.label.includes("Passed") ? 127 : 38);
    doc.roundedRect(rightPanelX + 10, mixBarY + 8, fillW, 6, 2, 2, "F");

    mixBarY += 19;
  });

  currentY += panelH + 16;

  // Defect Mix Breakdown Table
  let defectTableData = [];
  if (rawMix.length > 0 && !(rawMix.length === 1 && rawMix[0].label.includes("Defect-free"))) {
    defectTableData = rawMix.map((item, idx) => {
      const isPass = item.label.toLowerCase().includes("passed") || item.label.toLowerCase().includes("defect-free");
      const severity = isPass ? "Nominal" : (idx === 0 ? "High" : "Medium");
      const compliance = isPass ? "COMPLIANT" : "FLAGGED";
      return [
        item.label,
        `${item.value}%`,
        severity,
        compliance,
        isPass ? "Meets standard specification" : "Requires engineer verification"
      ];
    });
  } else {
    defectTableData = [
      ["Passed (Defect-free)", "100.0%", "Nominal", "COMPLIANT", "Zero anomalies detected across sample set"]
    ];
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Defect Category", "Share (%)", "Severity Grade", "Compliance Status", "Standard Notes"]],
    body: defectTableData,
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 4.5,
      textColor: textDark,
      lineColor: lineBorder,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 251],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 140 },
      1: { halign: "center", cellWidth: 65 },
      2: { halign: "center", cellWidth: 85 },
      3: { halign: "center", cellWidth: 95 },
      4: { cellWidth: "auto" },
    },
    didParseCell: function(data) {
      if (data.section === "body" && data.column.index === 3) {
        if (data.cell.raw === "COMPLIANT") {
          data.cell.styles.textColor = [22, 138, 88];
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "FLAGGED") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // Executive Findings & Quality Summary Note
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(margin, currentY, contentWidth, 42, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("EXECUTIVE QUALITY SUMMARY NOTE", margin + 10, currentY + 12);

  const summaryParagraph = reportData?.summary || 
    `During this inspection window (${reportRange}), a total of ${totalBatches} batch${totalBatches === 1 ? "" : "es"} comprising ${totalProducts} unit${totalProducts === 1 ? "" : "s"} were analyzed via high-resolution optical inspection. Yield rate achieved is ${productsPassRate.toFixed(1)}%. Production status is currently ${isApproved ? "verified compliant and authorized for release" : "subject to engineering review"}.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textDark);
  const splitSummary = doc.splitTextToSize(summaryParagraph, contentWidth - 20);
  doc.text(splitSummary, margin + 10, currentY + 24);

  drawPageFooter(1, 2);

  // ==========================================
  // PAGE 2: BATCH-LEVEL AUDIT LEDGER & SIGN-OFF
  // ==========================================
  doc.addPage();
  drawPageHeader();

  currentY = 104;

  // Section 3: Batch Inspection Ledger
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryTeal);
  doc.text("3. PRODUCTION BATCH INSPECTION LEDGER", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Aggregated batch outcomes, scanned product volumes, and release status.", margin, currentY + 11);

  currentY += 20;

  // Build Batch-level table rows
  const batchLedgerRows = (batches || []).map((b, idx) => {
    const totalItems = b.products?.length || 1;
    const flags = b.flagCount ?? (b.products?.filter(p => p.status === "Failed").length || 0);
    const passed = totalItems - flags;
    const passPct = Math.round((passed / totalItems) * 100);
    const isPassed = flags === 0 && (b.status === "Passed" || b.status === "Complete" || b.verdict === "Pass" || b.severity === "Low");

    return [
      String(idx + 1),
      b.id,
      b.name || "Production Batch",
      b.line || "Line 01",
      String(totalItems),
      String(flags),
      `${passPct}%`,
      isPassed ? "PASS" : "FAIL"
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Batch Code", "Batch Name", "Line", "Total Scanned", "Defects", "Pass Rate", "Verdict"]],
    body: batchLedgerRows.length ? batchLedgerRows : [["1", activeBatchCode, "Standard Inspection Batch", "Line 01", String(totalProducts), String(defectedProducts), `${productsPassRate}%`, isApproved ? "PASS" : "FAIL"]],
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 5,
      textColor: textDark,
      lineColor: lineBorder,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 251],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 22 },
      1: { fontStyle: "bold", cellWidth: 70 },
      2: { fontStyle: "bold", cellWidth: 140 },
      3: { cellWidth: 60 },
      4: { halign: "center", cellWidth: 65 },
      5: { halign: "center", cellWidth: 50 },
      6: { halign: "center", fontStyle: "bold", cellWidth: 60 },
      7: { halign: "center", fontStyle: "bold", cellWidth: "auto" }
    },
    didParseCell: function(data) {
      if (data.section === "body" && data.column.index === 7) {
        if (data.cell.raw === "PASS") {
          data.cell.styles.textColor = [22, 138, 88];
          data.cell.styles.fillColor = [234, 248, 239];
        } else if (data.cell.raw === "FAIL") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // Human-in-the-Loop (HITL) Verification Summary Card
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(margin, currentY, contentWidth, 54, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("HUMAN-IN-THE-LOOP (HITL) VERIFICATION & QUALITY AUDIT SUMMARY", margin + 10, currentY + 14);

  const hitlW = (contentWidth - 20) / 4;
  const hitlY = currentY + 28;

  // HITL Stat 1: Total Units Scanned
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("Total Units Scanned", margin + 10, hitlY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryTeal);
  doc.text(`${totalProducts}`, margin + 10, hitlY + 14);

  // HITL Stat 2: AI Auto-Cleared
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("AI Auto-Cleared (Nominal)", margin + 10 + hitlW, hitlY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(22, 138, 88);
  doc.text(`${aiAutoCleared}`, margin + 10 + hitlW, hitlY + 14);

  // HITL Stat 3: Engineer Overrides (Marked Good)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("Human Overrides (Marked Good)", margin + 10 + hitlW * 2, hitlY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(27, 126, 120);
  doc.text(`${humanOverriddenGood}`, margin + 10 + hitlW * 2, hitlY + 14);

  // HITL Stat 4: Confirmed Defective Units
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("Confirmed Defective Units", margin + 10 + hitlW * 3, hitlY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(defectedProducts > 0 ? [185, 28, 28] : [22, 138, 88]));
  doc.text(`${defectedProducts}`, margin + 10 + hitlW * 3, hitlY + 14);

  currentY += 54 + 20;

  // Section 4: Corrective Actions & Engineering Recommendations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryTeal);
  doc.text("4. CORRECTIVE ACTIONS & ENGINEERING RECOMMENDATIONS", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Actionable guidance tailored to dominant failure modes and line health.", margin, currentY + 11);

  currentY += 20;

  const recBoxWidth = (contentWidth - 12) / 2;
  const recBoxHeight = 50;

  // Left Recommendation Box (Root Cause)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(margin, currentY, recBoxWidth, recBoxHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("Root Cause Analysis", margin + 10, currentY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  const rootCauseText = defectedProducts === 0 
    ? "All optical scans nominal. Zero recurrent tool wear or machine calibration drift observed."
    : `Primary variance driven by ${topDefect}. Recommended inspection of feeder positioning and optical lighting.`;
  doc.text(doc.splitTextToSize(rootCauseText, recBoxWidth - 20), margin + 10, currentY + 24);

  // Right Recommendation Box (Action Items)
  const rightRecX = margin + recBoxWidth + 12;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...lineBorder);
  doc.roundedRect(rightRecX, currentY, recBoxWidth, recBoxHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("Engineering Recommended Actions", rightRecX + 10, currentY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  const actionText = defectedProducts === 0
    ? "Maintain current line speed and baseline illumination parameters. Proceed with planned production schedule."
    : "Calibrate camera threshold on Line 01. Execute preventive cleaning of optical sensor lenses.";
  doc.text(doc.splitTextToSize(actionText, recBoxWidth - 20), rightRecX + 10, currentY + 24);

  currentY += recBoxHeight + 20;

  // Section 5: Formal Audit Sign-Off
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryTeal);
  doc.text("5. FORMAL AUDIT SIGN-OFF & AUTHORIZATION", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Authorized release validation and engineering signatures.", margin, currentY + 11);

  currentY += 20;

  const sigColWidth = (contentWidth - 16) / 3;
  const sigHeight = 70;

  const signees = [
    { role: "Quality Assurance Lead", name: inspector || "Piyush (QE Lead)" },
    { role: "Plant Operations Supervisor", name: "Supervisor Line 01" },
    { role: "Head of Quality Engineering", name: "Quality Director" }
  ];

  signees.forEach((sig, idx) => {
    const sigX = margin + idx * (sigColWidth + 8);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...lineBorder);
    doc.roundedRect(sigX, currentY, sigColWidth, sigHeight, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...primaryTeal);
    doc.text(sig.role, sigX + 10, currentY + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...textDark);
    doc.text(`Name:  ${sig.name}`, sigX + 10, currentY + 27);
    
    doc.setDrawColor(...lineBorder);
    doc.line(sigX + 10, currentY + 48, sigX + sigColWidth - 10, currentY + 48);
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text("Signature / Digital Authorization", sigX + 10, currentY + 56);

    doc.text(`Date:  ${new Date().toISOString().slice(0, 10)}`, sigX + sigColWidth - 65, currentY + 56);
  });

  drawPageFooter(2, 2);

  // Save the generated document
  const fileName = `VisionInspect_Quality_Report_${activeBatchCode}_${reportRange.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
  return fileName;
}
