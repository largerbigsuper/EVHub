from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.response import success_response
from app.services.article_service import ArticleService
from app.schemas.article import (
    CategoryTreeResp, ArticleListResp, ArticleDetailResp,
)

router = APIRouter(prefix="/articles", tags=["文章"])


@router.get("/categories", response_model=CategoryTreeResp)
async def get_categories(db: AsyncSession = Depends(get_db)):
    service = ArticleService(db)
    categories = await service.get_categories()
    return success_response(data=categories)


@router.get("", response_model=ArticleListResp)
async def list_articles(
    category_slug: str | None = Query(None),
    tag: str | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    result = await service.list_articles(
        category_slug=category_slug, tag=tag, keyword=keyword,
        page=page, page_size=page_size,
    )
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/{slug}", response_model=ArticleDetailResp)
async def get_article(
    slug: str,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    service = ArticleService(db, redis)
    article = await service.get_article_by_slug(slug)
    return success_response(data=article)