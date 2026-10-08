import uuid
import logging
from datetime import datetime, timezone

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from bson import ObjectId

from core.db.mongo import found_items_collection, lost_items_collection

logger = logging.getLogger(__name__)


def upload_item_image(image_file, item_type: str) -> tuple[str, str]:
    """Upload image to storage (S3 in prod, local in dev). Returns (url, storage_key)."""
    ext = image_file.name.rsplit(".", 1)[-1].lower() if "." in image_file.name else "jpg"
    key = f"items/{item_type}/{uuid.uuid4().hex}.{ext}"
    saved_key = default_storage.save(key, ContentFile(image_file.read()))
    url = default_storage.url(saved_key)
    return url, saved_key


def create_found_item(data: dict, image_file, venue_id: int, reported_by: int) -> dict:
    image_url, image_key = upload_item_image(image_file, "found")
    now = datetime.now(timezone.utc)

    document = {
        "item_type": "found",
        "venue_id": venue_id,
        "reported_by": reported_by,
        "title": data["title"],
        "description": data["description"],
        "category": data["category"],
        "color": data.get("color", ""),
        "brand": data.get("brand", ""),
        "image_url": image_url,
        "image_key": image_key,
        "found_at": data["found_at"],
        "found_location": data.get("found_location", ""),
        "attributes": data.get("attributes", {}),
        "status": "available",
        "embedding_status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    result = found_items_collection().insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


def create_lost_item(data: dict, image_file, reported_by: int) -> dict:
    now = datetime.now(timezone.utc)
    image_url, image_key = "", ""

    if image_file:
        image_url, image_key = upload_item_image(image_file, "lost")

    document = {
        "item_type": "lost",
        "reported_by": reported_by,
        "title": data["title"],
        "description": data["description"],
        "category": data["category"],
        "color": data.get("color", ""),
        "brand": data.get("brand", ""),
        "image_url": image_url,
        "image_key": image_key,
        "lost_at": data["lost_at"],
        "lost_location": data.get("lost_location", ""),
        "attributes": data.get("attributes", {}),
        "status": "searching",
        "embedding_status": "pending" if image_url else "skipped",
        "created_at": now,
        "updated_at": now,
    }

    result = lost_items_collection().insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


def get_found_item(item_id: str) -> dict | None:
    doc = found_items_collection().find_one({"_id": ObjectId(item_id)})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def get_lost_item(item_id: str) -> dict | None:
    doc = lost_items_collection().find_one({"_id": ObjectId(item_id)})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def list_found_items(venue_id: int = None, category: str = None, status: str = None, limit: int = 20, skip: int = 0) -> list:
    query = {}
    if venue_id:
        query["venue_id"] = venue_id
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    cursor = found_items_collection().find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        docs.append(doc)
    return docs


def list_lost_items(reported_by: int = None, category: str = None, status: str = None, limit: int = 20, skip: int = 0) -> list:
    query = {}
    if reported_by:
        query["reported_by"] = reported_by
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    cursor = lost_items_collection().find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        docs.append(doc)
    return docs


def update_embedding_status(item_id: str, item_type: str, status: str):
    collection = found_items_collection() if item_type == "found" else lost_items_collection()
    collection.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"embedding_status": status, "updated_at": datetime.now(timezone.utc)}},
    )
