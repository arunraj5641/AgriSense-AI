from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class FarmerBase(BaseModel):
    phone: str | None = None
    address: str | None = None
    preferred_language: str = "en"

class FarmerUpdate(FarmerBase):
    pass

class FarmerResponse(FarmerBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
