from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
from .database import Base, engine, SessionLocal
from .services.yolo_service import get_yolo_service
from .seed import seed_db
from .routes import auth, inspection, history, analytics, reviews, reports, dashboard, pm_dashboard, products

app = FastAPI(title=settings.app_name, version="1.0.0")
origins = [x.strip() for x in settings.allowed_origins.split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/storage", StaticFiles(directory=str(Path(settings.upload_directory))), name="storage")

val_dir = Path(__file__).resolve().parents[2] / "dataset" / "yolo_mvtec" / "images" / "val"
if val_dir.exists():
    app.mount("/samples", StaticFiles(directory=str(val_dir)), name="samples")

app.include_router(auth.router)
app.include_router(inspection.router)
app.include_router(history.router)
app.include_router(analytics.router)
app.include_router(reviews.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(pm_dashboard.router)
app.include_router(products.router)

frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

@app.on_event("startup")

def startup():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_db(db)
    try:
        get_yolo_service()
    except Exception as e:
        print(f"[Warning] YOLO model loading during startup: {e}")


@app.get("/health")
def health():
    db_status="connected"
    model_status="loaded"
    try:
        with SessionLocal() as db:
            db.execute(__import__("sqlalchemy").text("SELECT 1"))
        get_yolo_service()
    except Exception:
        db_status="error"
        model_status="error"
    return {"status":"healthy" if db_status=="connected" and model_status=="loaded" else "unhealthy",
            "database":db_status,"model":model_status}
