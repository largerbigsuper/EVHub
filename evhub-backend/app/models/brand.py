import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Brand(Base):
    """品牌"""
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="品牌名称")
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True, comment="URL标识")
    logo: Mapped[str | None] = mapped_column(String(500), comment="品牌Logo图片URL")
    country: Mapped[str | None] = mapped_column(String(50), comment="所属国家/地区")
    founded_year: Mapped[int | None] = mapped_column(Integer, comment="成立年份")
    website: Mapped[str | None] = mapped_column(String(200), comment="官方网站URL")
    description: Mapped[str | None] = mapped_column(Text, comment="品牌描述/简介")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否推荐(首页展示)")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号(越小越靠前)")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), comment="软删除时间")

    series: Mapped[list["VehicleSeries"]] = relationship(back_populates="brand", lazy="selectin")