from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.dependencies import get_current_user
from app.schemas.vehicle import (
    BrandCreate,
    BrandUpdate,
    SeriesCreate,
    SeriesUpdate,
    SkuCreate,
    SkuUpdate,
    SkuAttributeValuesUpdate,
    AttributeGroupCreate,
    AttributeGroupUpdate,
    AttributeDefinitionCreate,
    AttributeDefinitionUpdate,
    BrandResp,
    SeriesResp,
    SkuResp,
    AttributeGroupResp,
    AttributeGroupListResp,
    AttributeDefResp,
    VehicleMessageResp,
)
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/admin", tags=["管理员"])


@router.post("/brands", response_model=BrandResp)
async def create_brand(
    req: BrandCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    brand = await service.create_brand(req.model_dump(), current_user["user_id"])
    return success_response(data=brand, message="品牌创建成功")


@router.put("/brands/{brand_id}", response_model=BrandResp)
async def update_brand(
    brand_id: str,
    req: BrandUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    brand = await service.update_brand(brand_id, update_data, current_user["user_id"])
    return success_response(data=brand, message="品牌更新成功")


@router.delete("/brands/{brand_id}", response_model=VehicleMessageResp)
async def delete_brand(
    brand_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_brand(brand_id, current_user["user_id"])
    return success_response(message="品牌已删除")


@router.post("/series", response_model=SeriesResp)
async def create_series(
    req: SeriesCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    series = await service.create_series(req.model_dump(), current_user["user_id"])
    return success_response(data=series, message="车系创建成功")


@router.put("/series/{series_id}", response_model=SeriesResp)
async def update_series(
    series_id: str,
    req: SeriesUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    series = await service.update_series(series_id, update_data, current_user["user_id"])
    return success_response(data=series, message="车系更新成功")


@router.delete("/series/{series_id}", response_model=VehicleMessageResp)
async def delete_series(
    series_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_series(series_id, current_user["user_id"])
    return success_response(message="车系已删除")


@router.post("/skus", response_model=SkuResp)
async def create_sku(
    req: SkuCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    sku = await service.create_sku(req.model_dump(), current_user["user_id"])
    return success_response(data=sku, message="车型创建成功")


@router.put("/skus/{sku_id}", response_model=SkuResp)
async def update_sku(
    sku_id: str,
    req: SkuUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    sku = await service.update_sku(sku_id, update_data, current_user["user_id"])
    return success_response(data=sku, message="车型更新成功")


@router.delete("/skus/{sku_id}", response_model=VehicleMessageResp)
async def delete_sku(
    sku_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_sku(sku_id, current_user["user_id"])
    return success_response(message="车型已删除")


@router.put("/skus/{sku_id}/attributes", response_model=VehicleMessageResp)
async def set_sku_attributes(
    sku_id: str,
    req: SkuAttributeValuesUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    values = {k: v.model_dump() for k, v in req.values.items()}
    await service.set_sku_attributes(sku_id, values, current_user["user_id"])
    return success_response(message="属性设置成功")


@router.get("/attributes/groups", response_model=AttributeGroupListResp)
async def list_attribute_groups(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    groups = await service.list_attribute_groups()
    return success_response(data=groups)


@router.post("/attributes/groups", response_model=AttributeGroupResp)
async def create_attribute_group(
    req: AttributeGroupCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    group = await service.create_attribute_group(req.model_dump(), current_user["user_id"])
    return success_response(data=group, message="属性组创建成功")


@router.put("/attributes/groups/{group_id}", response_model=AttributeGroupResp)
async def update_attribute_group(
    group_id: str,
    req: AttributeGroupUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    group = await service.update_attribute_group(group_id, update_data, current_user["user_id"])
    return success_response(data=group, message="属性组更新成功")


@router.delete("/attributes/groups/{group_id}", response_model=VehicleMessageResp)
async def delete_attribute_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_attribute_group(group_id, current_user["user_id"])
    return success_response(message="属性组已删除")


@router.post("/attributes/definitions", response_model=AttributeDefResp)
async def create_attribute_definition(
    req: AttributeDefinitionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    definition = await service.create_attribute_definition(req.model_dump(), current_user["user_id"])
    return success_response(data=definition, message="属性定义创建成功")


@router.put("/attributes/definitions/{definition_id}", response_model=AttributeDefResp)
async def update_attribute_definition(
    definition_id: str,
    req: AttributeDefinitionUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    definition = await service.update_attribute_definition(definition_id, update_data, current_user["user_id"])
    return success_response(data=definition, message="属性定义更新成功")


@router.delete("/attributes/definitions/{definition_id}", response_model=VehicleMessageResp)
async def delete_attribute_definition(
    definition_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_attribute_definition(definition_id, current_user["user_id"])
    return success_response(message="属性定义已删除")