import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.response import BaseResponse, PageResponse, PageMeta


# ---- Request Schemas ----

class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=250)
    content: str = Field(..., min_length=1)
    excerpt: str | None = Field(None, max_length=500)
    cover_image: str | None = Field(None, max_length=500)
    category_id: uuid.UUID | None = None
    tags: list[str] | None = None
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)
    og_image_url: str | None = Field(None, max_length=500)


class ArticleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=250)
    content: str | None = Field(None, min_length=1)
    excerpt: str | None = Field(None, max_length=500)
    cover_image: str | None = Field(None, max_length=500)
    category_id: uuid.UUID | None = None
    tags: list[str] | None = None
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)
    og_image_url: str | None = Field(None, max_length=500)


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=150)
    parent_id: uuid.UUID | None = None
    description: str | None = Field(None, max_length=500)
    icon: str | None = Field(None, max_length=500)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=150)
    parent_id: uuid.UUID | None = None
    description: str | None = Field(None, max_length=500)
    icon: str | None = Field(None, max_length=500)
    sort_order: int | None = None


# ---- Response Data Schemas ----

class CategoryItem(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 0
    article_count: int = 0
    children: list["CategoryItem"] | None = None

    class Config:
        from_attributes = True


class AuthorInfo(BaseModel):
    id: str
    username: str
    nickname: str | None = None
    avatar: str | None = None

    class Config:
        from_attributes = True


class ArticleItem(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str | None = None
    cover_image: str | None = None
    category: CategoryItem | None = None
    author: AuthorInfo | None = None
    tags: list[str] | None = None
    is_featured: bool = False
    meta_title: str | None = None
    meta_description: str | None = None
    view_count: int = 0
    published_at: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class ArticleDetail(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    excerpt: str | None = None
    cover_image: str | None = None
    category: CategoryItem | None = None
    author: AuthorInfo | None = None
    tags: list[str] | None = None
    is_featured: bool = False
    meta_title: str | None = None
    meta_description: str | None = None
    og_image_url: str | None = None
    view_count: int = 0
    published_at: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class AdminArticleItem(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str | None = None
    cover_image: str | None = None
    category: CategoryItem | None = None
    author: AuthorInfo | None = None
    status: str
    tags: list[str] | None = None
    is_featured: bool = False
    view_count: int = 0
    rejected_reason: str | None = None
    published_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True


class AdminArticleDetail(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    excerpt: str | None = None
    cover_image: str | None = None
    category: CategoryItem | None = None
    author: AuthorInfo | None = None
    status: str
    tags: list[str] | None = None
    is_featured: bool = False
    meta_title: str | None = None
    meta_description: str | None = None
    og_image_url: str | None = None
    view_count: int = 0
    rejected_reason: str | None = None
    published_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True


# ---- Response Models ----

CategoryTreeResp = BaseResponse[list[CategoryItem]]
CategoryResp = BaseResponse[CategoryItem]

ArticleListResp = PageResponse[ArticleItem]
ArticleDetailResp = BaseResponse[ArticleDetail]

AdminArticleListResp = PageResponse[AdminArticleItem]
AdminArticleDetailResp = BaseResponse[AdminArticleDetail]
AdminArticleResp = BaseResponse[AdminArticleItem]
MessageResp = BaseResponse[None]