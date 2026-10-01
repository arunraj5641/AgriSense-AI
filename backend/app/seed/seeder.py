import asyncio
import uuid
import random
from datetime import date, datetime, timedelta
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.equipment import Equipment
from app.models.budget import Budget
from app.models.soil_report import SoilReport
from app.models.recommendation import Recommendation, RecommendationStatus
from app.models.recommendation_review import RecommendationReview, ReviewStatus
from app.models.recommendation_audit import RecommendationAudit
from app.models.company import Company, ProcurementRequirement
from app.models.notification import Notification
from app.core.security import get_password_hash
from app.recommendations.engine import RecommendationEngine
from app.services.source_service import SourceService

async def seed_data():
    async with AsyncSessionLocal() as session:
        print("Checking existing seed data...")

        # 1. Deterministic Officer Account
        officer_res = await session.execute(select(User).where(User.email == "officer@example.com"))
        officer = officer_res.scalar_one_or_none()
        if not officer:
            officer = User(
                email="officer@example.com",
                name="Dr. Aruna Swaminathan (Extension Officer)",
                password_hash=get_password_hash("password123"),
                role=UserRole.EXTENSION_OFFICER
            )
            session.add(officer)
            await session.flush()
            print("Created Extension Officer: officer@example.com")

        # 2. Deterministic Admin Account
        admin_res = await session.execute(select(User).where(User.email == "admin@example.com"))
        if not admin_res.scalar_one_or_none():
            admin = User(
                email="admin@example.com",
                name="System Administrator",
                password_hash=get_password_hash("password123"),
                role=UserRole.ADMIN
            )
            session.add(admin)
            print("Created Admin: admin@example.com")

        # 3. Deterministic Primary Farmer Account
        farmer_user_res = await session.execute(select(User).where(User.email == "farmer@example.com"))
        farmer_user = farmer_user_res.scalar_one_or_none()
        if not farmer_user:
            farmer_user = User(
                email="farmer@example.com",
                name="Ramesh Patel",
                password_hash=get_password_hash("password123"),
                role=UserRole.FARMER
            )
            session.add(farmer_user)
            await session.flush()

            farmer_prof = Farmer(user_id=farmer_user.id, phone="+91 98765 43210", address="Plot 42, Cauvery Delta Region")
            session.add(farmer_prof)
            await session.flush()

            # Primary demo farm
            demo_farm = Farm(
                farmer_id=farmer_prof.id,
                name="Cauvery Sunrise Farm",
                location="Thanjavur, Tamil Nadu",
                farm_size=4.5,
                irrigation_type="drip"
            )
            session.add(demo_farm)
            await session.flush()

            # Resources
            session.add(Crop(farm_id=demo_farm.id, crop_type="rice", crop_stage="vegetative", sowing_date=date.today() - timedelta(days=35)))
            session.add(Budget(farm_id=demo_farm.id, available_budget=1800.0))
            session.add(Equipment(farm_id=demo_farm.id, equipment_name="tractor", quantity=1))
            session.add(Equipment(farm_id=demo_farm.id, equipment_name="spreader", quantity=1))
            session.add(SoilReport(farm_id=demo_farm.id, nitrogen=18.5, phosphorus=28.0, potassium=38.0, organic_matter=1.8))
            await session.flush()

            # Generate sample recommendations for demo farm
            rec1_res = RecommendationEngine.generate(
                action="apply_fertilizer",
                budget=1800.0,
                equipment=["tractor", "spreader"],
                irrigation="drip",
                farm_size=4.5,
                crop_stage="vegetative",
                soil_report={"nitrogen": 18.5, "phosphorus": 28.0, "potassium": 38.0, "organic_matter": 1.8},
                crop_type="rice"
            )

            rec1 = Recommendation(
                farm_id=demo_farm.id,
                recommendation=rec1_res["recommendation"],
                explanation=rec1_res["explanation"],
                status=RecommendationStatus.APPROVED,
                constraints_considered=rec1_res["constraints_considered"],
                evaluation_metadata={
                    "evaluation": rec1_res.get("evaluation", {}),
                    "alternative": rec1_res.get("alternative", {}),
                    "resource_snapshot": rec1_res.get("resource_snapshot", {})
                },
                estimated_cost=rec1_res["estimated_cost"],
                confidence_score=rec1_res["confidence_score"]
            )
            session.add(rec1)
            await session.flush()

            await SourceService.attach_default_sources(session, rec1.id, "apply_fertilizer", "rice")
            
            # Add review
            session.add(RecommendationReview(
                recommendation_id=rec1.id,
                reviewer_id=officer.id,
                status=ReviewStatus.APPROVED,
                comment="NPK split application verified compliant with TNAU wetland rice protocol. Approved for field execution."
            ))
            # Add audit
            session.add(RecommendationAudit(
                recommendation_id=rec1.id,
                user_id=farmer_user.id,
                user_name=farmer_user.name,
                user_role="farmer",
                action="Recommendation Generated",
                details="Initial deterministic rule engine recommendation generated."
            ))
            session.add(RecommendationAudit(
                recommendation_id=rec1.id,
                user_id=officer.id,
                user_name=officer.name,
                user_role="extension_officer",
                action="Recommendation Approved",
                details="Extension officer approved fertilizer protocol."
            ))

            # Second recommendation (Pending review)
            rec2_res = RecommendationEngine.generate(
                action="harvest",
                budget=1800.0,
                equipment=["tractor", "spreader"], # missing harvester
                irrigation="drip",
                farm_size=4.5,
                crop_stage="vegetative", # suboptimal stage
                soil_report=None,
                crop_type="rice"
            )
            rec2 = Recommendation(
                farm_id=demo_farm.id,
                recommendation=rec2_res["recommendation"],
                explanation=rec2_res["explanation"],
                status=RecommendationStatus.UNDER_REVIEW,
                constraints_considered=rec2_res["constraints_considered"],
                evaluation_metadata={
                    "evaluation": rec2_res.get("evaluation", {}),
                    "alternative": rec2_res.get("alternative", {}),
                    "resource_snapshot": rec2_res.get("resource_snapshot", {})
                },
                estimated_cost=rec2_res["estimated_cost"],
                confidence_score=rec2_res["confidence_score"]
            )
            session.add(rec2)
            await session.flush()
            await SourceService.attach_default_sources(session, rec2.id, "harvest", "rice")
            session.add(RecommendationAudit(
                recommendation_id=rec2.id,
                user_id=farmer_user.id,
                user_name=farmer_user.name,
                user_role="farmer",
                action="Recommendation Generated",
                details="Generated harvest advisory."
            ))

            print("Created Farmer: farmer@example.com with demo farm and recommendations")

        # 4. Deterministic Food Processing Company Account
        company_user_res = await session.execute(select(User).where(User.email == "company@example.com"))
        company_user = company_user_res.scalar_one_or_none()
        if not company_user:
            company_user = User(
                email="company@example.com",
                name="Kalyani Agro-Foods Ltd.",
                password_hash=get_password_hash("password123"),
                role=UserRole.FOOD_PROCESSING_UNIT
            )
            session.add(company_user)
            await session.flush()

            comp_profile = Company(
                user_id=company_user.id,
                company_name="Kalyani Agro-Foods Ltd.",
                address="Export Processing Zone, Thanjavur Industrial Corridor",
                email="company@example.com",
                phone="+91 4362 250000",
                processing_category="Grains & Pulses",
                supported_crops=["rice", "wheat", "tomato"],
                active=True
            )
            session.add(comp_profile)
            await session.flush()

            # Procurement 1: Rice
            proc_rice = ProcurementRequirement(
                company_id=comp_profile.id,
                crop="rice",
                required_quantity=200.0,
                minimum_quality_grade="Grade A",
                moisture_percentage=14.0,
                nitrogen_requirement=16.0,
                phosphorus_requirement=22.0,
                potassium_requirement=30.0,
                organic_matter_requirement=1.5,
                minimum_farm_size=2.0,
                preferred_irrigation="drip",
                harvest_window="October - November",
                offered_price=320.0,
                status="OPEN"
            )
            session.add(proc_rice)

            # Procurement 2: Wheat
            proc_wheat = ProcurementRequirement(
                company_id=comp_profile.id,
                crop="wheat",
                required_quantity=150.0,
                minimum_quality_grade="Grade A+",
                moisture_percentage=12.0,
                nitrogen_requirement=18.0,
                minimum_farm_size=2.5,
                preferred_irrigation="drip",
                harvest_window="December - January",
                offered_price=280.0,
                status="OPEN"
            )
            session.add(proc_wheat)

            # Procurement 3: Tomato
            proc_tomato = ProcurementRequirement(
                company_id=comp_profile.id,
                crop="tomato",
                required_quantity=100.0,
                minimum_quality_grade="Export Quality",
                moisture_percentage=85.0,
                minimum_farm_size=1.0,
                preferred_irrigation="drip",
                harvest_window="Year-round",
                offered_price=450.0,
                status="OPEN"
            )
            session.add(proc_tomato)
            await session.flush()

            # Create sample notification for farmer
            if farmer_user:
                session.add(Notification(
                    user_id=farmer_user.id,
                    title="New Procurement Opportunity",
                    message="Kalyani Agro-Foods published a Grade A Rice procurement quota. Check matching compatibility!",
                    notification_type="PROCUREMENT_DEADLINE",
                    link="/contracts",
                    is_read=False
                ))

            print("Created Company: company@example.com with 3 active procurement requirements")

        await session.commit()
        print("Successfully completed seeding.")

if __name__ == "__main__":
    asyncio.run(seed_data())
