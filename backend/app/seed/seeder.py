import asyncio
import uuid
import random
from datetime import date, timedelta
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.equipment import Equipment
from app.models.budget import Budget
from app.models.soil_report import SoilReport
from app.core.security import get_password_hash

async def seed_data():
    async with AsyncSessionLocal() as session:
        print("Seeding ~100 farmers...")
        for i in range(100):
            user = User(
                email=f"farmer{i}@example.com",
                name=f"Farmer {i}",
                password_hash=get_password_hash("password123"),
                role=UserRole.FARMER
            )
            session.add(user)
            await session.flush()
            
            farmer = Farmer(user_id=user.id, phone=f"555-010{i:02d}", address=f"Farm Lane {i}")
            session.add(farmer)
            await session.flush()
            
            # Create 1-3 farms per farmer (approx 150 total)
            num_farms = random.choice([1, 1, 2, 2, 3])
            for j in range(num_farms):
                farm = Farm(
                    farmer_id=farmer.id,
                    name=f"Farm {i}-{j}",
                    location=f"Region {random.randint(1, 10)}",
                    farm_size=round(random.uniform(1.0, 50.0), 2),
                    irrigation_type=random.choice(["drip", "sprinkler", "rainfed"])
                )
                session.add(farm)
                await session.flush()
                
                # Resources
                crop = Crop(
                    farm_id=farm.id,
                    crop_type=random.choice(["wheat", "corn", "rice"]),
                    crop_stage=random.choice(["vegetative", "flowering", "maturity"]),
                    sowing_date=date.today() - timedelta(days=random.randint(10, 100))
                )
                session.add(crop)
                
                budget = Budget(farm_id=farm.id, available_budget=round(random.uniform(500, 5000), 2))
                session.add(budget)
                
                equipment_list = random.sample(["tractor", "harvester", "spreader", "plow"], k=random.randint(0, 3))
                for eq in equipment_list:
                    session.add(Equipment(farm_id=farm.id, equipment_name=eq, quantity=1))
                    
                soil = SoilReport(
                    farm_id=farm.id,
                    nitrogen=round(random.uniform(10, 50), 2),
                    phosphorus=round(random.uniform(10, 50), 2),
                    potassium=round(random.uniform(10, 50), 2),
                    organic_matter=round(random.uniform(1, 5), 2)
                )
                session.add(soil)
                
        await session.commit()
        print("Successfully seeded database with synthetic data.")

if __name__ == "__main__":
    asyncio.run(seed_data())
