from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.schemas.dashboard import DashboardStatsResp, DashboardTrendsResp, DashboardAuditLogsResp
from app.services.dashboard_service import get_admin_stats, get_content_trends, get_audit_logs

router = APIRouter(prefix="/admin", tags=["管理后台"])


@router.get("/stats", response_model=DashboardStatsResp)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    stats = await get_admin_stats(db)
    return success_response(data=stats)


@router.get("/trends", response_model=DashboardTrendsResp)
async def dashboard_trends(
    db: AsyncSession = Depends(get_db),
):
    trends = await get_content_trends(db)
    return success_response(data=trends)


@router.get("/audit-logs", response_model=DashboardAuditLogsResp)
async def dashboard_audit_logs(
    db: AsyncSession = Depends(get_db),
):
    logs = await get_audit_logs(db)
    return success_response(data=logs)