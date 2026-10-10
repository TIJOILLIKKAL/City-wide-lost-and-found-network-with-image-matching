from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        MATCH_FOUND = "match_found", "Match Found"
        ITEM_RECOVERED = "item_recovered", "Item Recovered"
        CLAIM_UPDATE = "claim_update", "Claim Update"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
