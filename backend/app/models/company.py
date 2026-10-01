import uuid
import enum
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Float, Boolean, Date, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class ProcurementStatus(str, enum.Enum):
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    FULFILLED = "FULFILLED"
    CLOSED = "CLOSED"

class Company(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "companies"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    processing_category: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., Grains, Horticulture, Dairy, Oilseeds
    supported_crops: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list) # e.g. ["rice", "wheat", "tomato"]
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    procurement_requirements = relationship("ProcurementRequirement", back_populates="company", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="company")

class ProcurementRequirement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "procurement_requirements"

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    crop: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    required_quantity: Mapped[float] = mapped_column(Float, nullable=False) # in metric tonnes / quintals
    minimum_quality_grade: Mapped[str] = mapped_column(String(50), nullable=False) # Grade A, Grade A+, Export
    moisture_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # Max allowed moisture %
    nitrogen_requirement: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # min acceptable N (mg/kg or kg/ha)
    phosphorus_requirement: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    potassium_requirement: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    organic_matter_requirement: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # min organic matter %
    minimum_farm_size: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # min farm size (acres/hectares)
    preferred_irrigation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # drip, sprinkler, rainfed
    harvest_window: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g. October - November
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    offered_price: Mapped[float] = mapped_column(Float, nullable=False) # per unit currency
    status: Mapped[ProcurementStatus] = mapped_column(Enum(ProcurementStatus), nullable=False, default=ProcurementStatus.OPEN)

    # Relationships
    company = relationship("Company", back_populates="procurement_requirements")
    contracts = relationship("Contract", back_populates="procurement")
