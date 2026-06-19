from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscription(BaseModel):
    endpoint: str  # HttpUrl not used to avoid validation errors with some browsers
    expirationTime: Optional[int] = None
    keys: PushSubscriptionKeys

class NotificationPayload(BaseModel):
    title: str = Field(..., description="Title of the notification")
    body: str = Field(..., description="Body of the notification")
    icon: Optional[str] = "/pwa-192x192.png"
    badge: Optional[str] = "/pwa-64x64.png"
    url: Optional[str] = "/"
    data: Optional[Dict] = None
