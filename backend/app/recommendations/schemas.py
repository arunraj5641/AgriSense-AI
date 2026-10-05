from pydantic import BaseModel, ConfigDict, field_validator
from typing import Any
import uuid
from datetime import datetime

class RecommendationRequest(BaseModel):
    farm_id: uuid.UUID
    target_action: str
    
class RecommendationResponse(BaseModel):
    id: uuid.UUID
    farm_id: uuid.UUID
    recommendation: str
    explanation: str
    status: str = "GENERATED"
    constraints_considered: dict[str, Any]
    estimated_cost: float | None
    confidence_score: float
    is_high_impact: bool = False
    implemented_at: datetime | None = None
    implemented_by_id: uuid.UUID | None = None
    created_at: datetime

    @field_validator("status", mode="before")
    @classmethod
    def set_status(cls, v):
        if v is None:
            return "GENERATED"
        return str(v.value if hasattr(v, "value") else v)

    @field_validator("is_high_impact", mode="before")
    @classmethod
    def set_is_high_impact(cls, v):
        if v is None:
            return False
        return bool(v)
    
    model_config = ConfigDict(from_attributes=True)

