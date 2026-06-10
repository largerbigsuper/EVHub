from datetime import datetime, timedelta, timezone, date

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.article import Article
from app.models.vehicle_sku import VehicleSku
from app.models.mod_build import ModBuild
from app.models.audit_log import AuditLog
from app.core.redis import redis_pool

STATS_CACHE_TTL = 300


async def _get_today_range():
    today = date.today()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    return start


async def get_admin_stats(db: AsyncSession) -> dict:
    cached = await redis_pool.get("admin:dashboard:stats")
    if cached:
        import json
        return json.loads(cached)

    today_start = await _get_today_range()

    users_total = await db.scalar(select(func.count()).select_from(User))
    users_today = await db.scalar(
        select(func.count()).select_from(User).where(User.created_at >= today_start)
    )

    articles_total = await db.scalar(
        select(func.count()).select_from(Article).where(Article.deleted_at.is_(None))
    )
    articles_today = await db.scalar(
        select(func.count()).select_from(Article).where(
            Article.deleted_at.is_(None), Article.created_at >= today_start
        )
    )
    articles_pending = await db.scalar(
        select(func.count()).select_from(Article).where(
            Article.deleted_at.is_(None), Article.status == "pending"
        )
    )

    vehicles_total = await db.scalar(
        select(func.count()).select_from(VehicleSku).where(VehicleSku.deleted_at.is_(None))
    )

    pending_mod = await db.scalar(
        select(func.count()).select_from(ModBuild).where(
            ModBuild.deleted_at.is_(None), ModBuild.status == "pending"
        )
    )
    illegal_mod = await db.scalar(
        select(func.count()).select_from(ModBuild).where(
            ModBuild.deleted_at.is_(None),
            ModBuild.status == "published",
            ModBuild.is_legal == False,
        )
    )

    result = {
        "users": {
            "total": users_total or 0,
            "today": users_today or 0,
        },
        "articles": {
            "total": articles_total or 0,
            "today": articles_today or 0,
            "pending": articles_pending or 0,
        },
        "vehicles": {
            "total": vehicles_total or 0,
        },
        "pending_mod": pending_mod or 0,
        "illegal_mod": illegal_mod or 0,
    }

    import json
    await redis_pool.set("admin:dashboard:stats", json.dumps(result), ex=STATS_CACHE_TTL)
    return result


async def get_content_trends(db: AsyncSession) -> list[dict]:
    cached = await redis_pool.get("admin:dashboard:trends")
    if cached:
        import json
        return json.loads(cached)

    today = date.today()
    trends = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        article_count = await db.scalar(
            select(func.count()).select_from(Article).where(
                Article.deleted_at.is_(None),
                Article.created_at >= day_start,
                Article.created_at < day_end,
            )
        )

        trends.append({
            "date": day.strftime("%m-%d"),
            "articles": article_count or 0,
        })

    import json
    await redis_pool.set("admin:dashboard:trends", json.dumps(trends), ex=STATS_CACHE_TTL)
    return trends


async def get_audit_logs(db: AsyncSession) -> list[dict]:
    stmt = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource": log.resource,
            "resource_id": str(log.resource_id) if log.resource_id else None,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]