import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DECIMAL, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VehicleSku(Base):
    __tablename__ = "vehicle_skus"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    series_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_series.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    year: Mapped[int | None] = mapped_column(Integer)
    cover_image: Mapped[str | None] = mapped_column(String(500))
    price_min: Mapped[float | None] = mapped_column(DECIMAL(10, 2))
    price_max: Mapped[float | None] = mapped_column(DECIMAL(10, 2))
    battery_type: Mapped[str | None] = mapped_column(String(50), index=True)
    range_km: Mapped[int | None] = mapped_column(Integer, index=True)
    motor_power_w: Mapped[int | None] = mapped_column(Integer)
    top_speed_kmh: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(DECIMAL(6, 1))
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    colors: Mapped[list | None] = mapped_column(JSONB)
    tags: Mapped[list | None] = mapped_column(JSONB)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    series: Mapped["VehicleSeries"] = relationship(back_populates="skus")
    attribute_values: Mapped[list["VehicleAttributeValue"]] = relationship(back_populates="sku", lazy="selectin")