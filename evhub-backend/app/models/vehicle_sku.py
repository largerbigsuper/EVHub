import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DECIMAL, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VehicleSku(Base):
    """车型SKU（具体配置版本）"""
    __tablename__ = "vehicle_skus"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    series_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_series.id"), nullable=False, index=True, comment="所属车系ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="车型名称（如：九号E300P 顶配版）")
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True, comment="URL标识")
    year: Mapped[int | None] = mapped_column(Integer, comment="年款")
    cover_image: Mapped[str | None] = mapped_column(String(500), comment="封面图URL")
    price_min: Mapped[float | None] = mapped_column(DECIMAL(10, 2), comment="最低价格(元)")
    price_max: Mapped[float | None] = mapped_column(DECIMAL(10, 2), comment="最高价格(元)")
    battery_type: Mapped[str | None] = mapped_column(String(50), index=True, comment="电池类型(铅酸/锂电/磷酸铁锂等)")
    range_km: Mapped[int | None] = mapped_column(Integer, index=True, comment="续航里程(km)")
    motor_power_w: Mapped[int | None] = mapped_column(Integer, comment="电机功率(W)")
    top_speed_kmh: Mapped[int | None] = mapped_column(Integer, comment="最高时速(km/h)")
    weight_kg: Mapped[float | None] = mapped_column(DECIMAL(6, 1), comment="整车重量(kg)")
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False, index=True, comment="是否需要驾照")
    colors: Mapped[list | None] = mapped_column(JSON, comment="可选颜色列表")
    tags: Mapped[list | None] = mapped_column(JSON, comment="标签列表(如：['长续航','性价比','运动'])")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否推荐车型")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), comment="软删除时间")

    series: Mapped["VehicleSeries"] = relationship(back_populates="skus", lazy="selectin")
    attribute_values: Mapped[list["VehicleAttributeValue"]] = relationship(back_populates="sku", lazy="selectin")