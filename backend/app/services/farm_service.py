import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.farm import Farm
from app.repositories.base import BaseRepository
from app.schemas.farm import FarmCreate

class FarmRepository(BaseRepository[Farm]):
    def __init__(self):
        super().__init__(Farm)
        
    async def get_by_farmer(self, db: AsyncSession, farmer_id: uuid.UUID):
        result = await db.execute(select(Farm).where(Farm.farmer_id == farmer_id))
        return result.scalars().all()

farm_repo = FarmRepository()

class FarmService:
    @staticmethod
    async def create_farm(db: AsyncSession, farmer_id: uuid.UUID, farm_in: FarmCreate) -> Farm:
        return await farm_repo.create(db, obj_in={"farmer_id": farmer_id, **farm_in.model_dump()})
        
    @staticmethod
    async def get_farms_for_farmer(db: AsyncSession, farmer_id: uuid.UUID):
        return await farm_repo.get_by_farmer(db, farmer_id)
        
    @staticmethod
    async def get_farm(db: AsyncSession, farm_id: uuid.UUID) -> Farm | None:
        return await farm_repo.get(db, farm_id)
