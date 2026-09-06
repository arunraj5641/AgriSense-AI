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
from app.models.recommendation import Recommendation
from app.recommendations.schemas import RecommendationRequest, RecommendationResponse
from app.recommendations.engine import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("", response_model=RecommendationResponse)
async def generate_recommendation(
    req: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Verify ownership
    result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    result = await db.execute(select(Farm).where(Farm.id == req.farm_id))
    farm = result.scalar_one_or_none()
    if not farm or farm.farmer_id != farmer.id:
        raise HTTPException(status_code=404, detail="Farm not found or unauthorized")

    # Fetch resources
    budgets = (await db.execute(select(Budget).where(Budget.farm_id == req.farm_id))).scalars().all()
    total_budget = sum(b.available_budget for b in budgets)
    
    equipments = (await db.execute(select(Equipment).where(Equipment.farm_id == req.farm_id))).scalars().all()
    owned_equipment = [e.equipment_name.lower() for e in equipments]
    
    crops = (await db.execute(select(Crop).where(Crop.farm_id == req.farm_id))).scalars().all()
    crop_stage = crops[0].crop_stage.lower() if crops else "unknown"
    
    # Generate
    rec_result = RecommendationEngine.generate(
        action=req.target_action,
        budget=total_budget,
        equipment=owned_equipment,
        irrigation=farm.irrigation_type.lower() if farm.irrigation_type else None,
        farm_size=farm.farm_size,
        crop_stage=crop_stage
    )
    
    # Save
    rec = Recommendation(
        farm_id=req.farm_id,
        recommendation=rec_result["recommendation"],
        explanation=rec_result["explanation"],
        constraints_considered=rec_result["constraints_considered"],
        estimated_cost=rec_result["estimated_cost"],
        confidence_score=rec_result["confidence_score"]
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec

@router.get("/farms/{farm_id}", response_model=List[RecommendationResponse])
async def get_history(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    if not farm or farm.farmer_id != farmer.id:
        raise HTTPException(status_code=404, detail="Farm not found or unauthorized")
        
    result = await db.execute(select(Recommendation).where(Recommendation.farm_id == farm_id).order_by(Recommendation.created_at.desc()))
    return result.scalars().all()
