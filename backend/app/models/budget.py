import uuid
from sqlalchemy import Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Budget(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "budgets"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    available_budget: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="budgets")
