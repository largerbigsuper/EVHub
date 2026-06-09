from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T | None = None


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PageResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: list[T] = []
    meta: PageMeta


class SuccessResponse(BaseResponse[Any]):
    pass


class ErrorResponse(BaseModel):
    code: int
    message: str
    data: None = None


def success_response(data: Any = None, message: str = "success", meta: dict | None = None) -> dict:
    result = {"code": 200, "message": message, "data": data}
    if meta:
        result["meta"] = meta
    return result


def error_response(code: int, message: str) -> dict:
    return {"code": code, "message": message, "data": None}