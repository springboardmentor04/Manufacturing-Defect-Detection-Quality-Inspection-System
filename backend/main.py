from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import router

from utils import create_upload_folder

app = FastAPI(
    title="VisionInspect AI",
    version="1.0"
)

create_upload_folder()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def home():
    return {"message": "VisionInspect AI Backend Running"}