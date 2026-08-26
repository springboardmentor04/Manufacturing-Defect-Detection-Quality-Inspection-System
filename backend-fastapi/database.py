import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Example: postgresql://user:password@localhost:5432/visioninspect_db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/visioninspect_db",
)


def get_conn():
    """Returns a new psycopg2 connection whose rows behave like dicts
    (row['column_name']), matching how the app used sqlite3.Row before."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          full_name     TEXT NOT NULL,
          email         TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role          TEXT NOT NULL CHECK (role IN ('quality_engineer', 'supervisor')),
          plant         TEXT DEFAULT 'Main Plant',
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id               SERIAL PRIMARY KEY,
          product_code     TEXT NOT NULL,
          product_name     TEXT NOT NULL,
          category         TEXT,
          batch_number     TEXT,
          production_line  TEXT,
          production_date  TEXT,
          image_path       TEXT NOT NULL,
          uploaded_by      INTEGER NOT NULL REFERENCES users(id),
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS inspections (
          id               SERIAL PRIMARY KEY,
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
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_inspections_created ON inspections(created_at);
        CREATE INDEX IF NOT EXISTS idx_products_line ON products(production_line);
        """
    )
    conn.commit()
    cur.close()
    conn.close()
