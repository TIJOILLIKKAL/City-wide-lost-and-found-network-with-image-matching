from django.urls import path
from .views import AnalyticsOverviewView, AnalyticsDailyView

urlpatterns = [
    path("overview/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path("daily/", AnalyticsDailyView.as_view(), name="analytics-daily"),
]
