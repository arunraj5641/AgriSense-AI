from pydantic import BaseModel, ConfigDict
import uuid
from datetime import date, datetime

class CropBase(BaseModel):
    crop_type: str
    crop_stage: str
    sowing_date: date

class CropCreate(CropBase): pass

class CropResponse(CropBase):
    id: uuid.UUID
    farm_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EquipmentBase(BaseModel):
    equipment_name: str
    quantity: int = 1

class EquipmentCreate(EquipmentBase): pass

class EquipmentResponse(EquipmentBase):
    id: uuid.UUID
    farm_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BudgetBase(BaseModel):
    available_budget: float

class BudgetCreate(BudgetBase): pass

class BudgetResponse(BudgetBase):
    id: uuid.UUID
    farm_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SoilReportBase(BaseModel):
    nitrogen: float | None = None
    phosphorus: float | None = None
    potassium: float | None = None
    organic_matter: float | None = None

class SoilReportCreate(SoilReportBase): pass

class SoilReportResponse(SoilReportBase):
    id: uuid.UUID
    farm_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
