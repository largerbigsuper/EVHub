import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DECIMAL, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AttributeGroup(Base):
    """属性分组（如：动力参数、电池参数、车身参数）"""
    __tablename__ = "attribute_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="分组名称（如：动力参数）")
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="分组编码（如：powertrain）")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

    definitions: Mapped[list["AttributeDefinition"]] = relationship(
        back_populates="group", lazy="selectin", order_by="AttributeDefinition.sort_order"
    )


class AttributeDefinition(Base):
    """属性定义（如：电机功率、电池容量、续航里程）"""
    __tablename__ = "attribute_definitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attribute_groups.id"), nullable=False, comment="所属分组ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="属性名称（如：电机功率）")
    code: Mapped[str] = mapped_column(String(100), nullable=False, comment="属性编码（如：motor_power）")
    value_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text", comment="值类型：text=文本, number=数值, boolean=布尔")
    unit: Mapped[str | None] = mapped_column(String(20), comment="单位（如：W、km、kg）")
    is_key_spec: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否核心参数（详情页卡片展示）")
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否可用于筛选")
    is_comparable: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否可用于车型对比")
    display_format: Mapped[str | None] = mapped_column(String(50), comment="显示格式（预留）")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

    group: Mapped["AttributeGroup"] = relationship(back_populates="definitions")
    values: Mapped[list["VehicleAttributeValue"]] = relationship(back_populates="attribute")


class VehicleAttributeValue(Base):
    """车型属性值（联合主键：sku_id + attribute_id）"""
    __tablename__ = "vehicle_attribute_values"

    sku_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicle_skus.id", ondelete="CASCADE"), primary_key=True, comment="车型SKU ID")
    attribute_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attribute_definitions.id", ondelete="CASCADE"), primary_key=True, comment="属性定义ID")
    value_text: Mapped[str | None] = mapped_column(Text, comment="文本值（value_type=text时使用）")
    value_number: Mapped[float | None] = mapped_column(DECIMAL(10, 2), comment="数值（value_type=number时使用）")
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, comment="布尔值（value_type=boolean时使用）")

    sku: Mapped["VehicleSku"] = relationship(back_populates="attribute_values")
    attribute: Mapped["AttributeDefinition"] = relationship(back_populates="values")