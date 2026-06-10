from pydantic import BaseModel

from app.core.response import BaseResponse


class UserStatsSchema(BaseModel):
    total: int = 0
    today: int = 0


class ArticleStatsSchema(BaseModel):
    total: int = 0
    today: int = 0
    pending: int = 0


class StatsResponseData(BaseModel):
    users: UserStatsSchema
    articles: ArticleStatsSchema
    vehicles: dict
    pending_mod: int = 0
    illegal_mod: int = 0


class TrendItem(BaseModel):
    date: str
    articles: int


class AuditLogItem(BaseModel):
    id: str
    user_id: str | None = None
    action: str | None = None
    resource: str | None = None
    resource_id: str | None = None
    detail: dict | None = None
    ip_address: str | None = None
    created_at: str | None = None


DashboardStatsResp = BaseResponse[StatsResponseData]
DashboardTrendsResp = BaseResponse[list[TrendItem]]
DashboardAuditLogsResp = BaseResponse[list[AuditLogItem]]