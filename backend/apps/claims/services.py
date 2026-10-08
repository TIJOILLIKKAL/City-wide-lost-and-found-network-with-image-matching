import logging
from datetime import datetime, timezone as dt_tz

from django.utils import timezone
from django.db import transaction

from core.db.mongo import found_items_collection
from .models import Claim, ClaimStatusHistory, PickupSlot

logger = logging.getLogger(__name__)


def _record_history(claim: Claim, from_status: str, to_status: str, changed_by, note: str = ""):
    ClaimStatusHistory.objects.create(
        claim=claim,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        note=note,
    )


def _mark_found_item_claimed(found_item_id: str):
    """Update MongoDB found item status to 'claimed'."""
    try:
        from bson import ObjectId
        found_items_collection().update_one(
            {"_id": ObjectId(found_item_id)},
            {"$set": {"status": "claimed", "updated_at": datetime.now(dt_tz.utc)}},
        )
    except Exception as exc:
        logger.error("Failed to update found item %s status: %s", found_item_id, exc)


def _mark_found_item_available(found_item_id: str):
    try:
        from bson import ObjectId
        found_items_collection().update_one(
            {"_id": ObjectId(found_item_id)},
            {"$set": {"status": "available", "updated_at": datetime.now(dt_tz.utc)}},
        )
    except Exception as exc:
        logger.error("Failed to revert found item %s status: %s", found_item_id, exc)


@transaction.atomic
def submit_claim(found_item_id: str, lost_item_id: str, claimant, venue_id: int, proof_description: str, proof_images: list) -> Claim:
    claim = Claim.objects.create(
        found_item_id=found_item_id,
        lost_item_id=lost_item_id,
        claimant=claimant,
        venue_id=venue_id,
        proof_description=proof_description,
        proof_images=proof_images,
        status=Claim.Status.PENDING,
    )
    _record_history(claim, "", Claim.Status.PENDING, claimant, "Claim submitted.")
    return claim


@transaction.atomic
def review_claim(claim: Claim, action: str, reviewer, rejection_reason: str = "") -> Claim:
    old_status = claim.status

    if action == "approve":
        claim.status = Claim.Status.APPROVED
        _mark_found_item_claimed(claim.found_item_id)
        note = "Claim approved by staff."
    else:
        claim.status = Claim.Status.REJECTED
        claim.rejection_reason = rejection_reason
        note = f"Claim rejected: {rejection_reason}"

    claim.reviewed_by = reviewer
    claim.reviewed_at = timezone.now()
    claim.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "updated_at"])
    _record_history(claim, old_status, claim.status, reviewer, note)
    return claim


@transaction.atomic
def set_delivery(claim: Claim, delivery_method: str, pickup_slot_id: int = None, delivery_address: str = "", user=None) -> Claim:
    old_status = claim.status
    claim.delivery_method = delivery_method

    if delivery_method == "pickup":
        slot = PickupSlot.objects.select_for_update().get(pk=pickup_slot_id)
        if not slot.is_available:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"pickup_slot_id": "This slot is fully booked."})
        slot.booked_count += 1
        slot.save(update_fields=["booked_count"])
        claim.pickup_slot = slot
        claim.status = Claim.Status.PICKUP_SCHEDULED
        note = f"Pickup scheduled: {slot.date} {slot.start_time}."
    else:
        claim.delivery_address = delivery_address
        claim.status = Claim.Status.OUT_FOR_DELIVERY
        note = f"Courier delivery requested to: {delivery_address[:50]}."

    claim.save(update_fields=["delivery_method", "pickup_slot", "delivery_address", "status", "updated_at"])
    _record_history(claim, old_status, claim.status, user, note)
    return claim


@transaction.atomic
def complete_claim(claim: Claim, staff_user, tracking_id: str = "") -> Claim:
    old_status = claim.status
    claim.status = Claim.Status.COMPLETED
    if tracking_id:
        claim.delivery_tracking_id = tracking_id
    claim.save(update_fields=["status", "delivery_tracking_id", "updated_at"])
    _record_history(claim, old_status, Claim.Status.COMPLETED, staff_user, "Item handed over / delivered.")
    return claim


@transaction.atomic
def cancel_claim(claim: Claim, user) -> Claim:
    old_status = claim.status
    if old_status in (Claim.Status.APPROVED, Claim.Status.PICKUP_SCHEDULED, Claim.Status.OUT_FOR_DELIVERY):
        _mark_found_item_available(claim.found_item_id)
        if claim.pickup_slot_id:
            PickupSlot.objects.filter(pk=claim.pickup_slot_id).update(
                booked_count=models_f_minus_one("booked_count")
            )
    claim.status = Claim.Status.CANCELLED
    claim.save(update_fields=["status", "updated_at"])
    _record_history(claim, old_status, Claim.Status.CANCELLED, user, "Claim cancelled.")
    return claim


def models_f_minus_one(field):
    from django.db.models import F
    return F(field) - 1
