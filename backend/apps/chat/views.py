from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.claims.models import Claim
from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatRoomListSerializer, ChatMessageSerializer


class ChatRoomView(APIView):
    """GET or auto-create the chat room for a claim."""
    permission_classes = [IsAuthenticated]

    def _get_claim(self, claim_id, user):
        try:
            claim = Claim.objects.select_related("claimant", "venue").get(pk=claim_id)
        except Claim.DoesNotExist:
            return None, Response({"detail": "Claim not found."}, status=status.HTTP_404_NOT_FOUND)

        # Only the claimant, venue staff of that venue, or admin can access
        if user.role == "admin":
            return claim, None
        if user.role == "venue_staff":
            if not claim.venue.staff.filter(pk=user.pk).exists():
                return None, Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
            return claim, None
        if claim.claimant_id == user.id:
            return claim, None
        return None, Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    def get(self, request, claim_id):
        claim, err = self._get_claim(claim_id, request.user)
        if err:
            return err
        room, _ = ChatRoom.objects.get_or_create(claim=claim)
        serializer = ChatRoomSerializer(room)
        return Response(serializer.data)

    def post(self, request, claim_id):
        """Same as GET — idempotent room creation."""
        return self.get(request, claim_id)


class ChatHistoryView(APIView):
    """Return paginated message history for a room."""
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        try:
            room = ChatRoom.objects.select_related("claim__claimant", "claim__venue").get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"detail": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        claim = room.claim
        if user.role == "admin":
            pass
        elif user.role == "venue_staff":
            if not claim.venue.staff.filter(pk=user.pk).exists():
                return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        elif claim.claimant_id != user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        before = request.query_params.get("before")  # cursor: message ID
        qs = ChatMessage.objects.filter(room=room).select_related("sender")
        if before:
            qs = qs.filter(id__lt=before)
        messages = list(qs.order_by("-created_at")[:50])
        messages.reverse()
        return Response({
            "room_id": room.id,
            "results": ChatMessageSerializer(messages, many=True).data,
        })


class ChatPresenceView(APIView):
    """Return list of online user IDs for a room."""
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        from core.db.redis_client import get_redis_client
        redis = get_redis_client()
        key = f"chat_online:{room_id}"
        online_ids = [int(x) for x in redis.smembers(key)]
        return Response({"room_id": int(room_id), "online_ids": online_ids})


class ChatRoomsListView(APIView):
    """
    List all chat rooms accessible to the current user.
    Venue staff → their venue's rooms.
    Admin       → all rooms.
    Each room includes a found_item snapshot fetched from MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = (
            ChatRoom.objects
            .select_related("claim__claimant", "claim__venue")
            .prefetch_related("messages__sender")
            .order_by("-created_at")
        )
        if user.role == "admin":
            pass
        elif user.role == "venue_staff":
            if not user.venue_id:
                return Response({"results": []})
            qs = qs.filter(claim__venue_id=user.venue_id)
        else:
            # Regular users see only chats for their own claims
            qs = qs.filter(claim__claimant=user)

        rooms = list(qs[:100])
        serializer = ChatRoomListSerializer(rooms, many=True)
        data = serializer.data

        # Enrich with found item snapshot from MongoDB
        from apps.items.services import get_found_item
        item_cache: dict = {}
        for room in data:
            fid = room.get("found_item_id", "")
            if not fid:
                room["found_item"] = None
                continue
            if fid not in item_cache:
                try:
                    item_cache[fid] = get_found_item(fid)
                except Exception:
                    item_cache[fid] = None
            item = item_cache[fid]
            if item:
                room["found_item"] = {
                    "id": fid,
                    "title": item.get("title", ""),
                    "category": item.get("category", ""),
                    "color": item.get("color", ""),
                    "image_url": item.get("image_url", ""),
                    "found_location": item.get("found_location", ""),
                    "found_at": item.get("found_at", ""),
                }
            else:
                room["found_item"] = None

        return Response({"results": data, "count": len(data)})
