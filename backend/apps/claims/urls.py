from django.urls import path
from .views import (
    ClaimListCreateView, ClaimDetailView,
    ClaimReviewView, ClaimDeliveryView,
    ClaimCompleteView, ClaimCancelView,
    PickupSlotListCreateView,
)

urlpatterns = [
    # Claims
    path("", ClaimListCreateView.as_view(), name="claims"),
    path("<int:pk>/", ClaimDetailView.as_view(), name="claim-detail"),
    path("<int:pk>/review/", ClaimReviewView.as_view(), name="claim-review"),
    path("<int:pk>/delivery/", ClaimDeliveryView.as_view(), name="claim-delivery"),
    path("<int:pk>/complete/", ClaimCompleteView.as_view(), name="claim-complete"),
    path("<int:pk>/cancel/", ClaimCancelView.as_view(), name="claim-cancel"),

    # Pickup slots
    path("slots/", PickupSlotListCreateView.as_view(), name="pickup-slots"),
]
