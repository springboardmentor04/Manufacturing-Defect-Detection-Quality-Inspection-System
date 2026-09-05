<<<<<<< HEAD
# VisionInspect AI: Manufacturing Defect Detection & Quality Inspection System

VisionInspect AI is an industrial-grade, AI-powered quality control platform designed to automate product defect detection, anomaly localization, defect classification, severity scoring, and manufacturing analytics.

---

## 🌟 Key Capabilities (Milestone 3 Completed)

1. **Role-Based Workflows**:
   - **Quality Engineer**: Image upload, interactive camera/sample selection, OpenCV preprocessing controls (noise removal, CLAHE contrast enhancement, edge detection), manual inspection trigger, defect localization with bounding boxes, severity score formula breakdown, auto pass/fail decisions, and report generation.
   - **Factory Supervisor**: High-level production overview, yield rate KPIs, defect trend analytics, quality threshold rule adjustments, inspection audit history, and real-time production line monitoring simulation.
   - **System Admin**: Master view combining engineering and supervisor controls, full user management (role editing, line assignment), and AI model sensitivity calibration.

2. **Defect Severity Scoring Framework**:
   $$\text{Severity Score} = (\text{Size} \times 30\%) + (\text{Location} \times 25\%) + (\text{DefectType} \times 25\%) + (\text{Confidence} \times 20\%)$$
   - **Low (0 - 39)**: Minor cosmetic defect; product generally acceptable.
   - **Medium (40 - 59)**: Moderate quality concern; inspection review required.
   - **High (60 - 79)**: Significant quality issue; repair or rework recommended.
   - **Critical (80 - 100)**: Major structural defect; immediate product rejection required.

3. **MVTec AD Dataset Ready**:
   - Native support for industrial product categories: *Metal Nut, Cable, Tile, PCB, Capsule, Transistor, Wood, Bottle, Screw, Zipper*.

---

## 📁 Directory Structure

```text
/
├── frontend/                     # React + Tailwind CSS UI
│   ├── src/
│   │   ├── components/           # Reusable UI modules (Preprocessor, SeverityBadge, Navbar, etc.)
│   │   ├── context/              # Authentication & User Role state
│   │   ├── data/                 # Sample MVTec AD datasets & defect templates
│   │   ├── pages/                # Landing, Auth, QE, Supervisor, Admin Dashboards
│   │   ├── services/             # REST API Client & HTTP Interceptors
│   │   ├── App.tsx               # Main Role-Based Router
│   │   └── index.css             # Tailwind CSS Soft Calm styling
│   └── tailwind.config.js        # Theme color definitions
├── backend/                      # Python FastAPI REST Backend
│   ├── main.py                   # FastAPI application entrypoint
│   ├── auth.py                   # JWT Authentication & Passlib security
│   ├── models.py                 # Pydantic schemas for Users & Inspection Records
│   ├── database.py               # MongoDB Motor connection setup
│   ├── defect_engine.py          # OpenCV preprocessing & severity score algorithm
│   └── requirements.txt          # Python backend dependencies
├── ai_model/                     # Computer Vision & Anomaly Detection Pipeline
│   ├── preprocessing.py          # Gaussian Noise Removal, CLAHE, ROI Crop, Normalization
│   ├── inference.py              # YOLO / Anomaly Segmentation Inference Engine
│   └── severity_calculator.py    # Math formula engine for multi-factor severity scoring
├── database/                     # Database Schemas & Migrations
│   ├── mongo_schemas.js          # MongoDB collection schemas & validator rules
│   ├── postgres_schema.sql       # PostgreSQL alternative relational schema
│   └── seed_data.json            # Initial demo seed data
├── dataset_requirements/         # Local MVTec AD Dataset Setup Guide
│   └── mvtec_ad_structure.txt    # Directory hierarchy for MVTec AD dataset
└── README.md                     # Main documentation
```

---

## 🎨 Design & Theme Guidelines ("Soft Calm Aesthetic")

- **Primary Colors**: Soft Slate / Sage Green (`#E2E8F0` / `#F0F4F1`)
- **Secondary Colors**: Muted Teal / Deep Blue (`#0F766E` / `#0284C7`)
- **Backgrounds**: Soft Off-White (`#F8FAFC` / `#FAFBFB`)
- **Typography**: Deep Charcoal (`#1E293B`) for high-contrast, comfortable reading without pure black fatigue.

---

## 🛠️ Quick Start & Running Locally

### Option A: Node Full-Stack Runner (AI Studio Sandbox Mode)
```bash
# Install dependencies
npm install

# Copy .env.example to .env and set MONGODB_URL first.

# Run complete application (Frontend + Express API Server)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

The Node server connects to MongoDB at startup. It creates indexes and seeds the three demo users only when they do not already exist. Successful inspections are stored in `inspections` and also create related documents in `product`, `uploaded_images`, `model_predictions`, `defect`, `reports`, and `analytics`.

### Option B: FastAPI Backend + React Frontend
```bash
# Terminal 1: start the MongoDB-backed FastAPI service from the repository root.
.\.venv311\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000

# Terminal 2: start the React frontend from the repository root.
npm install
npm run dev
```

Set `MONGODB_URL`, `DATABASE_NAME`, `JWT_SECRET`, and `VITE_API_BASE=http://localhost:8000/api` in `.env`. `JWT_SECRET` must be a secure, non-default secret; the backend refuses to start without it. The frontend uses FastAPI as its only API; it does not provide demo or in-memory API responses.

---

## 🔐 Demo Credentials

Create accounts through the registration screen or `POST /api/auth/register`.
The FastAPI backend does not seed demo credentials.
python -m uvicorn backend.main:app --reload --port 8000
=======
# Manufacturing-Defect-Detection-Quality-Inspection-System
>>>>>>> mentor/Sudeshna_Dey
