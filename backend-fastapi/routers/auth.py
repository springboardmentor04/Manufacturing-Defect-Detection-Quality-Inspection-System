from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional

from database import get_conn
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterPayload(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["quality_engineer", "supervisor"]


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


def public_user(row) -> dict:
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "role": row["role"],
        "created_at": row["created_at"],
    }


@router.post("/register", status_code=201)
def register(payload: RegisterPayload):
    conn = get_conn()
    cur = conn.cursor()
    email = payload.email.lower().strip()

    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing = cur.fetchone()
    if existing:
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    password_hash = hash_password(payload.password)
    cur.execute(
        """INSERT INTO users (full_name, email, password_hash, role)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (payload.full_name.strip(), email, password_hash, payload.role),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()

    cur.execute("SELECT * FROM users WHERE id = %s", (new_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    token = create_token(user)
    return {"token": token, "user": public_user(user)}


@router.post("/login")
def login(payload: LoginPayload):
    conn = get_conn()
    cur = conn.cursor()
    email = payload.email.lower().strip()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user)
    return {"token": token, "user": public_user(user)}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (current_user["id"],))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": public_user(user)}
