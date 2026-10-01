import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.company import Company, ProcurementRequirement, ProcurementStatus
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyResponse,
    ProcurementCreate, ProcurementUpdate, ProcurementResponse
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/companies", tags=["Food Processing Companies"])

@router.get("", response_model=List[CompanyResponse])
async def list_companies(
    category: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List all registered food processing companies with optional category filtering.
    """
    query = select(Company)
    if active_only:
        query = query.where(Company.active == True)
    if category and category.lower() != "all":
        query = query.where(Company.processing_category.ilike(f"%{category}%"))
    query = query.order_by(Company.company_name.asc())

    result = await db.execute(query)
    return list(result.scalars().all())

@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company_profile(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create or link a company profile for the authenticated food processing unit.
    """
    # Check if company already linked to this user
    existing = await db.execute(select(Company).where(Company.user_id == user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A company profile is already associated with this account.")

    company = Company(
        user_id=user.id,
        company_name=data.company_name,
        address=data.address,
        email=data.email,
        phone=data.phone,
        processing_category=data.processing_category,
        supported_crops=data.supported_crops,
        active=data.active
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company

@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Retrieve the company profile associated with the current user.
    """
    result = await db.execute(select(Company).where(Company.user_id == user.id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found for this account.")
    return company

@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update company profile.
    """
    result = await db.execute(select(Company).where(Company.user_id == user.id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(company, field, val)

    await db.commit()
    await db.refresh(company)
    return company

@router.get("/{id}/procurements", response_model=List[ProcurementResponse])
async def get_company_procurements(
    id: uuid.UUID,
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List procurement requirements for a specific company.
    """
    query = select(ProcurementRequirement).where(ProcurementRequirement.company_id == id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(ProcurementRequirement.status == status_filter.upper())
    query = query.order_by(ProcurementRequirement.created_at.desc())

    result = await db.execute(query)
    procs = result.scalars().all()

    # Attach company name for serialization
    comp_res = await db.execute(select(Company.company_name).where(Company.id == id))
    comp_name = comp_res.scalar_one_or_none() or "Company"

    responses = []
    for p in procs:
        res = ProcurementResponse.model_validate(p)
        res.company_name = comp_name
        responses.append(res)
    return responses

@router.post("/{id}/procurements", response_model=ProcurementResponse, status_code=status.HTTP_201_CREATED)
async def create_procurement_requirement(
    id: uuid.UUID,
    data: ProcurementCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a new procurement requirement. Allowed for the company owner or Admin.
    """
    comp_res = await db.execute(select(Company).where(Company.id == id))
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    if user.role != UserRole.ADMIN and company.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to publish procurement orders for this company.")

    proc = ProcurementRequirement(
        company_id=id,
        crop=data.crop.lower(),
        required_quantity=data.required_quantity,
        minimum_quality_grade=data.minimum_quality_grade,
        moisture_percentage=data.moisture_percentage,
        nitrogen_requirement=data.nitrogen_requirement,
        phosphorus_requirement=data.phosphorus_requirement,
        potassium_requirement=data.potassium_requirement,
        organic_matter_requirement=data.organic_matter_requirement,
        minimum_farm_size=data.minimum_farm_size,
        preferred_irrigation=data.preferred_irrigation,
        harvest_window=data.harvest_window,
        expected_delivery_date=data.expected_delivery_date,
        offered_price=data.offered_price,
        status=data.status
    )
    db.add(proc)
    await db.commit()
    await db.refresh(proc)

    res = ProcurementResponse.model_validate(proc)
    res.company_name = company.company_name
    return res

@router.get("/analytics/overview")
async def get_company_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns analytics KPIs for the current company user.
    """
    comp_res = await db.execute(select(Company).where(Company.user_id == user.id))
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found.")

    return await AnalyticsService.get_company_analytics(db, company.id)
