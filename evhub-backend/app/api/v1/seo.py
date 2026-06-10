import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.services.seo_service import get_jsonld_schema

router = APIRouter(prefix="/seo", tags=["SEO"])


@router.get("/schema/{type}/{id}")
async def get_schema(
    type: str,
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    schema = await get_jsonld_schema(db, type, id)
    if schema is None:
        return success_response(data=None, message="资源不存在或未发布")
    return success_response(data=schema)