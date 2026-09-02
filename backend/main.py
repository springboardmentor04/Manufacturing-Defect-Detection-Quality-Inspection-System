import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection, db_instance
from models import UserRegisterSchema, UserLoginSchema, UserResponseSchema
from auth_utils import hash_password, verify_password, create_access_token
from routes.model_routes import router as model_router
from routes.reports import router as reports_router, seed_reports_to_mongo

app = FastAPI(
    title="VisionInspect AI Backend API",
    description="Manufacturing Defect Detection & Quality Inspection System MongoDB API",
    version="2.0.0"
)

app.include_router(model_router)
app.include_router(reports_router)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory backup store if MongoDB server is starting
IN_MEMORY_USERS_DB = {}

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await seed_reports_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "VisionInspect AI FastAPI Engine",
        "database": "MongoDB visioninspect_db"
    }

@app.post("/api/auth/register", response_model=UserResponseSchema)
async def register_user(user_data: UserRegisterSchema):
    email = user_data.email.lower()
    
    # 1. Check if user already exists in MongoDB
    user_exists = False
    if db_instance.db is not None:
        try:
            existing = await db_instance.db["users"].find_one({"email": email})
            if existing:
                user_exists = True
        except Exception as e:
            print("MongoDB query notice:", e)

    if not user_exists and email in IN_MEMORY_USERS_DB:
        user_exists = True

    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 2. Create User record with role selected during registration
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    hashed_pwd = hash_password(user_data.password)
    created_at = datetime.utcnow().isoformat()

    new_user_record = {
        "id": user_id,
        "fullName": user_data.fullName,
        "email": email,
        "password": hashed_pwd,
        "role": user_data.role, # Role set at registration!
        "department": user_data.department or "Quality Control Line A",
        "employeeId": user_data.employeeId or "QE-1001",
        "createdAt": created_at
    }

    # Save to MongoDB
    if db_instance.db is not None:
        try:
            await db_instance.db["users"].insert_one(new_user_record)
        except Exception as e:
            print("MongoDB insert notice:", e)

    IN_MEMORY_USERS_DB[email] = new_user_record

    # 3. Generate JWT access token with registered role
    token = create_access_token({"sub": user_id, "email": email, "role": user_data.role})

    return {
        "id": user_id,
        "fullName": user_data.fullName,
        "email": email,
        "role": user_data.role,
        "department": new_user_record["department"],
        "employeeId": new_user_record["employeeId"],
        "token": token,
        "createdAt": created_at
    }

@app.post("/api/auth/login", response_model=UserResponseSchema)
async def login_user(credentials: UserLoginSchema):
    email = credentials.email.lower()
    
    # Fetch from MongoDB database
    user_record = None
    if db_instance.db is not None:
        try:
            user_record = await db_instance.db["users"].find_one({"email": email})
        except Exception as e:
            print("MongoDB query notice:", e)

    if not user_record:
        user_record = IN_MEMORY_USERS_DB.get(email)

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # Verify password
    if not verify_password(credentials.password, user_record["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # Retrieve registered role directly from MongoDB database record!
    registered_role = user_record["role"]

    token = create_access_token({"sub": user_record["id"], "email": email, "role": registered_role})

    return {
        "id": user_record["id"],
        "fullName": user_record["fullName"],
        "email": user_record["email"],
        "role": registered_role,
        "department": user_record.get("department", "Quality Line A"),
        "employeeId": user_record.get("employeeId", "QE-9001"),
        "token": token,
        "createdAt": user_record.get("createdAt", datetime.utcnow().isoformat())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
