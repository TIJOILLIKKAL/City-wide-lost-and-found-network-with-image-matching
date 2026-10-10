import json
import logging
import tempfile
import os

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.db.redis_client import get_redis_client
from core.utils.throttles import SearchRateThrottle
from .engine import run_match_search, search_by_image, search_by_text
from .serializers import ImageSearchSerializer, TextSearchSerializer, MatchResultSerializer

logger = logging.getLogger(__name__)


class ItemMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["AI Matching"],
        summary="Get item matches",
        description="Returns cached AI match results for an item. Results are populated asynchronously by Celery after the item's CLIP embedding is generated.\n\n`item_type` must be `found` or `lost`. `source` in response is `cache` (Redis) or `live` (fresh ES query).",
        parameters=[
            OpenApiParameter("item_type", OpenApiTypes.STR, location=OpenApiParameter.PATH, description="found | lost"),
            OpenApiParameter("item_id", OpenApiTypes.STR, location=OpenApiParameter.PATH, description="MongoDB ObjectId of the item"),
        ],
    )
    def get(self, request, item_type, item_id):
        if item_type not in ("found", "lost"):
            return Response({"detail": "item_type must be 'found' or 'lost'."}, status=400)

        # Try Redis cache first (populated by find_matches task)
        redis = get_redis_client()
        cached = redis.get(f"matches:{item_type}:{item_id}")
        if cached:
            return Response({"results": json.loads(cached), "source": "cache"})

        # Fall back to live ES search
        matches = run_match_search(item_id, item_type, top_k=10)
        return Response({"results": matches, "source": "live"})


class ImageSearchView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    throttle_classes = [SearchRateThrottle]

    @extend_schema(
        tags=["AI Matching"],
        summary="Search by image",
        description="Upload a photo and find visually similar items using CLIP embeddings + Elasticsearch kNN. Rate limited to 30 req/min.",
        request=ImageSearchSerializer,
        responses={200: MatchResultSerializer(many=True)},
    )
    def post(self, request):
        serializer = ImageSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_file = request.FILES["image"]
        item_type = serializer.validated_data["item_type"]
        top_k = serializer.validated_data["top_k"]

        # Save to temp file so encode_image_from_url can be replaced by bytes directly
        image_bytes = image_file.read()

        from core.ai.clip_encoder import encode_image_from_bytes
        from core.db.elasticsearch_client import get_es_client, ITEMS_INDEX, ensure_items_index

        embedding = encode_image_from_bytes(image_bytes)
        if not embedding:
            return Response({"detail": "Could not generate image embedding. Ensure AI packages are installed."}, status=503)

        ensure_items_index()
        target_status = "available" if item_type == "found" else "searching"

        try:
            response = get_es_client().search(
                index=ITEMS_INDEX,
                body={
                    "size": top_k,
                    "_source": {"excludes": ["image_embedding"]},
                    "knn": {
                        "field": "image_embedding",
                        "query_vector": embedding,
                        "k": top_k,
                        "num_candidates": top_k * 10,
                        "filter": [
                            {"term": {"item_type": item_type}},
                            {"term": {"status": target_status}},
                        ],
                    },
                },
            )
        except Exception as exc:
            logger.error("Image search ES error: %s", exc)
            return Response({"detail": "Search service unavailable."}, status=503)

        hits = response["hits"]["hits"]
        max_score = max((hit["_score"] or 0 for hit in hits), default=1) or 1
        results = [
            {
                "item_id": hit["_id"],
                "title": hit["_source"].get("title"),
                "description": hit["_source"].get("description"),
                "category": hit["_source"].get("category"),
                "venue_id": hit["_source"].get("venue_id"),
                "status": hit["_source"].get("status"),
                "score": round((hit["_score"] or 0) / max_score, 4),
                "reported_at": hit["_source"].get("reported_at"),
            }
            for hit in hits
        ]
        return Response({"results": results, "total": len(results)})


class TextSearchView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SearchRateThrottle]

    @extend_schema(
        tags=["AI Matching"],
        summary="Search by text",
        description="Search items using a natural-language description. Uses CLIP text embeddings for semantic matching. Rate limited to 30 req/min.",
        request=TextSearchSerializer,
        responses={200: MatchResultSerializer(many=True)},
    )
    def post(self, request):
        serializer = TextSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        results = search_by_text(
            query=serializer.validated_data["query"],
            item_type_filter=serializer.validated_data["item_type"],
            category=serializer.validated_data.get("category") or None,
            top_k=serializer.validated_data["top_k"],
        )
        return Response({"results": results, "total": len(results)})
