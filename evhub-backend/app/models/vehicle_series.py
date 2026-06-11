import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VehicleSeries(Base):
    """车系"""
    __tablename__ = "vehicle_series"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True, comment="所属品牌ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="车系名称")
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True, comment="URL标识")
    cover_image: Mapped[str | None] = mapped_column(String(500), comment="封面图片URL")
    description: Mapped[str | None] = mapped_column(Text, comment="车系描述")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), comment="软删除时间")

    brand: Mapped["Brand"] = relationship(back_populates="series", lazy="selectin")
    skus: Mapped[list["VehicleSku"]] = relationship(back_populates="series", lazy="selectin")