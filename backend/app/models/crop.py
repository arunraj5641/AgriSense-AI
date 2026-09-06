import uuid
from datetime import date
from sqlalchemy import String, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Crop(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "crops"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    crop_type: Mapped[str] = mapped_column(String(100), nullable=False)
    crop_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    sowing_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="crops")
