<div align="center">

# 🏭 VisionInspect AI
**End-to-End Manufacturing Defect Detection & Quality Inspection Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker)](https://www.docker.com/)

VisionInspect AI is an enterprise-grade, full-stack application designed to revolutionize manufacturing quality control. By seamlessly integrating state-of-the-art AI computer vision (YOLOv8) with a highly scalable backend and an intuitive modern frontend, this platform automates and enhances the detection of production line defects in real-time.

[Features](#-key-features) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [ML Pipeline](#-machine-learning-pipeline) • [API Docs](#-api-documentation)

</div>

---

## 🌟 Key Features

* 🔐 **Role-Based Access Control (RBAC):** Secure JWT-based authentication supporting multiple roles (ADMIN, QUALITY_ENGINEER, SUPERVISOR, OPERATOR).
* 📊 **Real-time Analytics Dashboard:** Comprehensive manufacturing KPIs, defect trend analysis (bar charts), and severity distributions (pie charts).
* 📸 **Advanced Inspection Workflow:**
  * Drag-and-drop image uploading for quick inspections.
  * Live camera capture simulation directly from the browser.
  * Interactive image viewer rendering precise AI-generated bounding boxes around defects.
* 🧠 **Quality Decision Engine:**
  * Automatically flags anomalies and calculates a robust composite severity score.
  * Generates intelligent, automated Quality Control decisions (Pass, Rework, Reject).
  * Human-in-the-loop (HITL) capability allows authorized engineers to override AI decisions with full audit logging.
* 📈 **Reporting:** Extensible analytics for production line performance and automated PDF report generation.
* 🤖 **Dynamic Model Management:** Hot-swappable ML models. Administrators can activate different trained weights on the fly, with built-in fallbacks.

## 🏗 System Architecture

The application is built using a modern, decoupled microservices architecture:

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
* **Backend:** FastAPI (Python), SQLAlchemy ORM, Pydantic, Passlib (Bcrypt).
* **Database:** PostgreSQL (Containerized).
* **Computer Vision / ML:** PyTorch, Ultralytics YOLOv8, OpenCV, Scikit-learn.
* **Infrastructure:** Fully containerized using Docker and Docker Compose.

## 📁 Directory Structure

```text
visioninspect-ai/
├── backend/                # FastAPI Application
│   ├── app/                # API routes, models, schemas, services
│   ├── migrations/         # Alembic database migrations
│   ├── tests/              # Pytest test suites
│   ├── uploads/            # Temporary storage for inspected images
│   ├── requirements.txt    # Python dependencies
│   └── init_db.py          # Database seeding script
├── frontend/               # Next.js Application
│   ├── app/                # Next.js App Router pages
│   ├── components/         # Reusable React UI components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Axios API client services
│   ├── types/              # TypeScript interfaces
│   └── package.json        # Node.js dependencies
├── ml/                     # Machine Learning Pipeline
│   ├── train.py            # YOLOv8 training script
│   └── eval.py             # Model evaluation script
├── datasets/               # Training/Validation image datasets
├── runs/                   # ML training logs and artifacts
├── storage/                # Persistent volume storage
├── docker-compose.yml      # Multi-container orchestration
└── README.md               # This documentation
```

## 🚀 Getting Started

### Prerequisites
* Docker & Docker Compose (Recommended)
* Python 3.10+ (For manual backend setup)
* Node.js 18+ & npm (For manual frontend setup)
* Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/visioninspect-ai.git
cd visioninspect-ai
```

### 2. Environment Variables
Copy the example environment file and configure it as needed:
```bash
cp .env.example .env
```
*(Ensure you set secure values for `JWT_SECRET`, database credentials, etc.)*

### 3. Docker Deployment (Recommended)
The easiest way to run the entire stack is via Docker Compose:
```bash
docker compose up --build
```
Once the containers are running, you can access:
* **Frontend UI:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:8000](http://localhost:8000)
* **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Manual Setup (For Development)

If you prefer to run the services locally without Docker:

#### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python init_db.py # Initialize the database tables
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🧠 Machine Learning Pipeline

The ML component handles the training and evaluation of the YOLOv8 defect detection models.

1. **Prepare Data:** Place your annotated manufacturing images in `datasets/train` and `datasets/val`.
2. **Train Model:**
   ```bash
   cd ml
   python train.py --data config.yaml --epochs 50 --batch 16
   ```
3. **Evaluate Model:**
   ```bash
   python eval.py --weights runs/detect/train/weights/best.pt
   ```
The best-performing weights (`*.pt`) can then be dynamically loaded via the Admin dashboard or placed in the root directory (e.g., `yolov8n.pt`).

## 📚 API Documentation

FastAPI automatically generates interactive Swagger/OpenAPI documentation. 
When the backend is running, navigate to `http://localhost:8000/docs` to:
* Explore all available REST endpoints.
* View request/response schemas.
* Authenticate and test API calls directly from the browser.

## 🛠 Troubleshooting

* **Database Connection Refused (Docker):** Ensure your backend `.env` file uses the Docker service name for the host (e.g., `postgresql://user:password@db:5432/visioninspect`).
* **Passlib/Bcrypt ValueError:** If you encounter `ValueError: password cannot be longer than 72 bytes`, ensure your backend requirements enforce `bcrypt==3.2.0`, as newer versions conflict with Passlib.
* **Port Conflicts:** Ensure ports `3000` (Next.js), `8000` (FastAPI), and `5432` (PostgreSQL) are free on your host machine before starting Docker Compose.

## 🤝 Contributing

We welcome contributions to VisionInspect AI!
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

