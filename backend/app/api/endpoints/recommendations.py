import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user, require_extension_officer
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.equipment import Equipment
from app.models.budget import Budget
from app.models.soil_report import SoilReport
from app.models.recommendation import Recommendation, RecommendationStatus
from app.models.recommendation_review import RecommendationReview, ReviewStatus
from app.models.recommendation_audit import RecommendationAudit
from app.recommendations.schemas import RecommendationRequest, RecommendationResponse
from app.recommendations.engine import RecommendationEngine
from app.schemas.recommendation_xai import (
    ExplanationResponse,
    SourceResponse,
    ReviewCreate,
    ReviewResponse,
    AuditResponse,
    RecommendationDetailResponse,
    OfficerQueueItem,
    OfficerStatsResponse,
)
from app.services.explanation_service import DecisionExplanationService
from app.services.source_service import SourceService
from app.services.review_service import ReviewService
from app.services.audit_service import AuditService
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

async def _check_rec_access(db: AsyncSession, rec: Recommendation, user: User):
    if user.role in [UserRole.EXTENSION_OFFICER, UserRole.AGRONOMIST]:
        return
    result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=403, detail="Unauthorized")
    result = await db.execute(select(Farm).where(Farm.id == rec.farm_id))
    farm = result.scalar_one_or_none()
    if not farm or farm.farmer_id != farmer.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this farm's recommendation")

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
    crop_type = crops[0].crop_type if crops else None

    soil_reports = (await db.execute(select(SoilReport).where(SoilReport.farm_id == req.farm_id))).scalars().all()
    soil_dict = (
        {
            "nitrogen": soil_reports[0].nitrogen,
            "phosphorus": soil_reports[0].phosphorus,
            "potassium": soil_reports[0].potassium,
            "organic_matter": soil_reports[0].organic_matter,
        }
        if soil_reports
        else None
    )
    
    # Fetch real-time / deterministic fallback weather for farm location
    weather_data = WeatherService.get_current_weather(farm.location)

    # Generate via RecommendationEngine (Single Source of Truth)
    rec_result = RecommendationEngine.generate(
        action=req.target_action,
        budget=total_budget,
        equipment=owned_equipment,
        irrigation=farm.irrigation_type.lower() if farm.irrigation_type else None,
        farm_size=farm.farm_size,
        crop_stage=crop_stage,
        soil_report=soil_dict,
        crop_type=crop_type,
        weather_data=weather_data
    )
    
    # Save recommendation with evaluation_metadata and initial status
    is_high_impact = rec_result.get("is_high_impact", False)
    rec = Recommendation(
        farm_id=req.farm_id,
        recommendation=rec_result["recommendation"],
        explanation=rec_result["explanation"],
        status=RecommendationStatus.GENERATED,
        is_high_impact=is_high_impact,
        constraints_considered=rec_result["constraints_considered"],
        evaluation_metadata={
            "evaluation": rec_result.get("evaluation", {}),
            "alternative": rec_result.get("alternative", {}),
            "resource_snapshot": rec_result.get("resource_snapshot", {})
        },
        estimated_cost=rec_result["estimated_cost"],
        confidence_score=rec_result["confidence_score"]
    )
    db.add(rec)
    await db.flush()

    # Automatically attach default scientific evidence sources
    await SourceService.attach_default_sources(
        db=db,
        recommendation_id=rec.id,
        target_action=req.target_action,
        crop_type=crop_type
    )

    # Record initial audit event (Feature 6)
    await AuditService.record_audit(
        db=db,
        recommendation_id=rec.id,
        action="Recommendation Generated",
        user=user,
        details=f"Generated recommendation for '{farm.name}' (Target action: {req.target_action}, High-Impact: {is_high_impact})."
    )

    await db.commit()
    await db.refresh(rec)
    return rec

@router.get("/weather")
async def get_weather_data(
    location: str = Query("Thanjavur, Tamil Nadu", description="Farm location"),
    user: User = Depends(get_current_user)
):
    """
    Returns real-time or deterministic agro-climatic fallback weather data
    including temperature, rainfall mm, precipitation probability, humidity, and operational constraints.
    """
    return WeatherService.get_current_weather(location)

@router.get("/officer/stats", response_model=OfficerStatsResponse)
async def get_officer_stats(
    db: AsyncSession = Depends(get_db),
    officer: User = Depends(require_extension_officer())
):
    """
    Summary metrics card data for Extension Officer Dashboard.
    """
    recs_res = await db.execute(select(Recommendation))
    all_recs = recs_res.scalars().all()
    total = len(all_recs)
    if total == 0:
        return OfficerStatsResponse(
            total_recommendations=0,
            pending_reviews=0,
            approved=0,
            needs_revision=0,
            average_confidence=0.0,
            average_estimated_cost=0.0,
            recommendations_this_week=0
        )

    pending = sum(1 for r in all_recs if r.status in [RecommendationStatus.GENERATED, RecommendationStatus.UNDER_REVIEW])
    approved = sum(1 for r in all_recs if r.status == RecommendationStatus.APPROVED)
    needs_revision = sum(1 for r in all_recs if r.status == RecommendationStatus.NEEDS_REVISION)
    
    avg_conf = sum(r.confidence_score for r in all_recs) / total
    costs = [r.estimated_cost for r in all_recs if r.estimated_cost is not None]
    avg_cost = (sum(costs) / len(costs)) if costs else 0.0

    one_week_ago = datetime.now() - timedelta(days=7)
    this_week = sum(1 for r in all_recs if r.created_at >= one_week_ago)

    return OfficerStatsResponse(
        total_recommendations=total,
        pending_reviews=pending,
        approved=approved,
        needs_revision=needs_revision,
        average_confidence=round(avg_conf, 2),
        average_estimated_cost=round(avg_cost, 2),
        recommendations_this_week=this_week
    )

@router.get("/officer/queue", response_model=List[OfficerQueueItem])
async def get_officer_queue(
    search: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    farmer: Optional[str] = Query(None),
    farm: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    officer: User = Depends(require_extension_officer())
):
    """
    Extension Officer queue with multi-dimensional filtering across farmers, farms, crops, and review status.
    """
    query = (
        select(Recommendation)
        .options(
            selectinload(Recommendation.farm).selectinload(Farm.farmer).selectinload(Farmer.user),
            selectinload(Recommendation.farm).selectinload(Farm.crops),
            selectinload(Recommendation.reviews).selectinload(RecommendationReview.reviewer)
        )
        .order_by(Recommendation.created_at.desc())
    )

    result = await db.execute(query)
    recs = result.scalars().all()

    items: list[OfficerQueueItem] = []
    for r in recs:
        farm_obj = r.farm
        farmer_obj = farm_obj.farmer if farm_obj else None
        user_obj = farmer_obj.user if farmer_obj else None

        farmer_name = user_obj.name if user_obj else "Unknown Farmer"
        farmer_email = user_obj.email if user_obj else "unknown@example.com"
        farm_name = farm_obj.name if farm_obj else "Unknown Farm"
        crops_list = [c.crop_type for c in farm_obj.crops] if (farm_obj and farm_obj.crops) else []

        latest_rev = r.reviews[0] if r.reviews else None
        current_rec_status = str(r.status.value if hasattr(r.status, 'value') else r.status)

        # Synchronize review status with recommendation lifecycle:
        # 1. If recommendation is already IMPLEMENTED, review status is IMPLEMENTED
        # 2. If recommendation is APPROVED, review status is APPROVED
        # 3. If recommendation is NEEDS_REVISION, review status is NEEDS_REVISION
        # 4. Otherwise, use latest review status if available, else PENDING
        if current_rec_status == "IMPLEMENTED":
            current_rev_status = "IMPLEMENTED"
        elif current_rec_status == "APPROVED":
            current_rev_status = "APPROVED"
        elif current_rec_status == "NEEDS_REVISION":
            current_rev_status = "NEEDS_REVISION"
        elif latest_rev:
            current_rev_status = str(latest_rev.status.value if hasattr(latest_rev.status, 'value') else latest_rev.status)
        else:
            current_rev_status = "PENDING"

        # Apply filtering
        if status and status.upper() != "ALL":
            if status.upper() == "PENDING":
                if current_rec_status not in ["GENERATED", "UNDER_REVIEW"]:
                    continue
            elif current_rec_status.upper() != status.upper():
                continue

        if review_status and review_status.upper() != "ALL":
            if review_status.upper() == "PENDING":
                if current_rev_status != "PENDING" or current_rec_status in ["APPROVED", "IMPLEMENTED", "NEEDS_REVISION"]:
                    continue
            elif current_rev_status.upper() != review_status.upper():
                continue
        if crop and crop.lower() != "all" and not any(crop.lower() in c.lower() for c in crops_list):
            continue
        if farmer and farmer.lower() not in farmer_name.lower() and farmer.lower() not in farmer_email.lower():
            continue
        if farm and farm.lower() not in farm_name.lower():
            continue
        if search:
            s = search.lower()
            match = (
                s in farmer_name.lower() or
                s in farmer_email.lower() or
                s in farm_name.lower() or
                s in r.recommendation.lower() or
                s in r.explanation.lower() or
                any(s in c.lower() for c in crops_list)
            )
            if not match:
                continue

        rev_response = None
        if latest_rev:
            rev_response = ReviewResponse(
                id=latest_rev.id,
                recommendation_id=latest_rev.recommendation_id,
                reviewer_id=latest_rev.reviewer_id,
                reviewer_name=latest_rev.reviewer.name if latest_rev.reviewer else "System Expert",
                reviewer_role=str(latest_rev.reviewer.role.value if (latest_rev.reviewer and hasattr(latest_rev.reviewer.role, 'value')) else (latest_rev.reviewer.role if latest_rev.reviewer else "expert")),
                status=latest_rev.status,
                comment=latest_rev.comment,
                created_at=latest_rev.created_at
            )

        items.append(OfficerQueueItem(
            id=r.id,
            farm_id=r.farm_id,
            farm_name=farm_name,
            farmer_name=farmer_name,
            farmer_email=farmer_email,
            crops=crops_list,
            recommendation=r.recommendation,
            explanation=r.explanation,
            confidence_score=r.confidence_score,
            estimated_cost=r.estimated_cost,
            is_high_impact=r.is_high_impact,
            created_at=r.created_at,
            status=current_rec_status,
            review_status=current_rev_status,
            latest_review=rev_response
        ))

    return items

@router.get("/farms/{farm_id}", response_model=List[RecommendationResponse])
async def get_history(farm_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in [UserRole.EXTENSION_OFFICER, UserRole.AGRONOMIST, UserRole.ADMIN]:
        result = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
        farmer = result.scalar_one_or_none()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
            
        result = await db.execute(select(Farm).where(Farm.id == farm_id))
        farm = result.scalar_one_or_none()
        if not farm or farm.farmer_id != farmer.id:
            raise HTTPException(status_code=404, detail="Farm not found or unauthorized")
        
    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.farm_id == farm_id)
        .order_by(Recommendation.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{id}", response_model=RecommendationDetailResponse)
async def get_recommendation_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Primary endpoint for Recommendation Details page. Returns recommendation,
    dynamically generated explanation, resource snapshot, scientific evidence sources,
    latest review, and append-only audit trail.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await _check_rec_access(db, rec, user)

    # Log viewing audit (Feature 6)
    if user.role in [UserRole.EXTENSION_OFFICER, UserRole.AGRONOMIST, UserRole.ADMIN]:
        await AuditService.record_audit(db, id, "Recommendation Viewed", user=user, details="Viewed by Extension Officer")
    else:
        await AuditService.record_audit(db, id, "Farmer Viewed Recommendation", user=user, details="Viewed by Farm Owner")
    await db.commit()

    explanation = DecisionExplanationService.generate_explanation(rec)
    sources = await SourceService.get_sources_for_recommendation(db, id)
    latest_review = await ReviewService.get_latest_review(db, id)
    audits = await AuditService.get_audits_for_recommendation(db, id)

    return RecommendationDetailResponse(
        recommendation=rec,
        explanation=explanation,
        sources=list(sources),
        latest_review=latest_review,
        audit_trail=list(audits)
    )

@router.get("/{id}/explanation", response_model=ExplanationResponse)
async def get_recommendation_explanation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns dynamically generated explanation for the recommendation.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await _check_rec_access(db, rec, user)
    return DecisionExplanationService.generate_explanation(rec)

@router.get("/{id}/sources", response_model=List[SourceResponse])
async def get_recommendation_sources(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns supporting scientific references for the recommendation.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await _check_rec_access(db, rec, user)
    return await SourceService.get_sources_for_recommendation(db, id)

@router.get("/{id}/audit", response_model=List[AuditResponse])
async def get_recommendation_audit(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns complete chronological audit history for the recommendation.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await _check_rec_access(db, rec, user)
    return await AuditService.get_audits_for_recommendation(db, id)

@router.post("/{id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation_review(
    id: uuid.UUID,
    review_in: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    officer: User = Depends(require_extension_officer())
):
    """
    Allows an Agricultural Extension Officer to submit an expert review.
    Farmers attempting to submit reviews will receive 403 Forbidden.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return await ReviewService.create_review(db, id, officer, review_in)

@router.get("/{id}/reviews", response_model=List[ReviewResponse])
async def get_recommendation_reviews(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns complete chronological review history for the recommendation.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await _check_rec_access(db, rec, user)
    return await ReviewService.get_reviews_for_recommendation(db, id)

@router.post("/{id}/implement", response_model=RecommendationResponse)
async def implement_recommendation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Executes and implements a recommendation on the farm.
    Enforces the Human-in-the-Loop (HITL) compliance execution gate:
    1. Authenticates the user and verifies farm ownership (or Admin).
    2. Prohibits re-implementation if already IMPLEMENTED.
    3. Prohibits implementation if status is NEEDS_REVISION.
    4. For HIGH-IMPACT recommendations, strictly blocks implementation unless status == APPROVED.
    5. Transitions recommendation status to IMPLEMENTED, recording implemented_at,
       implemented_by_id, and immutable audit logs.
    """
    result = await db.execute(select(Recommendation).where(Recommendation.id == id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    # Authorization: Only the farm owner who owns the farm (or Admin) can execute actions
    if user.role != UserRole.ADMIN:
        if user.role != UserRole.FARMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Only the farm owner can implement recommendations."
            )
        farmer_res = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
        farmer = farmer_res.scalar_one_or_none()
        if not farmer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Only the farm owner can implement recommendations."
            )
        farm_res = await db.execute(select(Farm).where(Farm.id == rec.farm_id))
        farm = farm_res.scalar_one_or_none()
        if not farm or farm.farmer_id != farmer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You do not own the farm associated with this recommendation."
            )

    # Prevent re-implementation of already IMPLEMENTED recommendations
    if rec.status == RecommendationStatus.IMPLEMENTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recommendation has already been implemented."
        )

    # Block execution if revisions are required
    if rec.status == RecommendationStatus.NEEDS_REVISION:
        await AuditService.record_audit(
            db=db,
            recommendation_id=rec.id,
            action="Implementation Blocked",
            user=user,
            details=f"Execution blocked: Recommendation was marked as NEEDS_REVISION by extension officer."
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Implementation blocked: Recommendation requires revision before execution."
        )

    # High-impact execution gate: Must be APPROVED by Extension Officer
    if rec.is_high_impact and rec.status != RecommendationStatus.APPROVED:
        await AuditService.record_audit(
            db=db,
            recommendation_id=rec.id,
            action="Implementation Blocked",
            user=user,
            details=f"Execution blocked: High-impact action requires Extension Officer approval before execution (current status: {rec.status.value})."
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Implementation blocked: High-impact recommendation requires human Extension Officer approval before execution (current status: {rec.status.value})."
        )

    # Successful execution: update state and record audit trail
    rec.status = RecommendationStatus.IMPLEMENTED
    rec.implemented_at = datetime.now()
    rec.implemented_by_id = user.id

    await AuditService.record_audit(
        db=db,
        recommendation_id=rec.id,
        action="Recommendation Implemented",
        user=user,
        details=f"Recommendation successfully implemented on farm by {user.name} ({user.role.value if hasattr(user.role, 'value') else user.role})."
    )

    await db.commit()
    await db.refresh(rec)
    return rec


