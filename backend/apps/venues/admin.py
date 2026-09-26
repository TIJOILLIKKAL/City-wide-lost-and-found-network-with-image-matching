from django.contrib import admin
from .models import Venue, VenueOperatingHours


class VenueOperatingHoursInline(admin.TabularInline):
    model = VenueOperatingHours
    extra = 0


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ["name", "venue_type", "city", "status", "contact_email", "created_at"]
    list_filter = ["venue_type", "status", "city"]
    search_fields = ["name", "city", "contact_name", "contact_email"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    inlines = [VenueOperatingHoursInline]

    fieldsets = (
        ("Basic Info", {"fields": ("name", "slug", "venue_type", "status", "logo")}),
        ("Location", {"fields": ("address", "city", "state", "pincode", "latitude", "longitude")}),
        ("Contact", {"fields": ("contact_name", "contact_email", "contact_phone")}),
        ("Business", {"fields": ("registration_number", "operating_hours")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
