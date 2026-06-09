import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SearchKeyword(Base):
    """搜索关键词统计"""
    __tablename__ = "search_keywords"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    keyword: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True, comment="搜索关键词")
    search_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="搜索次数")
    last_searched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="最近搜索时间")