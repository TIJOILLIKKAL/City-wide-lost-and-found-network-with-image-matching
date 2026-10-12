from rest_framework import serializers
from django.utils import timezone
from .models import Claim, PickupSlot, ClaimStatusHistory


class PickupSlotSerializer(serializers.ModelSerializer):
    slots_remaining = serializers.IntegerField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)

    class Meta:
        model = PickupSlot
        fields = [
            "id", "venue", "venue_name", "date", "start_time", "end_time",
            "capacity", "booked_count", "slots_remaining", "is_available",
        ]
        read_only_fields = ["booked_count"]


class ClaimStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True)

    class Meta:
        model = ClaimStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by_email", "note", "changed_at"]


class _ClaimUserSerializer(serializers.Serializer):
    """Minimal user representation embedded in claim responses."""
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()


class _ClaimVenueSerializer(serializers.Serializer):
    """Minimal venue representation embedded in claim responses."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()


class ClaimListSerializer(serializers.ModelSerializer):
    claimant = _ClaimUserSerializer(read_only=True)
    venue = _ClaimVenueSerializer(read_only=True)

    class Meta:
        model = Claim
        fields = [
            "id", "found_item_id", "lost_item_id",
            "claimant", "venue",
            "status", "delivery_method", "created_at",
        ]


class ClaimDetailSerializer(serializers.ModelSerializer):
    claimant = _ClaimUserSerializer(read_only=True)
    venue = _ClaimVenueSerializer(read_only=True)
    reviewed_by = _ClaimUserSerializer(read_only=True)
    id_verified_by = _ClaimUserSerializer(read_only=True)
    pickup_slot_detail = PickupSlotSerializer(source="pickup_slot", read_only=True)
    history = ClaimStatusHistorySerializer(many=True, read_only=True)
    claimant_reputation = serializers.SerializerMethodField()

    class Meta:
        model = Claim
        fields = [
            "id", "found_item_id", "lost_item_id",
            "claimant", "venue",
            "status", "proof_description", "proof_images",
            "rejection_reason", "reviewed_by", "reviewed_at",
            "id_image_url", "id_verified", "id_verified_by",
            "delivery_method", "pickup_slot", "pickup_slot_detail",
            "delivery_address", "delivery_tracking_id",
            "history", "claimant_reputation", "created_at", "updated_at",
        ]
        read_only_fields = [
            "status", "reviewed_by", "reviewed_at",
            "rejection_reason", "delivery_tracking_id", "history",
            "id_verified", "id_verified_by",
        ]

    def get_claimant_reputation(self, obj):
        qs = Claim.objects.filter(claimant=obj.claimant)
        total = qs.count()
        approved = qs.filter(status=Claim.Status.APPROVED).count()
        rejected = qs.filter(status=Claim.Status.REJECTED).count()
        return {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "pct": round(approved / total * 100) if total > 0 else None,
        }


class ClaimCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Claim
        fields = ["found_item_id", "lost_item_id", "proof_description", "proof_images"]

    def validate_found_item_id(self, value):
        if len(value) != 24:
            raise serializers.ValidationError("Invalid found_item_id format.")
        return value


class ClaimReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["action"] == "reject" and not attrs.get("rejection_reason"):
            raise serializers.ValidationError({"rejection_reason": "Required when rejecting."})
        return attrs


class ClaimDeliverySerializer(serializers.Serializer):
    delivery_method = serializers.ChoiceField(choices=["pickup", "courier"])
    pickup_slot_id = serializers.IntegerField(required=False)
    delivery_address = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        method = attrs["delivery_method"]
        if method == "pickup" and not attrs.get("pickup_slot_id"):
            raise serializers.ValidationError({"pickup_slot_id": "Required for pickup delivery."})
        if method == "courier" and not attrs.get("delivery_address"):
            raise serializers.ValidationError({"delivery_address": "Required for courier delivery."})
        return attrs
