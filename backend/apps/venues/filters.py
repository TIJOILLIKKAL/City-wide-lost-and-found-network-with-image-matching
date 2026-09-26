import django_filters
from .models import Venue


class VenueFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(lookup_expr="icontains")
    state = django_filters.CharFilter(lookup_expr="icontains")
    venue_type = django_filters.ChoiceFilter(choices=Venue.VenueType.choices)
    status = django_filters.ChoiceFilter(choices=Venue.Status.choices)
    name = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Venue
        fields = ["city", "state", "venue_type", "status", "name"]
