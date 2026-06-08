import uuid

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, DuplicateError
from app.models.audit_log import AuditLog
from app.models.user import User, Role, UserRole, Permission
from app.repositories.user_repo import UserRepository
from app.repositories.role_repo import RoleRepository, PermissionRepository


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.permission_repo = PermissionRepository(db)

    async def list_users(
        self, page: int, page_size: int, search: str | None, role: str | None, status: int | None
    ) -> dict:
        filters = []
        if search:
            filters.append(
                or_(User.username.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
            )
        if status is not None:
            filters.append(User.status == status)

        stmt = select(User)
        if hasattr(User, "deleted_at"):
            stmt = stmt.where(User.deleted_at.is_(None))
        for f in filters:
            stmt = stmt.where(f)

        total = await self.user_repo.count(filters)
        total_pages = max(1, (total + page_size - 1) // page_size)

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        users = result.scalars().all()

        user_list = []
        for user in users:
            roles = await self.user_repo.get_roles(user.id)
            user_list.append({
                "id": str(user.id),
                "username": user.username,
                "nickname": user.nickname,
                "email": user.email,
                "avatar": user.avatar,
                "status": user.status,
                "role": roles[0].code if roles else "user",
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            })

        return {
            "data": user_list,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        }

    async def update_user_status(self, user_id: str, status: int, operator_id: str) -> dict:
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("用户")

        await self.user_repo.update(user.id, status=status)
        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="UPDATE_STATUS",
            resource="user",
            resource_id=user.id,
            detail={"status": status},
        )
        return {"id": user_id, "status": status}

    async def update_user_role(self, user_id: str, role_id: str, operator_id: str) -> dict:
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("用户")

        role = await self.role_repo.get_by_id(uuid.UUID(role_id))
        if not role:
            raise NotFoundError("角色")

        await self.db.execute(
            UserRole.__table__.delete().where(UserRole.user_id == user.id)
        )
        await self.user_repo.assign_role(user.id, role.id)
        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="UPDATE_ROLE",
            resource="user",
            resource_id=user.id,
            detail={"role_id": role_id},
        )
        return {"id": user_id, "role_id": role_id}

    async def list_roles(self) -> list[dict]:
        return await self.role_repo.get_all_with_stats()

    async def get_role(self, role_id: str) -> dict:
        role = await self.role_repo.get_role_with_permissions(uuid.UUID(role_id))
        if not role:
            raise NotFoundError("角色")
        return role

    async def create_role(self, name: str, code: str, description: str | None, operator_id: str) -> dict:
        existing = await self.role_repo.get_by_code(code)
        if existing:
            raise DuplicateError("角色代码")

        role = await self.role_repo.create(name=name, code=code, description=description)
        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="CREATE_ROLE",
            resource="role",
            resource_id=role.id,
            detail={"name": name, "code": code},
        )
        return {
            "id": str(role.id),
            "name": role.name,
            "code": role.code,
            "description": role.description,
        }

    async def update_role(
        self, role_id: str, name: str | None, description: str | None, operator_id: str
    ) -> dict:
        role = await self.role_repo.get_by_id(uuid.UUID(role_id))
        if not role:
            raise NotFoundError("角色")

        update_data = {}
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description

        if update_data:
            await self.role_repo.update(role.id, **update_data)

        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="UPDATE_ROLE",
            resource="role",
            resource_id=role.id,
            detail=update_data,
        )
        return {"id": role_id, **update_data}

    async def delete_role(self, role_id: str, operator_id: str) -> None:
        deleted = await self.role_repo.delete_role(uuid.UUID(role_id))
        if not deleted:
            raise NotFoundError("角色")
        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="DELETE_ROLE",
            resource="role",
            resource_id=uuid.UUID(role_id),
        )

    async def set_role_permissions(
        self, role_id: str, permission_ids: list[str], operator_id: str
    ) -> None:
        role = await self.role_repo.get_by_id(uuid.UUID(role_id))
        if not role:
            raise NotFoundError("角色")

        pids = [uuid.UUID(pid) for pid in permission_ids]
        await self.role_repo.set_permissions(role.id, pids)
        await self._write_audit_log(
            user_id=uuid.UUID(operator_id),
            action="SET_PERMISSIONS",
            resource="role",
            resource_id=role.id,
            detail={"permission_ids": permission_ids},
        )

    async def list_permissions(self) -> list[dict]:
        return await self.permission_repo.get_all()

    async def _write_audit_log(
        self,
        user_id: uuid.UUID,
        action: str,
        resource: str,
        resource_id: uuid.UUID,
        detail: dict | None = None,
    ) -> None:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            detail=detail,
        )
        self.db.add(log)
        await self.db.flush()