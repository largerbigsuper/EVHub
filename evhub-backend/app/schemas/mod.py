import uuid
from pydantic import BaseModel, Field

from app.core.response import BaseResponse, PageResponse
from app.schemas.base import ORMSchema


# ---- Request Schemas ----

class ModPartCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    brand: str | None = Field(None, max_length=100)
    price: float | None = None
    purchase_url: str | None = Field(None, max_length=500)
    is_legal: bool = True
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None


class ModBuildCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=250)
    description: str | None = None
    content: str = Field(..., min_length=1)
    vehicle_sku_id: uuid.UUID | None = None
    total_cost: float | None = None
    difficulty: str | None = Field(None, max_length=50)
    is_legal: bool = Field(...)
    legal_note: str | None = None
    cover_image: str | None = Field(None, max_length=500)
    tags: list[str] | None = None
    parts: list[ModPartCreate] = Field(default_factory=list)


class ModBuildUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    slug: str | None = Field(None, max_length=250)
    description: str | None = None
    content: str | None = None
    vehicle_sku_id: uuid.UUID | None = None
    total_cost: float | None = None
    difficulty: str | None = Field(None, max_length=50)
    is_legal: bool | None = None
    legal_note: str | None = None
    cover_image: str | None = Field(None, max_length=500)
    tags: list[str] | None = None
    parts: list[ModPartCreate] | None = None


class ModRejectRequest(BaseModel):
    reason: str = Field(..., min_length=1)


# ---- Response Data Schemas ----

class ModPartItem(ORMSchema):
    id: str
    name: str
    brand: str | None = None
    price: float | None = None
    purchase_url: str | None = None
    is_legal: bool = True
    quantity: int = 1
    notes: str | None = None


class AuthorInfo(ORMSchema):
    id: str
    username: str
    nickname: str | None = None
    avatar: str | None = None


class VehicleSkuRef(ORMSchema):
    id: str
    name: str


class ModBuildItem(ORMSchema):
    id: str
    title: str
    slug: str
    description: str | None = None
    cover_image: str | None = None
    vehicle_sku: VehicleSkuRef | None = None
    author: AuthorInfo | None = None
    total_cost: float | None = None
    difficulty: str | None = None
    is_legal: bool
    tags: list[str] | None = None
    view_count: int = 0
    part_count: int = 0
    published_at: str | None = None
    created_at: str | None = None


class ModBuildDetail(ModBuildItem):
    content: str
    legal_note: str | None = None
    parts: list[ModPartItem] = []
    rejected_reason: str | None = None


class AdminModBuildItem(ModBuildItem):
    status: str
    rejected_reason: str | None = None
    legal_note: str | None = None


# ---- Response Models ----

ModMessageResp = BaseResponse[None]
ModBuildListResp = PageResponse[ModBuildItem]
ModBuildDetailResp = BaseResponse[ModBuildDetail]
AdminModBuildListResp = PageResponse[AdminModBuildItem]
AdminModBuildDetailResp = BaseResponse[ModBuildDetail]