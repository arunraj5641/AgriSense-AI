import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.company import ProcurementStatus

# Company Schemas
class CompanyBase(BaseModel):
    company_name: str
    address: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    processing_category: str
    supported_crops: List[str] = []
    active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    processing_category: Optional[str] = None
    supported_crops: Optional[List[str]] = None
    active: Optional[bool] = None

class CompanyResponse(CompanyBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Procurement Schemas
class ProcurementBase(BaseModel):
    crop: str
    required_quantity: float
    minimum_quality_grade: str
    moisture_percentage: Optional[float] = None
    nitrogen_requirement: Optional[float] = None
    phosphorus_requirement: Optional[float] = None
    potassium_requirement: Optional[float] = None
    organic_matter_requirement: Optional[float] = None
    minimum_farm_size: Optional[float] = None
    preferred_irrigation: Optional[str] = None
    harvest_window: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    offered_price: float
    status: ProcurementStatus = ProcurementStatus.OPEN

class ProcurementCreate(ProcurementBase):
    pass

class ProcurementUpdate(BaseModel):
    crop: Optional[str] = None
    required_quantity: Optional[float] = None
    minimum_quality_grade: Optional[str] = None
    moisture_percentage: Optional[float] = None
    nitrogen_requirement: Optional[float] = None
    phosphorus_requirement: Optional[float] = None
    potassium_requirement: Optional[float] = None
    organic_matter_requirement: Optional[float] = None
    minimum_farm_size: Optional[float] = None
    preferred_irrigation: Optional[str] = None
    harvest_window: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    offered_price: Optional[float] = None
    status: Optional[ProcurementStatus] = None

class ProcurementResponse(ProcurementBase):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
