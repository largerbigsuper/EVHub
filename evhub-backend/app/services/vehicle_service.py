import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, DuplicateError, ValidationError
from app.models.audit_log import AuditLog
from app.models.attribute import AttributeGroup, AttributeDefinition
from app.models.vehicle_sku import VehicleSku
from app.repositories.vehicle_repo import (
    BrandRepository,
    VehicleSeriesRepository,
    VehicleSkuRepository,
    AttributeRepository,
)


def _format_brand(brand) -> dict:
    return {
        "id": str(brand.id),
        "name": brand.name,
        "slug": brand.slug,
        "logo": brand.logo,
        "country": brand.country,
        "founded_year": brand.founded_year,
        "website": brand.website,
        "description": brand.description,
        "is_featured": brand.is_featured,
        "sort_order": brand.sort_order,
        "series_count": len(brand.series) if brand.series else 0,
    }


def _format_series(series) -> dict:
    return {
        "id": str(series.id),
        "brand_id": str(series.brand_id),
        "brand_name": series.brand.name if series.brand else None,
        "name": series.name,
        "slug": series.slug,
        "cover_image": series.cover_image,
        "description": series.description,
        "sort_order": series.sort_order,
        "sku_count": len(series.skus) if series.skus else 0,
    }


def _format_sku(sku: VehicleSku, include_details: bool = False) -> dict:
    result = {
        "id": str(sku.id),
        "series_id": str(sku.series_id),
        "series_name": sku.series.name if sku.series else None,
        "series_slug": sku.series.slug if sku.series else None,
        "brand_id": str(sku.series.brand_id) if sku.series and sku.series.brand else None,
        "brand_name": sku.series.brand.name if sku.series and sku.series.brand else None,
        "brand_slug": sku.series.brand.slug if sku.series and sku.series.brand else None,
        "name": sku.name,
        "slug": sku.slug,
        "year": sku.year,
        "cover_image": sku.cover_image,
        "price_min": float(sku.price_min) if sku.price_min else None,
        "price_max": float(sku.price_max) if sku.price_max else None,
        "battery_type": sku.battery_type,
        "range_km": sku.range_km,
        "motor_power_w": sku.motor_power_w,
        "top_speed_kmh": sku.top_speed_kmh,
        "weight_kg": float(sku.weight_kg) if sku.weight_kg else None,
        "requires_license": sku.requires_license,
        "colors": sku.colors,
        "tags": sku.tags,
        "is_featured": sku.is_featured,
    }
    if include_details and sku.attribute_values:
        groups = {}
        for av in sku.attribute_values:
            attr = av.attribute
            group_name = attr.group.name if attr.group else "其他"
            if group_name not in groups:
                groups[group_name] = {"group_name": group_name, "items": []}
            value = av.value_text or av.value_number or av.value_boolean
            groups[group_name]["items"].append({
                "name": attr.name,
                "code": attr.code,
                "value": value,
                "unit": attr.unit,
            })
        result["attribute_groups"] = list(groups.values())
    return result


def _format_sku_simple(sku: VehicleSku) -> dict:
    result = {
        "id": str(sku.id),
        "series_name": sku.series.name if sku.series else None,
        "brand_name": sku.series.brand.name if sku.series and sku.series.brand else None,
        "name": sku.name,
        "slug": sku.slug,
        "year": sku.year,
        "cover_image": sku.cover_image,
        "price_min": float(sku.price_min) if sku.price_min else None,
        "price_max": float(sku.price_max) if sku.price_max else None,
        "battery_type": sku.battery_type,
        "range_km": sku.range_km,
        "motor_power_w": sku.motor_power_w,
        "top_speed_kmh": sku.top_speed_kmh,
        "weight_kg": float(sku.weight_kg) if sku.weight_kg else None,
        "requires_license": sku.requires_license,
        "tags": sku.tags,
    }
    if sku.attribute_values:
        key_specs = []
        for av in sku.attribute_values:
            if av.attribute.is_key_spec:
                key_specs.append({
                    "name": av.attribute.name,
                    "value": av.value_text or av.value_number or av.value_boolean,
                    "unit": av.attribute.unit,
                })
        result["key_specs"] = key_specs
    return result


class VehicleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.brand_repo = BrandRepository(db)
        self.series_repo = VehicleSeriesRepository(db)
        self.sku_repo = VehicleSkuRepository(db)
        self.attr_repo = AttributeRepository(db)

    async def list_brands(self) -> list[dict]:
        brands = await self.brand_repo.get_all_featured_first()
        return [_format_brand(b) for b in brands]

    async def get_brand(self, slug: str) -> dict:
        brand = await self.brand_repo.get_by_slug(slug)
        if not brand:
            raise NotFoundError("品牌")
        result = _format_brand(brand)
        result["series"] = [_format_series(s) for s in (brand.series or [])]
        return result

    async def create_brand(self, data: dict, operator_id: str) -> dict:
        if await self.brand_repo.check_slug_exists(data["slug"]):
            raise DuplicateError("品牌标识")
        brand = await self.brand_repo.create(**data)
        await self._write_audit(uuid.UUID(operator_id), "CREATE_BRAND", "brand", brand.id, data)
        return _format_brand(brand)

    async def update_brand(self, brand_id: str, data: dict, operator_id: str) -> dict:
        bid = uuid.UUID(brand_id)
        brand = await self.brand_repo.get_by_id(bid)
        if not brand:
            raise NotFoundError("品牌")
        if "slug" in data and data["slug"] != brand.slug:
            if await self.brand_repo.check_slug_exists(data["slug"], bid):
                raise DuplicateError("品牌标识")
        await self.brand_repo.update(bid, **data)
        await self._write_audit(uuid.UUID(operator_id), "UPDATE_BRAND", "brand", bid, data)
        brand = await self.brand_repo.get_by_id(bid)
        return _format_brand(brand)

    async def delete_brand(self, brand_id: str, operator_id: str) -> None:
        bid = uuid.UUID(brand_id)
        deleted = await self.brand_repo.soft_delete(bid)
        if not deleted:
            raise NotFoundError("品牌")
        await self._write_audit(uuid.UUID(operator_id), "DELETE_BRAND", "brand", bid)

    async def get_series(self, slug: str) -> dict:
        series = await self.series_repo.get_by_slug(slug)
        if not series:
            raise NotFoundError("车系")
        result = _format_series(series)
        result["skus"] = [_format_sku_simple(s) for s in (series.skus or [])]
        return result

    async def create_series(self, data: dict, operator_id: str) -> dict:
        series = await self.series_repo.create(**data)
        await self._write_audit(uuid.UUID(operator_id), "CREATE_SERIES", "vehicle_series", series.id, data)
        return _format_series(series)

    async def update_series(self, series_id: str, data: dict, operator_id: str) -> dict:
        sid = uuid.UUID(series_id)
        series = await self.series_repo.get_by_id(sid)
        if not series:
            raise NotFoundError("车系")
        await self.series_repo.update(sid, **data)
        await self._write_audit(uuid.UUID(operator_id), "UPDATE_SERIES", "vehicle_series", sid, data)
        series = await self.series_repo.get_by_id(sid)
        return _format_series(series)

    async def delete_series(self, series_id: str, operator_id: str) -> None:
        sid = uuid.UUID(series_id)
        deleted = await self.series_repo.soft_delete(sid)
        if not deleted:
            raise NotFoundError("车系")
        await self._write_audit(uuid.UUID(operator_id), "DELETE_SERIES", "vehicle_series", sid)

    async def search_skus(self, **params) -> dict:
        skus, total = await self.sku_repo.search(**params)
        page = params.get("page", 1)
        page_size = params.get("page_size", 20)
        return {
            "data": [_format_sku_simple(s) for s in skus],
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
            },
        }

    async def get_sku(self, slug: str) -> dict:
        sku = await self.sku_repo.get_by_slug(slug)
        if not sku:
            raise NotFoundError("车型")
        return _format_sku(sku, include_details=True)

    async def compare_skus(self, ids: list[str]) -> dict:
        sku_ids = [uuid.UUID(id) for id in ids]
        if len(sku_ids) > 4:
            raise ValidationError("最多对比4款车型")
        skus = await self.sku_repo.get_by_ids(sku_ids)

        attributes = []
        attr_map = {}
        for sku in skus:
            if sku.attribute_values:
                for av in sku.attribute_values:
                    attr = av.attribute
                    if not attr.is_comparable:
                        continue
                    key = attr.code
                    if key not in attr_map:
                        attr_map[key] = {
                            "name": attr.name,
                            "code": attr.code,
                            "unit": attr.unit,
                            "values": [None] * len(skus),
                        }
                        attributes.append(attr_map[key])

        for i, sku in enumerate(skus):
            if sku.attribute_values:
                for av in sku.attribute_values:
                    if av.attribute.code in attr_map:
                        attr_map[av.attribute.code]["values"][i] = (
                            av.value_text or av.value_number or av.value_boolean
                        )

        formatted = [_format_sku(s, include_details=False) for s in skus]
        return {"skus": formatted, "attributes": attributes}

    async def create_sku(self, data: dict, operator_id: str) -> dict:
        sku = await self.sku_repo.create(**data)
        await self._write_audit(uuid.UUID(operator_id), "CREATE_SKU", "vehicle_sku", sku.id, data)
        return _format_sku(sku)

    async def update_sku(self, sku_id: str, data: dict, operator_id: str) -> dict:
        sid = uuid.UUID(sku_id)
        sku = await self.sku_repo.get_by_id(sid)
        if not sku:
            raise NotFoundError("车型")
        await self.sku_repo.update(sid, **data)
        await self._write_audit(uuid.UUID(operator_id), "UPDATE_SKU", "vehicle_sku", sid, data)
        sku = await self.sku_repo.get_by_id(sid)
        return _format_sku(sku)

    async def delete_sku(self, sku_id: str, operator_id: str) -> None:
        sid = uuid.UUID(sku_id)
        deleted = await self.sku_repo.soft_delete(sid)
        if not deleted:
            raise NotFoundError("车型")
        await self._write_audit(uuid.UUID(operator_id), "DELETE_SKU", "vehicle_sku", sid)

    async def set_sku_attributes(self, sku_id: str, values: dict, operator_id: str) -> None:
        sid = uuid.UUID(sku_id)
        sku = await self.sku_repo.get_by_id(sid)
        if not sku:
            raise NotFoundError("车型")
        await self.attr_repo.batch_set_attribute_values(sid, values)
        await self._write_audit(uuid.UUID(operator_id), "SET_ATTRS", "vehicle_sku", sid, {"count": len(values)})

    async def list_attribute_groups(self) -> list[dict]:
        groups = await self.attr_repo.get_groups_with_definitions()
        result = []
        for g in groups:
            result.append({
                "id": str(g.id),
                "name": g.name,
                "code": g.code,
                "sort_order": g.sort_order,
                "definitions": [
                    {
                        "id": str(d.id),
                        "name": d.name,
                        "code": d.code,
                        "value_type": d.value_type,
                        "unit": d.unit,
                        "is_key_spec": d.is_key_spec,
                        "is_filterable": d.is_filterable,
                        "is_comparable": d.is_comparable,
                        "display_format": d.display_format,
                        "sort_order": d.sort_order,
                    }
                    for d in (g.definitions or [])
                ],
            })
        return result

    async def create_attribute_group(self, data: dict, operator_id: str) -> dict:
        group = await self.attr_repo.create_group(**data)
        await self._write_audit(uuid.UUID(operator_id), "CREATE_ATTR_GROUP", "attribute_group", group.id, data)
        return {"id": str(group.id), "name": group.name, "code": group.code, "sort_order": group.sort_order}

    async def update_attribute_group(self, group_id: str, data: dict, operator_id: str) -> dict:
        gid = uuid.UUID(group_id)
        group = await self.attr_repo.update_group(gid, **data)
        if not group:
            raise NotFoundError("属性组")
        await self._write_audit(uuid.UUID(operator_id), "UPDATE_ATTR_GROUP", "attribute_group", gid, data)
        return {"id": str(group.id), "name": group.name, "code": group.code, "sort_order": group.sort_order}

    async def delete_attribute_group(self, group_id: str, operator_id: str) -> None:
        gid = uuid.UUID(group_id)
        deleted = await self.attr_repo.delete_group(gid)
        if not deleted:
            raise NotFoundError("属性组")
        await self._write_audit(uuid.UUID(operator_id), "DELETE_ATTR_GROUP", "attribute_group", gid)

    async def create_attribute_definition(self, data: dict, operator_id: str) -> dict:
        definition = await self.attr_repo.create_definition(**data)
        await self._write_audit(uuid.UUID(operator_id), "CREATE_ATTR_DEF", "attribute_definition", definition.id, data)
        return {
            "id": str(definition.id),
            "name": definition.name,
            "code": definition.code,
            "value_type": definition.value_type,
            "unit": definition.unit,
            "is_key_spec": definition.is_key_spec,
            "is_filterable": definition.is_filterable,
            "is_comparable": definition.is_comparable,
        }

    async def update_attribute_definition(self, def_id: str, data: dict, operator_id: str) -> dict:
        did = uuid.UUID(def_id)
        definition = await self.attr_repo.update_definition(did, **data)
        if not definition:
            raise NotFoundError("属性定义")
        await self._write_audit(uuid.UUID(operator_id), "UPDATE_ATTR_DEF", "attribute_definition", did, data)
        return {"id": str(definition.id)}

    async def delete_attribute_definition(self, def_id: str, operator_id: str) -> None:
        did = uuid.UUID(def_id)
        deleted = await self.attr_repo.delete_definition(did)
        if not deleted:
            raise NotFoundError("属性定义")
        await self._write_audit(uuid.UUID(operator_id), "DELETE_ATTR_DEF", "attribute_definition", did)

    async def _write_audit(self, user_id: uuid.UUID, action: str, resource: str, resource_id: uuid.UUID, detail: dict | None = None):
        log = AuditLog(user_id=user_id, action=action, resource=resource, resource_id=resource_id, detail=detail)
        self.db.add(log)
        await self.db.flush()