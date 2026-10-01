import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class ContractStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    INTERESTED = "INTERESTED"
    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED"
    UNDER_COMPANY_REVIEW = "UNDER_COMPANY_REVIEW"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    HARVEST_READY = "HARVEST_READY"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class Contract(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "contracts"

    procurement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("procurement_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    farmer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    agreed_quantity: Mapped[float] = mapped_column(Float, nullable=False) # e.g. metric tonnes or quintals
    agreed_price: Mapped[float] = mapped_column(Float, nullable=False) # price per unit
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), nullable=False, default=ContractStatus.APPLICATION_SUBMITTED)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    procurement = relationship("ProcurementRequirement", back_populates="contracts")
    farm = relationship("Farm")
    farmer = relationship("Farmer")
    company = relationship("Company", back_populates="contracts")
