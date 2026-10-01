import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.contract import Contract, ContractStatus
from app.models.company import Company, ProcurementRequirement
from app.models.farm import Farm
from app.models.farmer import Farmer
from app.models.user import User, UserRole
from app.services.notification_service import NotificationService
from app.schemas.contract import ContractApplyRequest, ContractStatusUpdate, ContractResponse

class ContractService:
    @staticmethod
    async def apply_for_contract(
        db: AsyncSession,
        farmer_user: User,
        req: ContractApplyRequest
    ) -> Contract:
        """
        Farmer applies for an open company procurement requirement.
        """
        # 1. Verify procurement exists and is open
        p_res = await db.execute(select(ProcurementRequirement).where(ProcurementRequirement.id == req.procurement_id))
        proc = p_res.scalar_one_or_none()
        if not proc or proc.status != "OPEN":
            raise HTTPException(status_code=400, detail="Procurement requirement is not currently open for applications.")

        # 2. Verify farm belongs to farmer
        farmer_res = await db.execute(select(Farmer).where(Farmer.user_id == farmer_user.id))
        farmer = farmer_res.scalar_one_or_none()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer profile not found.")

        farm_res = await db.execute(select(Farm).where(Farm.id == req.farm_id, Farm.farmer_id == farmer.id))
        farm = farm_res.scalar_one_or_none()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found or unauthorized.")

        # 3. Check for existing active application
        existing = await db.execute(
            select(Contract).where(
                Contract.procurement_id == req.procurement_id,
                Contract.farm_id == req.farm_id,
                Contract.status.not_in([ContractStatus.ARCHIVED, ContractStatus.COMPLETED])
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="An active contract application already exists for this farm and requirement.")

        # 4. Create contract
        contract = Contract(
            procurement_id=req.procurement_id,
            farm_id=req.farm_id,
            farmer_id=farmer.id,
            company_id=proc.company_id,
            agreed_quantity=req.agreed_quantity,
            agreed_price=req.agreed_price or proc.offered_price,
            status=ContractStatus.APPLICATION_SUBMITTED,
            terms_and_conditions=req.terms_and_conditions or f"Agreed delivery of {req.agreed_quantity} tonnes of {proc.crop} at price {req.agreed_price} per unit."
        )
        db.add(contract)
        await db.flush()

        # 5. Notify company
        comp_res = await db.execute(select(Company).where(Company.id == proc.company_id))
        comp = comp_res.scalar_one_or_none()
        if comp and comp.user_id:
            await NotificationService.create_notification(
                db=db,
                user_id=comp.user_id,
                title="New Contract Application",
                message=f"Farmer {farmer_user.name} applied for procurement order '{proc.crop}' ({req.agreed_quantity} tonnes).",
                notification_type="CONTRACT_INVITATION",
                link="/company/contracts"
            )

        # 6. Notify farmer
        await NotificationService.create_notification(
            db=db,
            user_id=farmer_user.id,
            title="Contract Application Submitted",
            message=f"Application for '{proc.crop}' with {comp.company_name if comp else 'Company'} submitted and pending review.",
            notification_type="CONTRACT_INVITATION",
            link="/contracts"
        )

        await db.commit()
        await db.refresh(contract)
        return contract

    @staticmethod
    async def update_status(
        db: AsyncSession,
        contract_id: uuid.UUID,
        user: User,
        data: ContractStatusUpdate
    ) -> Contract:
        """
        Updates contract status with strict role verification.
        """
        result = await db.execute(
            select(Contract)
            .options(
                selectinload(Contract.company),
                selectinload(Contract.farmer).selectinload(Farmer.user),
                selectinload(Contract.procurement)
            )
            .where(Contract.id == contract_id)
        )
        contract = result.scalar_one_or_none()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found.")

        # Permission checks
        is_company = user.role == UserRole.FOOD_PROCESSING_UNIT and contract.company.user_id == user.id
        is_farmer = user.role == UserRole.FARMER and contract.farmer.user_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not (is_company or is_farmer or is_admin):
            raise HTTPException(status_code=403, detail="Unauthorized to modify this contract.")

        # Allowed transitions
        # Company can accept or reject, or mark in-progress/completed
        if data.status in [ContractStatus.ACCEPTED, ContractStatus.UNDER_COMPANY_REVIEW, ContractStatus.IN_PROGRESS, ContractStatus.COMPLETED]:
            if not (is_company or is_admin):
                raise HTTPException(status_code=403, detail="Only the contracting company or admin can accept or finalize contracts.")

        # Farmer can mark HARVEST_READY or apply/interested
        if data.status == ContractStatus.HARVEST_READY:
            if not (is_farmer or is_company or is_admin):
                raise HTTPException(status_code=403, detail="Unauthorized.")

        contract.status = data.status
        if data.rejection_reason:
            contract.rejection_reason = data.rejection_reason
        if data.terms_and_conditions:
            contract.terms_and_conditions = data.terms_and_conditions
        if data.status == ContractStatus.ACCEPTED and not contract.signed_at:
            contract.signed_at = datetime.utcnow()

        # Send notifications
        farmer_user_id = contract.farmer.user_id if contract.farmer else None
        company_user_id = contract.company.user_id if contract.company else None

        if data.status == ContractStatus.ACCEPTED:
            if farmer_user_id:
                await NotificationService.create_notification(
                    db=db,
                    user_id=farmer_user_id,
                    title="Contract Accepted! 🎉",
                    message=f"Congratulations! {contract.company.company_name} has accepted your contract for {contract.procurement.crop}.",
                    notification_type="CONTRACT_ACCEPTED",
                    link="/contracts"
                )
        elif data.status == ContractStatus.ARCHIVED:
            if farmer_user_id:
                await NotificationService.create_notification(
                    db=db,
                    user_id=farmer_user_id,
                    title="Contract Application Update",
                    message=f"Contract application for {contract.procurement.crop} was declined or archived. {data.rejection_reason or ''}",
                    notification_type="CONTRACT_REJECTED",
                    link="/contracts"
                )
        elif data.status == ContractStatus.HARVEST_READY:
            if company_user_id:
                await NotificationService.create_notification(
                    db=db,
                    user_id=company_user_id,
                    title="Crop Harvest Ready for Inspection",
                    message=f"Farmer {contract.farmer.user.name} marked contract {contract.procurement.crop} as Harvest Ready.",
                    notification_type="HARVEST_REMINDER",
                    link="/company/contracts"
                )
        elif data.status == ContractStatus.COMPLETED:
            if farmer_user_id:
                await NotificationService.create_notification(
                    db=db,
                    user_id=farmer_user_id,
                    title="Contract Fulfilled & Completed",
                    message=f"Contract for {contract.procurement.crop} has been completed and verified by {contract.company.company_name}.",
                    notification_type="CONTRACT_ACCEPTED",
                    link="/contracts"
                )

        await db.commit()
        await db.refresh(contract)
        return contract

    @staticmethod
    def serialize_contract(contract: Contract) -> ContractResponse:
        return ContractResponse(
            id=contract.id,
            procurement_id=contract.procurement_id,
            farm_id=contract.farm_id,
            farmer_id=contract.farmer_id,
            company_id=contract.company_id,
            crop=contract.procurement.crop if contract.procurement else "Unknown Crop",
            farm_name=contract.farm.name if contract.farm else "Unknown Farm",
            farmer_name=contract.farmer.user.name if (contract.farmer and contract.farmer.user) else "Unknown Farmer",
            farmer_email=contract.farmer.user.email if (contract.farmer and contract.farmer.user) else "",
            company_name=contract.company.company_name if contract.company else "Unknown Company",
            agreed_quantity=contract.agreed_quantity,
            agreed_price=contract.agreed_price,
            status=contract.status,
            terms_and_conditions=contract.terms_and_conditions,
            rejection_reason=contract.rejection_reason,
            signed_at=contract.signed_at,
            created_at=contract.created_at,
            updated_at=contract.updated_at
        )
