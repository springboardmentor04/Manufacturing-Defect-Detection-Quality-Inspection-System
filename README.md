# VisionInspect AI — Milestone 1 (Project Initialization, Auth & Image Upload Workflow)

An AI-powered manufacturing defect detection & quality inspection platform. Milestone 1 includes project setup, JWT authentication, role-based access control (RBAC), multi-file image upload workflow, inspection queueing, and executive dashboard UI.

---

## 🏗️ Architecture & Stack Overview

- **Backend**: FastAPI, Python 3.10+, SQLAlchemy ORM, PyJWT, bcrypt, python-multipart.
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Axios, Lucide Icons.
- **Database**: PostgreSQL (database name: `visioninspect_db`).

---

## 🗄️ Database & Schema Setup

> **IMPORTANT NOTE**:
> The PostgreSQL database and tables are assumed to already exist in your environment (e.g. created manually in pgAdmin 4). The backend connects directly to the existing schema using SQLAlchemy models without running auto-migrations.

If setting up a fresh database in pgAdmin 4 or `psql`, execute the provided `schema.sql` script located in `backend/schema.sql`:

```sql
CREATE DATABASE visioninspect_db;
-- Connect to visioninspect_db then run backend/schema.sql
```

---

## 🚀 Setup & Execution Instructions

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify/configure your `.env` file (copied from `.env.example`):
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/visioninspect_db
   JWT_SECRET=super_secret_visioninspect_jwt_key_change_in_production_12345
   JWT_EXPIRE_MINUTES=60
   CORS_ORIGINS=http://localhost:3000
   ```
5. Start the backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The API will be available at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.*

---

### 2. Frontend Setup (Next.js)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Ensure `.env.local` exists (copied from `.env.local.example`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The dashboard will be live at `http://localhost:3000`.*

---

### 3. Loading the Sample Dataset

To seed sample defect images (such as MVTec AD samples) into the database and uploads repository:

1. Ensure the backend server or Python environment is active.
2. From the `backend` directory, run:
   ```bash
   python -m scripts.load_sample_dataset --dir ./sample_data/mvtec_ad
   ```
   *Note: If no sample images exist in `./sample_data/mvtec_ad`, the script will automatically generate demo sample images and seed an initial default administrator account (`username: admin`, `password: Admin@123`).*

---

## 📌 API Endpoints (Milestone 1)

### Authentication
- `POST /auth/register` — Register new user with role (`quality_engineer` or `factory_supervisor`).
- `POST /auth/login` — Authenticate and receive 60-minute JWT token + user profile.

### Images & Inspection Queue
- `POST /images/upload` — Multi-file batch upload (validates `.jpg, .jpeg, .png, .bmp, .tiff, .webp` and `<10MB`). Automatically creates matching `inspections` queue row.
- `GET /images` — Paginated list of uploaded images with uploader username and status filter.
- `GET /images/{id}` — Single image detail + inspection queue status.
- `GET /uploads/{filename}` — Static file serving for UI thumbnail rendering.

### Inspections
- `GET /inspections` — List of all queued inspection items joined with image filenames.

---

## 💡 Notes on Token Storage & Security
- Access tokens are stored in `localStorage` and attached via `lib/api.ts` request interceptor.
- Trade-off comment: `localStorage` is convenient for client-side single page app development, but production enterprise deployments should consider `HttpOnly SameSite` cookies for XSS mitigation.
