import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.contract import ContractStatus

class ContractBase(BaseModel):
    agreed_quantity: float
    agreed_price: float
    terms_and_conditions: Optional[str] = None

class ContractApplyRequest(BaseModel):
    procurement_id: uuid.UUID
    farm_id: uuid.UUID
    agreed_quantity: float
    agreed_price: float
    terms_and_conditions: Optional[str] = None

class ContractStatusUpdate(BaseModel):
    status: ContractStatus
    rejection_reason: Optional[str] = None
    terms_and_conditions: Optional[str] = None

class ContractResponse(BaseModel):
    id: uuid.UUID
    procurement_id: uuid.UUID
    farm_id: uuid.UUID
    farmer_id: uuid.UUID
    company_id: uuid.UUID
    crop: str
    farm_name: str
    farmer_name: str
    farmer_email: str
    company_name: str
    agreed_quantity: float
    agreed_price: float
    status: ContractStatus
    terms_and_conditions: Optional[str] = None
    rejection_reason: Optional[str] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Deterministic Matching Schemas
class ConstraintMatch(BaseModel):
    name: str
    passed: bool
    description: str
    farm_value: str
    required_value: str

class MatchingResult(BaseModel):
    procurement_id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    processing_category: str
    crop: str
    offered_price: float
    required_quantity: float
    compatibility_score: float # 0.0 - 1.0 (or 0 - 100%)
    matched_constraints: List[ConstraintMatch]
    failed_constraints: List[ConstraintMatch]
    estimated_revenue: float
    estimated_cost: float
    estimated_profit: float
    match_explanation: str
