import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.community import Topic
from app.repositories.base import BaseRepository


class TopicRepo(BaseRepository[Topic]):
    def __init__(self, db: AsyncSession):
        super().__init__(Topic, db)

    async def get_by_id(self, id: uuid.UUID) -> Topic | None:
        stmt = (
            select(Topic)
            .options(selectinload(Topic.author))
            .where(Topic.id == id, Topic.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_topics(
        self,
        tag: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Topic], int]:
        conditions = [Topic.deleted_at.is_(None), Topic.status == "published"]

        if tag:
            conditions.append(Topic.tags.contains([tag]))

        stmt = (
            select(Topic)
            .options(selectinload(Topic.author))
            .where(*conditions)
        )

        count_stmt = select(func.count()).select_from(Topic).where(*conditions)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(
            Topic.is_pinned.desc(),
            Topic.last_reply_at.desc(),
        ).offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def increment_view(self, topic_id: uuid.UUID) -> None:
        stmt = (
            Topic.__table__.update()
            .where(Topic.id == topic_id)
            .values(view_count=Topic.view_count + 1)
        )
        await self.db.execute(stmt)

    async def update_last_reply(self, topic_id: uuid.UUID) -> None:
        stmt = (
            Topic.__table__.update()
            .where(Topic.id == topic_id)
            .values(
                reply_count=Topic.reply_count + 1,
                last_reply_at=datetime.now(timezone.utc),
            )
        )
        await self.db.execute(stmt)