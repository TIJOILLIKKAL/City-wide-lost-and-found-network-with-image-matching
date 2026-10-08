import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer that pushes real-time notifications to authenticated users.

    Clients connect to:
      ws://host/ws/notifications/

    Each user is placed in their personal group "user_<id>" so the server
    can push targeted messages.  Venue staff are also added to "venue_<id>"
    so claim events reach the whole team.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.personal_group = f"user_{user.id}"
        await self.channel_layer.group_add(self.personal_group, self.channel_name)

        # Venue staff also join the venue-wide group
        if user.is_venue_staff and user.venue_id:
            self.venue_group = f"venue_{user.venue_id}"
            await self.channel_layer.group_add(self.venue_group, self.channel_name)

        await self.accept()
        logger.debug("WS connected: user %s", self.user_id)

    async def disconnect(self, close_code):
        if hasattr(self, "personal_group"):
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        if hasattr(self, "venue_group"):
            await self.channel_layer.group_discard(self.venue_group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Clients don't send messages — read-only stream
        pass

    # ─── Event handlers (called by channel layer group_send) ─────────────────

    async def notify_match(self, event):
        await self.send(text_data=json.dumps({
            "type": "match",
            "item_id": event["item_id"],
            "item_type": event["item_type"],
            "match_count": event["match_count"],
        }))

    async def notify_claim_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "claim_status",
            "claim_id": event["claim_id"],
            "status": event["status"],
        }))

    async def notify_new_claim(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_claim",
            "claim_id": event["claim_id"],
            "venue_id": event["venue_id"],
        }))
