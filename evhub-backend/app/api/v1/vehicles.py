from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.services.vehicle_service import VehicleService

router = APIRouter(tags=["车型"])


@router.get("/series/{slug}")
async def get_series(slug: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    series = await service.get_series(slug)
    return success_response(data=series)


@router.get("/skus")
async def search_skus(
    brand_slug: str | None = Query(None),
    battery_type: str | None = Query(None),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    range_min: int | None = Query(None),
    requires_license: bool | None = Query(None),
    sort_by: str = Query("created_at"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    result = await service.search_skus(
        brand_slug=brand_slug,
        battery_type=battery_type,
        price_min=price_min,
        price_max=price_max,
        range_min=range_min,
        requires_license=requires_license,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/skus/{slug}")
async def get_sku(slug: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    sku = await service.get_sku(slug)
    return success_response(data=sku)


@router.get("/skus/compare")
async def compare_skus(
    ids: str = Query(description="逗号分隔的SKU ID，最多4个"),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    result = await service.compare_skus(id_list)
    return success_response(data=result)