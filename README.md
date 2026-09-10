# VisionInspect AI

**AI-Powered Manufacturing Quality Inspection & Defect Detection**

VisionInspect AI is an end-to-end computer-vision platform for manufacturing quality inspection. It combines **React, FastAPI, MongoDB, OpenCV, and a custom-trained YOLO model** to detect visual defects, estimate severity, generate PASS/FAIL decisions, and maintain inspection records.

The system is designed as an **internship/research prototype demonstrating the integration of computer vision, machine learning, backend APIs, databases, and cloud deployment into an industrial workflow.**

## Project Status

**Status:** Internship-ready prototype
**Deployment:** Docker + Render Cloud
**Model:** Custom-trained YOLO
**Database:** MongoDB

## Key Features

* Role-based authentication and authorization
* Quality Engineer inspection workflow
* Factory Supervisor analytics dashboard
* Admin user and role management
* Product management
* Real image upload and processing
* OpenCV image preprocessing
* Custom YOLO defect detection
* Bounding-box visualization
* Confidence scoring
* Multi-factor severity calculation
* PASS/FAIL decision
* MongoDB inspection persistence
* Inspection history and reports
* CSV export
* Production-line analytics
* REST API integration
* Dockerized deployment
* Cloud deployment using Render

## System Workflow

```text
Image Upload
     ↓
OpenCV Preprocessing
     ↓
YOLO Defect Detection
     ↓
Bounding Boxes + Confidence
     ↓
Severity Calculation
     ↓
PASS / FAIL Decision
     ↓
MongoDB Persistence
     ↓
Reports & Analytics
```

## Architecture

```text
┌──────────────────────────────┐
│       React Frontend         │
│ Engineer │ Supervisor │ Admin│
└──────────────┬───────────────┘
               │ REST API + JWT
               ↓
┌──────────────────────────────┐
│       FastAPI Backend        │
│ Auth │ Products │ Inspection │
│ Analytics │ Reports │ Users  │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌──────────────┐  ┌──────────────┐
│ OpenCV + YOLO│  │   MongoDB    │
│  Detection   │  │ Application  │
│  Processing  │  │    Data      │
└──────────────┘  └──────────────┘
```

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Python
* FastAPI
* Pydantic
* JWT Authentication
* Motor / MongoDB

### Computer Vision

* OpenCV
* Ultralytics YOLO
* Custom-trained defect detection model

### Database

* MongoDB

### Dataset

* MVTec AD
* Derived YOLO training/validation dataset

### Deployment

* Docker
* Render Cloud

## Machine Learning

The project uses a custom-trained YOLO model for visual defect detection.

Model weights:

```text
runs/detect/unified_20ep/weights/best.pt
```

The inspection pipeline returns:

* Defect class
* Bounding box
* Confidence
* Severity
* PASS/FAIL decision

### Severity Scoring

```text
Severity =
    Size       × 30%
  + Location   × 25%
  + DefectType × 25%
  + Confidence × 20%
```

|  Score | Severity |
| -----: | -------- |
|   0–39 | Low      |
|  40–59 | Medium   |
|  60–79 | High     |
| 80–100 | Critical |

> **Model limitation:** The current prototype model has a recorded mAP50 of approximately **5.4%**. It is intended for research and internship demonstration and should not be considered a production-certified industrial inspection model.

## Cloud Deployment

VisionInspect AI is containerized using Docker and deployed as a Render Web Service.

```text
GitHub
   ↓
Docker Build
   ↓
Render Cloud
   ↓
VisionInspect AI
```

**Live Application:**
https://manufacturing-defect-detection-quality-m2xo.onrender.com

## Local Setup

### Requirements

* Python 3.10+
* Node.js 18+
* npm
* MongoDB
* Git

### Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd visioninspect-ai
```

### Backend

```bash
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start FastAPI:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

## Environment Variables

Create a local `.env` file.

```env
MONGODB_URL=<your-mongodb-url>
DATABASE_NAME=visioninspect
JWT_SECRET=<your-secret>
VITE_API_BASE=http://localhost:8000/api
```

**Never commit `.env`, credentials, API keys, passwords, or JWT secrets to GitHub.**

## Project Structure

```text
visioninspect-ai/
├── backend/
├── src/
├── training/
├── ai_model/
├── database/
├── runs/
├── dataset_requirements/
├── Dockerfile
├── package.json
├── requirements.txt
└── README.md
```

## User Roles

| Role               | Responsibility                           |
| ------------------ | ---------------------------------------- |
| Quality Engineer   | Perform and review inspections           |
| Factory Supervisor | Monitor quality and production analytics |
| Administrator      | Manage users and system configuration    |

## API Modules

```text
/api/auth
/api/products
/api/inspections
/api/run-inspection
/api/analytics
/api/users
```

Protected endpoints use JWT-based authentication and role-based authorization.

## Security

The application implements:

* JWT authentication
* Password hashing
* Role-based access control
* Protected API routes
* Environment-based secrets
* API validation

Production deployment should additionally consider rate limiting, strict CORS policies, request-size limits, centralized logging, token revocation, and hardened database security.

## Limitations

* Current YOLO model has limited detection performance.
* Current mAP50 is approximately 5.4%.
* Dataset preparation uses a derived YOLO split and is not a strict MVTec benchmark protocol.
* Single trained model is currently integrated.
* The system is a prototype and not an industrial certification system.
* Production-grade security and monitoring require further implementation.

## Future Improvements

* Improve dataset preparation and model training
* Increase detection performance
* Per-category evaluation
* Model versioning
* Experiment tracking
* Automated CI/CD
* Kubernetes deployment
* Advanced monitoring and logging
* Production-grade security
* Automated end-to-end testing


## Author

**VisionInspect AI**
Computer Science & Engineering Project
Internship / Research Prototype
