import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, Role, Permission, UserRole, RolePermission
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    def __init__(self, db: AsyncSession):
        super().__init__(Role, db)

    async def get_by_code(self, code: str) -> Role | None:
        stmt = select(Role).where(Role.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_stats(self) -> list[dict]:
        stmt = (
            select(
                Role,
                func.count(func.distinct(UserRole.user_id)).label("user_count"),
                func.count(func.distinct(RolePermission.permission_id)).label("permission_count"),
            )
            .outerjoin(UserRole, UserRole.role_id == Role.id)
            .outerjoin(RolePermission, RolePermission.role_id == Role.id)
            .group_by(Role.id)
        )
        result = await self.db.execute(stmt)
        roles = []
        for row in result.all():
            role, user_count, perm_count = row
            roles.append({
                "id": str(role.id),
                "name": role.name,
                "code": role.code,
                "description": role.description,
                "user_count": user_count,
                "permission_count": perm_count,
            })
        return roles

    async def get_role_with_permissions(self, role_id: uuid.UUID) -> dict | None:
        stmt = (
            select(Role)
            .options(selectinload(Role.permissions).selectinload(RolePermission.permission))
            .where(Role.id == role_id)
        )
        result = await self.db.execute(stmt)
        role = result.scalar_one_or_none()
        if not role:
            return None
        return {
            "id": str(role.id),
            "name": role.name,
            "code": role.code,
            "description": role.description,
            "permissions": [
                {
                    "id": str(rp.permission.id),
                    "name": rp.permission.name,
                    "code": rp.permission.code,
                    "resource": rp.permission.resource,
                    "action": rp.permission.action,
                }
                for rp in role.permissions
            ],
        }

    async def set_permissions(self, role_id: uuid.UUID, permission_ids: list[uuid.UUID]) -> None:
        await self.db.execute(
            RolePermission.__table__.delete().where(RolePermission.role_id == role_id)
        )
        for pid in permission_ids:
            self.db.add(RolePermission(role_id=role_id, permission_id=pid))
        await self.db.flush()

    async def delete_role(self, role_id: uuid.UUID) -> bool:
        await self.db.execute(
            UserRole.__table__.delete().where(UserRole.role_id == role_id)
        )
        await self.db.execute(
            RolePermission.__table__.delete().where(RolePermission.role_id == role_id)
        )
        stmt = Role.__table__.delete().where(Role.id == role_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0


class PermissionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[dict]:
        stmt = select(Permission).order_by(Permission.resource, Permission.action)
        result = await self.db.execute(stmt)
        return [
            {
                "id": str(p.id),
                "name": p.name,
                "code": p.code,
                "resource": p.resource,
                "action": p.action,
            }
            for p in result.scalars().all()
        ]