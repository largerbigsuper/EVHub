import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.core.response import success_response
from app.schemas.community import (
    TopicCreate, CommentCreate, LikeAction, FavoriteAction,
    TopicListResp, TopicDetailResp,
    CommentListResp, CommentDetailResp,
    LikeStatusResp, FavoriteStatusResp,
    NotificationListResp, CommunityMessageResp,
)
from app.services.community_service import CommunityService

router = APIRouter(tags=["社区"])


# ---- Topic Routes ----

@router.get("/topics", response_model=TopicListResp)
async def list_topics(
    tag: str | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.list_topics(tag=tag, page=page, page_size=page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/topics/{topic_id}", response_model=TopicDetailResp)
async def get_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    topic = await service.get_topic(topic_id)
    return success_response(data=topic)


@router.post("/topics", response_model=TopicDetailResp)
async def create_topic(
    req: TopicCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    topic = await service.create_topic(req.model_dump(), current_user["user_id"])
    return success_response(data=topic, message="帖子发布成功")


@router.delete("/topics/{topic_id}", response_model=CommunityMessageResp)
async def delete_topic(
    topic_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    await service.delete_topic(topic_id, current_user["user_id"])
    return success_response(message="帖子已删除")


# ---- Comment Routes ----

@router.get("/comments", response_model=CommentListResp)
async def list_comments(
    target_type: str = Query(...),
    target_id: uuid.UUID = Query(...),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.list_comments(target_type, target_id, page, page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.post("/comments", response_model=CommentDetailResp)
async def create_comment(
    req: CommentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    comment = await service.create_comment(
        req.target_type, req.target_id, req.content,
        current_user["user_id"], req.parent_id,
    )
    return success_response(data=comment, message="评论发表成功")


@router.delete("/comments/{comment_id}", response_model=CommunityMessageResp)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    await service.delete_comment(comment_id, current_user["user_id"])
    return success_response(message="评论已删除")


# ---- Like Routes ----

@router.post("/likes", response_model=LikeStatusResp)
async def toggle_like(
    req: LikeAction,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.toggle_like(current_user["user_id"], req.target_type, req.target_id)
    return success_response(data=result, message="已点赞" if result["is_liked"] else "已取消点赞")


@router.get("/likes/status", response_model=LikeStatusResp)
async def check_like(
    target_type: str = Query(...),
    target_id: uuid.UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    is_liked = await service.check_like(current_user["user_id"], target_type, target_id)
    return success_response(data={"is_liked": is_liked})


# ---- Favorite Routes ----

@router.post("/favorites", response_model=FavoriteStatusResp)
async def toggle_favorite(
    req: FavoriteAction,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.toggle_favorite(current_user["user_id"], req.target_type, req.target_id)
    return success_response(data=result, message="已收藏" if result["is_favorited"] else "已取消收藏")


@router.get("/user/favorites", response_model=TopicListResp)
async def list_favorites(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.list_favorites(current_user["user_id"], page, page_size)
    return success_response(data=result["data"], meta=result["meta"])


# ---- Notification Routes ----

@router.get("/notifications", response_model=NotificationListResp)
async def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.list_notifications(current_user["user_id"], page, page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.post("/notifications/read-all", response_model=CommunityMessageResp)
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    await service.mark_all_read(current_user["user_id"])
    return success_response(message="全部已读")