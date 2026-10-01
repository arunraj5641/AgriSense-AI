import uuid
from datetime import datetime
from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.recommendation_review import RecommendationReview, ReviewStatus
from app.models.recommendation import Recommendation, RecommendationStatus
from app.models.user import User, UserRole
from app.schemas.recommendation_xai import ReviewCreate, ReviewResponse
from app.services.audit_service import AuditService

class ReviewService:
    @staticmethod
    async def create_review(
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        reviewer: User,
        review_in: ReviewCreate
    ) -> ReviewResponse:
        # Enforce permission: only EXTENSION_OFFICER (or agronomic experts)
        if reviewer.role != UserRole.EXTENSION_OFFICER and reviewer.role != UserRole.AGRONOMIST and reviewer.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Agricultural Extension Officers can submit recommendation reviews."
            )

        new_review = RecommendationReview(
            id=uuid.uuid4(),
            recommendation_id=recommendation_id,
            reviewer_id=reviewer.id,
            status=review_in.status,
            comment=review_in.comment.strip()
        )
        db.add(new_review)

        # Update recommendation status based on officer review if db supports execute
        if hasattr(db, "execute"):
            rec_res = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
            rec = rec_res.scalar_one_or_none()
            if rec:
                if review_in.status == ReviewStatus.APPROVED:
                    rec.status = RecommendationStatus.APPROVED
                elif review_in.status == ReviewStatus.NEEDS_REVISION:
                    rec.status = RecommendationStatus.NEEDS_REVISION
                else:
                    rec.status = RecommendationStatus.UNDER_REVIEW

        # Append audit events (Feature 6)
        if hasattr(db, "flush"):
            await AuditService.record_audit(
                db=db,
                recommendation_id=recommendation_id,
                action="Officer Review Submitted",
                user=reviewer,
                details=f"Review status: {review_in.status}. Comment: {review_in.comment.strip()}"
            )

            if review_in.status == ReviewStatus.APPROVED:
                await AuditService.record_audit(
                    db=db,
                    recommendation_id=recommendation_id,
                    action="Recommendation Approved",
                    user=reviewer,
                    details=f"Approved with comment: {review_in.comment.strip()}"
                )
            elif review_in.status == ReviewStatus.NEEDS_REVISION:
                await AuditService.record_audit(
                    db=db,
                    recommendation_id=recommendation_id,
                    action="Revision Requested",
                    user=reviewer,
                    details=f"Revision requested: {review_in.comment.strip()}"
                )

        await db.commit()
        await db.refresh(new_review)


        return ReviewResponse(
            id=new_review.id,
            recommendation_id=new_review.recommendation_id,
            reviewer_id=reviewer.id,
            reviewer_name=reviewer.name,
            reviewer_role=str(reviewer.role.value if hasattr(reviewer.role, 'value') else reviewer.role),
            status=new_review.status,
            comment=new_review.comment,
            created_at=new_review.created_at or datetime.now()
        )


    @staticmethod
    async def get_reviews_for_recommendation(
        db: AsyncSession, recommendation_id: uuid.UUID
    ) -> list[ReviewResponse]:
        """
        Retrieves complete append-only review history ordered chronologically (newest first).
        """
        result = await db.execute(
            select(RecommendationReview)
            .options(selectinload(RecommendationReview.reviewer))
            .where(RecommendationReview.recommendation_id == recommendation_id)
            .order_by(RecommendationReview.created_at.desc())
        )
        reviews = result.scalars().all()

        return [
            ReviewResponse(
                id=r.id,
                recommendation_id=r.recommendation_id,
                reviewer_id=r.reviewer_id,
                reviewer_name=r.reviewer.name if r.reviewer else "System Expert",
                reviewer_role=str(r.reviewer.role.value if (r.reviewer and hasattr(r.reviewer.role, 'value')) else (r.reviewer.role if r.reviewer else "expert")),
                status=r.status,
                comment=r.comment,
                created_at=r.created_at
            )
            for r in reviews
        ]

    @staticmethod
    async def get_latest_review(
        db: AsyncSession, recommendation_id: uuid.UUID
    ) -> ReviewResponse | None:
        """
        The newest review represents the current recommendation review status.
        """
        result = await db.execute(
            select(RecommendationReview)
            .options(selectinload(RecommendationReview.reviewer))
            .where(RecommendationReview.recommendation_id == recommendation_id)
            .order_by(RecommendationReview.created_at.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if not latest:
            return None

        return ReviewResponse(
            id=latest.id,
            recommendation_id=latest.recommendation_id,
            reviewer_id=latest.reviewer_id,
            reviewer_name=latest.reviewer.name if latest.reviewer else "System Expert",
            reviewer_role=str(latest.reviewer.role.value if (latest.reviewer and hasattr(latest.reviewer.role, 'value')) else (latest.reviewer.role if latest.reviewer else "expert")),
            status=latest.status,
            comment=latest.comment,
            created_at=latest.created_at
        )
