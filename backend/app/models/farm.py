import uuid
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Farm(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "farms"

    farmer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farmers.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    farm_size: Mapped[float] = mapped_column(Float, nullable=False, comment="Size in acres or hectares")
    irrigation_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    farmer = relationship("Farmer", back_populates="farms")
    crops = relationship("Crop", back_populates="farm", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="farm", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="farm", cascade="all, delete-orphan")
    soil_reports = relationship("SoilReport", back_populates="farm", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="farm", cascade="all, delete-orphan")
