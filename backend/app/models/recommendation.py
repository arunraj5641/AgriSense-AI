import uuid
from typing import Any
from sqlalchemy import String, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Recommendation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recommendations"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    
    # Store structured data so AI-generated recommendations can be easily introduced later
    recommendation: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=False)
    
    # JSON for flexibility in storing constraints like {"budget": "ok", "water": "insufficient"}
    constraints_considered: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="recommendations")
