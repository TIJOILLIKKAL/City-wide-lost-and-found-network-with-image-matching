from django.urls import path
from .views import ChatRoomView, ChatHistoryView, ChatPresenceView, ChatRoomsListView

urlpatterns = [
    path("rooms/", ChatRoomsListView.as_view()),
    path("claim/<int:claim_id>/", ChatRoomView.as_view()),
    path("room/<int:room_id>/messages/", ChatHistoryView.as_view()),
    path("room/<int:room_id>/presence/", ChatPresenceView.as_view()),
]
