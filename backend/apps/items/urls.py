from django.urls import path
from .views import (
    FoundItemListCreateView, FoundItemDetailView,
    LostItemListCreateView, LostItemDetailView,
    BulkFoundItemUploadView,
)

urlpatterns = [
    path("found/", FoundItemListCreateView.as_view(), name="found-items"),
    path("found/bulk/", BulkFoundItemUploadView.as_view(), name="found-items-bulk"),
    path("found/<str:item_id>/", FoundItemDetailView.as_view(), name="found-item-detail"),
    path("lost/", LostItemListCreateView.as_view(), name="lost-items"),
    path("lost/<str:item_id>/", LostItemDetailView.as_view(), name="lost-item-detail"),
]
