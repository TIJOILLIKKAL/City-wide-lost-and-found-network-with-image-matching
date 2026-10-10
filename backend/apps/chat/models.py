from django.db import models
from django.conf import settings


class ChatRoom(models.Model):
    claim = models.OneToOneField(
        "claims.Claim", on_delete=models.CASCADE, related_name="chat_room"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_rooms"

    def __str__(self):
        return f"ChatRoom for Claim #{self.claim_id}"


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"[Room {self.room_id}] {self.sender.email}: {self.text[:40]}"
