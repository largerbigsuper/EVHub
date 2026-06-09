from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.dependencies import get_current_user
from app.schemas.admin import (
    RoleCreate,
    RoleUpdate,
    RolePermissionsUpdate,
    RoleListResp,
    RoleResp,
    RoleDetailResp,
    PermissionListResp,
    AdminMessageResp,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["管理员"])


@router.get("/roles", response_model=RoleListResp)
async def list_roles(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    roles = await service.list_roles()
    return success_response(data=roles)


@router.get("/roles/{role_id}", response_model=RoleDetailResp)
async def get_role(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    role = await service.get_role(role_id)
    return success_response(data=role)


@router.post("/roles", response_model=RoleResp)
async def create_role(
    req: RoleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    role = await service.create_role(
        req.name, req.code, req.description, current_user["user_id"]
    )
    return success_response(data=role, message="角色创建成功")


@router.put("/roles/{role_id}", response_model=RoleResp)
async def update_role(
    role_id: str,
    req: RoleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    role = await service.update_role(
        role_id, req.name, req.description, current_user["user_id"]
    )
    return success_response(data=role, message="角色更新成功")


@router.delete("/roles/{role_id}", response_model=AdminMessageResp)
async def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    await service.delete_role(role_id, current_user["user_id"])
    return success_response(message="角色已删除")


@router.put("/roles/{role_id}/permissions", response_model=AdminMessageResp)
async def set_role_permissions(
    role_id: str,
    req: RolePermissionsUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    await service.set_role_permissions(role_id, req.permission_ids, current_user["user_id"])
    return success_response(message="权限设置成功")


@router.get("/permissions", response_model=PermissionListResp)
async def list_permissions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    permissions = await service.list_permissions()
    return success_response(data=permissions)