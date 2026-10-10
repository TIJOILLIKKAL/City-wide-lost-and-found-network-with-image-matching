import uuid
import logging
from datetime import datetime, timezone

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from bson import ObjectId
from bson.errors import InvalidId

from core.db.mongo import found_items_collection, lost_items_collection

logger = logging.getLogger(__name__)


def upload_item_image(image_file, item_type: str) -> tuple[str, str]:
    """Upload a single image. Returns (url, storage_key)."""
    ext = image_file.name.rsplit(".", 1)[-1].lower() if "." in image_file.name else "jpg"
    key = f"items/{item_type}/{uuid.uuid4().hex}.{ext}"
    saved_key = default_storage.save(key, ContentFile(image_file.read()))
    url = default_storage.url(saved_key)
    return url, saved_key


def upload_item_images(image_files: list, item_type: str) -> list[dict]:
    """Upload multiple images. Returns list of {url, key} dicts."""
    result = []
    for f in image_files:
        if f:
            url, key = upload_item_image(f, item_type)
            result.append({"url": url, "key": key})
    return result


def create_found_item(data: dict, image_files: list, venue_id: int, reported_by: int) -> dict:
    images = upload_item_images(image_files, "found")
    primary_url = images[0]["url"] if images else ""
    primary_key = images[0]["key"] if images else ""
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
        "images": images,
        "image_url": primary_url,
        "image_key": primary_key,
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


def create_lost_item(data: dict, image_files: list, reported_by: int) -> dict:
    now = datetime.now(timezone.utc)
    images = upload_item_images(image_files, "lost") if image_files else []
    primary_url = images[0]["url"] if images else ""
    primary_key = images[0]["key"] if images else ""

    document = {
        "item_type": "lost",
        "reported_by": reported_by,
        "title": data["title"],
        "description": data["description"],
        "category": data["category"],
        "color": data.get("color", ""),
        "brand": data.get("brand", ""),
        "images": images,
        "image_url": primary_url,
        "image_key": primary_key,
        "lost_at": data["lost_at"],
        "lost_location": data.get("lost_location", ""),
        "attributes": data.get("attributes", {}),
        "status": "searching",
        "embedding_status": "pending" if primary_url else "skipped",
        "created_at": now,
        "updated_at": now,
    }

    result = lost_items_collection().insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


def get_found_item(item_id: str) -> dict | None:
    try:
        doc = found_items_collection().find_one({"_id": ObjectId(item_id)})
    except (InvalidId, TypeError):
        return None
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def get_lost_item(item_id: str) -> dict | None:
    try:
        doc = lost_items_collection().find_one({"_id": ObjectId(item_id)})
    except (InvalidId, TypeError):
        return None
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def update_lost_item(item_id: str, data: dict, image_files: list = None) -> dict | None:
    try:
        oid = ObjectId(item_id)
    except (InvalidId, TypeError):
        return None

    updates = {k: v for k, v in data.items() if v is not None}
    if image_files:
        images = upload_item_images(image_files, "lost")
        if images:
            updates["images"] = images
            updates["image_url"] = images[0]["url"]
            updates["image_key"] = images[0]["key"]
            updates["embedding_status"] = "pending"
    updates["updated_at"] = datetime.now(timezone.utc)

    lost_items_collection().update_one({"_id": oid}, {"$set": updates})
    return get_lost_item(item_id)


def delete_lost_item(item_id: str) -> bool:
    """Soft-delete by setting status=closed."""
    try:
        oid = ObjectId(item_id)
    except (InvalidId, TypeError):
        return False
    result = lost_items_collection().update_one(
        {"_id": oid},
        {"$set": {"status": "closed", "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


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
