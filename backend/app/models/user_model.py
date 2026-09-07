from typing import Optional

from pydantic import BaseModel, EmailStr


# ============================================================
# USER REGISTRATION
# ============================================================

class UserRegister(BaseModel):

    name: str

    email: EmailStr

    password: str

    role: str


# ============================================================
# USER LOGIN
# ============================================================

class UserLogin(BaseModel):

    email: EmailStr

    password: str

    role: str


# ============================================================
# USER UPDATE
# ============================================================

class UserUpdate(BaseModel):

    name: Optional[str] = None

    email: Optional[EmailStr] = None

    password: Optional[str] = None

    role: Optional[str] = None


# ============================================================
# FORGOT PASSWORD
# ============================================================

class ForgotPassword(BaseModel):

    email: EmailStr


# ============================================================
# RESET PASSWORD
# ============================================================

class ResetPassword(BaseModel):

    token: str

    new_password: str