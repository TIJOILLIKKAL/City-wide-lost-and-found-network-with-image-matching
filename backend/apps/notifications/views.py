from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Notification


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
        data = [
            {
                "id": n.id,
                "type": n.notification_type,
                "title": n.title,
                "message": n.message,
                "data": n.data,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs
        ]
        unread = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"results": data, "unread_count": unread})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Mark all or specific notifications as read."""
        ids = request.data.get("ids")
        qs = Notification.objects.filter(user=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
