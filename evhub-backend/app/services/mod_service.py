import uuid
import math
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mod_build import ModBuild
from app.models.audit_log import AuditLog
from app.repositories.mod_repo import ModBuildRepo
from app.core.exceptions import NotFoundError, BadRequestError


class ModService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ModBuildRepo(db)

    # ---- Public APIs ----

    async def list_builds(
        self,
        vehicle_sku_id: uuid.UUID | None = None,
        tag: str | None = None,
        is_legal: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        builds, total = await self.repo.search(
            vehicle_sku_id=vehicle_sku_id,
            tag=tag,
            is_legal=is_legal,
            status="published",
            page=page,
            page_size=page_size,
        )
        return {
            "data": builds,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def get_build(self, slug: str) -> ModBuild:
        build = await self.repo.get_by_slug(slug)
        if not build:
            raise NotFoundError("改装方案")
        return build

    # ---- User APIs ----

    async def create_build(self, data: dict, user_id: str) -> ModBuild:
        existing = await self.repo.get_by_slug(data["slug"])
        if existing:
            raise BadRequestError("方案标识(slug)已存在")

        parts_data = data.pop("parts", [])

        data["author_id"] = uuid.UUID(user_id)
        data["status"] = "draft"

        if "is_legal" not in data:
            raise BadRequestError("必须填写是否合法改装(is_legal)")

        build = await self.repo.create(**data)

        if parts_data:
            await self.repo.save_parts(build.id, parts_data)

        await self._write_audit(uuid.UUID(user_id), "CREATE_MOD_BUILD", "mod_build", build.id)
        return build

    async def update_build(self, build_id: uuid.UUID, data: dict, user_id: str) -> ModBuild:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        if str(build.author_id) != user_id:
            raise BadRequestError("只能编辑自己的方案")
        if build.status == "published":
            raise BadRequestError("已发布的方案不可编辑")

        parts_data = data.pop("parts", None)

        if build.status == "rejected":
            data["status"] = "draft"
            data["rejected_reason"] = None

        build = await self.repo.update(build_id, **data)

        if parts_data is not None:
            await self.repo.save_parts(build_id, parts_data)

        await self._write_audit(uuid.UUID(user_id), "UPDATE_MOD_BUILD", "mod_build", build_id)
        return build

    async def delete_build(self, build_id: uuid.UUID, user_id: str) -> bool:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        if str(build.author_id) != user_id:
            raise BadRequestError("只能删除自己的方案")

        result = await self.repo.soft_delete(build_id)
        await self._write_audit(uuid.UUID(user_id), "DELETE_MOD_BUILD", "mod_build", build_id)
        return result

    async def submit_for_review(self, build_id: uuid.UUID, user_id: str) -> ModBuild:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        if str(build.author_id) != user_id:
            raise BadRequestError("只能提交自己的方案")
        if build.status != "draft":
            raise BadRequestError("只有草稿状态可以提交审核")

        build = await self.repo.update(build_id, status="pending")
        await self._write_audit(uuid.UUID(user_id), "SUBMIT_MOD_BUILD", "mod_build", build_id)
        return build

    # ---- Admin APIs ----

    async def list_pending(self, page: int = 1, page_size: int = 20) -> dict:
        builds, total = await self.repo.search(
            status="pending",
            page=page,
            page_size=page_size,
        )
        return {
            "data": builds,
            "meta": {
                "page": page, "page_size": page_size,
                "total": total, "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def list_admin(
        self, status: str | None = None, page: int = 1, page_size: int = 20,
    ) -> dict:
        builds, total = await self.repo.search(
            status=status, page=page, page_size=page_size,
        )
        return {
            "data": builds,
            "meta": {
                "page": page, "page_size": page_size,
                "total": total, "total_pages": max(1, math.ceil(total / page_size)),
            },
        }

    async def get_admin_build(self, build_id: uuid.UUID) -> ModBuild:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        return build

    async def publish(self, build_id: uuid.UUID, user_id: str) -> ModBuild:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        if build.status != "pending":
            raise BadRequestError("只有待审核状态可以发布")

        build = await self.repo.update(build_id, status="published", published_at=datetime.now(timezone.utc))
        await self._write_audit(uuid.UUID(user_id), "PUBLISH_MOD_BUILD", "mod_build", build_id)
        return build

    async def reject(self, build_id: uuid.UUID, reason: str, user_id: str) -> ModBuild:
        build = await self.repo.get_by_id(build_id)
        if not build:
            raise NotFoundError("改装方案")
        if build.status != "pending":
            raise BadRequestError("只有待审核状态可以拒绝")

        build = await self.repo.update(build_id, status="rejected", rejected_reason=reason)
        await self._write_audit(uuid.UUID(user_id), "REJECT_MOD_BUILD", "mod_build", build_id, {"reason": reason})
        return build

    # ---- Audit ----

    async def _write_audit(self, user_id: uuid.UUID, action: str, resource: str, resource_id: uuid.UUID, detail: dict | None = None):
        log = AuditLog(user_id=user_id, action=action, resource=resource, resource_id=resource_id, detail=detail)
        self.db.add(log)
        await self.db.flush()