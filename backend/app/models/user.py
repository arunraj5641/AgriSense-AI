import enum
from sqlalchemy import String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class UserRole(str, enum.Enum):
    FARMER = "farmer"
    AGRONOMIST = "agronomist"
    FOOD_PROCESSING_UNIT = "food_processing_unit"

class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.FARMER)

    # Relationships
    farmer_profile = relationship("Farmer", back_populates="user", uselist=False, cascade="all, delete-orphan")
