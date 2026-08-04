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

# Run complete application (Frontend + Express API Server)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: FastAPI Backend + React Frontend
```bash
# 1. Setup Python Backend
cd backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. Setup React Frontend
cd ../frontend
npm install
npm run dev
```

---

## 🔐 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Quality Engineer** | `engineer@factory.com` | `password123` |
| **Factory Supervisor** | `supervisor@factory.com` | `password123` |
| **Administrator** | `admin@factory.com` | `password123` |
