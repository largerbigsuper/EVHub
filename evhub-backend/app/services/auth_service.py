import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.redis import redis_pool
from app.core.exceptions import DuplicateError, UnauthorizedError, NotFoundError
from app.models.audit_log import AuditLog
from app.repositories.user_repo import UserRepository

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, username: str, email: str, password: str) -> dict:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise DuplicateError("邮箱")

        existing = await self.user_repo.get_by_username(username)
        if existing:
            raise DuplicateError("用户名")

        password_hash = hash_password(password)
        user = await self.user_repo.create(
            username=username,
            email=email,
            password_hash=password_hash,
        )

        await self._write_audit_log(
            user_id=user.id,
            action="REGISTER",
            resource="user",
            resource_id=user.id,
        )

        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": "user",
            "status": user.status,
        }

    async def login(self, login: str, password: str) -> dict:
        user = await self.user_repo.get_by_email_or_username(login)
        if not user:
            raise UnauthorizedError()

        if user.status != 1:
            raise UnauthorizedError()

        if not verify_password(password, user.password_hash):
            raise UnauthorizedError()

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        role = await self._get_user_role(user.id)
        user_id_str = str(user.id)

        access_token = create_access_token(user_id_str, role)
        refresh_token = create_refresh_token(user_id_str)

        refresh_key = f"auth:refresh:{user_id_str}"
        await redis_pool.setex(
            refresh_key,
            settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            refresh_token,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": role,
        }

    async def refresh(self, refresh_token: str) -> dict:
        keys = await redis_pool.keys("auth:refresh:*")
        user_id = None
        for key in keys:
            stored = await redis_pool.get(key)
            if stored == refresh_token:
                user_id = key.split(":")[-1]
                break

        if not user_id:
            raise UnauthorizedError()

        await redis_pool.delete(f"auth:refresh:{user_id}")

        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user or user.status != 1:
            raise UnauthorizedError()

        role = await self._get_user_role(user.id)

        new_access_token = create_access_token(user_id, role)
        new_refresh_token = create_refresh_token(user_id)

        refresh_key = f"auth:refresh:{user_id}"
        await redis_pool.setex(
            refresh_key,
            settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            new_refresh_token,
        )

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }

    async def logout(self, user_id: str) -> None:
        await redis_pool.delete(f"auth:refresh:{user_id}")

    async def get_current_user(self, user_id: str) -> dict:
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("用户")

        role = await self._get_user_role(user.id)

        return {
            "id": str(user.id),
            "username": user.username,
            "nickname": user.nickname,
            "email": user.email,
            "avatar": user.avatar,
            "role": role,
            "status": user.status,
        }

    async def update_profile(self, user_id: str, nickname: str | None, avatar: str | None) -> dict:
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("用户")

        update_data = {}
        if nickname is not None:
            update_data["nickname"] = nickname
        if avatar is not None:
            update_data["avatar"] = avatar

        if update_data:
            await self.user_repo.update(user.id, **update_data)

        return await self.get_current_user(user_id)

    async def _get_user_role(self, user_id: uuid.UUID) -> str:
        roles = await self.user_repo.get_roles(user_id)
        if roles:
            return roles[0].code
        return "user"

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