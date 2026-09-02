from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any

class UserRegisterSchema(BaseModel):
    fullName: str = Field(..., example="Sarah Chen")
    email: EmailStr = Field(..., example="sarah.chen@factory.com")
    password: str = Field(..., min_length=6, example="password123")
    role: str = Field(..., example="Quality Engineer") # "Quality Engineer" | "Factory Supervisor"
    department: Optional[str] = Field("Automotive QA Line A", example="Line A")
    employeeId: Optional[str] = Field("QE-1092", example="QE-1092")

class UserLoginSchema(BaseModel):
    email: EmailStr = Field(..., example="sarah.chen@factory.com")
    password: str = Field(..., example="password123")

class UserResponseSchema(BaseModel):
    id: str
    fullName: str
    email: str
    role: str
    department: str
    employeeId: str
    token: str
    createdAt: str

class InspectionReportCreateSchema(BaseModel):
    certificateId: Optional[str] = None
    partNumber: str = Field(..., example="ENG-884-X")
    partName: str = Field(..., example="Cast Aluminum Engine Block")
    batchCode: Optional[str] = Field("B-9021-AL", example="B-9021-AL")
    lineStation: Optional[str] = Field("Line A1", example="Line A1")
    defectType: str = Field(..., example="Surface Crack")
    defectLocation: str = Field(..., example="Functional Component Area")
    sizeScore: int = Field(85, example=85)
    locationScore: int = Field(90, example=90)
    defectTypeScore: int = Field(95, example=95)
    confidenceScore: int = Field(94, example=94)
    severityScore: int = Field(88, example=88)
    severityLevel: str = Field("Critical", example="Critical")
    verdict: str = Field("REJECT", example="REJECT")
    recommendation: Optional[str] = Field("Reject Product and Trigger Quality Inspection Workflow", example="Reject Product")
    inspector: Optional[str] = Field("Quality Engineer (AI Studio)", example="Quality Engineer")
    imageUrl: Optional[str] = None

class InspectionReportSchema(InspectionReportCreateSchema):
    id: str
    timestamp: str
