from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings

# Create async engine. Replace postgresql:// with postgresql+asyncpg:// if needed.
# Ensure the DATABASE_URL uses the async driver.
db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    db_url,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_size=20,
    max_overflow=10
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
