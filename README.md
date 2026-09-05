VisionInspect AI

AI-powered manufacturing quality inspection and defect detection platform built with React, FastAPI, MongoDB, OpenCV, and a custom-trained YOLO model.

VisionInspect AI is an end-to-end computer-vision application designed to support industrial quality inspection workflows. It allows a Quality Engineer to upload a real inspection image, preprocess it, run a locally trained YOLO detector, visualize detected defects, calculate severity, and record the inspection in MongoDB.

Factory Supervisors can monitor production-quality analytics, while Administrators can manage users, roles, and system configuration.

Project Status

Current stage: Internship-ready prototype / Milestone 3 application

What is implemented

Role-based authentication and dashboards

Quality Engineer inspection workflow

Factory Supervisor analytics dashboard

Admin user and role management

Product CRUD management

Real image upload and processing

OpenCV preprocessing controls

Local YOLO inference

Bounding-box defect visualization

Severity scoring and PASS/FAIL decision

MongoDB persistence

Inspection history and reports

CSV export

Production-line analytics

API-level validation and integration testing

Important: The current trained YOLO model is a working research/prototype model, not a production-accuracy model. The latest recorded mAP50 is approximately 5.4%, so this project does not claim 100% accuracy.

Why This Project?

Traditional visual inspection can be repetitive, time-consuming, and difficult to scale consistently.

VisionInspect AI demonstrates how computer vision can be integrated into a complete manufacturing workflow:

Image Acquisition
       ↓
Image Preprocessing
       ↓
YOLO Defect Detection
       ↓
Bounding Box + Confidence
       ↓
Severity Calculation
       ↓
PASS / FAIL Decision
       ↓
MongoDB Persistence
       ↓
Reports + Analytics

The project focuses not only on the machine-learning model, but also on the engineering required to turn an ML inference pipeline into a usable application.

Key Features

1. Quality Engineer Dashboard

The Quality Engineer can:

Select a product

Upload a real inspection image

Apply preprocessing options

Run AI inspection

View detected defects and bounding boxes

View confidence values

View severity classification

See PASS/FAIL output

Review previous inspections

Generate/view inspection reports

2. Image Preprocessing

The inspection pipeline supports configurable OpenCV preprocessing operations including:

Noise removal

CLAHE contrast enhancement

Edge detection

ROI cropping

Image normalization

Preprocessing can be enabled according to the inspection workflow.

3. YOLO Defect Detection

The backend loads locally trained YOLO weights and performs actual inference.

Current prototype model:

runs/detect/unified_20ep/weights/best.pt

The application does not use the previous random/simulation defect engine for AI inspection results.

Detection output includes:

Class

Bounding box

Confidence

Defect information

Severity

PASS/FAIL decision

4. Severity Scoring

The application uses a transparent multi-factor severity framework:

Severity Score =
    Size       × 30%
  + Location   × 25%
  + DefectType × 25%
  + Confidence × 20%

Severity levels:

Score

Severity

Interpretation

0–39

Low

Minor quality concern

40–59

Medium

Moderate quality concern

60–79

High

Significant quality issue

80–100

Critical

Major quality issue

The current PASS/FAIL threshold is based on the configured severity threshold.

5. Factory Supervisor Dashboard

The Supervisor dashboard provides:

Total inspections

Pass/fail KPIs

Yield-rate monitoring

Defect distribution

Hourly inspection trends

Factory-line metrics

Inspection audit history

Production monitoring

Analytics are calculated from MongoDB inspection records rather than hardcoded percentages.

6. Admin Dashboard

Administrators can:

View registered users

Edit user roles

Assign factory lines

Manage users

View current model configuration

Access system-level controls

The model configuration is intentionally read-only because the deployed application currently uses one fixed trained model.

7. MongoDB Persistence

The application stores real application data in MongoDB, including:

Users

Products

Inspections

Defects

Uploaded image references

Model predictions

Reports

Analytics

Database indexes are used for commonly queried fields such as IDs, email, factory line, and timestamps.

Machine Learning

Dataset

The project uses the MVTec AD (Anomaly Detection) dataset.

MVTec AD is primarily an anomaly-detection dataset. Its original training partition contains normal images, while defect annotations are provided for test images.

For this supervised YOLO prototype, a derived YOLO dataset is prepared from the available annotated defect images.

Important Dataset Limitation

The current preparation script creates a derived training/validation split from defect images.

This is suitable for an internal prototype demonstration, but it should not be presented as a strict benchmark evaluation of MVTec AD.

For a rigorous research benchmark, the original dataset protocol and a carefully designed evaluation methodology should be preserved.

Training

The training pipeline starts from the YOLO architecture configuration with random weights rather than loading a pretrained .pt checkpoint.

Prepare the derived YOLO dataset:

.\.venv311\Scripts\python.exe training\prepare_yolo.py

Train the unified model:

.\.venv311\Scripts\python.exe training\train_yolo.py

Training on CPU can take many hours. A CUDA-enabled GPU is strongly recommended.

Training artifacts include:

results.csv
best.pt
confusion_matrix.png
PR_curve.png

After a completed training run, the backend model path should be updated to the corresponding trained weights.

Model Evaluation

The current prototype should be evaluated using actual MVTec images rather than staged or invented application results.

Example test command:

.\.venv311\Scripts\python.exe training\all_categories_demo.py

Do not claim 100% accuracy. The current recorded mAP50 is approximately 5.4%, and individual test images can produce missed detections.

Technology Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

Role-based UI

REST API integration

Backend

Python

FastAPI

Pydantic

JWT authentication

Motor / MongoDB

OpenCV

Ultralytics YOLO

Database

MongoDB

Machine Learning

YOLO object detection

OpenCV preprocessing

MVTec AD dataset

Custom-trained model weights

System Architecture

┌─────────────────────────────────────────────┐
│                 React Frontend              │
│                                             │
│  Quality Engineer │ Supervisor │ Admin      │
└───────────────────────┬─────────────────────┘
                        │ REST API + JWT
                        ▼
┌─────────────────────────────────────────────┐
│                 FastAPI Backend             │
│                                             │
│ Authentication │ Products │ Inspections     │
│ Analytics      │ Users    │ Reports         │
└───────────────────────┬─────────────────────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
┌──────────────────────┐  ┌───────────────────┐
│ Computer Vision      │  │     MongoDB       │
│                      │  │                   │
│ OpenCV preprocessing │  │ Users             │
│ YOLO inference       │  │ Products          │
│ Severity scoring     │  │ Inspections       │
└──────────────────────┘  │ Reports           │
                          │ Analytics         │
                          └───────────────────┘

Inspection Workflow

Quality Engineer

Login
  ↓
Select Product
  ↓
Upload Real Image
  ↓
Configure Preprocessing
  ↓
Run Inspection
  ↓
FastAPI receives image
  ↓
OpenCV preprocessing
  ↓
Local YOLO inference
  ↓
Defect detection
  ↓
Severity calculation
  ↓
PASS / FAIL
  ↓
Save inspection to MongoDB
  ↓
Display result + history + report

Supervisor

Login
  ↓
Load analytics
  ↓
Read inspection records from MongoDB
  ↓
Calculate KPIs and factory-line metrics
  ↓
Display production-quality dashboard

Admin

Login
  ↓
View users
  ↓
Manage roles
  ↓
Assign factory lines
  ↓
Review system/model configuration

Project Structure

visioninspect-ai/
│
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── models.py
│   ├── database.py
│   ├── config.py
│   ├── yolo_inference.py
│   ├── defect_engine.py
│   ├── test_e2e.py
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── services/
│       │   └── api.ts
│       ├── pages/
│       │   ├── QualityEngineerDashboard.tsx
│       │   ├── FactorySupervisorDashboard.tsx
│       │   └── AdminDashboard.tsx
│       └── components/
│           ├── InspectionDetailModal.tsx
│           └── InspectionHistory.tsx
│
├── training/
│   ├── prepare_yolo.py
│   ├── train_yolo.py
│   └── all_categories_demo.py
│
├── database/
│   ├── mongo_schemas.js
│   ├── postgres_schema.sql
│   └── seed_data.json
│
├── ai_model/
│   ├── inference.py
│   ├── preprocessing.py
│   └── severity_calculator.py
│
├── runs/
│   └── detect/
│       └── unified_20ep/
│           └── weights/
│               └── best.pt
│
├── dataset_requirements/
│   └── mvtec_ad_structure.txt
│
└── README.md

The repository should not commit secrets, local .env files, large raw datasets, or unnecessary generated artifacts.

Getting Started

Prerequisites

Install:

Python 3.10+

Node.js 18+

npm

MongoDB 4.4+

Git

For model training, a CUDA-compatible NVIDIA GPU is strongly recommended.

1. Clone the Repository

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd visioninspect-ai

Replace <YOUR_GITHUB_REPOSITORY_URL> with the repository URL after creating the GitHub repository.

2. Create / Activate Python Environment

Windows example:

python -m venv .venv311
.\.venv311\Scripts\Activate.ps1

Install backend dependencies:

.\.venv311\Scripts\python.exe -m pip install -r backend\requirements.txt

3. Configure Environment Variables

Create a local environment file using the project's expected variables.

Example:

MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=visioninspect
JWT_SECRET=replace_with_a_secure_random_secret
VITE_API_BASE=http://localhost:8000/api

Never commit real credentials or secrets to GitHub.

Recommended .gitignore entries include:

.env
.env.*
!.env.example
.venv/
node_modules/
__pycache__/
*.pyc

4. Start MongoDB

Make sure your MongoDB instance is running and accessible using the configured connection string.

5. Start the FastAPI Backend

From the repository root:

.\.venv311\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000

Backend:

http://localhost:8000

6. Start the React Frontend

In another terminal:

npm install
npm run dev

The Vite development server normally runs at:

http://localhost:5173

7. Run an Inspection

Register or log in as a Quality Engineer.

Create/select a product.

Upload a real image from the MVTec dataset.

Configure preprocessing if required.

Click Run Inspection.

Review the YOLO detection result.

Check the bounding box, confidence, severity, and PASS/FAIL result.

Open inspection history.

Review the corresponding analytics in the Supervisor dashboard.

The application is designed to reject treating visual stock/demo cards as genuine MVTec/YOLO evidence.

API Overview

The FastAPI backend exposes endpoints for:

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

Products

GET    /api/products
POST   /api/products
GET    /api/products/{id}
PUT    /api/products/{id}
DELETE /api/products/{id}

Inspections

GET  /api/inspections
POST /api/run-inspection

Analytics

GET /api/analytics/summary
GET /api/analytics/by-line

Users

GET   /api/users
PUT   /api/users/{id}/role

Protected endpoints require the appropriate authenticated role.

Security

The application uses:

JWT-based authentication

Password hashing

Role-based authorization

Protected API routes

Environment-based secrets

For production deployment, additional hardening should be implemented, including:

Rate limiting

Stricter CORS configuration

Centralized logging

Request-size limits

Secure secret management

HTTPS

Token refresh/revocation strategy

Production MongoDB security configuration

Validation & Testing

The project has been validated across the major application layers.

Backend

The documented integration tests cover:

Database connection

User authentication

Product CRUD

Inspection schema

Analytics calculation

Frontend

Validation includes:

npm run lint
npm run build

The application has also been checked for:

TypeScript compatibility

API contract consistency

Authentication flow

Authorization

MongoDB persistence

Real YOLO inference

Dynamic analytics

Build/test results should be re-run locally before a final internship submission and documented according to the actual result from that run.

Screenshots / Demo

For an internship-ready GitHub repository, add screenshots demonstrating the actual running application.

Recommended screenshots:

1. Landing / Login

docs/screenshots/01-login.png

2. Quality Engineer Dashboard

docs/screenshots/02-quality-engineer-dashboard.png

3. Real Image Inspection

Show:

Uploaded MVTec image

Bounding box

Confidence

Severity

PASS/FAIL

docs/screenshots/03-yolo-inspection-result.png

4. Inspection History / Report

docs/screenshots/04-inspection-history.png

5. Factory Supervisor Analytics

Show:

Yield rate

Defect distribution

Factory-line metrics

Inspection trends

docs/screenshots/05-supervisor-analytics.png

6. Admin Dashboard

docs/screenshots/06-admin-dashboard.png

7. MongoDB Evidence

If included, show a sanitized database view demonstrating stored inspection records without exposing passwords, secrets, tokens, or personal information.

docs/screenshots/07-mongodb-data.png

Model Limitations

This section is intentionally included so the repository presents the project honestly.

Current limitations

The current YOLO model has limited detection performance.

Latest recorded mAP50 is approximately 5.4%.

Some real test images can produce missed detections.

The current derived YOLO split is suitable for a prototype but is not a strict MVTec benchmark protocol.

Only the current trained model is integrated into the application.

Email notifications are not implemented.

Multi-language support is not implemented.

Docker/Kubernetes/cloud deployment is not currently part of this milestone.

Refresh tokens are not implemented.

The application is primarily designed as an internship/research prototype rather than a production-certified industrial inspection system.

Engineering Decisions

Real inference instead of simulated results

The inspection endpoint loads the local trained YOLO weights and runs inference on the uploaded image.

This was chosen so that application results are connected to an actual computer-vision model rather than random or hardcoded defect values.

Database-driven analytics

Supervisor analytics are calculated from MongoDB inspection records.

This prevents the dashboard from displaying static demonstration percentages.

Transparent severity calculation

Severity is calculated using an explicit weighted formula rather than an unexplained score.

Role-based architecture

Different users receive different capabilities:

Role

Main Responsibility

Quality Engineer

Perform and review inspections

Factory Supervisor

Monitor quality and production analytics

Admin

Manage users and system configuration

Future Improvements

Potential next milestones include:

Improve YOLO training methodology and dataset split

Increase model performance through better training and validation

Add more rigorous evaluation metrics

Add per-category evaluation

Add confusion-matrix analysis

Add model versioning

Add experiment tracking

Add Docker deployment

Add Kubernetes deployment

Add CI/CD

Add cloud deployment

Add structured application logging

Add notification services

Add production-grade security hardening

Add automated end-to-end tests

Internship / Portfolio Highlights

This project demonstrates practical experience across multiple engineering areas:

Software Engineering

Full-stack React + FastAPI application

REST API design

Authentication and authorization

Role-based access control

Database integration

CRUD operations

Error handling

Modular project structure

Machine Learning / Computer Vision

MVTec AD dataset handling

YOLO model training

Custom model inference

Bounding-box detection

OpenCV preprocessing

Confidence-based predictions

Severity scoring

Model evaluation

Data Engineering

MongoDB schema design

Persistent inspection records

Aggregation pipelines

Factory-line analytics

Indexed queries

Product Engineering

Multi-role workflow design

Industrial inspection workflow

Audit history

Reports

Analytics dashboards

Human-readable AI results

Repository Notes

Before pushing to GitHub:

Do not commit .env files.

Do not commit MongoDB credentials.

Do not commit JWT secrets.

Do not expose passwords or tokens in screenshots.

Do not claim 100% model accuracy.

Do not present simulated/sample UI data as real model evidence.

Include actual screenshots from the working application.

Include model metrics from the final training run.

Keep large raw datasets outside the repository unless licensing and repository size requirements are satisfied.





Computer Science & Engineering

Project

VisionInspect AI — Manufacturing Defect Detection & Quality Inspection System