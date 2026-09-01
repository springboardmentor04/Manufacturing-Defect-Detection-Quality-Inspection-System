from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class UserModel(BaseModel):
    id_str: str = Field(alias="_id")  # Custom String primary key (e.g. "usr_101" / "cred_xxx")
    id: Optional[int] = None
    openId: str
    name: Optional[str] = None
    email: Optional[str] = None
    loginMethod: Optional[str] = None
    passwordHash: Optional[str] = None
    role: Literal["user", "admin", "quality_engineer", "factory_supervisor", "production_manager"] = "quality_engineer"
    accountStatus: Literal["active", "disabled"] = "active"
    credentialSessionVersion: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    lastSignedIn: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
