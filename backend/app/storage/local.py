from pathlib import Path
from uuid import uuid4

from app.storage.base import StoredObject, _sanitize_prefix


class LocalStorageBackend:
    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path

    def store_bytes(self, content: bytes, original_filename: str, prefix: str) -> StoredObject:
        suffix = Path(original_filename).suffix.lower()
        stored_name = f"{uuid4()}{suffix}"
        relative_dir = _sanitize_prefix(prefix)
        relative_path = relative_dir / stored_name if str(relative_dir) else Path(stored_name)
        absolute_path = self.base_path / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content)
        return StoredObject(
            path=relative_path.as_posix(),
            original_name=Path(original_filename).name,
            stored_name=stored_name,
            size_bytes=len(content),
        )
