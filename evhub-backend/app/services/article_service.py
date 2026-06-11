import uuid
import math
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.models.article import Article, Category
from app.models.audit_log import AuditLog
from app.repositories.article_repo import ArticleRepo, CategoryRepo
from app.core.exceptions import NotFoundError, BadRequestError


class ArticleService:
    def __init__(self, db: AsyncSession, redis: Redis | None = None):
        self.db = db
        self.redis = redis
        self.article_repo = ArticleRepo(db)
        self.category_repo = CategoryRepo(db)

    # ---- Public APIs ----

    async def list_articles(
        self,
        category_slug: str | None = None,
        tag: str | None = None,
        keyword: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        articles, total = await self.article_repo.search(
            category_slug=category_slug, tag=tag, keyword=keyword,
            status="published", page=page, page_size=page_size,
        )
        return {
            "data": articles,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def get_article_by_slug(self, slug: str) -> Article:
        article = await self.article_repo.get_by_slug(slug)
        if not article:
            raise NotFoundError("文章")
        if self.redis:
            await self.redis.incr(f"article:view:{article.id}")
        return article

    async def get_categories(self) -> list[Category]:
        return await self.category_repo.get_all_tree()

    # ---- Admin APIs ----

    async def create_article(self, data: dict, user_id: str) -> Article:
        existing = await self.article_repo.get_by_slug(data["slug"])
        if existing:
            raise BadRequestError("文章标识(slug)已存在")

        data["author_id"] = uuid.UUID(user_id)
        data["status"] = "draft"
        article = await self.article_repo.create(**data)
        await self._write_audit(uuid.UUID(user_id), "CREATE_ARTICLE", "article", article.id, data)
        return await self.article_repo.get_by_id(article.id)

    async def update_article(self, article_id: uuid.UUID, data: dict, user_id: str, is_admin: bool = False) -> Article:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        if not is_admin and str(article.author_id) != user_id:
            raise BadRequestError("只能编辑自己的文章")

        if article.status == "published":
            allowed = {"title", "content", "excerpt", "cover_image", "category_id", "tags", "meta_title", "meta_description", "og_image_url"}
            data = {k: v for k, v in data.items() if k in allowed}
        elif article.status == "rejected":
            data["status"] = "draft"

        article = await self.article_repo.update(article_id, **data)
        await self._write_audit(uuid.UUID(user_id), "UPDATE_ARTICLE", "article", article_id, data)
        return await self.article_repo.get_by_id(article_id)

    async def delete_article(self, article_id: uuid.UUID, user_id: str) -> bool:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        result = await self.article_repo.soft_delete(article_id)
        await self._write_audit(uuid.UUID(user_id), "DELETE_ARTICLE", "article", article_id)
        if result and article.category_id:
            await self.category_repo.increment_article_count(article.category_id, -1)
        return result

    async def submit_for_review(self, article_id: uuid.UUID, user_id: str) -> Article:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        if str(article.author_id) != user_id:
            raise BadRequestError("只能提交自己的文章")
        if article.status != "draft":
            raise BadRequestError("只有草稿状态的文章可以提交审核")

        article = await self.article_repo.update(article_id, status="pending")
        await self._write_audit(uuid.UUID(user_id), "SUBMIT_REVIEW", "article", article_id)
        return article

    async def publish_article(self, article_id: uuid.UUID, user_id: str) -> Article:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        if article.status != "pending":
            raise BadRequestError("只有待审核状态的文章可以发布")

        article = await self.article_repo.update(article_id, status="published", published_at=datetime.now(timezone.utc))
        if article.category_id:
            await self.category_repo.increment_article_count(article.category_id, 1)
        await self._write_audit(uuid.UUID(user_id), "PUBLISH_ARTICLE", "article", article_id)

        return article

    async def reject_article(self, article_id: uuid.UUID, reason: str, user_id: str) -> Article:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        if article.status != "pending":
            raise BadRequestError("只有待审核状态的文章可以拒绝")

        article = await self.article_repo.update(article_id, status="rejected", rejected_reason=reason)
        await self._write_audit(uuid.UUID(user_id), "REJECT_ARTICLE", "article", article_id, {"reason": reason})
        return article

    async def list_pending_articles(self, page: int = 1, page_size: int = 20) -> dict:
        articles, total = await self.article_repo.search(
            status="pending", page=page, page_size=page_size,
        )
        return {
            "data": articles,
            "meta": {
                "page": page, "page_size": page_size,
                "total": total, "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def list_admin_articles(
        self, status: str | None = None, keyword: str | None = None,
        category_id: uuid.UUID | None = None, page: int = 1, page_size: int = 20,
    ) -> dict:
        category_slug = None
        if category_id:
            cat = await self.category_repo.get_by_id(category_id)
            if cat:
                category_slug = cat.slug
        articles, total = await self.article_repo.search(
            status=status, keyword=keyword, category_slug=category_slug,
            page=page, page_size=page_size,
        )
        return {
            "data": articles,
            "meta": {
                "page": page, "page_size": page_size,
                "total": total, "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def get_admin_article(self, article_id: uuid.UUID) -> Article:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("文章")
        return article

    # ---- Category Admin APIs ----

    async def create_category(self, data: dict, user_id: str) -> Category:
        if await self.category_repo.get_by_slug(data["slug"]):
            raise BadRequestError("分类标识(slug)已存在")
        if data.get("parent_id"):
            parent = await self.category_repo.get_by_id(uuid.UUID(str(data["parent_id"])))
            if not parent:
                raise BadRequestError("父分类不存在")
        cat = await self.category_repo.create(**data)
        await self._write_audit(uuid.UUID(user_id), "CREATE_CATEGORY", "category", cat.id, data)
        return cat

    async def update_category(self, cid: uuid.UUID, data: dict, user_id: str) -> Category:
        cat = await self.category_repo.update(cid, **data)
        if not cat:
            raise NotFoundError("分类")
        await self._write_audit(uuid.UUID(user_id), "UPDATE_CATEGORY", "category", cid, data)
        return cat

    async def delete_category(self, cid: uuid.UUID, user_id: str) -> bool:
        result = await self.category_repo.hard_delete(cid)
        if not result:
            raise NotFoundError("分类")
        await self._write_audit(uuid.UUID(user_id), "DELETE_CATEGORY", "category", cid)
        return result

    # ---- Audit ----

    async def _write_audit(self, user_id: uuid.UUID, action: str, resource: str, resource_id: uuid.UUID, detail: dict | None = None):
        log = AuditLog(user_id=user_id, action=action, resource=resource, resource_id=resource_id, detail=detail)
        self.db.add(log)
        await self.db.flush()