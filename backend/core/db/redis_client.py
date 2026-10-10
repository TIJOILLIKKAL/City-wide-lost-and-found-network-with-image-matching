import logging
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

_redis_client = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        redis_url = (
            getattr(settings, "REDIS_URL", None)
            or settings.CACHES.get("default", {}).get("LOCATION", "redis://localhost:6379/0")
        )
        _redis_client = redis.from_url(redis_url, decode_responses=True)
        try:
            _redis_client.ping()
            logger.info("Redis connection established.")
        except redis.ConnectionError as e:
            logger.error("Redis connection failed: %s", e)
            raise
    return _redis_client
