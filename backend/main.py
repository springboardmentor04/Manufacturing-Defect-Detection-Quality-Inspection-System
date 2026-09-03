from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.models import user, inspection  # noqa: ensure models are registered
from app.routes import auth, inspections, users, dataset
from app.core.config import settings

Base.metadata.create_all(bind=engine)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="VisionInspect AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(inspections.router)
app.include_router(users.router)
app.include_router(dataset.router)

@app.get("/")
def root():
    return {"message": "VisionInspect AI API", "version": "1.0.0", "status": "running"}
