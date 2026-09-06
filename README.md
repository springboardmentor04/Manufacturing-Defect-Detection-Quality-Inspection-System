# VisionInspect AI

## AI-Powered Manufacturing Defect Detection & Quality Inspection System

VisionInspect AI is an AI-powered manufacturing quality inspection
platform designed to automatically inspect product images, detect
manufacturing defects, classify detected issues, assess severity, and
provide quality-control and manufacturing analytics.

The project is designed around the internship problem statement, which
aims to reduce manual inspection effort, improve product quality,
minimize manufacturing defects, and improve production efficiency using
computer vision and artificial intelligence.

------------------------------------------------------------------------

## 🎯 Project Objective

VisionInspect AI provides a centralized platform for:

-   Product image acquisition and inspection
-   AI-based defect detection
-   Defect classification
-   Severity and quality-risk assessment
-   Automated pass/fail quality decisions
-   Inspection history and reporting
-   Manufacturing quality analytics
-   Role-based access for Quality Engineers and Factory Supervisors

------------------------------------------------------------------------

## ✨ Key Features

### 🔐 Authentication & Authorization

-   JWT-based authentication
-   Secure login and registration workflow
-   Role-based access control (RBAC)
-   Quality Engineer and Supervisor workflows
-   Protected backend API endpoints

### 📷 AI Visual Inspection

-   Product image upload
-   Image validation
-   Computer-vision-based inspection
-   YOLO-based defect detection
-   Defect confidence scoring
-   Inspection result generation

### ⚠️ Quality Assessment

-   Defect classification
-   Severity scoring
-   Risk assessment
-   Quality recommendations
-   Pass/fail inspection decisions

### 📊 Analytics & Reporting

-   Quality Engineer dashboard
-   Supervisor dashboard
-   Defect analytics
-   Production quality reports
-   Inspection history
-   Trend-oriented manufacturing insights

------------------------------------------------------------------------

## 🏗️ System Architecture

``` text
                    ┌─────────────────────────┐
                    │       React Frontend    │
                    │                         │
                    │  Dashboard / Upload /   │
                    │  History / Analytics    │
                    └────────────┬────────────┘
                                 │
                              REST API
                                 │
                    ┌────────────▼────────────┐
                    │      FastAPI Backend    │
                    │                         │
                    │ Auth / RBAC / Inspection│
                    │ Reports / Analytics     │
                    └───────┬─────────┬───────┘
                            │         │
                  ┌─────────▼───┐ ┌──▼─────────────┐
                  │ PostgreSQL  │ │ YOLO AI Model  │
                  │  Database   │ │   best.pt      │
                  └─────────────┘ └────────────────┘
```

### Main application layers

1.  **Frontend** --- React-based user interface
2.  **Backend** --- FastAPI REST API
3.  **Authentication** --- JWT authentication and RBAC
4.  **Database** --- PostgreSQL
5.  **AI Layer** --- YOLO-based computer vision inference
6.  **Analytics Layer** --- inspection, defect, and production analytics

------------------------------------------------------------------------

## 🛠️ Technology Stack

  Category            Technology
  ------------------- ----------------------------
  Frontend            React.js
  Styling             Tailwind CSS / CSS
  Backend             Python, FastAPI
  Authentication      JWT
  Database            PostgreSQL
  Computer Vision     OpenCV
  Object Detection    YOLO
  AI Framework        PyTorch / Ultralytics
  Data Processing     NumPy, Pandas
  API Documentation   FastAPI Swagger / OpenAPI
  Version Control     Git / GitHub
  Development         VS Code
  Deployment Target   Docker / Cloud environment

------------------------------------------------------------------------

## 📁 Project Structure

``` text
VisionInspect-AI/
│
├── ai/
│   ├── preprocessing/
│   │   ├── augmentation.py
│   │   ├── convert_mvtec_to_yolo.py
│   │   ├── dataset_builder.py
│   │   ├── preprocess.py
│   │   └── utils.py
│   │
│   └── training/
│       └── train.py
│
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   │
│   ├── models/
│   │   └── best.pt
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── package.json
│   └── .env.example
│
└── README.md
```

------------------------------------------------------------------------

## 👥 User Roles

### Quality Engineer

The Quality Engineer workflow supports:

-   Login
-   Dashboard access
-   Product image upload
-   AI inspection
-   Inspection history
-   Inspection reports
-   Quality-related analytics
-   Profile management

### Factory Supervisor

The Supervisor workflow supports:

-   Login
-   Production dashboard
-   Manufacturing analytics
-   Production quality reports
-   User management
-   Profile management

Supervisor-only backend endpoints are protected using role-based
authorization.

------------------------------------------------------------------------

## 🔄 Inspection Workflow

``` text
User Login
    ↓
Upload Product Image
    ↓
Image Validation
    ↓
Image Preprocessing
    ↓
YOLO Model Inference
    ↓
Defect Detection
    ↓
Defect Classification
    ↓
Severity / Risk Assessment
    ↓
Quality Decision
    ↓
Store Inspection Result
    ↓
History / Reports / Analytics
```

------------------------------------------------------------------------

## 🤖 AI Model

The application integrates a trained YOLO model located at:

``` text
backend/models/best.pt
```

The model is loaded by the backend inspection pipeline and used for
product-image inference.

The project also contains preprocessing and training utilities under:

``` text
ai/preprocessing/
ai/training/
```

### Current model benchmark

A direct inference benchmark was performed on the available model:

-   Average inference time: approximately **0.104 seconds/image**
-   Approximate throughput: **9.65 FPS**

A test inspection also produced a detected defect example:

-   Defect: **Transistor-Misplaced**
-   Confidence: approximately **94.47%**
-   Severity: **High**
-   Recommendation: **Rework Required**

> **Validation note:** The current project copy does not contain the
> complete training dataset, so formal dataset-level M4 validation
> should not be interpreted as a newly reproduced benchmark from the
> repository. Existing model metrics and direct inference tests should
> be reported with this limitation clearly stated.

------------------------------------------------------------------------

## ⚠️ Severity Assessment

The application includes a confidence-based severity assessment
workflow.

The current rules classify results approximately as:

    Confidence Severity   Typical Recommendation
  ------------ ---------- ------------------------
         ≥ 95% Critical   Reject
         ≥ 85% High       Rework Required
         ≥ 70% Medium     Manual Inspection
        \< 70% Low        Accept / Review

These rules are part of the application's quality-assessment logic and
are not presented as a separately trained severity model.

------------------------------------------------------------------------

## 🔒 Security

The backend uses JWT authentication and role-based authorization.

Important security measures include:

-   Protected API endpoints
-   JWT bearer authentication
-   Role-specific endpoint authorization
-   Input validation
-   Image type and size validation
-   Environment-based configuration
-   Secrets kept outside source control

### Environment variables

Create a local environment file from the provided example:

``` text
backend/.env.example
frontend/.env.example
```

**Never commit real `.env` files or database credentials to GitHub.**

------------------------------------------------------------------------

## 🚀 Local Setup

### Prerequisites

Install:

-   Python 3.x
-   Node.js and npm
-   PostgreSQL
-   Git

### 1. Clone the repository

``` bash
git clone <your-github-repository-url>
cd VisionInspect-AI
```

### 2. Backend setup

``` bash
cd backend
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

``` powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

Create/configure the backend environment file using:

``` text
backend/.env.example
```

Start the API:

``` bash
uvicorn app.main:app --reload
```

Backend:

``` text
http://127.0.0.1:8000
```

Swagger API documentation:

``` text
http://127.0.0.1:8000/docs
```

### 3. Frontend setup

Open another terminal:

``` bash
cd frontend
npm install
```

Configure:

``` text
frontend/.env.example
```

with the backend API URL:

``` text
VITE_API_URL=http://localhost:8000
```

Start the frontend:

``` bash
npm run dev
```

The Vite development server will display the local frontend URL in the
terminal.

------------------------------------------------------------------------

## 🧪 Validation

The current implementation has been checked through multiple validation
stages.

### Backend

-   Python compilation check --- Passed
-   Dependency check using `pip check` --- Passed
-   FastAPI startup --- Passed
-   YOLO model loading --- Passed
-   Swagger/OpenAPI interface --- Working
-   Authentication login --- Working
-   Role-based access control --- Tested

### Frontend

-   Fresh dependency installation --- Passed
-   Production build --- Passed
-   Vite modules transformed --- 2,433
-   Production build time --- approximately 8.72 seconds
-   Generated `dist/index.html` and asset bundles --- Confirmed

### End-to-End

The demonstrated workflow covers:

``` text
Login
  ↓
Quality Engineer Dashboard
  ↓
Image Upload
  ↓
AI Inspection
  ↓
Inspection Result
  ↓
Inspection History
  ↓
Supervisor Login
  ↓
Supervisor Dashboard
  ↓
Analytics
  ↓
Production Reports
```

------------------------------------------------------------------------

## 📈 Performance Metrics

The project problem statement identifies the following categories for
evaluation:

### AI Model Performance

-   Precision
-   Recall
-   F1-score
-   mAP

### Manufacturing Performance

-   Inspection automation rate
-   Defect identification accuracy
-   False defect detection rate

### System Performance

-   Image processing speed
-   Inspection response time
-   Concurrent inspection capability

The current direct inference benchmark provides an observed average
inference time of approximately 0.104 seconds per test run. This should
not be confused with full end-to-end API response time.

------------------------------------------------------------------------

## 📋 Milestone 4 Status

Milestone 4 focuses on testing, deployment, and documentation.

  -----------------------------------------------------------------------
  Requirement                         Current Status
  ----------------------------------- -----------------------------------
  Model testing / validation          🟡 In progress / documented with
                                      limitations

  Inspection performance testing      ✅ Completed

  Dashboard/report quality            ✅ Demonstrated

  Frontend production build           ✅ Passed

  End-to-end demonstration            ✅ Completed

  Technical documentation             🟡 In progress

  Docker deployment                   ⏳ Pending

  Cloud deployment                    ⏳ Pending
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## ⚠️ Current Limitations

1.  The complete training dataset is not included in the current project
    copy.
2.  Formal dataset-level model validation should be reproduced only when
    the intended dataset and validation split are available.
3.  The current severity assessment is rule-based using prediction
    confidence.
4.  Docker/cloud deployment is a separate finalization step and should
    not be claimed as completed until it is actually tested.

------------------------------------------------------------------------

## 🔮 Future Enhancements

-   Larger and more diverse manufacturing datasets
-   Improved model training and validation
-   More robust defect categories
-   Learned severity classification
-   Real-time camera/production-line inspection
-   Model monitoring and drift detection
-   Batch inspection
-   Advanced production analytics
-   Cloud-native scaling
-   Automated CI/CD
-   More comprehensive automated testing

------------------------------------------------------------------------

## 🎓 Internship Context

VisionInspect AI was developed according to the manufacturing defect
detection and quality inspection problem statement, with the project
milestones covering:

-   Project initialization and architecture
-   Authentication and image acquisition
-   Image processing and AI defect detection
-   Defect classification and severity assessment
-   Manufacturing analytics and reporting
-   Testing, deployment, documentation, and final demonstration

------------------------------------------------------------------------

## 📄 License

This project is developed for educational and internship purposes.

------------------------------------------------------------------------

## 👨‍💻 Project

**VisionInspect AI --- Manufacturing Defect Detection & Quality
Inspection System**

Built using **React, FastAPI, PostgreSQL, OpenCV, and YOLO**.
