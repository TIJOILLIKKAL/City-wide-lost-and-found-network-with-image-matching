from django.urls import path
from .views import ItemMatchesView, ImageSearchView, TextSearchView

urlpatterns = [
    path("<str:item_type>/<str:item_id>/matches/", ItemMatchesView.as_view(), name="item-matches"),
    path("search/image/", ImageSearchView.as_view(), name="search-by-image"),
    path("search/text/", TextSearchView.as_view(), name="search-by-text"),
]
