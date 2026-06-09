import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditLog(Base):
    """操作审计日志"""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), comment="操作用户ID")
    action: Mapped[str | None] = mapped_column(String(50), comment="操作类型（如：CREATE_ARTICLE, PUBLISH_ARTICLE）")
    resource: Mapped[str | None] = mapped_column(String(50), comment="操作资源类型（如：article, mod_build）")
    resource_id: Mapped[uuid.UUID | None] = mapped_column(comment="操作资源ID")
    detail: Mapped[dict | None] = mapped_column(JSONB, comment="操作详情（JSON格式，记录变更数据）")
    ip_address: Mapped[str | None] = mapped_column(INET, comment="客户端IP地址")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="操作时间")