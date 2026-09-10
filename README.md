# 🔬 VisionInspect AI

<div align="center">

**AI-Powered Manufacturing Quality Inspection Platform**

Evidence-led defect detection powered by a Dual-Model Inference Pipeline (ResNet-18 + UNet + YOLOv8)

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-15.206.204.165-4F46E5?style=for-the-badge)](http://15.206.204.165/)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

</div>

---

## 🌐 Live Demo

**👉 [http://15.206.204.165/](http://15.206.204.165/)**

> Access the fully deployed, production-ready VisionInspect AI platform — no setup required.  
> Upload product images and see real-time AI defect detection with annotated Grad-CAM heatmaps, UNet segmentation overlays, and YOLOv8 bounding boxes.

---

## 📖 Overview

**VisionInspect AI** is a full-stack, production-grade manufacturing quality inspection system that replaces manual visual QA with a real-time, AI-driven pipeline. It detects, classifies, and localises surface defects across **48 defect categories** using a three-stage dual-model inference engine.

The platform serves two distinct roles:
- **Quality Engineers** — submit inspection batches, review AI-flagged findings, and manage defect evidence.
- **Factory Supervisors** — monitor live production lines, track KPIs, generate PDF reports, and manage announcements.

### ✨ Key Highlights

| Feature | Details |
|---|---|
| 🧠 Dual-Model AI | ResNet-18 classifier + UNet segmenter + YOLOv8 detector |
| 🎯 48 Defect Classes | From `broken_large` (severity 95) to `thread_side` (severity 30) |
| 🔥 Grad-CAM Heatmaps | Visual explainability overlaid on original images |
| 🟥 Segmentation Masks | Pixel-level defect area maps via UNet |
| 📦 Batch Inspection | Upload multiple images, get per-product findings instantly |
| 📊 Role-Based Dashboards | Separate views for QE and Supervisor roles |
| 📄 PDF Report Export | One-click report generation with jsPDF |
| 🔔 Announcements | Real-time factory-floor alerts and notifications |
| 🌙 Dark / Light Mode | Full theme support via `next-themes` |
| 🔐 JWT Auth | Secure credential authentication with `jose` |

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       VisionInspect AI                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │   Frontend   │    │  Node.js BFF │    │  Python AI Engine │  │
│  │  React + TS  │◄──►│  Express +   │◄──►│  FastAPI + PyTorch│  │
│  │  Vite + tRPC │    │  tRPC + JWT  │    │  + Ultralytics    │  │
│  └──────────────┘    └──────┬───────┘    └────────┬──────────┘  │
│                             │                     │             │
│                    ┌────────▼────────┐   ┌────────▼──────────┐  │
│                    │    MongoDB      │   │   Model Weights    │  │
│                    │  (Atlas / Self) │   │  best_model.pth   │  │
│                    └─────────────────┘   │  best_seg_model   │  │
│                                          │  best.pt (YOLO)   │  │
│                                          └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Inference Pipeline

The core of VisionInspect AI is a **three-stage dual-model consensus pipeline** that eliminates false positives while catching subtle defects.

```
                      ┌─────────────────────┐
                      │    Input Image       │
                      └──────────┬──────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │      Preprocessing         │
                   │  BGR→RGB → 224×224 resize  │
                   │  GaussianBlur(3×3) → LAB   │
                   │  CLAHE enhancement          │
                   │  ImageNet Normalization     │
                   └──────┬───────────┬─────────┘
                          │           │
          ┌───────────────▼──┐     ┌──▼───────────────┐
          │  Stage 1: CNN    │     │  Stage 2: UNet    │
          │  ResNet-18       │     │  Segmentation     │
          │  Classifier      │     │  Mask Generator   │
          │                  │     │                   │
          │ Defect Prob.     │     │ Binary mask        │
          │ Threshold = 0.55 │     │ Noise floor ≥12px │
          │ Grad-CAM Heatmap │     │ Defect area %      │
          └────────┬─────────┘     └──────┬────────────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Stage 3: YOLOv8   │
                   │   Multi-Defect      │
                   │   Detection         │
                   │                     │
                   │  Type-adaptive      │
                   │  conf thresh        │
                   │  (0.18 – 0.30)      │
                   │  Box filter ≥8×8px  │
                   │  IoU/IoMin NMS      │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Consensus Gating   │
                   │                     │
                   │  YOLO conf ≥ 0.50   │
                   │       OR            │
                   │  CNN prob  ≥ 0.45   │
                   │       OR            │
                   │  UNet ≥ 12 px       │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Severity Scoring   │
                   │                     │
                   │  Score =            │
                   │   Size  × 0.30      │
                   │ + Loc   × 0.25      │
                   │ + Type  × 0.25      │
                   │ + Conf  × 0.20      │
                   │                     │
                   │  ≥ 80 → Critical    │
                   │  ≥ 60 → High        │
                   │  ≥ 40 → Medium      │
                   │  < 40 → Low         │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Quality Decision   │
                   │                     │
                   │  Critical / High    │
                   │   → Hold for review │
                   │  Medium             │
                   │   → Review queued   │
                   │  Low / Clean        │
                   │   → Pass            │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Output Artifacts   │
                   │  - Grad-CAM PNG     │
                   │  - Seg Mask PNG     │
                   │  - BBox Annot. PNG  │
                   │  - Defect JSON      │
                   └─────────────────────┘
```

### Defect Severity Lookup (Top Classes)

| Severity Score | Defect Types |
|---|---|
| **95** | `broken_large`, `broken`, `damaged_case`, `missing_cable`, `missing_wire` |
| **90** | `hole`, `broken_small`, `broken_teeth`, `crack`, `defective` |
| **85** | `cut`, `cut_lead`, `metal_contamination`, `cable_swap`, `split_teeth` |
| **80** | `contamination`, `liquid`, `oil`, `poke`, `poke_insulation` |
| **70–75** | `deformed`, `squeeze`, `bent`, `misplaced`, `manipulated_front` |
| **50–65** | `glue`, `flip`, `print`, `faulty_imprint`, `fold`, `rough` |
| **30–40** | `scratch`, `color`, `thread`, `thread_side`, `thread_top` |

---

## 📁 Project Structure

```
visioninspect-ai/
│
├── README.md
├── package.json                         # Root pnpm workspace config
├── tsconfig.json
├── .prettierrc
├── .gitignore
├── anamoly-detection-model-v2.ipynb     # Model training notebook
│
├── frontend/                            # React 19 + Vite + TypeScript SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── App.tsx                      # Root app with routing
│       ├── main.tsx                     # Entry point
│       ├── const.ts                     # Global constants & API URLs
│       ├── index.css                    # Global styles (Tailwind v4)
│       ├── dark-theme.css               # Dark mode overrides
│       ├── pages/
│       │   ├── Landing.jsx              # Marketing landing page
│       │   ├── Login.jsx                # JWT auth login page
│       │   ├── Workspace.jsx            # Role-based workspace router
│       │   └── NotFound.tsx             # 404 page
│       ├── components/
│       │   ├── FactorySupervisorDashboard.jsx   # Supervisor dashboard
│       │   ├── QualityEngineerDashboard.jsx     # QE dashboard
│       │   ├── DefectDetailsWorkspace.jsx       # Per-batch defect detail
│       │   ├── SettingsModal.jsx                # App settings panel
│       │   ├── BrandMark.jsx                    # Logo component
│       │   └── ui/                              # Radix UI base components
│       ├── contexts/                    # React context providers
│       ├── lib/                         # tRPC client setup
│       └── utils/                       # Shared utility functions
│
├── backend/                             # Node.js BFF (Backend for Frontend)
│   ├── package.json
│   ├── tsconfig.json
│   └── server/
│       ├── _core/                       # Express server core & tRPC setup
│       ├── models/                      # TypeScript data models
│       ├── routers.ts                   # tRPC router definitions
│       ├── credentialAuth.ts            # JWT auth middleware
│       └── db.ts                        # MongoDB connection (mongoose)
│
├── backend_python/                      # Python AI Inference Engine (FastAPI)
│   ├── requirements.txt
│   └── app/
│       ├── main.py                      # FastAPI app, CORS, lifespan, routes
│       ├── config.py                    # Env vars & path configuration
│       ├── db.py                        # Motor async MongoDB client
│       ├── seed.py                      # Database seeding script
│       ├── models/                      # Pydantic data models
│       ├── routers/
│       │   ├── batches.py               # POST /api/batches/create, GET, DELETE
│       │   ├── reviews.py               # Review queue management
│       │   ├── reports.py               # Inspection report endpoints
│       │   └── announcements.py         # Factory announcements API
│       ├── services/
│       │   ├── inference_service.py     # Core dual-model inference pipeline
│       │   ├── model_loader.py          # Model singleton (ResNet/UNet/YOLO)
│       │   └── batch_service.py         # Batch creation & image processing
│       ├── weights/                     # Model weight files (not committed)
│       │   ├── best_model.pth           # ResNet-18 classifier weights
│       │   ├── best_seg_model.pth       # UNet segmenter weights
│       │   └── best.pt                  # YOLOv8 detector weights
│       └── static/uploads/              # Generated inference image artifacts
│
└── shared/                              # Shared types between frontend & backend
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | Frontend & BFF backend |
| **pnpm** | ≥ 8.x | Monorepo package manager |
| **Python** | ≥ 3.10 | AI inference engine |
| **pip** | latest | Python dependencies |
| **MongoDB** | Atlas or local | Database |

---

### 1. Clone the Repository

**HTTPS:**
```bash
git clone https://github.com/<your-username>/visioninspect-ai.git
cd visioninspect-ai
```

**SSH:**
```bash
git clone git@github.com:<your-username>/visioninspect-ai.git
cd visioninspect-ai
```

**GitHub CLI:**
```bash
gh repo clone <your-username>/visioninspect-ai
cd visioninspect-ai
```

---

### 2. Install Node.js Dependencies

```bash
# Install all workspace packages (frontend + backend BFF) from root
pnpm install

# Or install each manually:
cd frontend && npm install
cd ../backend && npm install
```

---

### 3. Configure Environment Variables

#### Node.js BFF — `backend/.env`

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/visioninspect

# JWT secret for token signing (use a long random string in production)
JWT_SECRET=your_super_secret_key_here

# Python AI engine base URL
PYTHON_API_URL=http://localhost:8000
```

#### Python Engine — `backend_python/.env`

```env
# Server bind config
HOST=0.0.0.0
PORT=8000

# Async MongoDB (Motor driver)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/visioninspect

# Upload directory for inference artifact images
UPLOAD_DIR=./app/static/uploads
```

---

### 4. Set Up Python AI Engine

```bash
cd backend_python

# Create a virtual environment
python -m venv venv

# Activate it:
# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt
```

#### Place Model Weights

Download or train your models and copy the weight files into:

```
backend_python/app/weights/
├── best_model.pth       ← ResNet-18 binary classifier
├── best_seg_model.pth   ← UNet segmentation model
└── best.pt              ← YOLOv8 multi-class detector
```

> **Note:** See `anamoly-detection-model-v2.ipynb` for the full training pipeline.  
> The server will still start without weights using default architectures (outputs will be uncalibrated).

---

### 5. Run All Services

Open **three terminal windows** and run each service in parallel:

#### Terminal 1 — Python AI Engine (FastAPI)

```bash
cd backend_python

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> Interactive API docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

#### Terminal 2 — Node.js BFF Server

```bash
cd backend
npm run dev
```

> BFF server starts on port `3000` by default.

---

#### Terminal 3 — React Frontend (Vite)

```bash
cd frontend
npm run dev
```

> Frontend available at: **[http://localhost:5173](http://localhost:5173)**

---

### 6. (Optional) Seed the Database

```bash
cd backend_python
source venv/bin/activate   # or venv\Scripts\activate
python -m app.seed
```

---

### 🐳 Docker (Coming Soon)

A Docker Compose setup will be provided to spin up all services with a single command:

```bash
# Planned:
docker compose up --build
```

---

## 🖥️ Usage Guide

1. **Open** the app at [http://localhost:5173](http://localhost:5173) or the [live demo](http://15.206.204.165/)
2. **Log in** with your Quality Engineer or Factory Supervisor credentials
3. **Upload** product images via the Inspection Dashboard
4. **View** real-time AI results:
   - 🔥 Grad-CAM heatmap highlighting areas of concern
   - 🟥 UNet segmentation mask showing defect pixel regions
   - 📦 YOLOv8 annotated image with bounding boxes and class labels
   - 📊 Severity score, defect type, and quality decision
5. **Review** flagged items in the Review Queue
6. **Export** PDF inspection reports from the Supervisor Dashboard
7. **Manage** factory announcements and production line KPIs

---

## 🔌 API Reference

### Python FastAPI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service health check |
| `POST` | `/api/batches/create` | Upload images → run inference → create batch |
| `GET` | `/api/batches` | List all inspection batches |
| `GET` | `/api/batches/{batch_id}` | Get batch details (products + findings) |
| `GET` | `/api/batches/history/list` | Formatted inspection history |
| `DELETE` | `/api/batches/{batch_id}` | Delete batch and all related documents |
| `GET` | `/api/reviews` | Review queue |
| `GET` | `/api/reports` | Inspection reports |
| `GET/POST` | `/api/announcements` | Factory announcements |

> Full interactive Swagger docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool & dev server |
| Tailwind CSS | 4 | Utility-first styling |
| tRPC | 11 | Type-safe API client |
| TanStack Query | 5 | Data fetching & caching |
| Wouter | 3 | Client-side routing |
| Radix UI | latest | Accessible headless components |
| Lucide React | 0.453 | Icon library |
| jsPDF | 4 | PDF report generation |
| Sonner | 2 | Toast notifications |
| next-themes | 0.4 | Dark / light mode |

### Node.js BFF

| Technology | Version | Purpose |
|---|---|---|
| Express | 4 | HTTP server |
| tRPC | 11 | Type-safe API layer |
| Mongoose | 9 | MongoDB ODM |
| Jose | 6 | JWT authentication |
| Zod | 4 | Schema validation |
| TypeScript | 5.9 | Type safety |

### Python AI Engine

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.110+ | Async REST API framework |
| PyTorch | 2.0+ | Neural network inference |
| torchvision | 0.15+ | ResNet-18 architecture |
| Ultralytics | 8.0+ | YOLOv8 inference |
| OpenCV | 4.8+ | Image preprocessing & annotation |
| Motor | 3.3+ | Async MongoDB driver |
| Uvicorn | 0.28+ | ASGI server |
| NumPy | 1.24+ | Numerical operations |
| Pillow | 10+ | Image I/O |

---

## 📊 AI Model Details

### ResNet-18 Classifier

- **Architecture:** ResNet-18 with custom 2-class fully-connected head (`clean` / `defective`)
- **Input:** 224×224 RGB tensor normalised with ImageNet mean/std
- **Detection threshold:** 0.55 defect probability
- **Explainability:** Grad-CAM heatmap on `layer4[-1]` → JET colormap overlay

### UNet Segmenter

- **Architecture:** Custom UNet — `3→32→64→128→256` encoder with symmetric decoder and skip connections
- **Input:** 224×224 float tensor
- **Output:** Sigmoid probability map, binarised at `0.45`
- **Noise floor:** Fewer than 12 defect pixels → classified as clean

### YOLOv8 Detector

- **Framework:** Ultralytics YOLOv8
- **Classes:** 48 manufacturing defect categories
- **Adaptive confidence thresholds:**
  - Structural micro-defects (`crack`, `hole`, `cut`): **0.18**
  - Cosmetic / texture defects (`fabric`, `thread`, `glue`): **0.30**
  - Default: **0.22**
- **NMS:** `iou=0.35`, `agnostic_nms=True` + custom box-merge (IoU≥0.25 or IoMin≥0.55)

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a branch:** `git checkout -b feature/your-feature-name`
3. **Commit changes:** `git commit -m "feat: add your feature"`
4. **Push:** `git push origin feature/your-feature-name`
5. **Open a Pull Request**

Please follow conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, etc.).

---

## 📄 License

This project is licensed under the terms of the [LICENSE](./LICENSE) file included in this repository.

---

## 🙏 Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — Object detection framework
- [PyTorch](https://pytorch.org/) — Deep learning engine
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python async web framework
- [MVTec AD Dataset](https://www.mvtec.com/company/research/datasets/mvtec-ad) — Anomaly detection benchmark (training inspiration)
- [tRPC](https://trpc.io/) — End-to-end typesafe APIs

---

<div align="center">

**Built with ❤️ for smarter manufacturing quality control**

[🌐 Live Demo](http://15.206.204.165/) &nbsp;·&nbsp; [📖 API Docs](http://15.206.204.165/docs) &nbsp;·&nbsp; [🐛 Report Bug](https://github.com/<your-username>/visioninspect-ai/issues)

</div>
