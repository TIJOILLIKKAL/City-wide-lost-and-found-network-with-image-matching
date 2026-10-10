import io
import logging
import urllib.request
from functools import lru_cache
from typing import List

logger = logging.getLogger(__name__)

CLIP_MODEL = "ViT-B-32"
CLIP_PRETRAINED = "openai"
EMBEDDING_DIMS = 512


@lru_cache(maxsize=1)
def _load_model():
    try:
        import open_clip
        import torch

        model, _, preprocess = open_clip.create_model_and_transforms(
            CLIP_MODEL, pretrained=CLIP_PRETRAINED
        )
        model.eval()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device)
        logger.info("CLIP model loaded on %s", device)
        return model, preprocess, device
    except ImportError:
        logger.warning("open_clip/torch not installed — AI matching unavailable.")
        return None, None, None


def encode_image_from_url(image_url: str) -> List[float]:
    model, preprocess, device = _load_model()
    if model is None:
        return []

    import torch
    from PIL import Image

    try:
        with urllib.request.urlopen(image_url, timeout=15) as resp:
            image = Image.open(io.BytesIO(resp.read())).convert("RGB")
        tensor = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            emb = model.encode_image(tensor)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        return emb.cpu().numpy()[0].tolist()
    except Exception as exc:
        logger.error("encode_image_from_url failed for %s: %s", image_url, exc)
        return []


def encode_image_from_bytes(image_bytes: bytes) -> List[float]:
    model, preprocess, device = _load_model()
    if model is None:
        return []

    import torch
    from PIL import Image

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            emb = model.encode_image(tensor)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        return emb.cpu().numpy()[0].tolist()
    except Exception as exc:
        logger.error("encode_image_from_bytes failed: %s", exc)
        return []


def encode_images_averaged(image_urls: List[str]) -> List[float]:
    """Encode multiple images and return their L2-normalised mean embedding."""
    valid_urls = [u for u in image_urls if u]
    if not valid_urls:
        return []
    if len(valid_urls) == 1:
        return encode_image_from_url(valid_urls[0])

    embeddings = [encode_image_from_url(u) for u in valid_urls]
    valid = [e for e in embeddings if e]
    if not valid:
        return []
    if len(valid) == 1:
        return valid[0]

    try:
        import numpy as np
        avg = np.mean(valid, axis=0)
        norm = float(np.linalg.norm(avg))
        if norm > 0:
            avg = avg / norm
        return avg.tolist()
    except Exception as exc:
        logger.error("encode_images_averaged failed: %s", exc)
        return valid[0]


def encode_text(text: str) -> List[float]:
    model, preprocess, device = _load_model()
    if model is None:
        return []

    import torch
    import open_clip

    try:
        tokenizer = open_clip.get_tokenizer(CLIP_MODEL)
        tokens = tokenizer([text]).to(device)
        with torch.no_grad():
            emb = model.encode_text(tokens)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        return emb.cpu().numpy()[0].tolist()
    except Exception as exc:
        logger.error("encode_text failed for '%s': %s", text, exc)
        return []
