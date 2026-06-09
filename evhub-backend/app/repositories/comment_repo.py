import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.community import Comment, Like, Favorite, Notification
from app.repositories.base import BaseRepository


class CommentRepo(BaseRepository[Comment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Comment, db)

    async def list_comments(
        self,
        target_type: str,
        target_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Comment], int]:
        conditions = [
            Comment.target_type == target_type,
            Comment.target_id == target_id,
            Comment.parent_id.is_(None),
            Comment.deleted_at.is_(None),
        ]

        stmt = (
            select(Comment)
            .options(
                selectinload(Comment.user),
                selectinload(Comment.replies).selectinload(Comment.user),
            )
            .where(*conditions)
        )

        count_stmt = select(func.count()).select_from(Comment).where(*conditions)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Comment.floor).offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_next_floor(self, target_type: str, target_id: uuid.UUID) -> int:
        stmt = (
            select(func.coalesce(func.max(Comment.floor), 0))
            .where(
                Comment.target_type == target_type,
                Comment.target_id == target_id,
                Comment.parent_id.is_(None),
                Comment.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return (result.scalar() or 0) + 1

    async def get_recent_comment_count(self, user_id: uuid.UUID) -> int:
        stmt = select(func.count()).select_from(Comment).where(
            Comment.user_id == user_id,
            Comment.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0


class LikeRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def toggle(self, user_id: uuid.UUID, target_type: str, target_id: uuid.UUID) -> bool:
        existing = await self.db.get(Like, (user_id, target_type, target_id))
        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return False
        else:
            like = Like(user_id=user_id, target_type=target_type, target_id=target_id)
            self.db.add(like)
            await self.db.flush()
            return True

    async def is_liked(self, user_id: uuid.UUID, target_type: str, target_id: uuid.UUID) -> bool:
        result = await self.db.get(Like, (user_id, target_type, target_id))
        return result is not None


class FavoriteRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def toggle(self, user_id: uuid.UUID, target_type: str, target_id: uuid.UUID) -> bool:
        stmt = select(Favorite).where(
            Favorite.user_id == user_id,
            Favorite.target_type == target_type,
            Favorite.target_id == target_id,
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return False
        else:
            fav = Favorite(user_id=user_id, target_type=target_type, target_id=target_id)
            self.db.add(fav)
            await self.db.flush()
            return True

    async def list_user_favorites(
        self, user_id: uuid.UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[Favorite], int]:
        conditions = [Favorite.user_id == user_id]

        stmt = select(Favorite).where(*conditions)
        count_stmt = select(func.count()).select_from(Favorite).where(*conditions)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Favorite.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total


class NotificationRepo(BaseRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(Notification, db)

    async def list_user_notifications(
        self, user_id: uuid.UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[Notification], int]:
        conditions = [Notification.user_id == user_id]

        stmt = select(Notification).where(*conditions)
        count_stmt = select(func.count()).select_from(Notification).where(*conditions)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(
            Notification.is_read.asc(),
            Notification.created_at.desc(),
        ).offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        stmt = (
            Notification.__table__.update()
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.db.execute(stmt)

    async def create_notification(
        self, user_id: uuid.UUID, type: str, title: str, content: str | None = None, link: str | None = None
    ) -> Notification:
        notification = Notification(
            user_id=user_id, type=type, title=title, content=content, link=link
        )
        self.db.add(notification)
        await self.db.flush()
        return notification