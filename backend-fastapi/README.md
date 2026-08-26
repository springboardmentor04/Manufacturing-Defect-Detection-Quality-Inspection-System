# VisionInspect AI — FastAPI backend (PostgreSQL)

This is the `backend-fastapi` folder converted from SQLite to PostgreSQL.
Application logic, routes, and response shapes are unchanged — only the
data layer was swapped.

## What changed from the SQLite version

- **`database.py`** — now connects with `psycopg2` instead of the built-in
  `sqlite3` module. `get_conn()` returns a connection configured with
  `RealDictCursor`, so rows still behave like dicts (`row["id"]`), just
  like the old `sqlite3.Row` did.
- **Table schema** — `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`,
  `TEXT` timestamp columns with `datetime('now')` → `TIMESTAMPTZ DEFAULT NOW()`.
  Everything else (columns, `CHECK` constraints, foreign keys, indexes) is
  the same.
- **All routers** (`routers/auth.py`, `routers/inspections.py`,
  `routers/analytics.py`, `routers/reports.py`) — every query was rewritten:
  - `?` placeholders → `%s` (psycopg2 style)
  - `conn.execute(...)` (a sqlite3 shortcut) → `cur = conn.cursor(); cur.execute(...)`
    (psycopg2 requires an explicit cursor)
  - `cur.lastrowid` → `INSERT ... RETURNING id` + `cur.fetchone()["id"]`
  - SQLite date helpers → Postgres equivalents:
    - `date(created_at)` → `created_at::date`
    - `datetime('now', '-N days')` → `NOW() - (%s * INTERVAL '1 day')`
- **`requirements.txt`** — added `psycopg2-binary`.
- **`.env.example`** — replaced the implicit SQLite file path with a
  `DATABASE_URL` connection string.
- **`main.py`, `auth.py` (JWT), `defect_engine.py`** — unchanged, since
  neither touches the database directly.

## Setup

1. Create a Postgres database:
   ```bash
   createdb visioninspect_db
   ```
2. Copy the env file and set your connection string:
   ```bash
   cp .env.example .env
   # edit DATABASE_URL, JWT_SECRET
   ```
3. Install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. Run it (tables are created automatically on startup via `init_db()`):
   ```bash
   python main.py
   # or: uvicorn main:app --reload
   ```

The API surface (`/api/auth/*`, `/api/inspections/*`, `/api/analytics/*`,
`/api/reports/*`, `/api/health`, `/uploads/*`) is identical to the SQLite
version, so the existing frontend needs no changes.
