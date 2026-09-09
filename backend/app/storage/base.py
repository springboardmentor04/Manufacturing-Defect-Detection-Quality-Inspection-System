from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


@dataclass(frozen=True)
class StoredObject:
    path: str
    original_name: str
    stored_name: str
    size_bytes: int


class StorageBackend(Protocol):
    def store_bytes(self, content: bytes, original_filename: str, prefix: str) -> StoredObject:
        raise NotImplementedError


def _sanitize_prefix(prefix: str) -> Path:
    cleaned_prefix = prefix.replace("\\", "/").strip("/")
    relative_path = Path(cleaned_prefix) if cleaned_prefix else Path()
    if any(part == ".." for part in relative_path.parts):
        raise ValueError("Storage prefix may not contain path traversal segments")
    return relative_path


def get_storage_backend() -> StorageBackend:
    from app.storage.local import LocalStorageBackend

    settings = get_settings()
    return LocalStorageBackend(base_path=Path(settings.storage_root))
