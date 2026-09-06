import uuid
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass

class TimestampMixin:
    """Mixin to add created_at and updated_at columns."""
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

class UUIDMixin:
    """Mixin to add a UUID primary key."""
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
