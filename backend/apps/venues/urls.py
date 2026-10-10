from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VenueViewSet, MyVenueView

router = DefaultRouter()
router.register(r"", VenueViewSet, basename="venue")

urlpatterns = [
    path("me/", MyVenueView.as_view(), name="my-venue"),
    path("", include(router.urls)),
]
