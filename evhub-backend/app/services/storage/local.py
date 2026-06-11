import os
import uuid
import aiofiles
from pathlib import Path

from app.services.storage import StorageBackend, UploadResult

UPLOAD_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_url: str = "http://localhost:8000"):
        self._base_url = base_url.rstrip("/")

    def _ensure_dir(self, folder: str) -> Path:
        target = UPLOAD_DIR / folder if folder else UPLOAD_DIR
        target.mkdir(parents=True, exist_ok=True)
        return target

    def _safe_filename(self, original: str) -> str:
        name, ext = os.path.splitext(original)
        ext = ext.lower()
        if ext not in ALLOWED_EXTENSIONS:
            ext = ".png"
        return f"{uuid.uuid4().hex}{ext}"

    async def upload(
        self, file_data: bytes, filename: str, content_type: str, folder: str = ""
    ) -> UploadResult:
        safe_name = self._safe_filename(filename)
        target_dir = self._ensure_dir(folder)
        file_path = target_dir / safe_name

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)

        relative = str(file_path.relative_to(UPLOAD_DIR)).replace("\\", "/")
        url = f"{self._base_url}/media/{relative}"

        return UploadResult(
            url=url,
            filename=safe_name,
            size=len(file_data),
            content_type=content_type,
        )

    async def delete(self, url: str) -> bool:
        prefix = f"{self._base_url}/media/"
        if not url.startswith(prefix):
            return False
        relative = url[len(prefix):]
        file_path = UPLOAD_DIR / relative
        try:
            os.remove(file_path)
            return True
        except FileNotFoundError:
            return False