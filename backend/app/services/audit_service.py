import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.recommendation_audit import RecommendationAudit
from app.models.user import User

class AuditService:
    @staticmethod
    async def record_audit(
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        action: str,
        user: User | None = None,
        details: str | None = None
    ) -> RecommendationAudit:
        """
        Appends an immutable audit event to the recommendation's audit trail.
        """
        audit = RecommendationAudit(
            id=uuid.uuid4(),
            recommendation_id=recommendation_id,
            user_id=user.id if user else None,
            user_name=user.name if user else "System Automated Engine",
            user_role=str(user.role.value if hasattr(user.role, 'value') else user.role) if user else "system",
            action=action,
            details=details
        )
        db.add(audit)
        if hasattr(db, "flush"):
            await db.flush()
        return audit

    @staticmethod
    async def get_audits_for_recommendation(
        db: AsyncSession,
        recommendation_id: uuid.UUID
    ) -> list[RecommendationAudit]:
        """
        Returns complete chronological audit trail ordered ascending (oldest to newest).
        """
        result = await db.execute(
            select(RecommendationAudit)
            .where(RecommendationAudit.recommendation_id == recommendation_id)
            .order_by(RecommendationAudit.created_at.asc())
        )
        return list(result.scalars().all())
