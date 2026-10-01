import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.farmer import Farmer
from app.models.recommendation import Recommendation, RecommendationStatus
from app.models.contract import Contract, ContractStatus
from app.models.user import User, UserRole
from app.services.notification_service import NotificationService

class ReminderService:
    """
    Automated agronomic reminder engine for crop stages, irrigation, fertilizer,
    harvest schedules, contract milestones, and pending officer reviews.
    """

    @staticmethod
    async def generate_farm_reminders(db: AsyncSession, farm_id: uuid.UUID) -> int:
        """
        Generates contextual reminders for a given farm based on crop sowing dates,
        growth stages, and recent recommendations.
        """
        result = await db.execute(select(Farm).where(Farm.id == farm_id))
        farm = result.scalar_one_or_none()
        if not farm:
            return 0

        # Get farmer user id
        farmer_res = await db.execute(select(Farmer).where(Farmer.id == farm.farmer_id))
        farmer = farmer_res.scalar_one_or_none()
        if not farmer or not farmer.user_id:
            return 0

        user_id = farmer.user_id
        reminders_created = 0

        # Check crops
        crops_res = await db.execute(select(Crop).where(Crop.farm_id == farm_id))
        crops = crops_res.scalars().all()

        today = date.today()
        for c in crops:
            days_since_sowing = (today - c.sowing_date).days if c.sowing_date else 30

            # 1. Irrigation Reminder (every 7 days)
            if days_since_sowing % 7 == 0:
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title=f"Irrigation Schedule: {farm.name}",
                    message=f"Optimal irrigation cycle reached for {c.crop_type.capitalize()} ({c.crop_stage}). Inspect soil moisture levels.",
                    notification_type="IRRIGATION_REMINDER",
                    link=f"/dashboard/{farm.id}"
                )
                reminders_created += 1

            # 2. Fertilizer Top-Dressing Reminder (around 30-40 days for vegetative)
            if 28 <= days_since_sowing <= 35 and c.crop_stage == "vegetative":
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title=f"Fertilizer Top-Dressing: {c.crop_type.capitalize()}",
                    message=f"{farm.name} is in peak vegetative growth. Apply scheduled nitrogen split dosage per recommendation.",
                    notification_type="FERTILIZER_REMINDER",
                    link=f"/recommendations"
                )
                reminders_created += 1

            # 3. Harvest Preparation Reminder (if flowering/maturity)
            if c.crop_stage in ["maturity", "ripening"]:
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title=f"Harvest Window Approaching: {c.crop_type.capitalize()}",
                    message=f"{farm.name} is nearing maturity. Ensure harvesting equipment and storage containers are prepared.",
                    notification_type="HARVEST_REMINDER",
                    link=f"/dashboard/{farm.id}"
                )
                reminders_created += 1

        await db.commit()
        return reminders_created

    @staticmethod
    async def generate_officer_review_reminders(db: AsyncSession) -> int:
        """
        Notifies Extension Officers when recommendations have been waiting in queue for review.
        """
        # Find recommendations pending review
        recs_res = await db.execute(
            select(Recommendation).where(Recommendation.status == RecommendationStatus.UNDER_REVIEW)
        )
        pending_recs = recs_res.scalars().all()
        if not pending_recs:
            return 0

        # Find officers
        officers_res = await db.execute(
            select(User).where(User.role.in_([UserRole.EXTENSION_OFFICER, UserRole.AGRONOMIST]))
        )
        officers = officers_res.scalars().all()
        count = 0

        for officer in officers:
            await NotificationService.create_notification(
                db=db,
                user_id=officer.id,
                title="Review Queue Pending",
                message=f"There are {len(pending_recs)} agricultural recommendations waiting for agronomic verification.",
                notification_type="REVIEW_PENDING",
                link="/officer"
            )
            count += 1

        await db.commit()
        return count
