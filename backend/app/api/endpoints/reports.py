import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.recommendation import Recommendation
from app.models.recommendation_review import RecommendationReview
from app.models.company import Company, ProcurementRequirement
from app.models.contract import Contract
from app.services.report_service import ReportService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("/farmer-summary")
async def export_farmer_summary(
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Export comprehensive farm summary, crops, and contract status for farmer.
    """
    farmer_res = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
    farmer = farmer_res.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")

    farms_res = await db.execute(
        select(Farm)
        .options(selectinload(Farm.crops), selectinload(Farm.budgets), selectinload(Farm.soil_reports))
        .where(Farm.farmer_id == farmer.id)
    )
    farms = farms_res.scalars().all()

    headers = ["Farm Name", "Location", "Size (ha)", "Irrigation", "Active Crop", "Growth Stage", "Budget ($)"]
    rows = []
    for f in farms:
        crop_name = f.crops[0].crop_type.capitalize() if f.crops else "None"
        crop_stage = f.crops[0].crop_stage.capitalize() if f.crops else "N/A"
        budget_val = f"${f.budgets[0].available_budget:,.2f}" if f.budgets else "$0.00"
        rows.append([
            f.name,
            f.location or "Regional",
            f"{f.farm_size} ha",
            (f.irrigation_type or "Rainfed").capitalize(),
            crop_name,
            crop_stage,
            budget_val
        ])

    analytics = await AnalyticsService.get_farmer_analytics(db, user.id)
    summary_stats = {
        "Farmer Name": user.name,
        "Total Farms Registered": len(farms),
        "Total Advisory Cost": f"${analytics.get('estimated_cost', 0):,.2f}",
        "Estimated Fertilizer Savings": f"${analytics.get('estimated_savings', 0):,.2f}",
        "Active Farming Contracts": analytics.get('active_contracts', 0)
    }

    if format == "csv":
        csv_str = ReportService.generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=farmer_summary.csv"}
        )
    else:
        pdf_bytes = ReportService.generate_pdf(
            title="Farmer Agricultural Summary Report",
            subtitle=f"Farm Portfolios & Agronomic Overview for {user.name}",
            headers=headers,
            data_rows=rows,
            summary_stats=summary_stats
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=farmer_summary.pdf"}
        )

@router.get("/officer-activity")
async def export_officer_activity(
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Export extension officer review activity, verified recommendations, and turnaround metrics.
    """
    reviews_res = await db.execute(
        select(RecommendationReview)
        .options(selectinload(RecommendationReview.recommendation).selectinload(Recommendation.farm))
        .where(RecommendationReview.reviewer_id == user.id)
        .order_by(RecommendationReview.created_at.desc())
    )
    reviews = reviews_res.scalars().all()

    headers = ["Date", "Farm", "Advisory Action", "Status Decision", "Officer Verification Notes"]
    rows = []
    for r in reviews:
        farm_name = r.recommendation.farm.name if (r.recommendation and r.recommendation.farm) else "Regional Farm"
        action = r.recommendation.recommendation[:40] + "..." if (r.recommendation and len(r.recommendation.recommendation) > 40) else (r.recommendation.recommendation if r.recommendation else "Advisory")
        rows.append([
            r.created_at.strftime("%Y-%m-%d"),
            farm_name,
            action,
            str(r.status.value if hasattr(r.status, 'value') else r.status),
            r.comment[:60] + "..." if len(r.comment) > 60 else r.comment
        ])

    summary_stats = {
        "Officer Name": user.name,
        "Total Reviews Submitted": len(reviews),
        "Approved Recommendations": len([r for r in reviews if "APPROV" in str(r.status).upper()]),
        "Revisions Requested": len([r for r in reviews if "REVIS" in str(r.status).upper()])
    }

    if format == "csv":
        csv_str = ReportService.generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=officer_activity.csv"}
        )
    else:
        pdf_bytes = ReportService.generate_pdf(
            title="Agricultural Extension Officer Activity Report",
            subtitle=f"Verification & Quality Review Log for {user.name}",
            headers=headers,
            data_rows=rows,
            summary_stats=summary_stats
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=officer_activity.pdf"}
        )

@router.get("/company-procurement")
async def export_company_procurement(
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Export procurement fulfillment and contract agreements for company.
    """
    comp_res = await db.execute(select(Company).where(Company.user_id == user.id))
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found.")

    contracts_res = await db.execute(
        select(Contract)
        .options(selectinload(Contract.farmer).selectinload(Farmer.user), selectinload(Contract.procurement), selectinload(Contract.farm))
        .where(Contract.company_id == company.id)
        .order_by(Contract.created_at.desc())
    )
    contracts = contracts_res.scalars().all()

    headers = ["Contract ID", "Farmer", "Farm", "Crop", "Agreed Qty (T)", "Offered Price ($)", "Status"]
    rows = []
    for c in contracts:
        farmer_name = c.farmer.user.name if (c.farmer and c.farmer.user) else "Farmer"
        farm_name = c.farm.name if c.farm else "Farm"
        crop = c.procurement.crop.capitalize() if c.procurement else "Crop"
        rows.append([
            str(c.id)[:8] + "...",
            farmer_name,
            farm_name,
            crop,
            f"{c.agreed_quantity} T",
            f"${c.agreed_price:,.2f}",
            str(c.status.value if hasattr(c.status, 'value') else c.status)
        ])

    analytics = await AnalyticsService.get_company_analytics(db, company.id)
    summary_stats = {
        "Company Name": company.company_name,
        "Total Procurement Target": f"{analytics.get('total_required_quantity', 0)} T",
        "Committed Volume": f"{analytics.get('committed_quantity', 0)} T",
        "Procurement Fulfillment": f"{analytics.get('fulfillment_percentage', 0)}%",
        "Active Binding Contracts": analytics.get('active_contracts', 0)
    }

    if format == "csv":
        csv_str = ReportService.generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=procurement_report.csv"}
        )
    else:
        pdf_bytes = ReportService.generate_pdf(
            title="Food Processing Procurement & Contract Fulfillment Report",
            subtitle=f"Sourcing Audit for {company.company_name}",
            headers=headers,
            data_rows=rows,
            summary_stats=summary_stats
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=procurement_report.pdf"}
        )

@router.get("/admin-platform")
async def export_admin_platform(
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Export platform-wide governance, user registrations, and contract milestones.
    """
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    stats = await AnalyticsService.get_admin_stats(db)

    users_res = await db.execute(select(User).order_by(User.created_at.desc()).limit(100))
    users = users_res.scalars().all()

    headers = ["User Name", "Email Address", "System Role", "Registered On"]
    rows = []
    for u in users:
        rows.append([
            u.name,
            u.email,
            str(u.role.value if hasattr(u.role, 'value') else u.role).replace("_", " ").capitalize(),
            u.created_at.strftime("%Y-%m-%d")
        ])

    summary_stats = {
        "Total Registered Users": stats.get("total_users", 0),
        "Total Active Farms": stats.get("total_farms", 0),
        "Recommendations Generated": stats.get("total_recommendations", 0),
        "Officer Verification Rate": f"{stats.get('approval_rate', 0)}%",
        "Contract Farming Agreements": stats.get("total_contracts", 0)
    }

    if format == "csv":
        csv_str = ReportService.generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=admin_platform.csv"}
        )
    else:
        pdf_bytes = ReportService.generate_pdf(
            title="AgriSense AI – Platform Governance & Ecosystem Audit",
            subtitle="Executive Administration Summary",
            headers=headers,
            data_rows=rows,
            summary_stats=summary_stats
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=admin_platform.pdf"}
        )
