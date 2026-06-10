import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, Float, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class ModBuild(Base, TimestampMixin, SoftDeleteMixin):
    """改装方案"""
    __tablename__ = "mod_builds"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="方案标题")
    slug: Mapped[str] = mapped_column(String(250), unique=True, nullable=False, comment="URL标识")
    description: Mapped[str | None] = mapped_column(Text, comment="方案简介/描述")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="改装步骤/详细内容（Markdown格式）")
    vehicle_sku_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vehicle_skus.id", ondelete="SET NULL"), nullable=True, comment="关联车型（适配车型）")
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="方案作者（用户ID）")
    total_cost: Mapped[float | None] = mapped_column(Float, comment="改装总费用(元)")
    difficulty: Mapped[str | None] = mapped_column(String(50), comment="改装难度：easy=简单, medium=中等, hard=困难")
    is_legal: Mapped[bool] = mapped_column(Boolean, nullable=False, comment="是否合法改装（必填，用于合规审核）")
    legal_note: Mapped[str | None] = mapped_column(Text, comment="合规说明（is_legal=false时建议填写）")
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True, comment="状态：draft=草稿, pending=待审核, published=已发布, rejected=已拒绝")
    cover_image: Mapped[str | None] = mapped_column(String(500), comment="封面图URL")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="标签列表（如：['外观','性能','灯光']）")
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="浏览次数")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="发布时间")
    rejected_reason: Mapped[str | None] = mapped_column(Text, comment="拒绝原因（审核拒绝时必填）")

    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])
    parts: Mapped[list["ModPart"]] = relationship(back_populates="build", lazy="selectin", cascade="all, delete-orphan")
    vehicle_sku: Mapped["VehicleSku | None"] = relationship("VehicleSku", foreign_keys=[vehicle_sku_id])


class ModPart(Base):
    """改装配件清单"""
    __tablename__ = "mod_parts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    build_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mod_builds.id", ondelete="CASCADE"), nullable=False, comment="所属方案ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配件名称")
    brand: Mapped[str | None] = mapped_column(String(100), comment="配件品牌")
    price: Mapped[float | None] = mapped_column(Float, comment="配件价格(元)")
    purchase_url: Mapped[str | None] = mapped_column(String(500), comment="购买链接（导购变现入口）")
    is_legal: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="该配件是否合法")
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="数量")
    notes: Mapped[str | None] = mapped_column(Text, comment="备注/说明")

    build: Mapped["ModBuild"] = relationship(back_populates="parts")