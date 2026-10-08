import logging
from celery import shared_task

from core.db.elasticsearch_client import get_es_client, ensure_items_index, ITEMS_INDEX
from core.ai.clip_encoder import encode_image_from_url, encode_text
from .services import get_found_item, get_lost_item, update_embedding_status

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_embedding(self, item_id: str, item_type: str):
    """Generate CLIP embedding for an item and index it in Elasticsearch."""
    try:
        item = get_found_item(item_id) if item_type == "found" else get_lost_item(item_id)
        if not item:
            logger.warning("Item %s (%s) not found, skipping embedding.", item_id, item_type)
            return

        # Generate embedding — image takes priority, fall back to text
        embedding = []
        if item.get("image_url"):
            embedding = encode_image_from_url(item["image_url"])

        if not embedding:
            text = f"{item.get('title', '')} {item.get('description', '')} {item.get('category', '')}"
            embedding = encode_text(text.strip())

        ensure_items_index()

        doc = {
            "item_id": item_id,
            "item_type": item_type,
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "category": item.get("category", ""),
            "venue_id": str(item.get("venue_id", "")),
            "status": item.get("status", ""),
            "reported_at": item.get("created_at"),
        }
        if embedding:
            doc["image_embedding"] = embedding

        get_es_client().index(index=ITEMS_INDEX, id=item_id, document=doc)
        update_embedding_status(item_id, item_type, "done")
        logger.info("Indexed %s item %s in Elasticsearch.", item_type, item_id)

        # Trigger match search after indexing
        find_matches.delay(item_id, item_type)

    except Exception as exc:
        update_embedding_status(item_id, item_type, "failed")
        logger.error("Embedding failed for %s %s: %s", item_type, item_id, exc)
        raise self.retry(exc=exc)


@shared_task
def find_matches(item_id: str, item_type: str):
    """Search Elasticsearch for matches, cache results, and push WebSocket notification."""
    from apps.matching.engine import run_match_search
    from core.db.redis_client import get_redis_client
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import json

    matches = run_match_search(item_id, item_type, top_k=10)

    # Cache for 24h regardless of match count (empty list is a valid cached result)
    redis = get_redis_client()
    redis.setex(f"matches:{item_type}:{item_id}", 86400, json.dumps(matches))

    if not matches:
        return

    # Resolve the item reporter to know which user group to notify
    item = get_found_item(item_id) if item_type == "found" else get_lost_item(item_id)
    if not item:
        return

    user_id = item.get("reported_by")
    if not user_id:
        return

    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "notify_match",
                "item_id": item_id,
                "item_type": item_type,
                "match_count": len(matches),
            },
        )
    logger.info("Notified user %s of %d matches for %s %s.", user_id, len(matches), item_type, item_id)
