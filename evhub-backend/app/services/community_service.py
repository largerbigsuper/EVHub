import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.community import Topic, Comment
from app.repositories.topic_repo import TopicRepo
from app.repositories.comment_repo import CommentRepo, LikeRepo, FavoriteRepo, NotificationRepo
from app.core.exceptions import NotFoundError, BadRequestError


class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.topic_repo = TopicRepo(db)
        self.comment_repo = CommentRepo(db)
        self.like_repo = LikeRepo(db)
        self.fav_repo = FavoriteRepo(db)
        self.notif_repo = NotificationRepo(db)

    # ---- Topic ----

    async def create_topic(self, data: dict, user_id: str) -> Topic:
        data["author_id"] = uuid.UUID(user_id)
        topic = await self.topic_repo.create(**data)
        return await self.topic_repo.get_by_id(topic.id)

    async def get_topic(self, topic_id: uuid.UUID) -> Topic:
        topic = await self.topic_repo.get_by_id(topic_id)
        if not topic:
            raise NotFoundError("帖子")
        await self.topic_repo.increment_view(topic_id)
        return topic

    async def list_topics(self, tag: str | None = None, page: int = 1, page_size: int = 20):
        topics, total = await self.topic_repo.list_topics(tag=tag, page=page, page_size=page_size)
        return {
            "data": topics,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
            },
        }

    async def delete_topic(self, topic_id: uuid.UUID, user_id: str):
        topic = await self.topic_repo.get_by_id(topic_id)
        if not topic:
            raise NotFoundError("帖子")
        await self.topic_repo.soft_delete(topic_id)

    # ---- Comment ----

    async def create_comment(self, target_type: str, target_id: uuid.UUID, content: str,
                             user_id: str, parent_id: uuid.UUID | None = None) -> Comment:
        if parent_id:
            parent = await self.comment_repo.get_by_id(parent_id)
            if not parent:
                raise NotFoundError("父评论")
            if parent.parent_id is not None:
                raise BadRequestError("不支持多级嵌套回复，请直接回复一级评论")

        floor = None
        if parent_id is None:
            floor = await self.comment_repo.get_next_floor(target_type, target_id)

        comment = await self.comment_repo.create(
            target_type=target_type,
            target_id=target_id,
            user_id=uuid.UUID(user_id),
            content=content,
            parent_id=parent_id,
            floor=floor,
        )

        if target_type == "topic":
            await self.topic_repo.update_last_reply(target_id)

        comment = await self.comment_repo.get_by_id(comment.id)

        # Send notification
        notified_user_id = None
        if parent_id and parent:
            notified_user_id = parent.user_id
            link = f"/topics/{target_id}" if target_type == "topic" else None
            if notified_user_id != uuid.UUID(user_id):
                await self.notif_repo.create_notification(
                    user_id=notified_user_id,
                    type="comment_reply",
                    title="有人回复了你的评论",
                    content=content[:100],
                    link=link,
                )
        elif not parent_id:
            if target_type == "topic":
                topic = await self.topic_repo.get_by_id(target_id)
                if topic and topic.author_id != uuid.UUID(user_id):
                    await self.notif_repo.create_notification(
                        user_id=topic.author_id,
                        type="comment_reply",
                        title="你的帖子收到了新评论",
                        content=content[:100],
                        link=f"/topics/{target_id}",
                    )

        return comment

    async def list_comments(self, target_type: str, target_id: uuid.UUID,
                            page: int = 1, page_size: int = 20):
        comments, total = await self.comment_repo.list_comments(
            target_type, target_id, page, page_size
        )
        return {
            "data": comments,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
            },
        }

    async def delete_comment(self, comment_id: uuid.UUID, user_id: str):
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise NotFoundError("评论")
        await self.comment_repo.soft_delete(comment_id)

    # ---- Like ----

    async def toggle_like(self, user_id: str, target_type: str, target_id: uuid.UUID):
        is_liked = await self.like_repo.toggle(uuid.UUID(user_id), target_type, target_id)

        if is_liked and target_type == "topic":
            topic = await self.topic_repo.get_by_id(target_id)
            if topic and topic.author_id != uuid.UUID(user_id):
                await self.notif_repo.create_notification(
                    user_id=topic.author_id,
                    type="like",
                    title="有人赞了你的帖子",
                    content=topic.title,
                    link=f"/topics/{target_id}",
                )

        return {"is_liked": is_liked}

    async def check_like(self, user_id: str, target_type: str, target_id: uuid.UUID) -> bool:
        return await self.like_repo.is_liked(uuid.UUID(user_id), target_type, target_id)

    # ---- Favorite ----

    async def toggle_favorite(self, user_id: str, target_type: str, target_id: uuid.UUID):
        is_favorited = await self.fav_repo.toggle(uuid.UUID(user_id), target_type, target_id)
        return {"is_favorited": is_favorited}

    async def list_favorites(self, user_id: str, page: int = 1, page_size: int = 20):
        favorites, total = await self.fav_repo.list_user_favorites(
            uuid.UUID(user_id), page, page_size
        )
        return {
            "data": favorites,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
            },
        }

    # ---- Notification ----

    async def list_notifications(self, user_id: str, page: int = 1, page_size: int = 20):
        notifications, total = await self.notif_repo.list_user_notifications(
            uuid.UUID(user_id), page, page_size
        )
        return {
            "data": notifications,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
            },
        }

    async def mark_all_read(self, user_id: str):
        await self.notif_repo.mark_all_read(uuid.UUID(user_id))