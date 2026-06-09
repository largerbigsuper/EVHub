from abc import ABC, abstractmethod
from dataclasses import dataclass
import uuid

from sqlalchemy import select, text, func, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.brand import Brand
from app.models.vehicle_sku import VehicleSku
from app.models.vehicle_series import VehicleSeries
from app.models.search import SearchKeyword


@dataclass
class SearchResultItem:
    id: str
    title: str
    excerpt: str | None = None
    url: str = ""
    type: str = ""
    extra: dict | None = None


@dataclass
class SearchResult:
    articles: list[SearchResultItem]
    vehicles: list[SearchResultItem]
    brands: list[SearchResultItem]
    total: int


class SearchServiceInterface(ABC):
    @abstractmethod
    async def search(self, q: str, type: str, page: int, page_size: int) -> SearchResult:
        ...

    @abstractmethod
    async def suggest(self, q: str) -> list[str]:
        ...

    @abstractmethod
    async def sync_document(self, type: str, id: uuid.UUID, data: dict) -> None:
        ...

    @abstractmethod
    async def remove_document(self, type: str, id: uuid.UUID) -> None:
        ...


class PgSearchService(SearchServiceInterface):
    def __init__(self, db: AsyncSession):
        self.db = db
        self._page_size = 10

    async def search(self, q: str, type: str, page: int, page_size: int = 10) -> SearchResult:
        result = SearchResult(articles=[], vehicles=[], brands=[], total=0)
        safe_q = q.replace("%", "\\%").replace("_", "\\_")
        like_pattern = f"%{safe_q}%"
        offset = (page - 1) * page_size

        if type in ("all", "article"):
            articles_stmt = (
                select(
                    Article.id.label("id"),
                    Article.title.label("title"),
                    Article.excerpt.label("excerpt"),
                    func.concat("/articles/", Article.slug).label("url"),
                )
                .where(
                    Article.deleted_at.is_(None),
                    Article.status == "published",
                    text(
                        "articles.title ILIKE :q1 OR articles.excerpt ILIKE :q2 OR "
                        "similarity(articles.title, :q3) > 0.1"
                    ).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
                )
                .order_by(
                    text(
                        "CASE WHEN articles.title ILIKE :q1 THEN 0 "
                        "WHEN articles.excerpt ILIKE :q2 THEN 1 ELSE 2 END"
                    ).bindparams(q1=like_pattern, q2=like_pattern)
                )
                .limit(page_size)
                .offset(offset)
            )
            articles_result = await self.db.execute(articles_stmt)
            rows = articles_result.fetchall()
            result.articles = [
                SearchResultItem(
                    id=str(r.id), title=r.title, excerpt=r.excerpt,
                    url=r.url, type="article",
                )
                for r in rows
            ]
            count = await self._count_articles(like_pattern, q)
            result.total += count

        if type in ("all", "vehicle"):
            vehicles_stmt = (
                select(
                    VehicleSku.id.label("id"),
                    VehicleSku.name.label("name"),
                    VehicleSeries.name.label("series_name"),
                    Brand.name.label("brand_name"),
                    func.concat("/vehicles/", VehicleSku.id).label("url"),
                )
                .join(VehicleSeries, VehicleSku.series_id == VehicleSeries.id)
                .join(Brand, VehicleSeries.brand_id == Brand.id)
                .where(
                    VehicleSku.deleted_at.is_(None),
                    text(
                        "vehicle_skus.name ILIKE :q1 OR vehicle_series.name ILIKE :q1 OR "
                        "brands.name ILIKE :q1 OR similarity(vehicle_skus.name, :q2) > 0.1"
                    ).bindparams(q1=like_pattern, q2=q),
                )
                .order_by(
                    text(
                        "CASE WHEN vehicle_skus.name ILIKE :q1 THEN 0 ELSE 1 END"
                    ).bindparams(q1=like_pattern)
                )
                .limit(page_size)
                .offset(offset)
            )
            vehicles_result = await self.db.execute(vehicles_stmt)
            rows = vehicles_result.fetchall()
            result.vehicles = [
                SearchResultItem(
                    id=str(r.id),
                    title=f"{r.brand_name} {r.series_name} {r.name}",
                    url=r.url,
                    type="vehicle",
                    extra={"brand": r.brand_name, "series": r.series_name},
                )
                for r in rows
            ]
            vcount = await self._count_vehicles(like_pattern, q)
            result.total += vcount

        if type in ("all", "brand"):
            brands_stmt = (
                select(
                    Brand.id.label("id"),
                    Brand.name.label("name"),
                    Brand.logo.label("logo"),
                    Brand.description.label("description"),
                    func.concat("/brands/", Brand.slug).label("url"),
                )
                .where(
                    Brand.deleted_at.is_(None),
                    text(
                        "brands.name ILIKE :q1 OR brands.description ILIKE :q1 OR "
                        "similarity(brands.name, :q2) > 0.1"
                    ).bindparams(q1=like_pattern, q2=q),
                )
                .limit(page_size)
                .offset(offset)
            )
            brands_result = await self.db.execute(brands_stmt)
            rows = brands_result.fetchall()
            result.brands = [
                SearchResultItem(
                    id=str(r.id), title=r.name, excerpt=r.description,
                    url=r.url, type="brand", extra={"logo": r.logo},
                )
                for r in rows
            ]
            bcount = await self._count_brands(like_pattern, q)
            result.total += bcount

        return result

    async def suggest(self, q: str) -> list[str]:
        if not q:
            return []
        safe_q = q.replace("%", "\\%").replace("_", "\\_")
        like_pattern = f"{safe_q}%"

        kw_stmt = (
            select(SearchKeyword.keyword)
            .where(SearchKeyword.keyword.ilike(like_pattern))
            .order_by(SearchKeyword.search_count.desc())
            .limit(5)
        )
        kw_result = await self.db.execute(kw_stmt)
        suggestions = [row[0] for row in kw_result.fetchall()]

        if len(suggestions) < 10:
            brand_names_stmt = (
                select(Brand.name)
                .where(Brand.deleted_at.is_(None), Brand.name.ilike(like_pattern))
                .limit(5)
            )
            brand_result = await self.db.execute(brand_names_stmt)
            suggestions.extend(row[0] for row in brand_result.fetchall())

        if len(suggestions) < 10:
            vehicle_names_stmt = (
                select(VehicleSku.name)
                .where(VehicleSku.deleted_at.is_(None), VehicleSku.name.ilike(like_pattern))
                .limit(5)
            )
            vehicle_result = await self.db.execute(vehicle_names_stmt)
            suggestions.extend(row[0] for row in vehicle_result.fetchall())

        return suggestions[:10]

    async def sync_document(self, type: str, id: uuid.UUID, data: dict) -> None:
        pass

    async def remove_document(self, type: str, id: uuid.UUID) -> None:
        pass

    async def _count_articles(self, like_pattern: str, q: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Article)
            .where(
                Article.deleted_at.is_(None),
                Article.status == "published",
                text(
                    "articles.title ILIKE :q1 OR articles.excerpt ILIKE :q2 OR "
                    "similarity(articles.title, :q3) > 0.1"
                ).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _count_vehicles(self, like_pattern: str, q: str) -> int:
        stmt = (
            select(func.count())
            .select_from(VehicleSku)
            .join(VehicleSeries, VehicleSku.series_id == VehicleSeries.id)
            .join(Brand, VehicleSeries.brand_id == Brand.id)
            .where(
                VehicleSku.deleted_at.is_(None),
                text(
                    "vehicle_skus.name ILIKE :q1 OR vehicle_series.name ILIKE :q1 OR "
                    "brands.name ILIKE :q1 OR similarity(vehicle_skus.name, :q2) > 0.1"
                ).bindparams(q1=like_pattern, q2=q),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _count_brands(self, like_pattern: str, q: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Brand)
            .where(
                Brand.deleted_at.is_(None),
                text(
                    "brands.name ILIKE :q1 OR brands.description ILIKE :q1 OR "
                    "similarity(brands.name, :q2) > 0.1"
                ).bindparams(q1=like_pattern, q2=q),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0


class SearchKeywordService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_search(self, keyword: str) -> None:
        if not keyword.strip():
            return
        k = keyword.strip().lower()[:200]
        stmt = select(SearchKeyword).where(SearchKeyword.keyword == k)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.search_count += 1
            existing.last_searched_at = func.now()
        else:
            kw = SearchKeyword(keyword=k, search_count=1)
            self.db.add(kw)
        await self.db.flush()

    async def get_hot_keywords(self, limit: int = 10) -> list[dict]:
        stmt = (
            select(SearchKeyword)
            .order_by(SearchKeyword.search_count.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return [
            {"keyword": kw.keyword, "search_count": kw.search_count}
            for kw in result.scalars().all()
        ]