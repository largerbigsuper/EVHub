import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.dependencies import get_current_user
from app.services.article_service import ArticleService
from app.schemas.article import (
    ArticleCreate, ArticleUpdate, RejectRequest,
    CategoryCreate, CategoryUpdate,
    AdminArticleListResp, AdminArticleDetailResp, AdminArticleResp,
    CategoryResp, CategoryTreeResp, MessageResp,
)

router = APIRouter(prefix="/admin", tags=["管理员"])


# ---- Articles ----

@router.post("/articles", response_model=AdminArticleResp)
async def create_article(
    req: ArticleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.create_article(req.model_dump(), current_user["user_id"])
    return success_response(data=article, message="文章创建成功")


@router.put("/articles/{article_id}", response_model=AdminArticleResp)
async def update_article(
    article_id: uuid.UUID,
    req: ArticleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.update_article(article_id, req.model_dump(exclude_none=True), current_user["user_id"], True)
    return success_response(data=article, message="文章更新成功")


@router.delete("/articles/{article_id}", response_model=MessageResp)
async def delete_article(
    article_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    await service.delete_article(article_id, current_user["user_id"])
    return success_response(message="文章已删除")


@router.post("/articles/{article_id}/submit", response_model=AdminArticleResp)
async def submit_article(
    article_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.submit_for_review(article_id, current_user["user_id"])
    return success_response(data=article, message="已提交审核")


@router.post("/articles/{article_id}/publish", response_model=AdminArticleResp)
async def publish_article(
    article_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.publish_article(article_id, current_user["user_id"])
    return success_response(data=article, message="文章已发布")


@router.post("/articles/{article_id}/reject", response_model=AdminArticleResp)
async def reject_article(
    article_id: uuid.UUID,
    req: RejectRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.reject_article(article_id, req.reason, current_user["user_id"])
    return success_response(data=article, message="文章已拒绝")


@router.get("/articles/pending", response_model=AdminArticleListResp)
async def list_pending_articles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    result = await service.list_pending_articles(page, page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/articles", response_model=AdminArticleListResp)
async def list_admin_articles(
    status: str | None = Query(None),
    keyword: str | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    result = await service.list_admin_articles(
        status=status, keyword=keyword, category_id=category_id,
        page=page, page_size=page_size,
    )
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/articles/{article_id}", response_model=AdminArticleDetailResp)
async def get_admin_article(
    article_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    article = await service.get_admin_article(article_id)
    return success_response(data=article)


# ---- Categories ----

@router.post("/categories", response_model=CategoryResp)
async def create_category(
    req: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    cat = await service.create_category(req.model_dump(), current_user["user_id"])
    return success_response(data=cat, message="分类创建成功")


@router.put("/categories/{category_id}", response_model=CategoryResp)
async def update_category(
    category_id: uuid.UUID,
    req: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    cat = await service.update_category(category_id, req.model_dump(exclude_none=True), current_user["user_id"])
    return success_response(data=cat, message="分类更新成功")


@router.delete("/categories/{category_id}", response_model=MessageResp)
async def delete_category(
    category_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    await service.delete_category(category_id, current_user["user_id"])
    return success_response(message="分类已删除")