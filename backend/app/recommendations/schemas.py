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
    created_at: datetime

    @field_validator("status", mode="before")
    @classmethod
    def set_status(cls, v):
        if v is None:
            return "GENERATED"
        return str(v.value if hasattr(v, "value") else v)
    
    model_config = ConfigDict(from_attributes=True)
