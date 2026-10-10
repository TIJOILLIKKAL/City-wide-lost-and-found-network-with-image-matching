import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

ONLINE_KEY = "chat_online:{room_id}"


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"
        self.venue_id = None  # set in _load_room_meta

        if not await self._load_room_meta():
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self._set_online(True)
        await self.accept()

        online_ids = await self._get_online_ids()
        await self.channel_layer.group_send(self.group_name, {
            "type": "presence_update",
            "online_ids": online_ids,
        })

    async def disconnect(self, close_code):
        await self._set_online(False)
        if hasattr(self, "group_name"):
            online_ids = await self._get_online_ids()
            await self.channel_layer.group_send(self.group_name, {
                "type": "presence_update",
                "online_ids": online_ids,
            })
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "")
        except (json.JSONDecodeError, TypeError):
            return

        if data.get("type") == "message":
            text = (data.get("text") or "").strip()
            if not text:
                return
            msg = await self._save_message(text)
            event = {
                "type": "chat_message",
                "room_id": self.room_id,
                "claim_id": self.claim_id,
                "id": msg.id,
                "sender_id": self.user.id,
                "sender_name": self.user.full_name,
                "text": text,
                "created_at": msg.created_at.isoformat(),
            }
            # Broadcast to everyone in the room
            await self.channel_layer.group_send(self.group_name, event)

            # Also push to the venue group so staff on the list page see it
            if self.venue_id:
                await self.channel_layer.group_send(f"venue_{self.venue_id}", {
                    "type": "notify_chat_message",
                    "room_id": self.room_id,
                    "claim_id": self.claim_id,
                    "sender_id": self.user.id,
                    "sender_name": self.user.full_name,
                    "text": text[:80],
                    "created_at": msg.created_at.isoformat(),
                })

    # ─── Group event handlers ─────────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "room_id": event["room_id"],
            "claim_id": event["claim_id"],
            "id": event["id"],
            "sender_id": event["sender_id"],
            "sender_name": event["sender_name"],
            "text": event["text"],
            "created_at": event["created_at"],
        }))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence",
            "online_ids": event["online_ids"],
        }))

    # ─── DB / Redis helpers ───────────────────────────────────────────────────

    @database_sync_to_async
    def _load_room_meta(self):
        """Verify access and cache claim/venue IDs on self."""
        from .models import ChatRoom
        try:
            room = ChatRoom.objects.select_related("claim__claimant", "claim__venue").get(
                pk=self.room_id
            )
        except ChatRoom.DoesNotExist:
            return False
        claim = room.claim
        self.claim_id = claim.id
        self.venue_id = claim.venue_id

        if self.user.role == "admin":
            return True
        if self.user.role == "venue_staff":
            return claim.venue.staff.filter(pk=self.user.pk).exists()
        return claim.claimant_id == self.user.id

    @database_sync_to_async
    def _save_message(self, text):
        from .models import ChatRoom, ChatMessage
        room = ChatRoom.objects.get(pk=self.room_id)
        return ChatMessage.objects.create(room=room, sender=self.user, text=text)

    async def _set_online(self, online: bool):
        from core.db.redis_client import get_redis_client
        redis = get_redis_client()
        key = ONLINE_KEY.format(room_id=self.room_id)
        if online:
            redis.sadd(key, self.user.id)
            redis.expire(key, 86400)
        else:
            redis.srem(key, self.user.id)

    async def _get_online_ids(self) -> list:
        from core.db.redis_client import get_redis_client
        redis = get_redis_client()
        key = ONLINE_KEY.format(room_id=self.room_id)
        return [int(x) for x in redis.smembers(key)]
