# VisionInspect AI — Enterprise Vision Inspection System

VisionInspect AI is an enterprise-grade automated vision inspection platform powered by real-time computer vision (YOLOv8s), automated defect severity scoring, PostgreSQL persistence, and role-based operational dashboards for Quality Engineers, Factory Supervisors, and System Administrators.

---

## 1. Architecture Overview & Tech Stack

```
                                  System Architecture
┌──────────────────┐    REST / JSON    ┌─────────────────┐   SQL Connection   ┌─────────────────┐
│  React 19 Frontend│ ───────────────> │  FastAPI Server │ ─────────────────> │ PostgreSQL DB   │
│  Tailwind CSS v4 │ <───────────────  │  Python 3.13    │ <───────────────── │ 19 Tables       │
└──────────────────┘                   └────────┬────────┘                    └─────────────────┘
                                                │ Detections & BBoxes
                                                ▼
                                       ┌─────────────────┐
                                       │ Severity Engine │
                                       └─────────────────┘
```

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts.
- **Backend API**: FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM.
- **Computer Vision**: PyTorch, Ultralytics YOLOv8s @ 320×320.
- **Database**: PostgreSQL 16 (19 relational tables).
- **Authentication & Security**: Bearer JWT Tokens (HS256), Passlib / Bcrypt password hashing, RBAC router guards.

---

## 2. Prerequisites & Environment Setup

- **Python**: 3.10+ (Tested on Python 3.13)
- **Node.js**: 18.0+ & npm
- **Database**: PostgreSQL 16+ running locally on port 5432
- **Hardware**: CPU / Optional CUDA-capable GPU

---

## 3. Backend Setup

1. **Navigate to Backend Directory**:
   ```bash
   cd backend
   ```

2. **Create & Activate Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/visioninspect_db` and configure a secure `SECRET_KEY`.

5. **PostgreSQL Database Migration**:
   Run the migration script to initialize database tables, roles, and initial system data:
   ```bash
   python migrate_to_postgres.py
   ```

6. **Start FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend interactive Swagger documentation will be accessible at `http://localhost:8000/docs`.

---

## 4. Frontend Setup

1. **Navigate to Frontend Directory**:
   ```bash
   cd frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The web application will be accessible at `http://localhost:5173`.

---

## 5. Production Model Configuration & Metrics

- **Production Model Checkpoint**: [`runs/detect/yolo_phase4_4_architecture/weights/best.pt`](file:///c:/Users/admin/OneDrive/Desktop/VisionInspectAI-2/runs/detect/yolo_phase4_4_architecture/weights/best.pt)
- **Architecture**: YOLOv8s (11.16M Parameters)
- **Input Resolution**: 320×320
- **Class Count**: 73 Industrial Defect Classes (0 to 72)
- **Inference Confidence Threshold**: 0.25

### Official Validated Performance Benchmarks

| Metric | Validated Score | Benchmark Labeling Standard |
| :--- | :---: | :--- |
| **Precision** | `44.40%` | Official Precision Benchmark |
| **Recall** | `47.63%` | Official Recall Benchmark |
| **mAP@0.5** | `45.07%` | **mAP@0.5** (Strictly labelled in all UI pages) |
| **mAP@0.5:0.95** | `23.76%` | Official COCO mAP Benchmark |
| **F1-Score** | `45.97%` | Harmonic Mean Benchmark |

---

## 6. End-to-End AI Inspection Pipeline

```text
Image File Upload
  ↓
FastAPI Endpoint (/api/v1/quality/analyze)
  ↓
YOLOv8s Inference (320×320, conf=0.25)
  ↓
Bounding Box & Defect Extraction
  ↓
Severity Engine Scoring (severity_engine.py)
  ↓
Status Evaluation (PASS / FAIL / MANUAL_REVIEW)
  ↓
PostgreSQL Relational Persistence
  ↓
React Frontend Operational Dashboards
```

---

## 7. Main API Endpoint Groups

- `/api/v1/auth`: Login authentication, JWT token refresh, user profile, logout.
- `/api/v1/quality`: Real-time inspection uploads, detail views, inspection history, PDF/TXT quality reports.
- `/api/v1/supervisor`: Line telemetry, defect trends, quality analytics, production line monitoring.
- `/api/v1/admin`: User management (CRUD), dataset registry, AI model registry, activity logs, system health.

---

## 8. Dataset Information

The system is trained on an expanded MVTec-derived industrial anomaly dataset:
- **Scope**: 15 product categories (Bottle, Cable, Capsule, Carpet, Grid, Hazelnut, Leather, Metal Nut, Pill, Screw, Tile, Toothbrush, Transistor, Wood, Zipper).
- **Volume**: 5,354 total images (Train: 3,747, Val: 726, Test: 881).
- **Format**: YOLO Normalized Bounding Boxes.
- *Note*: Large raw dataset files (~9.8 GB) are excluded from Git repository history. The automated conversion utility is available at `backend/scratch/convert_mvtec_to_yolo.py`.

---

## 9. Role-Based Access Control & Test Accounts

The platform supports 3 distinct operational roles:

1. **Quality Engineer**: Operational inspection uploads, detail views, defect details, report exports.
2. **Factory Supervisor**: Production line monitoring, defect trend analysis, quality reports, factory KPIs.
3. **System Admin**: User lifecycle management, dataset registry, model deployment controls, audit logs, system health.

*Test Credentials Note*: Use your locally configured user accounts created during initial setup (`python migrate_to_postgres.py`).

---

## 10. Historical ML Experiments

Historical evaluation artifacts and experimental model runs are preserved in `runs/detect/` for audit purposes:
- `yolo_baseline_evaluation/` (Baseline evaluation)
- `yolo_phase4_1_640/` (640×640 resolution experiment)
- `yolo_phase4_3_augmentation/` (Augmentation study)
- `yolo_phase5_640/` (Final resolution study)
