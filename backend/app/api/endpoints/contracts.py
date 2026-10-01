import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.soil_report import SoilReport
from app.models.budget import Budget
from app.models.recommendation import Recommendation
from app.models.company import Company, ProcurementRequirement, ProcurementStatus
from app.models.contract import Contract, ContractStatus
from app.schemas.contract import (
    ContractApplyRequest, ContractStatusUpdate, ContractResponse, MatchingResult
)
from app.schemas.company import ProcurementResponse
from app.services.contract_service import ContractService
from app.services.matching_service import FarmerCompanyMatchingEngine

router = APIRouter(tags=["Contracts & Matching"])

@router.get("/procurements", response_model=List[ProcurementResponse])
async def list_all_procurements(
    crop: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("OPEN"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List all open procurement requirements across all food processing companies.
    """
    query = (
        select(ProcurementRequirement)
        .options(selectinload(ProcurementRequirement.company))
        .order_by(ProcurementRequirement.created_at.desc())
    )
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(ProcurementRequirement.status == status_filter.upper())
    if crop and crop.lower() != "all":
        query = query.where(ProcurementRequirement.crop.ilike(f"%{crop.lower()}%"))

    result = await db.execute(query)
    procs = result.scalars().all()

    responses = []
    for p in procs:
        res = ProcurementResponse.model_validate(p)
        res.company_name = p.company.company_name if p.company else "Processing Partner"
        responses.append(res)
    return responses

@router.get("/contracts", response_model=List[ContractResponse])
async def list_contracts(
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List contracts based on authenticated user's role:
    - Farmer: views contracts for their farms
    - Food Processing Unit: views contracts for their company
    - Extension Officer / Admin: views all contracts
    """
    query = (
        select(Contract)
        .options(
            selectinload(Contract.company),
            selectinload(Contract.farmer).selectinload(Farmer.user),
            selectinload(Contract.farm),
            selectinload(Contract.procurement)
        )
        .order_by(Contract.created_at.desc())
    )

    if user.role == UserRole.FARMER:
        farmer_res = await db.execute(select(Farmer.id).where(Farmer.user_id == user.id))
        farmer_id = farmer_res.scalar_one_or_none()
        if not farmer_id:
            return []
        query = query.where(Contract.farmer_id == farmer_id)

    elif user.role == UserRole.FOOD_PROCESSING_UNIT:
        comp_res = await db.execute(select(Company.id).where(Company.user_id == user.id))
        company_id = comp_res.scalar_one_or_none()
        if not company_id:
            return []
        query = query.where(Contract.company_id == company_id)

    if status_filter and status_filter.upper() != "ALL":
        query = query.where(Contract.status == status_filter.upper())

    result = await db.execute(query)
    contracts = result.scalars().all()
    return [ContractService.serialize_contract(c) for c in contracts]

@router.get("/contracts/{id}", response_model=ContractResponse)
async def get_contract_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific contract.
    """
    result = await db.execute(
        select(Contract)
        .options(
            selectinload(Contract.company),
            selectinload(Contract.farmer).selectinload(Farmer.user),
            selectinload(Contract.farm),
            selectinload(Contract.procurement)
        )
        .where(Contract.id == id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    return ContractService.serialize_contract(contract)

@router.post("/contracts/apply", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def apply_for_contract(
    req: ContractApplyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Farmer applies for an open company procurement requirement.
    """
    contract = await ContractService.apply_for_contract(db, user, req)
    # Re-fetch with relationships
    return await get_contract_details(contract.id, db, user)

@router.put("/contracts/{id}/status", response_model=ContractResponse)
async def update_contract_status(
    id: uuid.UUID,
    data: ContractStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update contract lifecycle status (Accept, In Progress, Harvest Ready, Completed, Archived).
    """
    contract = await ContractService.update_status(db, id, user, data)
    return await get_contract_details(contract.id, db, user)

@router.get("/contracts/matching/{farm_id}", response_model=List[MatchingResult])
async def match_farm_to_companies(
    farm_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Deterministic Farmer-Company Matching Engine.
    Evaluates farm soil, irrigation, crop, and advisory confidence against all open
    procurement requirements.
    """
    # Fetch farm and resources
    farm_res = await db.execute(
        select(Farm)
        .options(
            selectinload(Farm.crops),
            selectinload(Farm.soil_reports),
            selectinload(Farm.budgets),
            selectinload(Farm.recommendations)
        )
        .where(Farm.id == farm_id)
    )
    farm = farm_res.scalar_one_or_none()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")

    crop = farm.crops[0] if farm.crops else None
    soil = farm.soil_reports[0] if farm.soil_reports else None
    budget = farm.budgets[0] if farm.budgets else None
    latest_rec = farm.recommendations[0] if farm.recommendations else None

    # Fetch all open procurement requirements with company
    procs_res = await db.execute(
        select(ProcurementRequirement)
        .options(selectinload(ProcurementRequirement.company))
        .where(ProcurementRequirement.status == ProcurementStatus.OPEN)
    )
    procs = procs_res.scalars().all()

    matches: List[MatchingResult] = []
    for p in procs:
        company = p.company
        if not company or not company.active:
            continue

        match_res = FarmerCompanyMatchingEngine.evaluate_match(
            procurement=p,
            company=company,
            farm=farm,
            crop=crop,
            soil=soil,
            budget=budget,
            latest_recommendation=latest_rec
        )
        if match_res:
            matches.append(match_res)

    # Sort matches by compatibility score descending
    matches.sort(key=lambda m: m.compatibility_score, reverse=True)
    return matches
