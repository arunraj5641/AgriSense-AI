import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: str
    link: Optional[str] = None

class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationUnreadCount(BaseModel):
    unread_count: int
