import logging
from celery import shared_task

from core.db.elasticsearch_client import get_es_client, ensure_items_index, ITEMS_INDEX
from core.ai.clip_encoder import encode_image_from_url, encode_images_averaged, encode_text
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

        # Generate embedding — multiple images averaged, single image, or text fallback
        embedding = []
        images = item.get("images") or []
        image_urls = [img["url"] for img in images if img.get("url")]

        if len(image_urls) > 1:
            embedding = encode_images_averaged(image_urls)
        elif image_urls:
            embedding = encode_image_from_url(image_urls[0])
        elif item.get("image_url"):
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
    """Search ES for matches, cache results, create DB notifications, push WS + email."""
    from apps.matching.engine import run_match_search, NOTIFICATION_SCORE_THRESHOLD
    from core.db.redis_client import get_redis_client
    from channels.layers import get_channel_layer
    import json

    matches = run_match_search(item_id, item_type, top_k=10)

    redis = get_redis_client()
    redis.setex(f"matches:{item_type}:{item_id}", 86400, json.dumps(matches))

    if not matches:
        return

    source_item = get_found_item(item_id) if item_type == "found" else get_lost_item(item_id)
    if not source_item:
        return

    channel_layer = get_channel_layer()

    # Only notify for matches above the confidence threshold
    notify_matches = [m for m in matches if m["score"] >= NOTIFICATION_SCORE_THRESHOLD]

    if item_type == "found":
        # Found item uploaded by venue → notify each matched lost-item owner individually
        for match in notify_matches:
            lost_item = get_lost_item(match["item_id"])
            if not lost_item:
                continue
            owner_id = lost_item.get("reported_by")
            if not owner_id:
                continue
            pct = int(match["score"] * 100)
            _notify_user(
                user_id=owner_id,
                notif_type="match_found",
                title=f"{pct}% match found for your lost item!",
                message=f"A found item \"{source_item.get('title')}\" may be yours — {pct}% confidence.",
                data={"found_item_id": item_id, "lost_item_id": match["item_id"], "score": match["score"]},
                channel_layer=channel_layer,
                found_item_id=item_id,
            )
    else:
        # Lost item reported → notify the owner about each high-confidence found match
        owner_id = source_item.get("reported_by")
        if owner_id and notify_matches:
            for match in notify_matches:
                pct = int(match["score"] * 100)
                _notify_user(
                    user_id=owner_id,
                    notif_type="match_found",
                    title=f"{pct}% match: possible found item",
                    message=f"\"{source_item.get('title')}\" matched a found item with {pct}% confidence.",
                    data={"lost_item_id": item_id, "found_item_id": match["item_id"], "score": match["score"]},
                    channel_layer=channel_layer,
                    found_item_id=match.get("item_id"),
                )

    logger.info(
        "find_matches done for %s %s — %d total, %d above threshold.",
        item_type, item_id, len(matches), len(notify_matches),
    )


def _notify_user(user_id: int, notif_type: str, title: str, message: str, data: dict,
                 channel_layer, found_item_id: str = None):
    """Save DB notification, push WebSocket event, and send email."""
    from django.contrib.auth import get_user_model
    from django.core.mail import send_mail
    from django.conf import settings
    from apps.notifications.models import Notification

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    # Persist notification
    notif = Notification.objects.create(
        user=user,
        notification_type=notif_type,
        title=title,
        message=message,
        data=data,
    )

    # WebSocket push
    if channel_layer:
        try:
            from asgiref.sync import async_to_sync
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "notify_match",
                    "item_id": data.get("lost_item_id") or data.get("found_item_id", ""),
                    "item_type": "lost",
                    "match_count": data.get("match_count", 1),
                    "notification_id": notif.id,
                    "title": title,
                    "message": message,
                },
            )
        except Exception as exc:
            logger.warning("WS push failed for user %s: %s", user_id, exc)

    # Email notification
    if user.email:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        link = f"{frontend_url}/items/lost/{data.get('lost_item_id', '')}"
        try:
            send_mail(
                subject=title,
                message=f"{message}\n\nView your item: {link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            logger.info("Email sent to %s for notification %s.", user.email, notif.id)
        except Exception as exc:
            logger.warning("Email failed for user %s: %s", user_id, exc)
