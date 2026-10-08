import logging
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from apps.venues.permissions import IsAdminUser
from apps.venues.models import Venue
from apps.claims.models import Claim
from .models import User
from .serializers import AdminUserSerializer

logger = logging.getLogger(__name__)


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=["Admin"], summary="Platform-wide stats")
    def get(self, request):
        users_by_role = {
            r["role"]: r["count"]
            for r in User.objects.values("role").annotate(count=Count("id"))
        }
        venues_by_status = {
            r["status"]: r["count"]
            for r in Venue.objects.values("status").annotate(count=Count("id"))
        }
        claims_by_status = {
            r["status"]: r["count"]
            for r in Claim.objects.values("status").annotate(count=Count("id"))
        }

        try:
            from core.db.mongo import found_items_collection, lost_items_collection
            found_count = found_items_collection().count_documents({})
            lost_count = lost_items_collection().count_documents({})
        except Exception as exc:
            logger.warning("MongoDB count failed: %s", exc)
            found_count = 0
            lost_count = 0

        return Response({
            "users": {"total": User.objects.count(), "by_role": users_by_role},
            "venues": {"total": Venue.objects.count(), "by_status": venues_by_status},
            "items": {"found": found_count, "lost": lost_count},
            "claims": {"total": Claim.objects.count(), "by_status": claims_by_status},
        })


class AdminUsersListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ["email", "full_name", "phone"]
    filterset_fields = ["role", "is_active", "is_verified"]
    ordering_fields = ["created_at", "email", "full_name"]
    ordering = ["-created_at"]

    @extend_schema(tags=["Admin"], summary="List all users")
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)

    def get_queryset(self):
        return User.objects.select_related("venue").all()


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related("venue").all()

    @extend_schema(tags=["Admin"], summary="Get user detail")
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)

    @extend_schema(tags=["Admin"], summary="Update user (role / venue / active status)")
    def patch(self, *args, **kwargs):
        return super().patch(*args, **kwargs)

    def perform_update(self, serializer):
        if serializer.instance == self.request.user:
            new_role = serializer.validated_data.get("role")
            if new_role and new_role != User.Role.ADMIN:
                raise ValidationError({"role": "You cannot demote your own account."})
        serializer.save()
