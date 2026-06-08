from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.dependencies import get_current_user
from app.schemas.admin import UserListQuery, UserStatusUpdate, UserRoleUpdate
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["管理员"])


@router.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    status: int | None = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.list_users(page, page_size, search, role, status)
    return success_response(data=result["data"], meta=result["meta"])


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: UserStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_user_status(user_id, req.status, current_user["user_id"])
    return success_response(data=result, message="状态更新成功")


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    req: UserRoleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_user_role(user_id, req.role_id, current_user["user_id"])
    return success_response(data=result, message="角色更新成功")