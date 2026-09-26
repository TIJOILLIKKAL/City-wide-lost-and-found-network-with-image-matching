from rest_framework import serializers
from django.utils.text import slugify
from .models import Venue, VenueOperatingHours


class VenueOperatingHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = VenueOperatingHours
        fields = ["id", "day", "day_name", "open_time", "close_time", "is_closed"]


class VenueListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id", "name", "slug", "venue_type", "status",
            "city", "state", "contact_phone", "staff_count", "created_at",
        ]

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()


class VenueDetailSerializer(serializers.ModelSerializer):
    hours = VenueOperatingHoursSerializer(many=True, read_only=True)
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id", "name", "slug", "venue_type", "status",
            "address", "city", "state", "pincode",
            "latitude", "longitude",
            "contact_name", "contact_email", "contact_phone",
            "operating_hours", "registration_number", "logo",
            "staff_count", "hours", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()

    def create(self, validated_data):
        validated_data["slug"] = slugify(validated_data["name"])
        # ensure uniqueness by appending id suffix if needed
        slug = validated_data["slug"]
        if Venue.objects.filter(slug=slug).exists():
            validated_data["slug"] = f"{slug}-{Venue.objects.count() + 1}"
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data and validated_data["name"] != instance.name:
            new_slug = slugify(validated_data["name"])
            if not Venue.objects.filter(slug=new_slug).exclude(pk=instance.pk).exists():
                validated_data["slug"] = new_slug
        return super().update(instance, validated_data)


class VenueOperatingHoursBulkSerializer(serializers.Serializer):
    hours = VenueOperatingHoursSerializer(many=True)

    def save(self, venue):
        VenueOperatingHours.objects.filter(venue=venue).delete()
        for entry in self.validated_data["hours"]:
            VenueOperatingHours.objects.create(venue=venue, **entry)
