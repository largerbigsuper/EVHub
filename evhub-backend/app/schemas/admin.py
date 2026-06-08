from pydantic import BaseModel, Field


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