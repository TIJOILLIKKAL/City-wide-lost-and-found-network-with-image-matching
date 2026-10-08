from django.urls import path
from .views import (
    AdminStatsView,
    AdminUsersView, AdminUserDetailView,
    AdminVenuesView, AdminVenueDetailView,
    AdminVenueActivateView, AdminVenueDeactivateView, AdminVenueTypesView,
    AdminFoundItemsView, AdminFoundItemDetailView,
    AdminLostItemsView, AdminLostItemDetailView,
    AdminClaimsView, AdminClaimDetailView,
    AdminClaimReviewView, AdminClaimCompleteView, AdminClaimCancelView,
)

urlpatterns = [
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),

    path("users/", AdminUsersView.as_view(), name="admin-users"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),

    path("venues/", AdminVenuesView.as_view(), name="admin-venues"),
    path("venues/types/", AdminVenueTypesView.as_view(), name="admin-venue-types"),
    path("venues/<slug:slug>/", AdminVenueDetailView.as_view(), name="admin-venue-detail"),
    path("venues/<slug:slug>/activate/", AdminVenueActivateView.as_view(), name="admin-venue-activate"),
    path("venues/<slug:slug>/deactivate/", AdminVenueDeactivateView.as_view(), name="admin-venue-deactivate"),

    path("found-items/", AdminFoundItemsView.as_view(), name="admin-found-items"),
    path("found-items/<str:item_id>/", AdminFoundItemDetailView.as_view(), name="admin-found-item-detail"),

    path("lost-items/", AdminLostItemsView.as_view(), name="admin-lost-items"),
    path("lost-items/<str:item_id>/", AdminLostItemDetailView.as_view(), name="admin-lost-item-detail"),

    path("claims/", AdminClaimsView.as_view(), name="admin-claims"),
    path("claims/<int:pk>/", AdminClaimDetailView.as_view(), name="admin-claim-detail"),
    path("claims/<int:pk>/review/", AdminClaimReviewView.as_view(), name="admin-claim-review"),
    path("claims/<int:pk>/complete/", AdminClaimCompleteView.as_view(), name="admin-claim-complete"),
    path("claims/<int:pk>/cancel/", AdminClaimCancelView.as_view(), name="admin-claim-cancel"),
]
