const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'visioninspect.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('quality_engineer', 'supervisor')),
  plant         TEXT DEFAULT 'Main Plant',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code     TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  category         TEXT,
  batch_number     TEXT,
  production_line  TEXT,
  production_date  TEXT,
  image_path       TEXT NOT NULL,
  uploaded_by      INTEGER NOT NULL REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspections (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  defect_type      TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  size_score       REAL NOT NULL,
  location_score   REAL NOT NULL,
  type_score       REAL NOT NULL,
  confidence_score REAL NOT NULL,
  severity_score   REAL NOT NULL,
  severity_level   TEXT NOT NULL,
  recommendation   TEXT NOT NULL,
  bbox_x           REAL,
  bbox_y           REAL,
  bbox_w           REAL,
  bbox_h           REAL,
  inspected_by     INTEGER NOT NULL REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inspections_created ON inspections(created_at);
CREATE INDEX IF NOT EXISTS idx_products_line ON products(production_line);
`);

module.exports = db;
