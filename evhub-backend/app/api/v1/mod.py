import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.core.response import success_response
from app.schemas.mod import (
    ModBuildCreate, ModBuildUpdate,
    ModBuildListResp, ModBuildDetailResp, ModMessageResp,
)
from app.services.mod_service import ModService

router = APIRouter(prefix="/mod/builds", tags=["改装方案"])


@router.get("", response_model=ModBuildListResp)
async def list_builds(
    vehicle_sku_id: uuid.UUID | None = Query(None),
    tag: str | None = Query(None),
    is_legal: bool | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    result = await service.list_builds(
        vehicle_sku_id=vehicle_sku_id, tag=tag, is_legal=is_legal,
        page=page, page_size=page_size,
    )
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/{slug}", response_model=ModBuildDetailResp)
async def get_build(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.get_build(slug)
    return success_response(data=build)


@router.post("", response_model=ModBuildDetailResp)
async def create_build(
    req: ModBuildCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.create_build(req.model_dump(), current_user["user_id"])
    return success_response(data=build, message="改装方案创建成功")


@router.put("/{build_id}", response_model=ModBuildDetailResp)
async def update_build(
    build_id: uuid.UUID,
    req: ModBuildUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.update_build(build_id, req.model_dump(exclude_none=True), current_user["user_id"])
    return success_response(data=build, message="方案更新成功")


@router.delete("/{build_id}", response_model=ModMessageResp)
async def delete_build(
    build_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    await service.delete_build(build_id, current_user["user_id"])
    return success_response(message="方案已删除")


@router.post("/{build_id}/submit", response_model=ModBuildDetailResp)
async def submit_build(
    build_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.submit_for_review(build_id, current_user["user_id"])
    return success_response(data=build, message="已提交审核")