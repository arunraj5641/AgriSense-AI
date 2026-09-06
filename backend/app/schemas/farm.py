from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class FarmBase(BaseModel):
    name: str
    location: str
    farm_size: float
    irrigation_type: str | None = None

class FarmCreate(FarmBase):
    pass

class FarmUpdate(FarmBase):
    name: str | None = None
    location: str | None = None
    farm_size: float | None = None

class FarmResponse(FarmBase):
    id: uuid.UUID
    farmer_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
