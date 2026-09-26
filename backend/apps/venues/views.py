from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Venue
from .serializers import (
    VenueListSerializer,
    VenueDetailSerializer,
    VenueOperatingHoursBulkSerializer,
)
from .permissions import IsAdminOrReadOnly, IsVenueStaffOrAdmin
from .filters import VenueFilter


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

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, slug=None):
        venue = self.get_object()
        venue.status = Venue.Status.ACTIVE
        venue.save(update_fields=["status"])
        return Response({"detail": "Venue activated."})

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, slug=None):
        venue = self.get_object()
        venue.status = Venue.Status.INACTIVE
        venue.save(update_fields=["status"])
        return Response({"detail": "Venue deactivated."})

    @action(detail=False, methods=["get"], url_path="types")
    def venue_types(self, request):
        return Response([
            {"value": v, "label": l}
            for v, l in Venue.VenueType.choices
        ])
