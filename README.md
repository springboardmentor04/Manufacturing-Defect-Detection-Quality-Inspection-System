# VisionInspect AI 🏭🧠

VisionInspect AI is an enterprise-grade AI-powered Manufacturing Defect Detection & Quality Inspection platform. This platform will leverage Computer Vision (YOLO/OpenCV/CNN) to detect defects from product images. 

*Note: This is Milestone 1 - Project Initialization. AI functionality and authentication are not yet implemented.*

## 🏗️ Project Architecture

```
visioninspect-ai/
├── frontend/          # Next.js 15 App Router Frontend
├── backend/           # FastAPI Python Backend
├── ai-model/          # AI/ML models and scripts
├── uploads/           # Uploaded images and assets
├── docs/              # Documentation
├── docker/            # Docker configurations and scripts
└── README.md          # Project documentation
```

## 🛠️ Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI, React Hook Form, Zod, Axios

### Backend
- FastAPI (Python 3.12)
- Motor (Async MongoDB Driver)
- Pydantic v2
- Uvicorn

### DevOps & Database
- Docker & Docker Compose
- MongoDB Atlas

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd visioninspect-ai
   ```

2. **Environment Variables:**
   - Copy `frontend/.env.example` to `frontend/.env.local`
   - Copy `backend/.env.example` to `backend/.env`

3. **Run with Docker Compose (Recommended):**
   ```bash
   docker compose up --build
   ```
   - Frontend runs at `http://localhost:3000`
   - Backend API runs at `http://localhost:8000`
   - Backend Swagger Docs at `http://localhost:8000/docs`

## 👨‍💻 Development Workflow

- **Frontend Development:** Navigate to `frontend/` and run `npm run dev`.
- **Backend Development:** Navigate to `backend/` and run `uvicorn app.main:app --reload`.
