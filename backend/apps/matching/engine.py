import logging
from typing import List, Dict, Any

from core.db.elasticsearch_client import get_es_client, ITEMS_INDEX
from core.ai.clip_encoder import encode_image_from_url, encode_text

logger = logging.getLogger(__name__)

# Score weights
IMAGE_WEIGHT = 0.7
TEXT_WEIGHT = 0.3
MIN_SCORE_THRESHOLD = 0.3
# Only send match notifications for matches above this confidence
NOTIFICATION_SCORE_THRESHOLD = 0.6


def _get_item_doc(item_id: str) -> dict | None:
    try:
        result = get_es_client().get(index=ITEMS_INDEX, id=item_id)
        return result["_source"]
    except Exception:
        return None


def run_match_search(item_id: str, item_type: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Find matches for item_id from the opposite pool.
    found → search among lost items
    lost  → search among found items
    """
    source_doc = _get_item_doc(item_id)
    if not source_doc:
        logger.warning("Source doc %s not in ES yet.", item_id)
        return []

    target_type = "lost" if item_type == "found" else "found"
    target_status = "searching" if target_type == "lost" else "available"

    embedding = source_doc.get("image_embedding")
    text_query = f"{source_doc.get('title', '')} {source_doc.get('description', '')}".strip()
    category = source_doc.get("category", "")

    es = get_es_client()

    # Build the ES query — kNN for image similarity, bool for text/category boost
    query_body: dict = {
        "size": top_k,
        "_source": {"excludes": ["image_embedding"]},
        "query": {
            "bool": {
                "must": [
                    {"term": {"item_type": target_type}},
                    {"term": {"status": target_status}},
                ],
                "should": [
                    {"match": {"title": {"query": text_query, "boost": 1.5}}},
                    {"match": {"description": {"query": text_query, "boost": 1.0}}},
                    {"term": {"category": {"value": category, "boost": 2.0}}},
                ],
            }
        },
    }

    if embedding:
        query_body["knn"] = {
            "field": "image_embedding",
            "query_vector": embedding,
            "k": top_k,
            "num_candidates": top_k * 10,
            "filter": [
                {"term": {"item_type": target_type}},
                {"term": {"status": target_status}},
            ],
            "boost": IMAGE_WEIGHT,
        }

    try:
        response = es.search(index=ITEMS_INDEX, body=query_body)
    except Exception as exc:
        logger.error("ES search failed for %s %s: %s", item_type, item_id, exc)
        return []

    hits = response["hits"]["hits"]
    max_score = max((hit["_score"] or 0 for hit in hits), default=1) or 1

    matches = []
    for hit in hits:
        raw = hit["_score"] or 0
        if raw < MIN_SCORE_THRESHOLD:
            continue
        normalized = round(raw / max_score, 4)
        matches.append({
            "item_id": hit["_id"],
            "item_type": hit["_source"].get("item_type"),
            "title": hit["_source"].get("title"),
            "description": hit["_source"].get("description"),
            "category": hit["_source"].get("category"),
            "venue_id": hit["_source"].get("venue_id"),
            "status": hit["_source"].get("status"),
            "score": normalized,
            "reported_at": hit["_source"].get("reported_at"),
        })

    return matches


def search_by_image(image_url: str, item_type_filter: str = "found", top_k: int = 10) -> List[Dict[str, Any]]:
    """Direct image-based search — used by the public search endpoint."""
    embedding = encode_image_from_url(image_url)
    if not embedding:
        return []

    es = get_es_client()
    query_body = {
        "size": top_k,
        "_source": {"excludes": ["image_embedding"]},
        "knn": {
            "field": "image_embedding",
            "query_vector": embedding,
            "k": top_k,
            "num_candidates": top_k * 10,
            "filter": [
                {"term": {"item_type": item_type_filter}},
                {"term": {"status": "available" if item_type_filter == "found" else "searching"}},
            ],
        },
    }

    try:
        response = es.search(index=ITEMS_INDEX, body=query_body)
    except Exception as exc:
        logger.error("ES image search failed: %s", exc)
        return []

    hits = response["hits"]["hits"]
    max_score = max((hit["_score"] or 0 for hit in hits), default=1) or 1
    return [
        {
            "item_id": hit["_id"],
            "title": hit["_source"].get("title"),
            "category": hit["_source"].get("category"),
            "venue_id": hit["_source"].get("venue_id"),
            "score": round((hit["_score"] or 0) / max_score, 4),
            "reported_at": hit["_source"].get("reported_at"),
        }
        for hit in hits
        if (hit["_score"] or 0) >= MIN_SCORE_THRESHOLD
    ]


def search_by_text(query: str, item_type_filter: str = "found", category: str = None, top_k: int = 10) -> List[Dict[str, Any]]:
    """Text-only search — used when no image is available."""
    text_embedding = encode_text(query)
    es = get_es_client()

    must_filters = [
        {"term": {"item_type": item_type_filter}},
        {"term": {"status": "available" if item_type_filter == "found" else "searching"}},
    ]
    if category:
        must_filters.append({"term": {"category": category}})

    query_body: dict = {
        "size": top_k,
        "_source": {"excludes": ["image_embedding"]},
        "query": {
            "bool": {
                "must": must_filters,
                "should": [
                    {"match": {"title": {"query": query, "boost": 2.0}}},
                    {"match": {"description": {"query": query, "boost": 1.0}}},
                ],
            }
        },
    }

    if text_embedding:
        query_body["knn"] = {
            "field": "image_embedding",
            "query_vector": text_embedding,
            "k": top_k,
            "num_candidates": top_k * 10,
            "filter": must_filters,
            "boost": 0.5,
        }

    try:
        response = es.search(index=ITEMS_INDEX, body=query_body)
    except Exception as exc:
        logger.error("ES text search failed: %s", exc)
        return []

    hits = response["hits"]["hits"]
    max_score = max((hit["_score"] or 0 for hit in hits), default=1) or 1
    return [
        {
            "item_id": hit["_id"],
            "title": hit["_source"].get("title"),
            "description": hit["_source"].get("description"),
            "category": hit["_source"].get("category"),
            "venue_id": hit["_source"].get("venue_id"),
            "score": round((hit["_score"] or 0) / max_score, 4),
            "reported_at": hit["_source"].get("reported_at"),
        }
        for hit in hits
    ]
