import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.company import Company
from app.core.security import get_password_hash
from app.schemas.admin import (
    UserAdminCreate, UserAdminUpdate, UserAdminResponse,
    AdminStatsResponse, AdminChartsResponse
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin", tags=["Admin Portal & Governance"])

@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    """
    List all platform users with search and role filtering. Admin only.
    """
    query = select(User).order_by(User.created_at.desc())
    if role and role.lower() != "all":
        query = query.where(User.role == role.lower())
    if search:
        s = f"%{search.lower()}%"
        query = query.where((User.name.ilike(s)) | (User.email.ilike(s)))
    query = query.limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())

@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    data: UserAdminCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new user with any authorized role (Farmer, Officer, Company, Admin). Admin only.
    """
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    new_user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role
    )
    db.add(new_user)
    await db.flush()

    # If farmer role, create farmer profile
    if data.role == UserRole.FARMER:
        db.add(Farmer(user_id=new_user.id))
    # If company role, create base company profile
    elif data.role == UserRole.FOOD_PROCESSING_UNIT:
        db.add(Company(
            user_id=new_user.id,
            company_name=f"{data.name} Foods",
            email=data.email,
            processing_category="General Processing",
            supported_crops=["rice", "wheat"]
        ))

    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.put("/users/{id}", response_model=UserAdminResponse)
async def update_user_by_admin(
    id: uuid.UUID,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Update user profile, role, or reset password. Admin only.
    """
    result = await db.execute(select(User).where(User.id == id))
    user_obj = result.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found.")

    if data.name:
        user_obj.name = data.name
    if data.email:
        user_obj.email = data.email
    if data.role:
        user_obj.role = data.role
    if data.password:
        user_obj.password_hash = get_password_hash(data.password)

    await db.commit()
    await db.refresh(user_obj)
    return user_obj

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Return high-level platform KPI statistics. Admin only.
    """
    return await AnalyticsService.get_admin_stats(db)

@router.get("/charts", response_model=AdminChartsResponse)
async def get_admin_charts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Return platform distribution charts datasets. Admin only.
    """
    return await AnalyticsService.get_admin_charts(db)
