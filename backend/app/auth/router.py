from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserMeResponse, Token
from app.models.user import User, UserRole
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.farmer import Farmer
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

from app.models.company import Company

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Enforce role boundaries: Admin cannot self-register
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Administrator accounts cannot be self-registered.")

    target_role = user_in.role or UserRole.FARMER
    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        role=target_role
    )
    db.add(user)
    await db.flush() # To get user.id
    
    if target_role == UserRole.FARMER:
        farmer = Farmer(user_id=user.id)
        db.add(farmer)
    elif target_role == UserRole.FOOD_PROCESSING_UNIT:
        company = Company(
            user_id=user.id,
            company_name=user_in.name,
            email=user_in.email,
            processing_category="General Food Processing",
            supported_crops=["rice", "wheat", "tomato", "chilli"]
        )
        db.add(company)
        
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/admin/create-officer", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_officer(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can provision Extension Officers.")

    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    officer = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.EXTENSION_OFFICER
    )
    db.add(officer)
    await db.commit()
    await db.refresh(officer)
    return officer

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


