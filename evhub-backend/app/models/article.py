import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class Category(Base, TimestampMixin):
    """文章分类（最多二级）"""
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="分类名称")
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, comment="URL标识")
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, comment="父分类ID（顶级分类为null）")
    description: Mapped[str | None] = mapped_column(String(500), comment="分类描述")
    icon: Mapped[str | None] = mapped_column(String(500), comment="分类图标URL")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序序号")
    article_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="该分类下的文章数量（冗余缓存）")

    parent: Mapped["Category | None"] = relationship(back_populates="children", remote_side="Category.id")
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    articles: Mapped[list["Article"]] = relationship(back_populates="category", lazy="selectin")


class Article(Base, TimestampMixin, SoftDeleteMixin):
    """文章内容"""
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="文章标题")
    slug: Mapped[str] = mapped_column(String(250), unique=True, nullable=False, comment="URL标识")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="文章正文（Markdown格式）")
    excerpt: Mapped[str | None] = mapped_column(String(500), comment="文章摘要")
    cover_image: Mapped[str | None] = mapped_column(String(500), comment="封面图URL")
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, comment="所属分类ID")
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="作者（用户ID）")
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True, comment="文章状态：draft=草稿, pending=待审核, published=已发布, rejected=已拒绝")
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="浏览次数")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="是否精选/推荐")
    meta_title: Mapped[str | None] = mapped_column(String(200), comment="SEO标题（不填则用文章标题）")
    meta_description: Mapped[str | None] = mapped_column(String(500), comment="SEO描述（不填则用摘要）")
    og_image_url: Mapped[str | None] = mapped_column(String(500), comment="社交分享图（Open Graph）")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="标签列表（如：['电动车','电池','评测']）")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="发布时间")
    rejected_reason: Mapped[str | None] = mapped_column(Text, comment="拒绝原因（审核拒绝时必填）")

    category: Mapped["Category | None"] = relationship(back_populates="articles")
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])