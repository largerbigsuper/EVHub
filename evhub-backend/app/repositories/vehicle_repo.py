import uuid

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.brand import Brand
from app.models.vehicle_series import VehicleSeries
from app.models.vehicle_sku import VehicleSku
from app.models.attribute import AttributeGroup, AttributeDefinition, VehicleAttributeValue
from app.repositories.base import BaseRepository


class BrandRepository(BaseRepository[Brand]):
    def __init__(self, db: AsyncSession):
        super().__init__(Brand, db)

    async def get_by_slug(self, slug: str) -> Brand | None:
        stmt = (
            select(Brand)
            .options(selectinload(Brand.series))
            .where(Brand.slug == slug, Brand.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_featured_first(self) -> list[Brand]:
        stmt = (
            select(Brand)
            .where(Brand.deleted_at.is_(None))
            .order_by(Brand.is_featured.desc(), Brand.sort_order.asc(), Brand.name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def check_slug_exists(self, slug: str, exclude_id: uuid.UUID | None = None) -> bool:
        stmt = select(func.count()).select_from(Brand).where(Brand.slug == slug)
        if exclude_id:
            stmt = stmt.where(Brand.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one() > 0


class VehicleSeriesRepository(BaseRepository[VehicleSeries]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleSeries, db)

    async def get_by_slug(self, slug: str) -> VehicleSeries | None:
        stmt = (
            select(VehicleSeries)
            .options(
                selectinload(VehicleSeries.brand),
                selectinload(VehicleSeries.skus),
            )
            .where(VehicleSeries.slug == slug, VehicleSeries.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class VehicleSkuRepository(BaseRepository[VehicleSku]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleSku, db)

    async def get_by_slug(self, slug: str) -> VehicleSku | None:
        stmt = (
            select(VehicleSku)
            .options(
                selectinload(VehicleSku.series).selectinload(VehicleSeries.brand),
                selectinload(VehicleSku.attribute_values).selectinload(VehicleAttributeValue.attribute).selectinload(AttributeDefinition.group),
            )
            .where(VehicleSku.slug == slug, VehicleSku.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_ids(self, ids: list[uuid.UUID]) -> list[VehicleSku]:
        stmt = (
            select(VehicleSku)
            .options(
                selectinload(VehicleSku.series).selectinload(VehicleSeries.brand),
                selectinload(VehicleSku.attribute_values).selectinload(VehicleAttributeValue.attribute),
            )
            .where(VehicleSku.id.in_(ids), VehicleSku.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search(
        self,
        brand_slug: str | None = None,
        battery_type: str | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        range_min: int | None = None,
        requires_license: bool | None = None,
        tags: list[str] | None = None,
        sort_by: str = "created_at",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[VehicleSku], int]:
        stmt = select(VehicleSku).options(
            selectinload(VehicleSku.series).selectinload(VehicleSeries.brand),
            selectinload(VehicleSku.attribute_values).selectinload(VehicleAttributeValue.attribute),
        ).where(VehicleSku.deleted_at.is_(None))

        count_stmt = select(func.count()).select_from(VehicleSku).where(VehicleSku.deleted_at.is_(None))

        if brand_slug:
            stmt = stmt.join(VehicleSeries).join(Brand).where(Brand.slug == brand_slug)
            count_stmt = count_stmt.join(VehicleSeries).join(Brand).where(Brand.slug == brand_slug)

        if battery_type:
            stmt = stmt.where(VehicleSku.battery_type == battery_type)
            count_stmt = count_stmt.where(VehicleSku.battery_type == battery_type)

        if price_min is not None:
            stmt = stmt.where(VehicleSku.price_min >= price_min)
            count_stmt = count_stmt.where(VehicleSku.price_min >= price_min)

        if price_max is not None:
            stmt = stmt.where(VehicleSku.price_min <= price_max)
            count_stmt = count_stmt.where(VehicleSku.price_min <= price_max)

        if range_min is not None:
            stmt = stmt.where(VehicleSku.range_km >= range_min)
            count_stmt = count_stmt.where(VehicleSku.range_km >= range_min)

        if requires_license is not None:
            stmt = stmt.where(VehicleSku.requires_license == requires_license)
            count_stmt = count_stmt.where(VehicleSku.requires_license == requires_license)

        sort_map = {
            "price_asc": VehicleSku.price_min.asc(),
            "price_desc": VehicleSku.price_min.desc(),
            "range_desc": VehicleSku.range_km.desc(),
            "created_at": VehicleSku.created_at.desc(),
        }
        stmt = stmt.order_by(sort_map.get(sort_by, VehicleSku.created_at.desc()))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total


class AttributeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_groups_with_definitions(self) -> list[AttributeGroup]:
        stmt = (
            select(AttributeGroup)
            .options(selectinload(AttributeGroup.definitions))
            .order_by(AttributeGroup.sort_order)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_group_by_id(self, group_id: uuid.UUID) -> AttributeGroup | None:
        stmt = select(AttributeGroup).where(AttributeGroup.id == group_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_group(self, name: str, code: str, sort_order: int = 0) -> AttributeGroup:
        group = AttributeGroup(name=name, code=code, sort_order=sort_order)
        self.db.add(group)
        await self.db.flush()
        return group

    async def update_group(self, group_id: uuid.UUID, **kwargs) -> AttributeGroup | None:
        stmt = (
            AttributeGroup.__table__.update()
            .where(AttributeGroup.id == group_id)
            .values(**kwargs)
            .returning(AttributeGroup)
        )
        result = await self.db.execute(stmt)
        row = result.fetchone()
        return row

    async def delete_group(self, group_id: uuid.UUID) -> bool:
        stmt = AttributeDefinition.__table__.delete().where(AttributeDefinition.group_id == group_id)
        await self.db.execute(stmt)
        stmt = AttributeGroup.__table__.delete().where(AttributeGroup.id == group_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def get_definition_by_id(self, def_id: uuid.UUID) -> AttributeDefinition | None:
        stmt = select(AttributeDefinition).where(AttributeDefinition.id == def_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_definition(self, **kwargs) -> AttributeDefinition:
        definition = AttributeDefinition(**kwargs)
        self.db.add(definition)
        await self.db.flush()
        return definition

    async def update_definition(self, def_id: uuid.UUID, **kwargs) -> AttributeDefinition | None:
        stmt = (
            AttributeDefinition.__table__.update()
            .where(AttributeDefinition.id == def_id)
            .values(**kwargs)
            .returning(AttributeDefinition)
        )
        result = await self.db.execute(stmt)
        row = result.fetchone()
        return row

    async def delete_definition(self, def_id: uuid.UUID) -> bool:
        await self.db.execute(
            VehicleAttributeValue.__table__.delete().where(
                VehicleAttributeValue.attribute_id == def_id
            )
        )
        stmt = AttributeDefinition.__table__.delete().where(AttributeDefinition.id == def_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def batch_set_attribute_values(
        self, sku_id: uuid.UUID, values: dict[str, dict]
    ) -> None:
        await self.db.execute(
            VehicleAttributeValue.__table__.delete().where(
                VehicleAttributeValue.sku_id == sku_id
            )
        )
        for attr_id_str, val in values.items():
            attr_id = uuid.UUID(attr_id_str)
            av = VehicleAttributeValue(
                sku_id=sku_id,
                attribute_id=attr_id,
                value_text=val.get("value_text"),
                value_number=val.get("value_number"),
                value_boolean=val.get("value_boolean"),
            )
            self.db.add(av)
        await self.db.flush()