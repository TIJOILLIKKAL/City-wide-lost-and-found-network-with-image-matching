import logging
from functools import lru_cache
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from django.conf import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        logger.info("MongoDB connection established.")
    except ConnectionFailure as e:
        logger.error("MongoDB connection failed: %s", e)
        raise
    return client


def get_db():
    return get_mongo_client()[settings.MONGO_DB_NAME]


# Collection accessors
def found_items_collection():
    return get_db()["found_items"]


def lost_items_collection():
    return get_db()["lost_items"]
