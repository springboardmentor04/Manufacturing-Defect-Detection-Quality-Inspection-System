const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary — top KPI cards for both dashboards
router.get('/summary', requireAuth, (req, res) => {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total_inspected,
         SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS defects_detected,
         SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
         AVG(confidence_score) AS avg_confidence
       FROM inspections`
    )
    .get();

  const total = totals.total_inspected || 0;
  const passed = totals.passed || 0;
  const quality_score = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;

  res.json({
    total_products_inspected: total,
    defects_detected: totals.defects_detected || 0,
    quality_score_percent: quality_score,
    ai_confidence_percent: totals.avg_confidence ? Math.round(totals.avg_confidence * 10) / 10 : 0,
  });
});

// GET /api/analytics/defect-breakdown — counts per defect type (for Defect Analytics page)
router.get('/defect-breakdown', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT defect_type, COUNT(*) AS count
       FROM inspections
       WHERE status = 'fail'
       GROUP BY defect_type
       ORDER BY count DESC`
    )
    .all();

  const totalDefects = rows.reduce((sum, r) => sum + r.count, 0);
  const breakdown = rows.map((r) => ({
    defect_type: r.defect_type,
    count: r.count,
    percent: totalDefects > 0 ? Math.round((r.count / totalDefects) * 1000) / 10 : 0,
  }));

  const severityRows = db
    .prepare(
      `SELECT severity_level, COUNT(*) AS count
       FROM inspections
       WHERE status = 'fail'
       GROUP BY severity_level`
    )
    .all();

  res.json({ breakdown, severity_breakdown: severityRows });
});

// GET /api/analytics/trends?days=14 — daily inspection trend (for Trends / Defect Analytics charts)
router.get('/trends', requireAuth, (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);

  const rows = db
    .prepare(
      `SELECT
         date(created_at) AS day,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS defects,
         SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
         AVG(severity_score) AS avg_severity
       FROM inspections
       WHERE created_at >= datetime('now', ?)
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(`-${days} days`);

  res.json({
    days: rows.map((r) => ({
      date: r.day,
      total: r.total,
      defects: r.defects,
      passed: r.passed,
      avg_severity: r.avg_severity ? Math.round(r.avg_severity * 10) / 10 : 0,
    })),
  });
});

// GET /api/analytics/production-lines — per-line stats for Supervisor Production Overview/Monitoring
router.get('/production-lines', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         COALESCE(p.production_line, 'Unassigned') AS production_line,
         COUNT(i.id) AS total_inspected,
         SUM(CASE WHEN i.status = 'fail' THEN 1 ELSE 0 END) AS defects,
         SUM(CASE WHEN i.status = 'pass' THEN 1 ELSE 0 END) AS passed,
         AVG(i.severity_score) AS avg_severity,
         MAX(i.created_at) AS last_inspection
       FROM inspections i
       JOIN products p ON p.id = i.product_id
       GROUP BY production_line
       ORDER BY total_inspected DESC`
    )
    .all();

  const lines = rows.map((r) => ({
    production_line: r.production_line,
    total_inspected: r.total_inspected,
    defects: r.defects,
    passed: r.passed,
    yield_percent: r.total_inspected > 0 ? Math.round((r.passed / r.total_inspected) * 1000) / 10 : 0,
    avg_severity: r.avg_severity ? Math.round(r.avg_severity * 10) / 10 : 0,
    status: r.avg_severity >= 60 ? 'Attention Needed' : r.avg_severity >= 40 ? 'Monitor' : 'Healthy',
    last_inspection: r.last_inspection,
  }));

  res.json({ lines });
});

module.exports = router;
