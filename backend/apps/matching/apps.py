import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MatchingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.matching"

    def ready(self):
        try:
            from core.db.elasticsearch_client import ensure_items_index
            ensure_items_index()
        except Exception as exc:
            logger.warning("Could not create Elasticsearch index on startup: %s", exc)
