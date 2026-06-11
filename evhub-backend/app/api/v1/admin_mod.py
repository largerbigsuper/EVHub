import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.core.response import success_response
from app.schemas.mod import (
    ModRejectRequest,
    AdminModBuildListResp, AdminModBuildDetailResp, ModMessageResp,
)
from app.services.mod_service import ModService

router = APIRouter(prefix="/admin/mod", tags=["改装方案管理"])


@router.get("/builds", response_model=AdminModBuildListResp)
async def list_mod_builds(
    status: str | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    result = await service.list_admin(status=status, keyword=keyword, page=page, page_size=page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/pending", response_model=AdminModBuildListResp)
async def list_pending_builds(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    result = await service.list_pending(page=page, page_size=page_size)
    return success_response(data=result["data"], meta=result["meta"])


@router.get("/builds/{build_id}", response_model=AdminModBuildDetailResp)
async def get_mod_build(
    build_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.get_admin_build(build_id)
    return success_response(data=build)


@router.post("/builds/{build_id}/publish", response_model=AdminModBuildDetailResp)
async def publish_mod_build(
    build_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.publish(build_id, current_user["user_id"])
    return success_response(data=build, message="方案已发布")


@router.post("/builds/{build_id}/reject", response_model=AdminModBuildDetailResp)
async def reject_mod_build(
    build_id: uuid.UUID,
    req: ModRejectRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    build = await service.reject(build_id, req.reason, current_user["user_id"])
    return success_response(data=build, message="方案已拒绝")


@router.delete("/builds/{build_id}", response_model=ModMessageResp)
async def delete_mod_build(
    build_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    service = ModService(db)
    await service.repo.soft_delete(build_id)
    return success_response(message="方案已删除")