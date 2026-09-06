import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.farmer import Farmer
from app.repositories.base import BaseRepository
from app.schemas.farmer import FarmerUpdate

class FarmerRepository(BaseRepository[Farmer]):
    def __init__(self):
        super().__init__(Farmer)

    async def get_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> Farmer | None:
        result = await db.execute(select(Farmer).where(Farmer.user_id == user_id))
        return result.scalar_one_or_none()

farmer_repo = FarmerRepository()

class FarmerService:
    @staticmethod
    async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> Farmer | None:
        return await farmer_repo.get_by_user(db, user_id)

    @staticmethod
    async def update_profile(db: AsyncSession, user_id: uuid.UUID, profile_in: FarmerUpdate) -> Farmer | None:
        farmer = await farmer_repo.get_by_user(db, user_id)
        if not farmer:
            return None
        return await farmer_repo.update(db, db_obj=farmer, obj_in=profile_in.model_dump(exclude_unset=True))
