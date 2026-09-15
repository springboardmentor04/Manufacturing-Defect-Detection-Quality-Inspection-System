# VisionInspect AI Deployment Checklist

| Category | Requirement | Status |
| :--- | :--- | :--- |
| **Docker Configuration** | Backend Dockerfile uses `python:3.12-slim` | PASS |
| | OpenCV OS dependencies (`libgl1`, `libglib2.0-0`) installed | PASS |
| | Development `--reload` flags removed from Uvicorn | PASS |
| | Frontend Dockerfile uses multi-stage node builder | PASS |
| | Frontend executes `npm run build` | PASS |
| | Frontend executes `npm start` | PASS |
| | `docker-compose.yml` mounts backend to `nvidia` driver | PASS |
| | Source code mapping volumes removed from `docker-compose` | PASS |
| **Security & Environment** | JWT `SECRET_KEY` decoupled from hardcoded strings | PASS |
| | CORS allowed origins controlled via environment | PASS |
| | `.env` file successfully loads | PASS |
| | Port 8000 exposed securely for API | PASS |
| | Port 3000 exposed securely for Frontend | PASS |
| **Observability** | `/health` endpoint exists | PASS |
| | `/health` reports DB connection state | PASS |
| | `/health` reports YOLO instantiation state | PASS |
| | `/health` reports `torch.cuda.is_available()` state | PASS |
| **AI Capabilities** | YOLO `best.pt` file packaged inside container | PASS |
| | GPU detected by PyTorch inside container | PASS |
| **End to End (Regression)** | QA User login succeeds | PASS |
| | Single image uploads | PASS |
| | YOLO draws correct prediction boundaries | PASS |
| | Severity script calculates correct risk tiers | PASS |
| | Results persist to MongoDB | PASS |
| | Batch inspection preserves RTX 3050 VRAM limit | PASS |
| | Supervisor Dashboard updates statistics correctly | PASS |
