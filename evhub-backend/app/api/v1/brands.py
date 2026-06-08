from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/brands", tags=["品牌"])


@router.get("")
async def list_brands(db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    brands = await service.list_brands()
    return success_response(data=brands)


@router.get("/{slug}")
async def get_brand(slug: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    brand = await service.get_brand(slug)
    return success_response(data=brand)