import logging
from datetime import datetime, timedelta, timezone

from rest_framework.views import APIView
from rest_framework.response import Response

from apps.venues.permissions import IsAdminUser
from apps.claims.models import Claim
from core.db.mongo import found_items_collection, lost_items_collection

logger = logging.getLogger(__name__)


class AnalyticsOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = min(int(request.query_params.get("days", 30)), 365)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        total_found = found_items_collection().count_documents({})
        new_found = found_items_collection().count_documents({"created_at": {"$gte": cutoff}})
        archived_found = found_items_collection().count_documents({"status": "archived"})
        total_lost = lost_items_collection().count_documents({})
        new_lost = lost_items_collection().count_documents({"created_at": {"$gte": cutoff}})

        total_claims = Claim.objects.count()
        new_claims = Claim.objects.filter(created_at__gte=cutoff).count()
        approved = Claim.objects.filter(status=Claim.Status.APPROVED).count()
        rejected = Claim.objects.filter(status=Claim.Status.REJECTED).count()
        completed = Claim.objects.filter(status=Claim.Status.COMPLETED).count()
        pending = Claim.objects.filter(status__in=[Claim.Status.PENDING, Claim.Status.UNDER_REVIEW]).count()

        from django.db.models import Avg, ExpressionWrapper, F, DurationField
        avg_dur = (
            Claim.objects
            .filter(status=Claim.Status.APPROVED, reviewed_at__isnull=False, created_at__gte=cutoff)
            .annotate(dur=ExpressionWrapper(F("reviewed_at") - F("created_at"), output_field=DurationField()))
            .aggregate(avg=Avg("dur"))
        )["avg"]
        avg_hours = round(avg_dur.total_seconds() / 3600, 1) if avg_dur else None

        matched_claims = Claim.objects.filter(lost_item_id__gt="").count()
        match_rate = round(matched_claims / total_claims * 100) if total_claims > 0 else 0

        return Response({
            "period_days": days,
            "found_items": {"total": total_found, "new": new_found, "archived": archived_found},
            "lost_items": {"total": total_lost, "new": new_lost},
            "claims": {
                "total": total_claims, "new": new_claims, "pending": pending,
                "approved": approved, "rejected": rejected, "completed": completed,
            },
            "avg_resolution_hours": avg_hours,
            "match_rate_pct": match_rate,
        })


class AnalyticsDailyView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = min(int(request.query_params.get("days", 30)), 365)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        found_daily = [{"date": r["_id"], "count": r["count"]}
                       for r in found_items_collection().aggregate(pipeline)]
        lost_daily = [{"date": r["_id"], "count": r["count"]}
                      for r in lost_items_collection().aggregate(pipeline)]

        from django.db.models.functions import TruncDate
        from django.db.models import Count
        raw = (
            Claim.objects
            .filter(created_at__gte=cutoff)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        claims_daily = [{"date": str(r["day"]), "count": r["count"]} for r in raw]

        return Response({
            "period_days": days,
            "found_items_per_day": found_daily,
            "lost_items_per_day": lost_daily,
            "claims_per_day": claims_daily,
        })
