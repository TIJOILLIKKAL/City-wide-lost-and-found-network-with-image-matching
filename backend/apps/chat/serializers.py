from rest_framework import serializers
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender_id", "sender_name", "text", "created_at"]
        read_only_fields = ["id", "sender_id", "sender_name", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    claim_id = serializers.IntegerField(source="claim.id", read_only=True)
    claim_status = serializers.CharField(source="claim.status", read_only=True)
    found_item_id = serializers.CharField(source="claim.found_item_id", read_only=True)
    claimant_id = serializers.IntegerField(source="claim.claimant.id", read_only=True)
    claimant_name = serializers.CharField(source="claim.claimant.full_name", read_only=True)
    claimant_email = serializers.CharField(source="claim.claimant.email", read_only=True)
    claimant_phone = serializers.CharField(source="claim.claimant.phone", read_only=True)
    venue_name = serializers.CharField(source="claim.venue.name", read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id", "claim_id", "claim_status", "found_item_id",
            "claimant_id", "claimant_name", "claimant_email", "claimant_phone",
            "venue_name", "messages", "created_at",
        ]


class ChatRoomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the rooms list — no full message history."""
    claim_id = serializers.IntegerField(source="claim.id", read_only=True)
    claim_status = serializers.CharField(source="claim.status", read_only=True)
    found_item_id = serializers.CharField(source="claim.found_item_id", read_only=True)
    claimant_name = serializers.CharField(source="claim.claimant.full_name", read_only=True)
    claimant_email = serializers.CharField(source="claim.claimant.email", read_only=True)
    venue_name = serializers.CharField(source="claim.venue.name", read_only=True)
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id", "claim_id", "claim_status", "found_item_id",
            "claimant_name", "claimant_email", "venue_name",
            "last_message", "message_count", "created_at",
        ]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {"text": msg.text[:80], "sender_name": msg.sender.full_name, "created_at": msg.created_at.isoformat()}

    def get_message_count(self, obj):
        return obj.messages.count()
