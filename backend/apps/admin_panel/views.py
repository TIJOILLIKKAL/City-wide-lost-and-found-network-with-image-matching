import logging
from datetime import datetime, timezone as dt_tz

from bson import ObjectId
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from apps.authentication.models import User
from apps.claims.models import Claim
from apps.claims.services import review_claim, complete_claim, cancel_claim
from apps.venues.models import Venue
from apps.venues.permissions import IsAdminUser
from core.db.mongo import found_items_collection, lost_items_collection

from .serializers import (
    AdminUserSerializer,
    AdminVenueListSerializer,
    AdminVenueDetailSerializer,
    AdminClaimSerializer,
)

logger = logging.getLogger(__name__)

_TAG = "Admin"


# ─── Stats ────────────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Platform-wide statistics")
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
            found_count = found_items_collection().count_documents({})
            lost_count = lost_items_collection().count_documents({})
        except Exception as exc:
            logger.warning("MongoDB count failed: %s", exc)
            found_count = lost_count = 0

        return Response({
            "users": {"total": User.objects.count(), "by_role": users_by_role},
            "venues": {"total": Venue.objects.count(), "by_status": venues_by_status},
            "items": {"found": found_count, "lost": lost_count},
            "claims": {"total": Claim.objects.count(), "by_status": claims_by_status},
        })


# ─── Users ────────────────────────────────────────────────────────────────────

class AdminUsersView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ["email", "full_name", "phone"]
    filterset_fields = ["role", "is_active", "is_verified"]
    ordering_fields = ["created_at", "email", "full_name"]
    ordering = ["-created_at"]

    @extend_schema(tags=[_TAG], summary="List all users")
    def get(self, *a, **kw):
        return super().get(*a, **kw)

    def get_queryset(self):
        return User.objects.select_related("venue").all()


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related("venue").all()
    http_method_names = ["get", "patch", "delete", "head", "options"]

    @extend_schema(tags=[_TAG], summary="Get user")
    def get(self, *a, **kw):
        return super().get(*a, **kw)

    @extend_schema(tags=[_TAG], summary="Update user (role / venue / active)")
    def patch(self, *a, **kw):
        return super().patch(*a, **kw)

    @extend_schema(tags=[_TAG], summary="Delete user")
    def delete(self, *a, **kw):
        return super().delete(*a, **kw)

    def perform_update(self, serializer):
        if serializer.instance == self.request.user:
            new_role = serializer.validated_data.get("role")
            if new_role and new_role != User.Role.ADMIN:
                raise ValidationError({"role": "You cannot demote your own account."})
        serializer.save()

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise ValidationError({"detail": "You cannot delete your own account."})
        instance.delete()


# ─── Venues ───────────────────────────────────────────────────────────────────

class AdminVenuesView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "city", "state", "contact_name"]
    ordering_fields = ["name", "city", "created_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        return AdminVenueDetailSerializer if self.request.method == "POST" else AdminVenueListSerializer

    def get_queryset(self):
        qs = Venue.objects.prefetch_related("staff").all()
        venue_type = self.request.query_params.get("venue_type")
        status_filter = self.request.query_params.get("status")
        if venue_type:
            qs = qs.filter(venue_type=venue_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @extend_schema(tags=[_TAG], summary="List venues")
    def get(self, *a, **kw):
        return super().get(*a, **kw)

    @extend_schema(tags=[_TAG], summary="Create venue", request=AdminVenueDetailSerializer)
    def post(self, *a, **kw):
        return super().post(*a, **kw)


class AdminVenueDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminVenueDetailSerializer
    queryset = Venue.objects.prefetch_related("staff").all()
    lookup_field = "slug"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    @extend_schema(tags=[_TAG], summary="Get venue")
    def get(self, *a, **kw):
        return super().get(*a, **kw)

    @extend_schema(tags=[_TAG], summary="Update venue")
    def patch(self, *a, **kw):
        return super().patch(*a, **kw)

    @extend_schema(tags=[_TAG], summary="Delete venue")
    def delete(self, *a, **kw):
        return super().delete(*a, **kw)


class AdminVenueActivateView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Activate venue")
    def post(self, request, slug):
        venue = get_object_or_404(Venue, slug=slug)
        venue.status = Venue.Status.ACTIVE
        venue.save(update_fields=["status", "updated_at"])
        return Response(AdminVenueDetailSerializer(venue).data)


class AdminVenueDeactivateView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Deactivate venue")
    def post(self, request, slug):
        venue = get_object_or_404(Venue, slug=slug)
        venue.status = Venue.Status.INACTIVE
        venue.save(update_fields=["status", "updated_at"])
        return Response(AdminVenueDetailSerializer(venue).data)


class AdminVenueTypesView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="List venue types")
    def get(self, request):
        return Response([
            {"value": value, "label": label}
            for value, label in Venue.VenueType.choices
        ])


# ─── Found Items ──────────────────────────────────────────────────────────────

def _serialize_item(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", ""))
    for key in ("created_at", "updated_at", "found_at", "lost_at"):
        if key in doc and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return doc


class AdminFoundItemsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="List all found items")
    def get(self, request):
        page = max(int(request.query_params.get("page", 1)), 1)
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip = (page - 1) * limit

        query = {}
        venue_id = request.query_params.get("venue_id")
        category = request.query_params.get("category")
        item_status = request.query_params.get("status")
        if venue_id:
            query["venue_id"] = int(venue_id)
        if category:
            query["category"] = category
        if item_status:
            query["status"] = item_status

        col = found_items_collection()
        total = col.count_documents(query)
        docs = [
            _serialize_item(doc)
            for doc in col.find(query).sort("created_at", -1).skip(skip).limit(limit)
        ]
        return Response({
            "count": total,
            "page": page,
            "total_pages": max(1, -(-total // limit)),
            "results": docs,
        })


class AdminFoundItemDetailView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Get found item")
    def get(self, request, item_id):
        doc = found_items_collection().find_one({"_id": ObjectId(item_id)})
        if not doc:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_item(doc))

    @extend_schema(tags=[_TAG], summary="Update found item status")
    def patch(self, request, item_id):
        allowed_fields = {"status", "title", "description", "category", "color", "brand"}
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not update_data:
            return Response({"detail": "Nothing to update."}, status=status.HTTP_400_BAD_REQUEST)
        update_data["updated_at"] = datetime.now(dt_tz.utc)
        found_items_collection().update_one(
            {"_id": ObjectId(item_id)}, {"$set": update_data}
        )
        doc = found_items_collection().find_one({"_id": ObjectId(item_id)})
        return Response(_serialize_item(doc))


# ─── Lost Items ───────────────────────────────────────────────────────────────

class AdminLostItemsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="List all lost items")
    def get(self, request):
        page = max(int(request.query_params.get("page", 1)), 1)
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip = (page - 1) * limit

        query = {}
        category = request.query_params.get("category")
        item_status = request.query_params.get("status")
        if category:
            query["category"] = category
        if item_status:
            query["status"] = item_status

        col = lost_items_collection()
        total = col.count_documents(query)
        docs = [
            _serialize_item(doc)
            for doc in col.find(query).sort("created_at", -1).skip(skip).limit(limit)
        ]
        return Response({
            "count": total,
            "page": page,
            "total_pages": max(1, -(-total // limit)),
            "results": docs,
        })


class AdminLostItemDetailView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Get lost item")
    def get(self, request, item_id):
        doc = lost_items_collection().find_one({"_id": ObjectId(item_id)})
        if not doc:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_item(doc))


# ─── Claims ───────────────────────────────────────────────────────────────────

class AdminClaimsView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminClaimSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "venue", "delivery_method"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    @extend_schema(tags=[_TAG], summary="List all claims")
    def get(self, *a, **kw):
        return super().get(*a, **kw)

    def get_queryset(self):
        return Claim.objects.select_related("claimant", "venue", "reviewed_by").all()


class AdminClaimDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminClaimSerializer
    queryset = Claim.objects.select_related("claimant", "venue", "reviewed_by").all()

    @extend_schema(tags=[_TAG], summary="Get claim detail")
    def get(self, *a, **kw):
        return super().get(*a, **kw)


class AdminClaimReviewView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Approve or reject a claim")
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)
        action = request.data.get("action")
        if action not in ("approve", "reject"):
            raise ValidationError({"action": "Must be 'approve' or 'reject'."})
        if claim.status not in (Claim.Status.PENDING, Claim.Status.UNDER_REVIEW):
            raise ValidationError({"detail": f"Cannot review a claim with status '{claim.status}'."})
        rejection_reason = request.data.get("rejection_reason", "")
        claim = review_claim(claim, action, request.user, rejection_reason)
        return Response(AdminClaimSerializer(claim).data)


class AdminClaimCompleteView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Mark claim as completed")
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)
        if claim.status not in (
            Claim.Status.APPROVED,
            Claim.Status.PICKUP_SCHEDULED,
            Claim.Status.OUT_FOR_DELIVERY,
        ):
            raise ValidationError({"detail": f"Cannot complete a claim with status '{claim.status}'."})
        tracking_id = request.data.get("tracking_id", "")
        claim = complete_claim(claim, request.user, tracking_id)
        return Response(AdminClaimSerializer(claim).data)


class AdminClaimCancelView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(tags=[_TAG], summary="Cancel a claim")
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)
        if claim.status in (Claim.Status.COMPLETED, Claim.Status.CANCELLED):
            raise ValidationError({"detail": f"Cannot cancel a claim with status '{claim.status}'."})
        claim = cancel_claim(claim, request.user)
        return Response(AdminClaimSerializer(claim).data)
