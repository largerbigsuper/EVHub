import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DECIMAL, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AttributeGroup(Base):
    __tablename__ = "attribute_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    definitions: Mapped[list["AttributeDefinition"]] = relationship(
        back_populates="group", lazy="selectin", order_by="AttributeDefinition.sort_order"
    )


class AttributeDefinition(Base):
    __tablename__ = "attribute_definitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attribute_groups.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    value_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    unit: Mapped[str | None] = mapped_column(String(20))
    is_key_spec: Mapped[bool] = mapped_column(Boolean, default=False)
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_comparable: Mapped[bool] = mapped_column(Boolean, default=False)
    display_format: Mapped[str | None] = mapped_column(String(50))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["AttributeGroup"] = relationship(back_populates="definitions")
    values: Mapped[list["VehicleAttributeValue"]] = relationship(back_populates="attribute")


class VehicleAttributeValue(Base):
    __tablename__ = "vehicle_attribute_values"

    sku_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_skus.id", ondelete="CASCADE"), primary_key=True)
    attribute_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attribute_definitions.id", ondelete="CASCADE"), primary_key=True)
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column(DECIMAL(10, 2))
    value_boolean: Mapped[bool | None] = mapped_column(Boolean)

    sku: Mapped["VehicleSku"] = relationship(back_populates="attribute_values")
    attribute: Mapped["AttributeDefinition"] = relationship(back_populates="values")