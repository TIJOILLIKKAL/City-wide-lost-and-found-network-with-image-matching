import logging
from functools import lru_cache
from elasticsearch import Elasticsearch
from django.conf import settings

logger = logging.getLogger(__name__)

ITEMS_INDEX = "lostfound_items"
EMBEDDING_DIMS = 512  # CLIP ViT-B/32


@lru_cache(maxsize=1)
def get_es_client() -> Elasticsearch:
    client = Elasticsearch(
        settings.ELASTICSEARCH_HOST,
        basic_auth=(settings.ELASTICSEARCH_USER, settings.ELASTICSEARCH_PASSWORD),
        verify_certs=False,
    )
    if client.ping():
        logger.info("Elasticsearch connection established.")
    else:
        logger.error("Elasticsearch connection failed.")
    return client


def ensure_items_index():
    es = get_es_client()
    if es.indices.exists(index=ITEMS_INDEX):
        return

    mapping = {
        "mappings": {
            "properties": {
                "item_id": {"type": "keyword"},
                "item_type": {"type": "keyword"},  # found | lost
                "title": {"type": "text"},
                "description": {"type": "text"},
                "category": {"type": "keyword"},
                "venue_id": {"type": "keyword"},
                "status": {"type": "keyword"},
                "reported_at": {"type": "date"},
                "image_embedding": {
                    "type": "dense_vector",
                    "dims": EMBEDDING_DIMS,
                    "index": True,
                    "similarity": "cosine",
                },
            }
        }
    }
    es.indices.create(index=ITEMS_INDEX, mappings=mapping["mappings"])
    logger.info("Created Elasticsearch index: %s", ITEMS_INDEX)
