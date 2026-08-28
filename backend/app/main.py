from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.inspections.routes import router as inspection_router
from app.database import Base, engine
from app.models.user import User
from app.auth.routes import router as auth_router
from app.models.inspection import Inspection
Base.metadata.create_all(bind=engine)
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)
app.include_router(inspection_router)