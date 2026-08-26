const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports — daily quality report summaries (Quality Reports page)
router.get('/', requireAuth, (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 180);

  const rows = db
    .prepare(
      `SELECT
         date(i.created_at) AS report_date,
         COUNT(*) AS total_inspected,
         SUM(CASE WHEN i.status = 'fail' THEN 1 ELSE 0 END) AS defects,
         SUM(CASE WHEN i.status = 'pass' THEN 1 ELSE 0 END) AS passed,
         SUM(CASE WHEN i.severity_level = 'Critical' THEN 1 ELSE 0 END) AS critical,
         SUM(CASE WHEN i.severity_level = 'High' THEN 1 ELSE 0 END) AS high,
         AVG(i.confidence_score) AS avg_confidence
       FROM inspections i
       WHERE i.created_at >= datetime('now', ?)
       GROUP BY report_date
       ORDER BY report_date DESC`
    )
    .all(`-${days} days`);

  const reports = rows.map((r) => ({
    report_date: r.report_date,
    total_inspected: r.total_inspected,
    defects: r.defects,
    passed: r.passed,
    critical_defects: r.critical,
    high_defects: r.high,
    yield_percent: r.total_inspected > 0 ? Math.round((r.passed / r.total_inspected) * 1000) / 10 : 0,
    avg_confidence: r.avg_confidence ? Math.round(r.avg_confidence * 10) / 10 : 0,
  }));

  res.json({ reports });
});

// GET /api/reports/:date — detailed inspection list for one report day (YYYY-MM-DD)
router.get('/:date', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT i.id, i.defect_type, i.status, i.severity_score, i.severity_level, i.recommendation,
              i.created_at, p.product_code, p.product_name, p.production_line, u.full_name
       FROM inspections i
       JOIN products p ON p.id = i.product_id
       JOIN users u ON u.id = i.inspected_by
       WHERE date(i.created_at) = ?
       ORDER BY i.created_at DESC`
    )
    .all(req.params.date);

  res.json({ date: req.params.date, inspections: rows });
});

module.exports = router;
