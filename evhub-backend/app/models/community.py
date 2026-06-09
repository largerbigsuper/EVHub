import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class Topic(Base, TimestampMixin, SoftDeleteMixin):
    """社区帖子"""
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="帖子标题")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="帖子内容（Markdown格式）")
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="发帖人ID")
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True, comment="标签（如：['求助','讨论','分享']）")
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="浏览数")
    reply_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="回复数（冗余缓存）")
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="点赞数（冗余缓存）")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否置顶")
    is_highlighted: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否精华")
    last_reply_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="最后回复时间")
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False, index=True, comment="状态：published=正常, hidden=隐藏")

    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])


class Comment(Base, TimestampMixin, SoftDeleteMixin):
    """通用评论（支持文章/车型/改装/帖子）"""
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True, comment="评论目标类型：article/vehicle_sku/mod_build/topic")
    target_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True, comment="评论目标ID")
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="评论人ID")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="评论内容")
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True, comment="父评论ID（二级回复，最多两级）")
    floor: Mapped[int | None] = mapped_column(Integer, comment="楼层号（同一target下的顺序编号）")
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="点赞数")

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    parent: Mapped["Comment | None"] = relationship("Comment", remote_side="Comment.id", back_populates="replies")
    replies: Mapped[list["Comment"]] = relationship(back_populates="parent", foreign_keys=[parent_id])


class Like(Base):
    """通用点赞（幂等）"""
    __tablename__ = "likes"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, comment="点赞人ID")
    target_type: Mapped[str] = mapped_column(String(50), primary_key=True, comment="点赞目标类型：topic/comment/article/mod_build")
    target_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, comment="点赞目标ID")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="点赞时间")


class Favorite(Base):
    """通用收藏"""
    __tablename__ = "favorites"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="收藏人ID")
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="收藏目标类型：article/mod_build/topic")
    target_id: Mapped[uuid.UUID] = mapped_column(nullable=False, comment="收藏目标ID")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="收藏时间")


class Notification(Base):
    """通知"""
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="接收通知的用户ID")
    type: Mapped[str] = mapped_column(String(50), nullable=False, comment="通知类型：comment_reply/like/follow/system")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="通知标题")
    content: Mapped[str | None] = mapped_column(Text, comment="通知内容")
    link: Mapped[str | None] = mapped_column(String(500), comment="跳转链接")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True, comment="是否已读")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="通知时间")