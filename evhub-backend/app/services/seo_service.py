import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_pool
from app.models.article import Article
from app.models.brand import Brand
from app.models.vehicle_series import VehicleSeries
from app.models.vehicle_sku import VehicleSku
from app.models.mod_build import ModBuild

SITEMAP_CACHE_KEY = "seo:sitemap"
SITEMAP_CACHE_TTL = 3600


async def _build_url_xml(
    loc: str,
    lastmod: Optional[datetime] = None,
    changefreq: str = "monthly",
    priority: str = "0.5",
) -> str:
    lastmod_str = ""
    if lastmod:
        if isinstance(lastmod, datetime):
            lastmod_str = f"<lastmod>{lastmod.isoformat()}</lastmod>"
    return (
        f"<url>"
        f"<loc>{loc}</loc>"
        f"{lastmod_str}"
        f"<changefreq>{changefreq}</changefreq>"
        f"<priority>{priority}</priority>"
        f"</url>"
    )


async def generate_sitemap(db: AsyncSession, base_url: str) -> str:
    cached = await redis_pool.get(SITEMAP_CACHE_KEY)
    if cached:
        return cached

    urls: list[str] = []

    urls.append(await _build_url_xml(f"{base_url}/", changefreq="daily", priority="1.0"))

    articles_result = await db.execute(
        select(Article.slug, Article.published_at)
        .where(Article.deleted_at.is_(None), Article.status == "published")
        .limit(10000)
    )
    for row in articles_result.fetchall():
        urls.append(
            await _build_url_xml(
                f"{base_url}/articles/{row[0]}",
                lastmod=row[1],
                changefreq="weekly",
                priority="0.8",
            )
        )

    brands_result = await db.execute(
        select(Brand.slug, Brand.updated_at)
        .where(Brand.deleted_at.is_(None))
        .limit(5000)
    )
    for row in brands_result.fetchall():
        urls.append(
            await _build_url_xml(
                f"{base_url}/brands/{row[0]}",
                lastmod=row[1],
                changefreq="monthly",
                priority="0.7",
            )
        )

    vehicles_result = await db.execute(
        select(VehicleSku.id, VehicleSku.updated_at)
        .where(VehicleSku.deleted_at.is_(None))
        .limit(50000)
    )
    for row in vehicles_result.fetchall():
        urls.append(
            await _build_url_xml(
                f"{base_url}/vehicles/{row[0]}",
                lastmod=row[1],
                changefreq="monthly",
                priority="0.9",
            )
        )

    mods_result = await db.execute(
        select(ModBuild.slug, ModBuild.updated_at)
        .where(ModBuild.deleted_at.is_(None), ModBuild.status == "published")
        .limit(10000)
    )
    for row in mods_result.fetchall():
        urls.append(
            await _build_url_xml(
                f"{base_url}/mod/{row[0]}",
                lastmod=row[1],
                changefreq="weekly",
                priority="0.6",
            )
        )

    total = len(urls)

    if total > 50000:
        index_parts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ]
        for i in range(0, total, 50000):
            chunk = urls[i : i + 50000]
            chunk_xml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                + "".join(chunk)
                + "</urlset>"
            )
            chunk_key = f"{SITEMAP_CACHE_KEY}:{i // 50000 + 1}"
            await redis_pool.set(chunk_key, chunk_xml, ex=SITEMAP_CACHE_TTL)
            index_parts.append(
                f"<sitemap><loc>{base_url}/sitemap.xml?part={i // 50000 + 1}</loc></sitemap>"
            )
        index_parts.append("</sitemapindex>")
        result = "\n".join(index_parts)
    else:
        result = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + "".join(urls)
            + "</urlset>"
        )

    await redis_pool.set(SITEMAP_CACHE_KEY, result, ex=SITEMAP_CACHE_TTL)
    return result


async def invalidate_sitemap_cache() -> None:
    await redis_pool.delete(SITEMAP_CACHE_KEY)


async def build_jsonld_vehicle(sku_row) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": sku_row.name,
        "description": sku_row.description or "",
        "brand": {
            "@type": "Brand",
            "name": sku_row.brand_name,
        },
    }


async def build_jsonld_article(article_row) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article_row.title,
        "description": article_row.excerpt or "",
        "datePublished": article_row.published_at.isoformat() if article_row.published_at else "",
        "dateModified": article_row.updated_at.isoformat() if article_row.updated_at else "",
        "author": {
            "@type": "Person",
            "name": article_row.author_name or "",
        },
    }


async def build_jsonld_brand(brand_row) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brand_row.name,
        "description": brand_row.description or "",
    }


async def build_jsonld_modbuild(mod_row) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": mod_row.title,
        "description": mod_row.content or "",
    }


async def get_jsonld_schema(db: AsyncSession, type: str, id: uuid.UUID) -> dict | None:
    if type == "vehicle":
        stmt = (
            select(
                VehicleSku.name,
                VehicleSku.description,
                Brand.name.label("brand_name"),
            )
            .join(VehicleSeries, VehicleSku.series_id == VehicleSeries.id)
            .join(Brand, VehicleSeries.brand_id == Brand.id)
            .where(VehicleSku.id == id, VehicleSku.deleted_at.is_(None))
        )
        result = await db.execute(stmt)
        row = result.one_or_none()
        if row:
            return await build_jsonld_vehicle(row)

    elif type == "article":
        stmt = select(
            Article.title,
            Article.excerpt,
            Article.published_at,
            Article.updated_at,
            Article.author_id,
        ).where(Article.id == id, Article.deleted_at.is_(None), Article.status == "published")
        result = await db.execute(stmt)
        row = result.one_or_none()
        if row:
            return await build_jsonld_article(row)

    elif type == "brand":
        stmt = select(Brand.name, Brand.description).where(
            Brand.id == id, Brand.deleted_at.is_(None)
        )
        result = await db.execute(stmt)
        row = result.one_or_none()
        if row:
            return await build_jsonld_brand(row)

    elif type == "mod":
        stmt = select(ModBuild.title, ModBuild.content).where(
            ModBuild.id == id, ModBuild.deleted_at.is_(None), ModBuild.status == "published"
        )
        result = await db.execute(stmt)
        row = result.one_or_none()
        if row:
            return await build_jsonld_modbuild(row)

    return None