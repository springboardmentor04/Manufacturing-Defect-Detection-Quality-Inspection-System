# VisionInspect AI

Manufacturing Defect Detection & Quality Inspection platform — matches the flows in
your reference screenshots: **Login**, **Register**, a **Quality Engineer** dashboard
(Dashboard, Upload Product Image, Product Inspection Results, Defect Analytics,
Inspection History, Quality Reports) and a **Supervisor** dashboard (Dashboard,
Production Overview, Production Monitoring, Trends).

## Stack

Two interchangeable backends are included — same routes, same JSON response shapes,
same SQLite schema — so the frontend works unmodified against either one. Run whichever
you prefer (or both, on different ports, to compare).

- **`backend/`** — Node.js + Express + SQLite (`better-sqlite3`), JWT auth, `bcryptjs`
  password hashing, `multer` image uploads. Runs on **port 4000**.
- **`backend-fastapi/`** — Python + FastAPI + SQLite (stdlib `sqlite3`), JWT auth via
  `python-jose`, `passlib`/`bcrypt` password hashing, native `UploadFile` image uploads.
  Runs on **port 8000**. Interactive API docs at `http://localhost:8000/docs`.
- **Frontend (`frontend/`):** Plain HTML/CSS/JS (no build step) styled to match the
  VisionInspect AI dark theme, with Chart.js (via CDN) for the analytics/trend charts.
- **AI inspection:** `backend/defectEngine.js` (Node) and `backend-fastapi/defect_engine.py`
  (Python) both simulate a YOLOv8-style detector and implement the severity scoring
  formula from the spec:
  `Severity = Size×30% + Location×25% + Defect Type×25% + Confidence×20%`,
  mapped to Critical (80–100) / High (60–79) / Medium (40–59) / Low (0–39).
  Swap either module out for a real model (e.g. an ONNX/PyTorch YOLOv8 endpoint) later
  without touching any routes — it only needs to keep returning the same shape.

## Project layout

```
visioninspect-ai/
├── backend/
│   ├── server.js            # Express app entry point
│   ├── db.js                 # SQLite schema (users, products, inspections)
│   ├── defectEngine.js       # Simulated CV inference + severity scoring
│   ├── middleware/auth.js    # JWT auth + role guard
│   └── routes/
│       ├── auth.js           # register / login / me
│       ├── inspections.js    # upload image, run inspection, results, history
│       ├── analytics.js      # KPI summary, defect breakdown, trends, production lines
│       └── reports.js        # daily quality reports
├── backend-fastapi/            # Python equivalent of backend/ — same routes & JSON shapes
│   ├── main.py                 # FastAPI app entry point
│   ├── database.py             # SQLite schema (identical to db.js)
│   ├── defect_engine.py        # Simulated CV inference + severity scoring (Python port)
│   ├── auth.py                 # JWT auth + role guard dependency
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py
│       ├── inspections.py
│       ├── analytics.py
│       └── reports.py
└── frontend/
    ├── login.html
    ├── register.html
    ├── app.html               # SPA shell (sidebar + content mount)
    ├── serve.js                # tiny static file server, no build step
    ├── css/style.css
    └── js/
        ├── api.js             # fetch wrapper + auth/session helpers
        └── app.js              # hash router + all page renderers
```

## Running it in the VS Code terminal

Open the project folder in VS Code, then open **three terminals** (Terminal → New
Terminal, or the `+` icon) — one per piece. Pick **either** Option A (Node) **or**
Option B (FastAPI) for the backend; you don't need both running at once.

### Terminal 1 — Option A: Node/Express backend (port 4000)

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env  — then edit JWT_SECRET
npm start
```

### Terminal 1 — Option B: FastAPI backend (port 8000)

```bash
cd backend-fastapi

# create & activate a virtual environment
python -m venv venv
# macOS / Linux:
source venv/bin/activate
# Windows (PowerShell):
venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env  — then edit JWT_SECRET

python main.py
# or, equivalently:
uvicorn main:app --reload --port 8000
```

FastAPI gives you interactive API docs for free at **http://localhost:8000/docs** —
handy for testing endpoints without the frontend.

### Terminal 2 — Frontend (port 3000)

```bash
cd frontend
node serve.js
```

Open **http://localhost:3000** (redirects to the login page).

> The frontend talks to `http://localhost:4000` by default (`frontend/js/api.js`). If
> you're running the **FastAPI** backend instead, either change that one line to
> `http://localhost:8000`, or add this line before `js/api.js` loads in each HTML file:
> `<script>window.VISIONINSPECT_API_BASE = 'http://localhost:8000';</script>`

Either backend creates its own SQLite file (`visioninspect.db`) and `uploads/` folder
on first run — they don't share data, so register a fresh account on whichever backend
you're running.

## Using the app

1. Go to **Register**, create an account, and choose a role:
   - **Quality Engineer** — uploads product images and runs inspections.
   - **Supervisor** — monitors production lines and trends (read-only).
2. Sign in — you'll land on the role-appropriate dashboard.
3. As a Quality Engineer: **Upload Product Image** → fill in product details → drop an
   image → **Upload & Trigger AI Inspection**. The result panel shows the simulated
   bounding box, severity breakdown, and a pass/fail recommendation.
4. Results feed straight into **Product Inspection Results**, **Defect Analytics**,
   **Inspection History**, and **Quality Reports** — and a Supervisor logged in
   elsewhere will see the same activity on **Production Overview**, **Production
   Monitoring** (auto-refreshes every 20s) and **Trends**.

## Auth & roles

- Passwords are hashed with bcrypt; sessions are stateless JWTs (default 8h expiry,
  configurable via `JWT_EXPIRES_IN`).
- Every API route except `/api/auth/register` and `/api/auth/login` requires
  `Authorization: Bearer <token>`.
- Both roles currently share read access to inspections/analytics/reports so a
  supervisor can oversee QE activity; if you want QE-only or Supervisor-only routes,
  add `requireRole('quality_engineer')` / `requireRole('supervisor')` to the relevant
  route in `backend/routes/*.js` — the middleware is already wired up.

## Notes for production use

- Swap SQLite for Postgres/MySQL by replacing `db.js` if you expect concurrent write
  load; the query style (parameterized SQL) ports over directly.
- Replace `defectEngine.js` with a real inference call (local ONNX runtime, or a
  hosted model endpoint) — keep the same return shape and nothing else changes.
- Move uploaded images to S3/Azure Blob storage instead of local disk for a
  multi-instance deployment, and put the whole stack behind Docker/Nginx as noted in
  the original project brief.
