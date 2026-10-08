import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.venues.permissions import IsAdminOrVenueStaff
from .serializers import FoundItemCreateSerializer, LostItemCreateSerializer, ItemResponseSerializer
from .services import (
    create_found_item, create_lost_item,
    get_found_item, get_lost_item,
    list_found_items, list_lost_items,
    update_lost_item, delete_lost_item,
)
from .tasks import generate_embedding

logger = logging.getLogger(__name__)


def _format_item(doc: dict) -> dict:
    doc["id"] = doc.pop("_id", doc.get("id", ""))
    return doc


class FoundItemListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrVenueStaff()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=["Items"],
        summary="List found items",
        description="Paginated list of found items stored at venues. Any authenticated user can list.",
        parameters=[
            OpenApiParameter("page", OpenApiTypes.INT, description="Page number (1-based, default 1)"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Items per page (max 100, default 20)"),
            OpenApiParameter("category", OpenApiTypes.STR, description="bag|phone|wallet|keys|clothing|document|electronics|jewelry|other"),
            OpenApiParameter("status", OpenApiTypes.STR, description="available|claimed|archived"),
            OpenApiParameter("venue_id", OpenApiTypes.INT, description="Filter by venue ID"),
        ],
        responses={200: ItemResponseSerializer(many=True)},
    )
    def get(self, request):
        venue_id = request.query_params.get("venue_id")
        category = request.query_params.get("category")
        status_filter = request.query_params.get("status")
        page = int(request.query_params.get("page", 1))
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip = (page - 1) * limit

        items = list_found_items(
            venue_id=int(venue_id) if venue_id else None,
            category=category,
            status=status_filter,
            limit=limit,
            skip=skip,
        )
        return Response({"results": [_format_item(i) for i in items], "page": page})

    @extend_schema(
        tags=["Items"],
        summary="Upload found item (Staff)",
        description="Upload a found item with a photo. Triggers async CLIP embedding via Celery. **Venue staff or admin only.**",
        request=FoundItemCreateSerializer,
        responses={201: ItemResponseSerializer},
    )
    def post(self, request):
        serializer = FoundItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.venue_id and not request.user.is_admin:
            return Response(
                {"detail": "Venue staff must be assigned to a venue."},
                status=status.HTTP_403_FORBIDDEN,
            )

        venue_id = request.user.venue_id or request.data.get("venue_id")
        if not venue_id:
            return Response({"detail": "venue_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        item = create_found_item(
            data=serializer.validated_data,
            image_file=request.FILES["image"],
            venue_id=int(venue_id),
            reported_by=request.user.id,
        )

        # Kick off async CLIP embedding
        generate_embedding.delay(item["_id"], "found")

        return Response(_format_item(item), status=status.HTTP_201_CREATED)


class FoundItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Items"],
        summary="Get found item",
        description="Retrieve a single found item by its MongoDB ObjectId.",
        responses={200: ItemResponseSerializer, 404: None},
    )
    def get(self, request, item_id):
        item = get_found_item(item_id)
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_format_item(item))


class LostItemListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Items"],
        summary="List lost items",
        description="List lost items. Owners see only their own; admins see all.",
        parameters=[
            OpenApiParameter("page", OpenApiTypes.INT, description="Page number (1-based)"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Items per page (max 100)"),
            OpenApiParameter("category", OpenApiTypes.STR, description="bag|phone|wallet|keys|clothing|document|electronics|jewelry|other"),
            OpenApiParameter("status", OpenApiTypes.STR, description="searching|matched|claimed|closed"),
        ],
        responses={200: ItemResponseSerializer(many=True)},
    )
    def get(self, request):
        category = request.query_params.get("category")
        status_filter = request.query_params.get("status")
        page = int(request.query_params.get("page", 1))
        limit = min(int(request.query_params.get("limit", 20)), 100)
        skip = (page - 1) * limit

        # Non-admins only see their own lost items
        reported_by = None if request.user.is_admin else request.user.id

        items = list_lost_items(
            reported_by=reported_by,
            category=category,
            status=status_filter,
            limit=limit,
            skip=skip,
        )
        return Response({"results": [_format_item(i) for i in items], "page": page})

    @extend_schema(
        tags=["Items"],
        summary="Report lost item",
        description="Report a lost item. Image is optional; if provided, CLIP embedding is generated for AI matching.",
        request=LostItemCreateSerializer,
        responses={201: ItemResponseSerializer},
    )
    def post(self, request):
        serializer = LostItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_file = request.FILES.get("image")
        item = create_lost_item(
            data=serializer.validated_data,
            image_file=image_file,
            reported_by=request.user.id,
        )

        # Kick off embedding only if an image was provided
        if image_file:
            generate_embedding.delay(item["_id"], "lost")

        return Response(_format_item(item), status=status.HTTP_201_CREATED)


class LostItemDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Items"],
        summary="Get lost item",
        description="Retrieve a single lost item. Owners can only view their own; admins can view all.",
        responses={200: ItemResponseSerializer, 404: None},
    )
    def _get_owned(self, request, item_id):
        """Return item if it exists and belongs to this user (or user is admin)."""
        item = get_lost_item(item_id)
        if not item:
            return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_admin and item.get("reported_by") != request.user.id:
            return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return item, None

    def get(self, request, item_id):
        item, err = self._get_owned(request, item_id)
        if err:
            return err
        return Response(_format_item(item))

    def patch(self, request, item_id):
        item, err = self._get_owned(request, item_id)
        if err:
            return err

        allowed = {"title", "description", "category", "color", "brand", "lost_at", "lost_location", "status"}
        data = {k: v for k, v in request.data.items() if k in allowed}
        # Only allow valid status transitions
        new_status = data.get("status")
        if new_status and new_status not in ("searching", "found", "closed"):
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES.get("image")
        updated = update_lost_item(item_id, data, image_file=image_file)
        if not updated:
            return Response({"detail": "Update failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if image_file:
            from .tasks import generate_embedding
            generate_embedding.delay(item_id, "lost")

        return Response(_format_item(updated))

    def delete(self, request, item_id):
        item, err = self._get_owned(request, item_id)
        if err:
            return err
        delete_lost_item(item_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
