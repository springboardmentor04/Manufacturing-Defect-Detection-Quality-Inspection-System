import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.inspection import router as inspection_router

app = FastAPI(
    title="VisionInspect AI - Custom CNN Module",
    description="Standalone ML module for Anomaly Detection using Custom CNN",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include new ML routes
app.include_router(inspection_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "VisionInspect AI ML Module"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
