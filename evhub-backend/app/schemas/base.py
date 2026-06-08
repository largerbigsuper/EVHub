from pydantic import BaseModel


class BaseResponseSchema(BaseModel):
    code: int = 200
    message: str = "success"
    data: object | None = None


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PageResponseSchema(BaseModel):
    code: int = 200
    message: str = "success"
    data: list = []
    meta: PageMeta