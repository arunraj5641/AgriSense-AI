import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Farmer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "farmers"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")

    # Relationships
    user = relationship("User", back_populates="farmer_profile")
    farms = relationship("Farm", back_populates="farmer", cascade="all, delete-orphan")
