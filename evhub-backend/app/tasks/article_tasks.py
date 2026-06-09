import uuid
import logging

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL)


@celery_app.task(name="app.tasks.article_tasks.sync_article_view_counts")
def sync_article_view_counts():
    import asyncio
    asyncio.run(_do_sync_view_counts())


async def _do_sync_view_counts():
    import redis.asyncio as aioredis
    from app.repositories.article_repo import ArticleRepo

    r = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

    try:
        keys = await r.keys("article:view:*")
        if not keys:
            return

        pipeline = r.pipeline()
        for key in keys:
            pipeline.getdel(key)
        results = await pipeline.execute()

        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            repo = ArticleRepo(session)
            updates: dict[uuid.UUID, int] = {}
            for key, val in zip(keys, results):
                if val and int(val) > 0:
                    article_id = str(key).replace("article:view:", "")
                    try:
                        updates[uuid.UUID(article_id)] = int(val)
                    except ValueError:
                        pass

            if updates:
                await repo.batch_update_view_counts(updates)
                await session.commit()
                logger.info("Synced view counts for %d articles", len(updates))
    finally:
        await r.close()
    await engine.dispose()


@celery_app.task(name="app.tasks.article_tasks.sync_article_to_search")
def sync_article_to_search(article_id: str):
    pass


@celery_app.task(name="app.tasks.article_tasks.update_sitemap")
def update_sitemap():
    pass