from rest_framework import generics, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Venue
from .serializers import (
    VenueListSerializer,
    VenueDetailSerializer,
    VenueOperatingHoursBulkSerializer,
)
from .permissions import IsAdminOrReadOnly, IsVenueStaffOrAdmin
from .filters import VenueFilter


class MyVenueView(generics.RetrieveUpdateAPIView):
    """Venue staff can view and partially update their own venue."""
    permission_classes = [IsAuthenticated]
    serializer_class = VenueDetailSerializer

    def get_object(self):
        user = self.request.user
        if not user.venue_id:
            from rest_framework.exceptions import NotFound
            raise NotFound("You are not assigned to a venue.")
        return Venue.objects.prefetch_related("hours", "staff").get(pk=user.venue_id)

    def get_serializer(self, *args, **kwargs):
        kwargs.setdefault("partial", True)
        return super().get_serializer(*args, **kwargs)


@extend_schema_view(
    list=extend_schema(tags=["Venues"], summary="List venues"),
    create=extend_schema(tags=["Venues"], summary="Create venue (Admin)"),
    retrieve=extend_schema(tags=["Venues"], summary="Get venue"),
    update=extend_schema(tags=["Venues"], summary="Replace venue (Admin)"),
    partial_update=extend_schema(tags=["Venues"], summary="Update venue (Admin)"),
    destroy=extend_schema(tags=["Venues"], summary="Delete venue (Admin)"),
)
class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.prefetch_related("hours", "staff").all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = VenueFilter
    search_fields = ["name", "city", "state", "contact_name"]
    ordering_fields = ["name", "city", "created_at"]
    ordering = ["name"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return VenueListSerializer
        return VenueDetailSerializer

    def get_permissions(self):
        if self.action in ["retrieve", "list"]:
            return [IsVenueStaffOrAdmin()]
        return super().get_permissions()

    @extend_schema(tags=["Venues"], summary="Get/set operating hours")
    @action(detail=True, methods=["get", "post"], url_path="hours")
    def operating_hours(self, request, slug=None):
        venue = self.get_object()

        if request.method == "GET":
            from .serializers import VenueOperatingHoursSerializer
            serializer = VenueOperatingHoursSerializer(venue.hours.all(), many=True)
            return Response(serializer.data)

        # POST — replace all hours
        self.check_object_permissions(request, venue)
        serializer = VenueOperatingHoursBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(venue=venue)
        return Response({"detail": "Operating hours updated."}, status=status.HTTP_200_OK)

    @extend_schema(tags=["Venues"], summary="Activate venue (Admin)")
    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, slug=None):
        venue = self.get_object()
        venue.status = Venue.Status.ACTIVE
        venue.save(update_fields=["status"])
        return Response({"detail": "Venue activated."})

    @extend_schema(tags=["Venues"], summary="Deactivate venue (Admin)")
    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, slug=None):
        venue = self.get_object()
        venue.status = Venue.Status.INACTIVE
        venue.save(update_fields=["status"])
        return Response({"detail": "Venue deactivated."})

    @extend_schema(tags=["Venues"], summary="List venue types")
    @action(detail=False, methods=["get"], url_path="types")
    def venue_types(self, request):
        return Response([
            {"value": v, "label": l}
            for v, l in Venue.VenueType.choices
        ])
