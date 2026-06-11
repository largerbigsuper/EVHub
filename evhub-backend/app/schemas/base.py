from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, field_validator


class ORMSchema(BaseModel):
    model_config = {"from_attributes": True}

    @field_validator("*", mode="before")
    @classmethod
    def _coerce_types(cls, v: object) -> object:
        if isinstance(v, UUID):
            return str(v)
        if isinstance(v, datetime):
            return v.isoformat()
        if isinstance(v, date):
            return v.isoformat()
        return v


class BaseResponseSchema(BaseModel):
    code: int = 200
    message: str = "success"
    data: object | None = None


class PageMetaSchema(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PageResponseSchema(BaseModel):
    code: int = 200
    message: str = "success"
    data: list = []
    meta: PageMetaSchema