import logging
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view

from rest_framework.parsers import MultiPartParser, FormParser

from apps.venues.permissions import IsAdminOrVenueStaff, IsAdminUser
from .models import Claim, PickupSlot
from .serializers import (
    ClaimListSerializer, ClaimDetailSerializer, ClaimCreateSerializer,
    ClaimReviewSerializer, ClaimDeliverySerializer, PickupSlotSerializer,
)
from .services import submit_claim, review_claim, set_delivery, complete_claim, cancel_claim

HIGH_VALUE_CATEGORIES = {"phone", "electronics", "jewelry", "wallet"}

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(
        tags=["Claims"],
        summary="List claims",
        description="Admins see all claims. Venue staff see their venue's claims. Owners see their own claims.",
    ),
    create=extend_schema(
        tags=["Claims"],
        summary="Submit a claim",
        description="Submit a claim for a found item. Item must be `available`. Auto-notifies venue staff via WebSocket.",
        request=ClaimCreateSerializer,
        responses={201: ClaimDetailSerializer},
    ),
)
class ClaimListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "venue", "delivery_method"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return ClaimCreateSerializer if self.request.method == "POST" else ClaimListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Claim.objects.select_related("claimant", "venue", "reviewed_by")
        if user.is_admin:
            return qs
        if user.is_venue_staff and user.venue_id:
            return qs.filter(venue_id=user.venue_id)
        return qs.filter(claimant=user)

    def perform_create(self, serializer):
        data = serializer.validated_data
        found_item_id = data["found_item_id"]

        # Resolve venue from the found item in MongoDB
        from apps.items.services import get_found_item
        found_item = get_found_item(found_item_id)
        if not found_item:
            raise ValidationError({"found_item_id": "Found item does not exist."})
        if found_item.get("status") != "available":
            raise ValidationError({"found_item_id": "This item is not available for claiming."})

        venue_id = found_item.get("venue_id")
        if not venue_id:
            raise ValidationError({"found_item_id": "Found item has no associated venue."})

        claim = submit_claim(
            found_item_id=found_item_id,
            lost_item_id=data.get("lost_item_id", ""),
            claimant=self.request.user,
            venue_id=venue_id,
            proof_description=data["proof_description"],
            proof_images=data.get("proof_images", []),
        )

        # Notify venue staff via Redis
        _notify_venue(venue_id, claim.id, "new_claim")

        serializer.instance = claim

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        out = ClaimDetailSerializer(serializer.instance)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Claims"],
    summary="Get claim",
    description="Retrieve a single claim with full detail including status history and pickup slot.",
)
class ClaimDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClaimDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Claim.objects.select_related(
            "claimant", "venue", "reviewed_by", "pickup_slot"
        ).prefetch_related("history__changed_by")
        if user.is_admin:
            return qs
        if user.is_venue_staff and user.venue_id:
            return qs.filter(venue_id=user.venue_id)
        return qs.filter(claimant=user)


class ClaimReviewView(APIView):
    permission_classes = [IsAdminOrVenueStaff]

    @extend_schema(
        tags=["Claims"],
        summary="Review claim (approve/reject)",
        description="Approve or reject a pending/under_review claim. **Venue staff or admin only.** Notifies claimant via WebSocket.\n\nSet `action` to `approve` or `reject`. If rejecting, `rejection_reason` is required.",
        request=ClaimReviewSerializer,
        responses={200: ClaimDetailSerializer},
    )
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)

        if request.user.is_venue_staff and claim.venue_id != request.user.venue_id:
            raise PermissionDenied("You can only review claims for your venue.")

        if claim.status not in (Claim.Status.PENDING, Claim.Status.UNDER_REVIEW):
            return Response(
                {"detail": f"Cannot review a claim with status '{claim.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClaimReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        claim = review_claim(
            claim=claim,
            action=serializer.validated_data["action"],
            reviewer=request.user,
            rejection_reason=serializer.validated_data.get("rejection_reason", ""),
        )

        _notify_claimant(claim.claimant_id, claim.id, claim.status)
        return Response(ClaimDetailSerializer(claim).data)


class ClaimDeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Claims"],
        summary="Set delivery method",
        description="Owner chooses how to receive the item after claim approval. **Claimant only.**\n\n- `delivery_method: pickup` → requires `pickup_slot_id`; status → `pickup_scheduled`\n- `delivery_method: courier` → requires `delivery_address`; status → `out_for_delivery`",
        request=ClaimDeliverySerializer,
        responses={200: ClaimDetailSerializer},
    )
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk, claimant=request.user)

        if claim.status != Claim.Status.APPROVED:
            return Response(
                {"detail": "Delivery can only be set for approved claims."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClaimDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        claim = set_delivery(
            claim=claim,
            delivery_method=serializer.validated_data["delivery_method"],
            pickup_slot_id=serializer.validated_data.get("pickup_slot_id"),
            delivery_address=serializer.validated_data.get("delivery_address", ""),
            user=request.user,
        )

        _notify_venue(claim.venue_id, claim.id, "delivery_scheduled")
        return Response(ClaimDetailSerializer(claim).data)


class ClaimCompleteView(APIView):
    permission_classes = [IsAdminOrVenueStaff]

    @extend_schema(
        tags=["Claims"],
        summary="Complete claim",
        description="Mark the claim as completed once the item has been handed over or dispatched. **Venue staff or admin only.** Notifies claimant via WebSocket.\n\n`delivery_tracking_id` is optional — useful for courier dispatch.",
        responses={200: ClaimDetailSerializer},
    )
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)

        if request.user.is_venue_staff and claim.venue_id != request.user.venue_id:
            raise PermissionDenied("You can only complete claims for your venue.")

        if claim.status not in (Claim.Status.PICKUP_SCHEDULED, Claim.Status.OUT_FOR_DELIVERY):
            return Response(
                {"detail": f"Cannot complete a claim with status '{claim.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tracking_id = request.data.get("delivery_tracking_id", "")
        claim = complete_claim(claim, staff_user=request.user, tracking_id=tracking_id)
        _notify_claimant(claim.claimant_id, claim.id, claim.status)
        return Response(ClaimDetailSerializer(claim).data)


class ClaimCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Claims"],
        summary="Cancel claim",
        description="Cancel a claim. **Claimant only.** Cannot cancel completed or already-cancelled claims. Status → `cancelled`.",
        responses={200: ClaimDetailSerializer},
    )
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk, claimant=request.user)

        if claim.status in (Claim.Status.COMPLETED, Claim.Status.CANCELLED):
            return Response(
                {"detail": "Cannot cancel a completed or already cancelled claim."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        claim = cancel_claim(claim, user=request.user)
        return Response(ClaimDetailSerializer(claim).data)


# ─── Pickup Slots ────────────────────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(
        tags=["Claims"],
        summary="List pickup slots",
        description="List available pickup slots. Non-staff users only see slots with remaining capacity.",
    ),
    create=extend_schema(
        tags=["Claims"],
        summary="Create pickup slot (Staff)",
        description="Create a pickup slot at a venue. **Venue staff or admin only.** Staff don't need to specify `venue` — it defaults to their assigned venue.",
        request=PickupSlotSerializer,
        responses={201: PickupSlotSerializer},
    ),
)
class PickupSlotListCreateView(generics.ListCreateAPIView):
    serializer_class = PickupSlotSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["venue", "date"]
    ordering = ["date", "start_time"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrVenueStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = PickupSlot.objects.select_related("venue")
        # Filter to only available slots for non-staff
        user = self.request.user
        if not (user.is_admin or user.is_venue_staff):
            qs = qs.filter(booked_count__lt=models_capacity())
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_venue_staff and not user.is_admin:
            serializer.save(venue=user.venue)
        else:
            serializer.save()


def models_capacity():
    from django.db.models import F
    return F("capacity")


# ─── Dispute resolution ──────────────────────────────────────────────────────

class DisputeListView(APIView):
    """Admin: list found items that have 2+ competing active claims."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count
        from apps.items.services import get_found_item

        disputed_ids = list(
            Claim.objects
            .filter(status__in=[Claim.Status.PENDING, Claim.Status.UNDER_REVIEW, Claim.Status.APPROVED])
            .values("found_item_id")
            .annotate(cnt=Count("id"))
            .filter(cnt__gte=2)
            .values_list("found_item_id", flat=True)
        )

        results = []
        for fid in disputed_ids:
            claims = Claim.objects.filter(
                found_item_id=fid,
                status__in=[Claim.Status.PENDING, Claim.Status.UNDER_REVIEW, Claim.Status.APPROVED],
            ).select_related("claimant")
            found_item = get_found_item(fid)
            results.append({
                "found_item_id": fid,
                "found_item": {
                    "title": found_item.get("title", "Unknown") if found_item else "Unknown",
                    "category": found_item.get("category", "") if found_item else "",
                    "image_url": found_item.get("image_url", "") if found_item else "",
                },
                "claims": ClaimListSerializer(claims, many=True).data,
            })

        return Response({"results": results, "count": len(results)})


class DisputeResolveView(APIView):
    """Admin: approve one claim for a disputed item, auto-reject the others."""
    permission_classes = [IsAdminUser]

    def post(self, request, found_item_id):
        winner_id = request.data.get("winner_claim_id")
        if not winner_id:
            return Response({"detail": "winner_claim_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            winner = Claim.objects.get(pk=winner_id, found_item_id=found_item_id)
        except Claim.DoesNotExist:
            return Response({"detail": "Claim not found."}, status=status.HTTP_404_NOT_FOUND)

        winner = review_claim(winner, "approve", request.user)

        others = Claim.objects.filter(
            found_item_id=found_item_id,
            status__in=[Claim.Status.PENDING, Claim.Status.UNDER_REVIEW],
        ).exclude(pk=winner_id)
        rejected_count = others.count()
        for claim in others:
            review_claim(claim, "reject", request.user,
                         rejection_reason="Another claimant was verified as the rightful owner.")

        return Response({"winner_claim_id": winner.id, "rejected_count": rejected_count})


# ─── ID verification ─────────────────────────────────────────────────────────

class ClaimUploadIdView(APIView):
    """Claimant uploads a photo of their ID for high-value item claims."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk, claimant=request.user)
        id_file = request.FILES.get("id_image")
        if not id_file:
            return Response({"detail": "id_image file is required."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.items.services import upload_item_image
        url, _ = upload_item_image(id_file, "id_docs")
        claim.id_image_url = url
        claim.id_verified = False
        claim.save(update_fields=["id_image_url", "id_verified", "updated_at"])
        return Response({"id_image_url": url})


class ClaimVerifyIdView(APIView):
    """Staff marks a claimant's uploaded ID as verified."""
    permission_classes = [IsAdminOrVenueStaff]

    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)
        if request.user.is_venue_staff and claim.venue_id != request.user.venue_id:
            raise PermissionDenied("You can only verify claims for your venue.")
        claim.id_verified = True
        claim.id_verified_by = request.user
        claim.save(update_fields=["id_verified", "id_verified_by", "updated_at"])
        return Response({"id_verified": True})


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _notify_venue(venue_id: int, claim_id: int, event: str):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"venue_{venue_id}",
                {
                    "type": "notify_new_claim",
                    "claim_id": claim_id,
                    "venue_id": venue_id,
                },
            )
    except Exception as exc:
        logger.warning("Channel notify_venue failed: %s", exc)


def _notify_claimant(user_id: int, claim_id: int, new_status: str):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "notify_claim_status",
                    "claim_id": claim_id,
                    "status": new_status,
                },
            )
    except Exception as exc:
        logger.warning("Channel notify_claimant failed: %s", exc)
