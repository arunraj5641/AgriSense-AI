from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, require_role
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.farmer import FarmerResponse, FarmerUpdate
from app.services.farmer_service import FarmerService

router = APIRouter(prefix="/farmers", tags=["Farmers"])

@router.get("/me", response_model=FarmerResponse)
async def get_my_profile(
    current_user: User = Depends(require_role(UserRole.FARMER)),
    db: AsyncSession = Depends(get_db)
):
    profile = await FarmerService.get_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return profile

@router.put("/me", response_model=FarmerResponse)
async def update_my_profile(
    profile_in: FarmerUpdate,
    current_user: User = Depends(require_role(UserRole.FARMER)),
    db: AsyncSession = Depends(get_db)
):
    profile = await FarmerService.update_profile(db, current_user.id, profile_in)
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return profile
