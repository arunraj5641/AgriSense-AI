from pydantic import BaseModel, EmailStr, ConfigDict
import uuid
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.FARMER

class UserResponse(UserBase):
    id: uuid.UUID
    role: UserRole
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
