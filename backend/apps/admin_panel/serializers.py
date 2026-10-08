from rest_framework import serializers
from django.utils.text import slugify
from apps.authentication.models import User
from apps.venues.models import Venue, VenueOperatingHours
from apps.claims.models import Claim, PickupSlot


class AdminUserSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.name", read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone", "role",
            "venue", "venue_name", "is_active", "is_verified", "created_at",
        ]
        read_only_fields = ["id", "email", "created_at", "venue_name"]


class AdminVenueListSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id", "name", "slug", "venue_type", "status",
            "city", "state", "contact_phone", "staff_count", "created_at",
        ]

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()


class AdminVenueDetailSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id", "name", "slug", "venue_type", "status",
            "address", "city", "state", "pincode",
            "latitude", "longitude",
            "contact_name", "contact_email", "contact_phone",
            "registration_number",
            "staff_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()

    def create(self, validated_data):
        slug = slugify(validated_data["name"])
        if Venue.objects.filter(slug=slug).exists():
            slug = f"{slug}-{Venue.objects.count() + 1}"
        validated_data["slug"] = slug
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data and validated_data["name"] != instance.name:
            new_slug = slugify(validated_data["name"])
            if not Venue.objects.filter(slug=new_slug).exclude(pk=instance.pk).exists():
                validated_data["slug"] = new_slug
        return super().update(instance, validated_data)


class AdminClaimSerializer(serializers.ModelSerializer):
    claimant_email = serializers.CharField(source="claimant.email", read_only=True)
    claimant_name = serializers.CharField(source="claimant.full_name", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model = Claim
        fields = [
            "id", "found_item_id", "lost_item_id",
            "claimant", "claimant_email", "claimant_name",
            "venue", "venue_name",
            "status", "proof_description", "proof_images",
            "delivery_method", "delivery_address", "delivery_tracking_id",
            "rejection_reason",
            "reviewed_by", "reviewed_by_name", "reviewed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
