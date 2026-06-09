import uuid

from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.article import Article, Category
from app.repositories.base import BaseRepository


class CategoryRepo(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_all_tree(self) -> list[Category]:
        stmt = (
            select(Category)
            .options(selectinload(Category.children))
            .where(Category.parent_id.is_(None))
            .order_by(Category.sort_order)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> Category | None:
        stmt = select(Category).where(Category.slug == slug)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def hard_delete(self, cid: uuid.UUID) -> bool:
        cat = await self.get_by_id(cid)
        if not cat:
            return False
        await self.db.delete(cat)
        await self.db.flush()
        return True

    async def increment_article_count(self, cid: uuid.UUID | None, delta: int):
        if cid is not None:
            await self.db.execute(
                text("UPDATE categories SET article_count = article_count + :delta WHERE id = :cid"),
                {"delta": delta, "cid": cid},
            )


class ArticleRepo(BaseRepository[Article]):
    def __init__(self, db: AsyncSession):
        super().__init__(Article, db)

    async def get_by_slug(self, slug: str) -> Article | None:
        stmt = (
            select(Article)
            .options(selectinload(Article.author), selectinload(Article.category))
            .where(Article.slug == slug, Article.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, aid: uuid.UUID) -> Article | None:
        stmt = (
            select(Article)
            .options(selectinload(Article.author), selectinload(Article.category))
            .where(Article.id == aid, Article.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        category_slug: str | None = None,
        tag: str | None = None,
        keyword: str | None = None,
        status: str | None = None,
        author_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Article], int]:
        stmt = select(Article).options(
            selectinload(Article.author), selectinload(Article.category)
        )
        count_stmt = select(func.count()).select_from(Article)

        base_conditions = [Article.deleted_at.is_(None)]

        if category_slug:
            stmt = stmt.join(Category, Article.category_id == Category.id)
            count_stmt = count_stmt.join(Category, Article.category_id == Category.id)
            base_conditions.append(Category.slug == category_slug)

        if tag:
            base_conditions.append(Article.tags.contain([tag]))

        if keyword:
            base_conditions.append(
                or_(
                    Article.title.ilike(f"%{keyword}%"),
                    Article.excerpt.ilike(f"%{keyword}%"),
                )
            )

        if status:
            base_conditions.append(Article.status == status)
        else:
            base_conditions.append(Article.status == "published")

        if author_id:
            base_conditions.append(Article.author_id == author_id)

        stmt = stmt.where(and_(*base_conditions))
        count_stmt = count_stmt.where(and_(*base_conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)

        return list(result.scalars().all()), total

    async def increment_view_count(self, aid: uuid.UUID, delta: int):
        await self.db.execute(
            text("UPDATE articles SET view_count = view_count + :delta WHERE id = :aid"),
            {"delta": delta, "aid": aid},
        )

    async def batch_update_view_counts(self, updates: dict[uuid.UUID, int]):
        for aid, delta in updates.items():
            await self.increment_view_count(aid, delta)