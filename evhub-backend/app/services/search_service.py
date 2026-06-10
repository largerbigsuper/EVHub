from abc import ABC, abstractmethod
from dataclasses import dataclass
import uuid

from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.engine import Dialect

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


def _sql_like_field(field_name: str, dialect_name: str) -> str:
    if dialect_name == "sqlite":
        return f"LOWER({field_name}) LIKE LOWER(:q1)"
    return f"{field_name} ILIKE :q1"


def _sql_similarity(field_name: str, dialect_name: str) -> str:
    if dialect_name == "sqlite":
        return f"LOWER({field_name}) LIKE LOWER(:q2)"
    return f"similarity({field_name}, :q3) > 0.1"


def _sql_rank_order(field_name: str, dialect_name: str) -> str:
    if dialect_name == "sqlite":
        return f"CASE WHEN LOWER({field_name}) LIKE LOWER(:q1) THEN 0 ELSE 1 END"
    return f"CASE WHEN {field_name} ILIKE :q1 THEN 0 ELSE 1 END"


class PgSearchService(SearchServiceInterface):
    def __init__(self, db: AsyncSession):
        self.db = db
        self._dialect_name = db.get_bind().dialect.name if db.get_bind() else "postgresql"

    def _like(self, field: str) -> str:
        return _sql_like_field(field, self._dialect_name)

    def _similarity(self, field: str) -> str:
        return _sql_similarity(field, self._dialect_name)

    def _rank(self, field: str) -> str:
        return _sql_rank_order(field, self._dialect_name)

    def _build_search_condition(self, *fields: str, like_var: str = "q1") -> str:
        parts = [self._like(f) for f in fields]
        return " OR ".join(parts)

    async def search(self, q: str, type: str, page: int, page_size: int = 10) -> SearchResult:
        result = SearchResult(articles=[], vehicles=[], brands=[], total=0)
        safe_q = q.replace("%", "\\%").replace("_", "\\_")
        like_pattern = f"%{safe_q}%"
        offset = (page - 1) * page_size

        if type in ("all", "article"):
            article_cond = (
                f"{self._like('articles.title')} OR "
                f"{self._like('articles.excerpt')} OR "
                f"{self._similarity('articles.title')}"
            )
            rank_clause = (
                f"CASE WHEN {self._like('articles.title')} THEN 0 "
                f"WHEN {self._like('articles.excerpt')} THEN 1 ELSE 2 END"
            ).replace(":q1", ":q1").replace("ILIKE", "ILIKE")

            if self._dialect_name == "sqlite":
                rank_clause = (
                    f"CASE WHEN LOWER(articles.title) LIKE LOWER(:q1) THEN 0 "
                    f"WHEN LOWER(articles.excerpt) LIKE LOWER(:q2) THEN 1 ELSE 2 END"
                )
            else:
                rank_clause = (
                    "CASE WHEN articles.title ILIKE :q1 THEN 0 "
                    "WHEN articles.excerpt ILIKE :q2 THEN 1 ELSE 2 END"
                )

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
                    text(article_cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
                )
                .order_by(text(rank_clause).bindparams(q1=like_pattern, q2=like_pattern))
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
            v_cond = (
                f"{self._like('vehicle_skus.name')} OR "
                f"{self._like('vehicle_series.name')} OR "
                f"{self._like('brands.name')} OR "
                f"{self._similarity('vehicle_skus.name')}"
            )
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
                    text(v_cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
                )
                .order_by(text(self._rank("vehicle_skus.name")).bindparams(q1=like_pattern))
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
            b_cond = (
                f"{self._like('brands.name')} OR "
                f"{self._like('brands.description')} OR "
                f"{self._similarity('brands.name')}"
            )
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
                    text(b_cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
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

        is_sqlite = self._dialect_name == "sqlite"

        kw_stmt = select(SearchKeyword.keyword)
        if is_sqlite:
            kw_stmt = kw_stmt.where(func.lower(SearchKeyword.keyword).like(func.lower(like_pattern)))
        else:
            kw_stmt = kw_stmt.where(SearchKeyword.keyword.ilike(like_pattern))
        kw_stmt = kw_stmt.order_by(SearchKeyword.search_count.desc()).limit(5)
        kw_result = await self.db.execute(kw_stmt)
        suggestions = [row[0] for row in kw_result.fetchall()]

        if len(suggestions) < 10:
            brand_stmt = select(Brand.name).where(Brand.deleted_at.is_(None))
            if is_sqlite:
                brand_stmt = brand_stmt.where(func.lower(Brand.name).like(func.lower(like_pattern)))
            else:
                brand_stmt = brand_stmt.where(Brand.name.ilike(like_pattern))
            brand_stmt = brand_stmt.limit(5)
            brand_result = await self.db.execute(brand_stmt)
            suggestions.extend(row[0] for row in brand_result.fetchall())

        if len(suggestions) < 10:
            vehicle_stmt = select(VehicleSku.name).where(VehicleSku.deleted_at.is_(None))
            if is_sqlite:
                vehicle_stmt = vehicle_stmt.where(func.lower(VehicleSku.name).like(func.lower(like_pattern)))
            else:
                vehicle_stmt = vehicle_stmt.where(VehicleSku.name.ilike(like_pattern))
            vehicle_stmt = vehicle_stmt.limit(5)
            vehicle_result = await self.db.execute(vehicle_stmt)
            suggestions.extend(row[0] for row in vehicle_result.fetchall())

        return suggestions[:10]

    async def sync_document(self, type: str, id: uuid.UUID, data: dict) -> None:
        pass

    async def remove_document(self, type: str, id: uuid.UUID) -> None:
        pass

    def _build_count_condition(self, *field_pairs) -> str:
        parts = []
        for field, var in field_pairs:
            parts.append(self._like(field))
        return " OR ".join(parts)

    async def _count_articles(self, like_pattern: str, q: str) -> int:
        cond = (
            f"{self._like('articles.title')} OR "
            f"{self._like('articles.excerpt')} OR "
            f"{self._similarity('articles.title')}"
        )
        stmt = (
            select(func.count())
            .select_from(Article)
            .where(
                Article.deleted_at.is_(None),
                Article.status == "published",
                text(cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _count_vehicles(self, like_pattern: str, q: str) -> int:
        cond = (
            f"{self._like('vehicle_skus.name')} OR "
            f"{self._like('vehicle_series.name')} OR "
            f"{self._like('brands.name')} OR "
            f"{self._similarity('vehicle_skus.name')}"
        )
        stmt = (
            select(func.count())
            .select_from(VehicleSku)
            .join(VehicleSeries, VehicleSku.series_id == VehicleSeries.id)
            .join(Brand, VehicleSeries.brand_id == Brand.id)
            .where(
                VehicleSku.deleted_at.is_(None),
                text(cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _count_brands(self, like_pattern: str, q: str) -> int:
        cond = (
            f"{self._like('brands.name')} OR "
            f"{self._like('brands.description')} OR "
            f"{self._similarity('brands.name')}"
        )
        stmt = (
            select(func.count())
            .select_from(Brand)
            .where(
                Brand.deleted_at.is_(None),
                text(cond).bindparams(q1=like_pattern, q2=like_pattern, q3=q),
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