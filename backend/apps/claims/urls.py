from django.urls import path
from .views import (
    ClaimListCreateView, ClaimDetailView,
    ClaimReviewView, ClaimDeliveryView,
    ClaimCompleteView, ClaimCancelView,
    PickupSlotListCreateView,
    DisputeListView, DisputeResolveView,
    ClaimUploadIdView, ClaimVerifyIdView,
)

urlpatterns = [
    # Claims CRUD
    path("", ClaimListCreateView.as_view(), name="claims"),
    path("<int:pk>/", ClaimDetailView.as_view(), name="claim-detail"),
    path("<int:pk>/review/", ClaimReviewView.as_view(), name="claim-review"),
    path("<int:pk>/delivery/", ClaimDeliveryView.as_view(), name="claim-delivery"),
    path("<int:pk>/complete/", ClaimCompleteView.as_view(), name="claim-complete"),
    path("<int:pk>/cancel/", ClaimCancelView.as_view(), name="claim-cancel"),

    # ID verification
    path("<int:pk>/upload-id/", ClaimUploadIdView.as_view(), name="claim-upload-id"),
    path("<int:pk>/verify-id/", ClaimVerifyIdView.as_view(), name="claim-verify-id"),

    # Disputes
    path("disputes/", DisputeListView.as_view(), name="claim-disputes"),
    path("disputes/<str:found_item_id>/resolve/", DisputeResolveView.as_view(), name="claim-dispute-resolve"),

    # Pickup slots
    path("slots/", PickupSlotListCreateView.as_view(), name="pickup-slots"),
]
