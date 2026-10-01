import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.user import UserRole

class UserAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class UserAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None

class UserAdminResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminStatsResponse(BaseModel):
    total_users: int
    total_farmers: int
    total_officers: int
    total_companies: int
    total_farms: int
    total_recommendations: int
    total_reviews: int
    total_contracts: int
    approval_rate: float
    average_confidence: float

class AdminChartsResponse(BaseModel):
    recommendations_by_crop: List[Dict[str, Any]]
    review_status_distribution: List[Dict[str, Any]]
    contract_status_distribution: List[Dict[str, Any]]
    confidence_distribution: List[Dict[str, Any]]
    soil_nutrient_distribution: List[Dict[str, Any]]
    procurement_demand_by_crop: List[Dict[str, Any]]
    monthly_activity: List[Dict[str, Any]]
