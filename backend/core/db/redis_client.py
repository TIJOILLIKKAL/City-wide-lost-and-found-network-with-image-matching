import logging
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

_redis_client = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL if hasattr(settings, "REDIS_URL") else "redis://localhost:6379/0",
            decode_responses=True,
        )
        try:
            _redis_client.ping()
            logger.info("Redis connection established.")
        except redis.ConnectionError as e:
            logger.error("Redis connection failed: %s", e)
            raise
    return _redis_client
