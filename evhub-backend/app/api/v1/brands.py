from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.schemas.vehicle import BrandListResp, BrandDetailResp
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/brands", tags=["品牌"])


@router.get("", response_model=BrandListResp)
async def list_brands(keyword: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    brands = await service.list_brands(keyword=keyword)
    return success_response(data=brands)


@router.get("/{slug}", response_model=BrandDetailResp)
async def get_brand(slug: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    brand = await service.get_brand(slug)
    return success_response(data=brand)