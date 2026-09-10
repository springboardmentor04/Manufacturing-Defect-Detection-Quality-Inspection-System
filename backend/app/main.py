import os

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["YOLO_VERBOSE"] = "False"
os.environ["ULTRALYTICS_AUTOINSTALL"] = "0"

import cv2
try:
    cv2.setNumThreads(1)
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass

try:
    import torch
    torch.set_num_threads(1)
    if hasattr(torch, "set_num_interop_threads"):
        try:
            torch.set_num_interop_threads(1)
        except Exception:
            pass
    
    try:
        import ultralytics.nn.tasks
        if hasattr(torch.serialization, "add_safe_globals"):
            torch.serialization.add_safe_globals([
                ultralytics.nn.tasks.DetectionModel,
                ultralytics.nn.tasks.ClassificationModel,
                ultralytics.nn.tasks.SegmentationModel,
                ultralytics.nn.tasks.PoseModel,
            ])
    except Exception:
        pass

    _orig_torch_load = torch.load
    def _safe_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _orig_torch_load(*args, **kwargs)
    torch.load = _safe_torch_load
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, products, batches, inspections, analytics, models, reports
from app.database.session import engine
from app.models.all_models import Base

from fastapi.staticfiles import StaticFiles

from app.core.config import settings

app = FastAPI(title="VISIONINSPECT AI", version="1.0.0")

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    if cors_origins_env:
        for origin in cors_origins_env.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(batches.router, prefix="/api/batches", tags=["batches"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def create_tables_on_startup():
    """Ensure database tables and default roles exist when the app starts."""
    try:
        Base.metadata.create_all(bind=engine)
        from app.database.session import SessionLocal
        from app.models.all_models import Role, User
        from app.core.security import get_password_hash
        
        db = SessionLocal()
        try:
            roles = ["ADMIN", "QUALITY_ENGINEER", "SUPERVISOR", "OPERATOR"]
            for role_name in roles:
                if not db.query(Role).filter(Role.name == role_name).first():
                    db.add(Role(name=role_name))
            db.commit()

            admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
            if admin_role and not db.query(User).filter(User.username == "admin").first():
                admin = User(
                    username="admin",
                    email="admin@visioninspect.local",
                    hashed_password=get_password_hash("admin123"),
                    role_id=admin_role.id
                )
                db.add(admin)
                db.commit()
        finally:
            db.close()

        # Warmup model inference at startup to eliminate cold-start latency on first user request
        try:
            import numpy as np
            from ml.inference.pipeline import pipeline
            if pipeline.model is not None:
                print("[Startup] Warming up YOLO detection model on CPU kernels...")
                dummy_img = np.full((320, 320, 3), 128, dtype=np.uint8)
                infer_ctx = torch.inference_mode() if "torch" in globals() and torch is not None else nullcontext()
                with infer_ctx:
                    pipeline.model(dummy_img, imgsz=640, verbose=False)
                print("[Startup] YOLO model warmup complete!")
        except Exception as warmup_err:
            print(f"[Startup] Warmup note: {warmup_err}")
    except Exception as e:
        print(f"Startup initialization notice: {e}")
