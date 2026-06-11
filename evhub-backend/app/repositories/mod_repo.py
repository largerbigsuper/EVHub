import uuid

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.mod_build import ModBuild, ModPart
from app.repositories.base import BaseRepository


class ModBuildRepo(BaseRepository[ModBuild]):
    def __init__(self, db: AsyncSession):
        super().__init__(ModBuild, db)

    async def get_by_slug(self, slug: str) -> ModBuild | None:
        stmt = (
            select(ModBuild)
            .options(
                selectinload(ModBuild.author),
                selectinload(ModBuild.parts),
                selectinload(ModBuild.vehicle_sku),
            )
            .where(ModBuild.slug == slug, ModBuild.deleted_at.is_(None), ModBuild.status == "published")
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, bid: uuid.UUID) -> ModBuild | None:
        stmt = (
            select(ModBuild)
            .options(
                selectinload(ModBuild.author),
                selectinload(ModBuild.parts),
                selectinload(ModBuild.vehicle_sku),
            )
            .where(ModBuild.id == bid, ModBuild.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        vehicle_sku_id: uuid.UUID | None = None,
        tag: str | None = None,
        keyword: str | None = None,
        is_legal: bool | None = None,
        status: str | None = None,
        author_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ModBuild], int]:
        stmt = select(ModBuild).options(
            selectinload(ModBuild.author),
            selectinload(ModBuild.vehicle_sku),
        )
        count_stmt = select(func.count()).select_from(ModBuild)

        conditions = [ModBuild.deleted_at.is_(None)]

        if vehicle_sku_id:
            conditions.append(ModBuild.vehicle_sku_id == vehicle_sku_id)

        if tag:
            conditions.append(ModBuild.tags.contain([tag]))

        if is_legal is not None:
            conditions.append(ModBuild.is_legal == is_legal)

        if keyword:
            conditions.append(
                or_(
                    ModBuild.title.ilike(f"%{keyword}%"),
                    ModBuild.description.ilike(f"%{keyword}%"),
                )
            )

        if status:
            conditions.append(ModBuild.status == status)
        else:
            conditions.append(ModBuild.status == "published")

        if author_id:
            conditions.append(ModBuild.author_id == author_id)

        stmt = stmt.where(and_(*conditions))
        count_stmt = count_stmt.where(and_(*conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(ModBuild.published_at.desc().nullslast(), ModBuild.created_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)

        return list(result.scalars().all()), total

    async def save_parts(self, build_id: uuid.UUID, parts: list[dict]):
        await self.db.execute(
            ModPart.__table__.delete().where(ModPart.build_id == build_id)
        )
        for p in parts:
            part = ModPart(build_id=build_id, **p)
            self.db.add(part)
        await self.db.flush()