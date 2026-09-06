import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Equipment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "equipment"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    equipment_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="equipment")
