# VisionInspect AI — Developer & Contributor Guide

## 1. Local Development Setup

### 1.1 Prerequisites
- **Python 3.10+** (Python 3.11/3.14 tested)
- **Node.js 18+** or **Node.js 20 LTS**
- **Git**
- **CUDA Toolkit** (Optional, for NVIDIA GPU acceleration)

---

## 2. Backend Development Setup

```bash
# 1. Navigate to repository root
cd VIsionAi

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Start the development server
cd backend
uvicorn app.main:app --reload --port 8000
```

The API documentation will be available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

---

## 3. Frontend Development Setup

```bash
# In a separate terminal:
cd VIsionAi/frontend

# Install dependencies
npm install

# Start development server
npm run dev -- -p 3000
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Running the Test Suite

```bash
# From the repository root with active virtual environment:
pytest backend/tests -v
```

All 25 automated tests cover:
- Healthcheck & Authentication
- Severity score mathematical correctness
- YOLO defect detection & Non-Maximum Suppression
- Class mapping resolution across 73 MVTec defect classes
- Strict 4-State Quality Decision logic (`PASS`, `FAIL`, `REVIEW`, `REWORK`)
- Manual override API validation and RBAC enforcement
- Analytics aggregations and trend calculation
- Itemized CSV inspection report generation

---

## 5. Running Model Validation & Performance Benchmarks

```bash
python ml/validate_model_metrics.py
```

This benchmark executes the inference pipeline against real MVTec dataset samples and outputs precision, recall, $F_1$-score, false alarm rate, and response latencies without metric fabrication.
