from pydantic import BaseModel, Field

from app.core.response import BaseResponse, PageMeta, PageResponse


class UserListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = None
    role: str | None = None
    status: int | None = None


class UserStatusUpdate(BaseModel):
    status: int = Field(ge=0, le=1)


class UserRoleUpdate(BaseModel):
    role_id: str


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(None, max_length=200)


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = Field(None, max_length=200)


class RolePermissionsUpdate(BaseModel):
    permission_ids: list[str]


class AdminUserItem(BaseModel):
    id: str
    username: str
    nickname: str | None = None
    email: str
    avatar: str | None = None
    role: str = "user"
    status: int = 1
    created_at: str | None = None

    class Config:
        from_attributes = True


class RoleItem(BaseModel):
    id: str
    name: str
    code: str
    description: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class PermissionItem(BaseModel):
    id: str
    name: str
    code: str
    description: str | None = None

    class Config:
        from_attributes = True


class RoleDetail(RoleItem):
    permissions: list[PermissionItem] = []


# ---- Response Models ----

AdminUserListResp = PageResponse[AdminUserItem]
AdminUserResp = BaseResponse[AdminUserItem]
RoleListResp = BaseResponse[list[RoleItem]]
RoleResp = BaseResponse[RoleItem]
RoleDetailResp = BaseResponse[RoleDetail]
PermissionListResp = BaseResponse[list[PermissionItem]]
AdminMessageResp = BaseResponse[None]