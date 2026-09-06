import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, require_role
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.farm import FarmCreate, FarmResponse, FarmUpdate
from app.services.farm_service import FarmService
from app.models.farmer import Farmer

router = APIRouter(prefix="/farms", tags=["Farms"])

async def get_current_farmer(user: User = Depends(require_role(UserRole.FARMER)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return farmer

@router.post("", response_model=FarmResponse)
async def create_farm(
    farm_in: FarmCreate,
    db: AsyncSession = Depends(get_db),
    farmer: Farmer = Depends(get_current_farmer)
):
    return await FarmService.create_farm(db, farmer.id, farm_in)

@router.get("", response_model=List[FarmResponse])
async def read_farms(
    db: AsyncSession = Depends(get_db),
    farmer: Farmer = Depends(get_current_farmer)
):
    return await FarmService.get_farms_for_farmer(db, farmer.id)

@router.get("/{farm_id}", response_model=FarmResponse)
async def read_farm(
    farm_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    farmer: Farmer = Depends(get_current_farmer)
):
    farm = await FarmService.get_farm(db, farm_id)
    if not farm or farm.farmer_id != farmer.id:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm
