import { jsPDF } from 'jspdf';
import { fmtDateTime } from './format';
export async function downloadInspectionReport(insp, imgSrc, userFullName) {
  // eslint-disable-next-line no-undef
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 45);
  doc.text('VisionInspect AI', margin, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 100, 120);
  doc.text('Product Inspection Report', margin, y + 16);
  doc.setDrawColor(220, 224, 232);
  y += 30;
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // Status badge
  const statusColor = insp.status === 'pass' ? [51, 209, 122] : [240, 71, 90];
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - 80, 50, 80, 22, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(insp.status === 'pass' ? 'PASS' : 'FAIL', pageWidth - margin - 40, 65, { align: 'center' });

  // Product details
  doc.setTextColor(20, 30, 45);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Details', margin, y);
  y += 18;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 98);

  const details = [
    ['Product Name', insp.product.product_name || '—'],
    ['Product Code', insp.product.product_code || '—'],
    ['Category', insp.product.category || '—'],
    ['Batch Number', insp.product.batch_number || '—'],
    ['Production Line', insp.product.production_line || '—'],
    ['Inspection Date', fmtDateTime(insp.created_at)],
    ['Inspected By', userFullName || '—'],
  ];
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 130, y);
    y += 16;
  });

  y += 8;

  // Product image
  if (imgSrc && imgSrc.startsWith('data:image')) {
    try {
      const imgProps = doc.getImageProperties(imgSrc);
      const maxW = pageWidth - margin * 2;
      const maxH = 220;
      let w = maxW;
      let h = (imgProps.height * w) / imgProps.width;
      if (h > maxH) {
        h = maxH;
        w = (imgProps.width * h) / imgProps.height;
      }
      doc.setDrawColor(220, 224, 232);
      doc.rect(margin, y, w, h);
      doc.addImage(imgSrc, imgProps.fileType || 'JPEG', margin, y, w, h);
      y += h + 24;
    } catch (e) {
      // If image can't be embedded, skip silently and continue with the report
    }
  }

  // Defect classification
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 45);
  doc.text('Defect Classification & Severity', margin, y);
  y += 18;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 98);
  const scoreRows = [
    ['Defect Type', insp.defect_type || '—'],
    ['Severity Level', insp.severity_level || '—'],
    ['Severity Score', `${insp.severity_score} / 100`],
    ['Size Score', String(insp.scores.size)],
    ['Location Score', String(insp.scores.location)],
    ['Defect Type Score', String(insp.scores.type)],
    ['AI Confidence', `${insp.scores.confidence}%`],
  ];
  scoreRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 130, y);
    y += 16;
  });

  y += 8;

  // Recommendation
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 45);
  doc.text('Recommendation', margin, y);
  y += 18;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 98);
  const recLines = doc.splitTextToSize(insp.recommendation || 'No recommendation available.', pageWidth - margin * 2);
  doc.text(recLines, margin, y);
  y += recLines.length * 14 + 20;

  // Footer
  doc.setDrawColor(220, 224, 232);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(140, 148, 165);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')} by VisionInspect AI`, margin, y);

  const fileSafeCode = (insp.product.product_code || 'inspection').replace(/[^a-z0-9-_]+/gi, '_');
  doc.save(`inspection-report-${fileSafeCode}.pdf`);
}
