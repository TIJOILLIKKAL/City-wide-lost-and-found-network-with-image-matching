from django.db import models
from django.conf import settings


class PickupSlot(models.Model):
    venue = models.ForeignKey(
        "venues.Venue", on_delete=models.CASCADE, related_name="pickup_slots"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveIntegerField(default=5)
    booked_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "pickup_slots"
        ordering = ["date", "start_time"]
        unique_together = ("venue", "date", "start_time")

    def __str__(self):
        return f"{self.venue.name} — {self.date} {self.start_time}–{self.end_time}"

    @property
    def is_available(self):
        return self.booked_count < self.capacity

    @property
    def slots_remaining(self):
        return self.capacity - self.booked_count


class Claim(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PICKUP_SCHEDULED = "pickup_scheduled", "Pickup Scheduled"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class DeliveryMethod(models.TextChoices):
        PICKUP = "pickup", "Self Pickup"
        COURIER = "courier", "Courier Delivery"

    # Item references (MongoDB IDs as strings)
    found_item_id = models.CharField(max_length=24)
    lost_item_id = models.CharField(max_length=24, blank=True)

    # People
    claimant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="claims_made",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claims_reviewed",
    )
    venue = models.ForeignKey(
        "venues.Venue", on_delete=models.CASCADE, related_name="claims"
    )

    # Status
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Proof from owner
    proof_description = models.TextField()
    proof_images = models.JSONField(default=list, blank=True)

    # Review outcome
    rejection_reason = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Delivery
    delivery_method = models.CharField(
        max_length=10, choices=DeliveryMethod.choices, blank=True
    )
    pickup_slot = models.ForeignKey(
        PickupSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claims",
    )
    delivery_address = models.TextField(blank=True)
    delivery_tracking_id = models.CharField(max_length=100, blank=True)

    # ID verification for high-value items
    id_image_url = models.CharField(max_length=500, blank=True, default="")
    id_verified = models.BooleanField(default=False)
    id_verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="id_verifications_made",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "claims"
        ordering = ["-created_at"]
        # Prevent duplicate claims for the same found item by the same user
        unique_together = ("found_item_id", "claimant")

    def __str__(self):
        return f"Claim #{self.pk} by {self.claimant.email} — {self.status}"


class ClaimStatusHistory(models.Model):
    claim = models.ForeignKey(
        Claim, on_delete=models.CASCADE, related_name="history"
    )
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    note = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "claim_status_history"
        ordering = ["changed_at"]

    def __str__(self):
        return f"Claim #{self.claim_id}: {self.from_status} → {self.to_status}"
