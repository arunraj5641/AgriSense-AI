from pydantic import BaseModel, ConfigDict
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
    constraints_considered: dict[str, Any]
    estimated_cost: float | None
    confidence_score: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
