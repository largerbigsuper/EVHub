import asyncio
import uuid

from qiniu import Auth, put_data, BucketManager

from app.services.storage import StorageBackend, UploadResult


class QiniuStorageBackend(StorageBackend):
    def __init__(
        self,
        access_key: str,
        secret_key: str,
        bucket: str,
        domain: str,
    ):
        self._access_key = access_key.rstrip()
        self._secret_key = secret_key.rstrip()
        self._bucket = bucket.rstrip()
        domain = domain.rstrip().rstrip("/")
        if not domain.startswith("http://") and not domain.startswith("https://"):
            domain = f"https://{domain}"
        self._domain = domain
        self._auth = Auth(self._access_key, self._secret_key)

    def _build_key(self, filename: str, folder: str = "") -> str:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "png"
        return f"{folder}/{uuid.uuid4().hex}.{ext}" if folder else f"{uuid.uuid4().hex}.{ext}"

    async def upload(
        self, file_data: bytes, filename: str, content_type: str, folder: str = ""
    ) -> UploadResult:
        key = self._build_key(filename, folder)
        token = self._auth.upload_token(self._bucket, key, 3600)

        ret, info = await asyncio.to_thread(put_data, token, key, file_data, mime_type=content_type)
        if info.status_code != 200:
            raise RuntimeError(f"七牛云上传失败: {info.exception or info.text_body}")

        url = f"{self._domain}/{key}"
        return UploadResult(
            url=url,
            filename=key.split("/")[-1],
            size=len(file_data),
            content_type=content_type,
        )

    async def delete(self, url: str) -> bool:
        if not url.startswith(self._domain):
            return False
        key = url[len(self._domain) + 1:]
        bucket_manager = BucketManager(self._auth)
        ret, info = await asyncio.to_thread(bucket_manager.delete, self._bucket, key)
        return info.status_code == 200 or info.status_code == 612