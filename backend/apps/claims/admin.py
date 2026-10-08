from django.contrib import admin
from .models import Claim, PickupSlot, ClaimStatusHistory


class ClaimStatusHistoryInline(admin.TabularInline):
    model = ClaimStatusHistory
    extra = 0
    readonly_fields = ["from_status", "to_status", "changed_by", "note", "changed_at"]


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ["id", "found_item_id", "claimant", "venue", "status", "delivery_method", "created_at"]
    list_filter = ["status", "delivery_method", "venue"]
    search_fields = ["found_item_id", "claimant__email", "claimant__full_name"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at"]
    inlines = [ClaimStatusHistoryInline]
    raw_id_fields = ["claimant", "reviewed_by", "pickup_slot"]


@admin.register(PickupSlot)
class PickupSlotAdmin(admin.ModelAdmin):
    list_display = ["venue", "date", "start_time", "end_time", "capacity", "booked_count", "slots_remaining"]
    list_filter = ["venue", "date"]
    ordering = ["date", "start_time"]

    def slots_remaining(self, obj):
        return obj.slots_remaining
