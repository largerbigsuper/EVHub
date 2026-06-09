from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.schemas.search import SearchResultResp, SuggestResultResp, HotKeywordsResultResp
from app.services.search_service import PgSearchService, SearchKeywordService

router = APIRouter(prefix="/search", tags=["搜索"])


@router.get("", response_model=SearchResultResp)
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    type: str = Query(default="all", description="all|article|vehicle|brand"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    service = PgSearchService(db)
    keyword_service = SearchKeywordService(db)

    result = await service.search(q, type, page, page_size)
    await keyword_service.record_search(q)
    await db.commit()

    return success_response(data={
        "articles": [
            {"id": r.id, "title": r.title, "excerpt": r.excerpt, "url": r.url, "type": r.type, "extra": r.extra}
            for r in result.articles
        ],
        "vehicles": [
            {"id": r.id, "title": r.title, "excerpt": r.excerpt, "url": r.url, "type": r.type, "extra": r.extra}
            for r in result.vehicles
        ],
        "brands": [
            {"id": r.id, "title": r.title, "excerpt": r.excerpt, "url": r.url, "type": r.type, "extra": r.extra}
            for r in result.brands
        ],
        "total": result.total,
    })


@router.get("/suggest", response_model=SuggestResultResp)
async def suggest(
    q: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
):
    service = PgSearchService(db)
    suggestions = await service.suggest(q)
    return success_response(data={"suggestions": suggestions})


@router.get("/hot", response_model=HotKeywordsResultResp)
async def hot_keywords(
    db: AsyncSession = Depends(get_db),
):
    service = SearchKeywordService(db)
    keywords = await service.get_hot_keywords(10)
    return success_response(data={"keywords": [
        {"keyword": k["keyword"], "search_count": k["search_count"]}
        for k in keywords
    ]})