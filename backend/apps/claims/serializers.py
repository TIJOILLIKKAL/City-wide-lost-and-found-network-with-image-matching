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


class ClaimListSerializer(serializers.ModelSerializer):
    claimant_email = serializers.CharField(source="claimant.email", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)

    class Meta:
        model = Claim
        fields = [
            "id", "found_item_id", "lost_item_id", "claimant_email",
            "venue_name", "status", "delivery_method", "created_at",
        ]


class ClaimDetailSerializer(serializers.ModelSerializer):
    claimant_email = serializers.CharField(source="claimant.email", read_only=True)
    claimant_name = serializers.CharField(source="claimant.full_name", read_only=True)
    claimant_phone = serializers.CharField(source="claimant.phone", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    reviewed_by_email = serializers.CharField(source="reviewed_by.email", read_only=True)
    pickup_slot_detail = PickupSlotSerializer(source="pickup_slot", read_only=True)
    history = ClaimStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Claim
        fields = [
            "id", "found_item_id", "lost_item_id",
            "claimant_email", "claimant_name", "claimant_phone",
            "venue", "venue_name",
            "status", "proof_description", "proof_images",
            "rejection_reason", "reviewed_by_email", "reviewed_at",
            "delivery_method", "pickup_slot", "pickup_slot_detail",
            "delivery_address", "delivery_tracking_id",
            "history", "created_at", "updated_at",
        ]
        read_only_fields = [
            "status", "reviewed_by_email", "reviewed_at",
            "rejection_reason", "delivery_tracking_id", "history",
        ]


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
