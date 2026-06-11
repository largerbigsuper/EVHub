import uuid
from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema


# ---- Request Schemas ----

class TopicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    tags: list[str] | None = None


class CommentCreate(BaseModel):
    target_type: str = Field(..., min_length=1, max_length=50, description="目标类型：topic/article/vehicle_sku/mod_build")
    target_id: uuid.UUID = Field(...)
    content: str = Field(..., min_length=1)
    parent_id: uuid.UUID | None = Field(None, description="父评论ID（二级回复）")


class LikeAction(BaseModel):
    target_type: str = Field(..., min_length=1, max_length=50)
    target_id: uuid.UUID = Field(...)


class FavoriteAction(BaseModel):
    target_type: str = Field(..., min_length=1, max_length=50)
    target_id: uuid.UUID = Field(...)


# ---- Response Data Schemas ----

class AuthorInfo(ORMSchema):
    id: str
    username: str
    nickname: str | None = None
    avatar: str | None = None


class CommentReplyItem(ORMSchema):
    id: str
    user: AuthorInfo | None = None
    content: str
    parent_id: str | None = None
    floor: int | None = None
    like_count: int = 0
    created_at: str | None = None


class CommentItem(ORMSchema):
    id: str
    target_type: str
    target_id: str
    user: AuthorInfo | None = None
    content: str
    parent_id: str | None = None
    floor: int | None = None
    like_count: int = 0
    created_at: str | None = None
    replies: list[CommentReplyItem] = []


class TopicItem(ORMSchema):
    id: str
    title: str
    content: str
    author: AuthorInfo | None = None
    tags: list[str] | None = None
    view_count: int = 0
    reply_count: int = 0
    like_count: int = 0
    is_pinned: bool = False
    is_highlighted: bool = False
    last_reply_at: str | None = None
    status: str
    created_at: str | None = None


class TopicDetail(ORMSchema):
    id: str
    title: str
    content: str
    author: AuthorInfo | None = None
    tags: list[str] | None = None
    view_count: int = 0
    reply_count: int = 0
    like_count: int = 0
    is_pinned: bool = False
    is_highlighted: bool = False
    last_reply_at: str | None = None
    status: str
    created_at: str | None = None


class NotificationItem(ORMSchema):
    id: str
    type: str
    title: str
    content: str | None = None
    link: str | None = None
    is_read: bool = False
    created_at: str | None = None


class LikeStatus(BaseModel):
    is_liked: bool


class FavoriteStatus(BaseModel):
    is_favorited: bool


# ---- Response Wrappers ----

from app.core.response import BaseResponse, PageResponse

TopicListResp = PageResponse[TopicItem]
TopicDetailResp = BaseResponse[TopicDetail]
CommentListResp = PageResponse[CommentItem]
CommentDetailResp = BaseResponse[CommentItem]
LikeStatusResp = BaseResponse[LikeStatus]
FavoriteStatusResp = BaseResponse[FavoriteStatus]
NotificationListResp = PageResponse[NotificationItem]
CommunityMessageResp = BaseResponse[None]