from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class UploadResult:
    url: str
    filename: str
    size: int
    content_type: str


class StorageBackend(ABC):
    @abstractmethod
    async def upload(
        self, file_data: bytes, filename: str, content_type: str, folder: str = ""
    ) -> UploadResult:
        ...

    @abstractmethod
    async def delete(self, url: str) -> bool:
        ...