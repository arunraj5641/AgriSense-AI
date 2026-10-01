import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationUnreadCount
from app.services.notification_service import NotificationService
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/notifications", tags=["Notifications & Reminders"])

@router.get("", response_model=List[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Retrieve notification history for the authenticated user.
    """
    return await NotificationService.get_user_notifications(db, user.id, unread_only, limit)

@router.get("/unread-count", response_model=NotificationUnreadCount)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns unread count for top navigation bell badge.
    """
    count = await NotificationService.get_unread_count(db, user.id)
    return NotificationUnreadCount(unread_count=count)

@router.put("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Mark single notification as read.
    """
    notif = await NotificationService.mark_as_read(db, id, user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    await db.commit()
    return notif

@router.put("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Mark all unread notifications as read.
    """
    count = await NotificationService.mark_all_read(db, user.id)
    await db.commit()
    return {"status": "success", "marked_read": count}

@router.post("/reminders/check")
async def trigger_reminders(
    farm_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Evaluates farm stages and review queues to dispatch automated reminders.
    """
    created_count = 0
    if farm_id:
        created_count += await ReminderService.generate_farm_reminders(db, farm_id)
    created_count += await ReminderService.generate_officer_review_reminders(db)
    return {"status": "success", "reminders_dispatched": created_count}
