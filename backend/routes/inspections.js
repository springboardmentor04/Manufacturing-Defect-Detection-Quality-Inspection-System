const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { runInspection } = require('../defectEngine');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB, matches spec's upload limit
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|bmp|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, JPEG and BMP images are supported'));
  },
});

function rowToInspection(row) {
  return {
    id: row.id,
    product: {
      id: row.product_id,
      product_code: row.product_code,
      product_name: row.product_name,
      category: row.category,
      batch_number: row.batch_number,
      production_line: row.production_line,
      image_url: `/uploads/${path.basename(row.image_path)}`,
    },
    defect_type: row.defect_type,
    status: row.status,
    scores: {
      size: row.size_score,
      location: row.location_score,
      type: row.type_score,
      confidence: row.confidence_score,
    },
    severity_score: row.severity_score,
    severity_level: row.severity_level,
    recommendation: row.recommendation,
    bbox:
      row.bbox_x == null
        ? null
        : { x: row.bbox_x, y: row.bbox_y, w: row.bbox_w, h: row.bbox_h },
    inspected_by: row.full_name,
    created_at: row.created_at,
  };
}

const SELECT_INSPECTION = `
  SELECT i.*, p.product_code, p.product_name, p.category, p.batch_number, p.production_line,
         p.image_path, u.full_name
  FROM inspections i
  JOIN products p ON p.id = i.product_id
  JOIN users u ON u.id = i.inspected_by
`;

// POST /api/inspections/upload  (multipart/form-data, field name: image)
router.post('/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A product image file is required' });

  const { product_code, product_name, category, batch_number, production_line, production_date } =
    req.body || {};

  if (!product_code || !product_name) {
    return res.status(400).json({ error: 'product_code and product_name are required' });
  }

  const info = db
    .prepare(
      `INSERT INTO products
        (product_code, product_name, category, batch_number, production_line, production_date, image_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      product_code,
      product_name,
      category || null,
      batch_number || null,
      production_line || null,
      production_date || null,
      req.file.filename,
      req.user.id
    );

  res.status(201).json({
    product: {
      id: info.lastInsertRowid,
      product_code,
      product_name,
      category,
      batch_number,
      production_line,
      image_url: `/uploads/${req.file.filename}`,
    },
  });
});

// POST /api/inspections/run/:productId  — trigger AI inspection on an uploaded image
router.post('/run/:productId', requireAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const imagePath = path.join(__dirname, '..', 'uploads', product.image_path);
  const result = runInspection(imagePath);

  const info = db
    .prepare(
      `INSERT INTO inspections
        (product_id, defect_type, status, size_score, location_score, type_score, confidence_score,
         severity_score, severity_level, recommendation, bbox_x, bbox_y, bbox_w, bbox_h, inspected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      product.id,
      result.defect_type,
      result.status,
      result.size_score,
      result.location_score,
      result.type_score,
      result.confidence_score,
      result.severity_score,
      result.severity_level,
      result.recommendation,
      result.bbox ? result.bbox.x : null,
      result.bbox ? result.bbox.y : null,
      result.bbox ? result.bbox.w : null,
      result.bbox ? result.bbox.h : null,
      req.user.id
    );

  const row = db.prepare(`${SELECT_INSPECTION} WHERE i.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ inspection: rowToInspection(row) });
});

// GET /api/inspections  — list / history (supports ?limit=, ?status=, ?line=)
router.get('/', requireAuth, (req, res) => {
  const { limit = 50, status, line } = req.query;
  let sql = SELECT_INSPECTION;
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('i.status = ?');
    params.push(status);
  }
  if (line) {
    clauses.push('p.production_line = ?');
    params.push(line);
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY i.created_at DESC LIMIT ?';
  params.push(Number(limit) || 50);

  const rows = db.prepare(sql).all(...params);
  res.json({ inspections: rows.map(rowToInspection) });
});

// GET /api/inspections/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare(`${SELECT_INSPECTION} WHERE i.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  res.json({ inspection: rowToInspection(row) });
});

module.exports = router;
