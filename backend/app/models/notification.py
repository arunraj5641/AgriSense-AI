import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True) 
    # e.g., RECOMMENDATION_GENERATED, RECOMMENDATION_REVIEWED, RECOMMENDATION_APPROVED, 
    # REVIEW_NEEDS_REVISION, CONTRACT_INVITATION, CONTRACT_ACCEPTED, CONTRACT_REJECTED, 
    # IRRIGATION_REMINDER, FERTILIZER_REMINDER, HARVEST_REMINDER, PROCUREMENT_DEADLINE, ADMIN_ANNOUNCEMENT
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    user = relationship("User")
