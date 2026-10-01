import uuid
import enum
from typing import Any
from sqlalchemy import String, Float, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class RecommendationStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    NEEDS_REVISION = "NEEDS_REVISION"
    IMPLEMENTED = "IMPLEMENTED"
    ARCHIVED = "ARCHIVED"

class Recommendation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recommendations"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    
    # Store structured data so AI-generated recommendations can be easily introduced later
    recommendation: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=False)
    
    # Lifecycle status
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus), nullable=False, default=RecommendationStatus.GENERATED
    )

    # JSON for flexibility in storing constraints like {"budget": "ok", "water": "insufficient"}
    constraints_considered: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    # Structured evaluation returned by RecommendationEngine (Phase 2)
    evaluation_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="recommendations")
    sources = relationship("RecommendationSource", back_populates="recommendation", cascade="all, delete-orphan")
    reviews = relationship("RecommendationReview", back_populates="recommendation", cascade="all, delete-orphan", order_by="RecommendationReview.created_at.desc()")
    audits = relationship("RecommendationAudit", back_populates="recommendation", cascade="all, delete-orphan", order_by="RecommendationAudit.created_at.asc()")

