import uuid
from sqlalchemy import Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class SoilReport(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "soil_reports"

    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    nitrogen: Mapped[float | None] = mapped_column(Float, nullable=True)
    phosphorus: Mapped[float | None] = mapped_column(Float, nullable=True)
    potassium: Mapped[float | None] = mapped_column(Float, nullable=True)
    organic_matter: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    farm = relationship("Farm", back_populates="soil_reports")
