import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.equipment import Equipment
from app.models.budget import Budget
from app.models.soil_report import SoilReport
from app.schemas.resources import (
    CropCreate, CropResponse,
    EquipmentCreate, EquipmentResponse,
    BudgetCreate, BudgetResponse,
    SoilReportCreate, SoilReportResponse
)

router = APIRouter(prefix="/resources", tags=["Resources"])

async def verify_farm_ownership(farm_id: uuid.UUID, user: User, db: AsyncSession):
    if user.role != "farmer":
        raise HTTPException(status_code=403, detail="Not a farmer")
    
    # Get farmer id
    result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    # Get farm
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    if not farm or farm.farmer_id != farmer.id:
        raise HTTPException(status_code=404, detail="Farm not found or does not belong to you")
    return farm

# Generic endpoint pattern for resources
@router.post("/farms/{farm_id}/crops", response_model=CropResponse)
async def add_crop(farm_id: uuid.UUID, crop_in: CropCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    crop = Crop(farm_id=farm_id, **crop_in.model_dump())
    db.add(crop)
    await db.commit()
    await db.refresh(crop)
    return crop

@router.get("/farms/{farm_id}/crops", response_model=List[CropResponse])
async def get_crops(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    result = await db.execute(select(Crop).where(Crop.farm_id == farm_id))
    return result.scalars().all()

@router.post("/farms/{farm_id}/equipment", response_model=EquipmentResponse)
async def add_equipment(farm_id: uuid.UUID, eq_in: EquipmentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    eq = Equipment(farm_id=farm_id, **eq_in.model_dump())
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq

@router.get("/farms/{farm_id}/equipment", response_model=List[EquipmentResponse])
async def get_equipment(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    result = await db.execute(select(Equipment).where(Equipment.farm_id == farm_id))
    return result.scalars().all()

@router.post("/farms/{farm_id}/budget", response_model=BudgetResponse)
async def add_budget(farm_id: uuid.UUID, budget_in: BudgetCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    budget = Budget(farm_id=farm_id, **budget_in.model_dump())
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget

@router.get("/farms/{farm_id}/budget", response_model=BudgetResponse)
async def get_budget(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    result = await db.execute(select(Budget).where(Budget.farm_id == farm_id).order_by(Budget.created_at.desc()))
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget

@router.post("/farms/{farm_id}/soil-report", response_model=SoilReportResponse)
async def add_soil_report(farm_id: uuid.UUID, sr_in: SoilReportCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    sr = SoilReport(farm_id=farm_id, **sr_in.model_dump())
    db.add(sr)
    await db.commit()
    await db.refresh(sr)
    return sr

@router.get("/farms/{farm_id}/soil-report", response_model=SoilReportResponse)
async def get_soil_report(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_farm_ownership(farm_id, user, db)
    result = await db.execute(select(SoilReport).where(SoilReport.farm_id == farm_id).order_by(SoilReport.created_at.desc()))
    sr = result.scalars().first()
    if not sr:
        raise HTTPException(status_code=404, detail="Soil report not found")
    return sr
