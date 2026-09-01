from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import HOST, PORT, UPLOAD_DIR
from app.db import connect_db, close_db
from app.routers import batches, reviews, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="VisionInspect AI — FastAPI Backend",
    description="Evidence-led quality inspection API for manufacturing dashboard powered by MongoDB.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for serving image assets
app.mount("/static", StaticFiles(directory=UPLOAD_DIR.parent), name="static")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "VisionInspect AI FastAPI Engine",
        "version": "1.0.0",
        "database": "MongoDB"
    }

# Register routers
app.include_router(batches.router)
app.include_router(reviews.router)
app.include_router(reports.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
