from pydantic import BaseModel, Field

from app.core.response import BaseResponse, PageMeta, PageResponse
from app.schemas.base import ORMSchema


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=100)
    password: str = Field(min_length=8, max_length=100)


class LoginRequest(BaseModel):
    login: str = Field(description="用户名或邮箱")
    password: str


class TokenResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str = "user"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponseData(ORMSchema):
    id: str
    username: str
    nickname: str | None = None
    email: str
    avatar: str | None = None
    role: str = "user"
    status: int = 1


class UserUpdateRequest(BaseModel):
    nickname: str | None = Field(None, max_length=100)
    avatar: str | None = Field(None, max_length=500)


# ---- Response Models ----

TokenResp = BaseResponse[TokenResponseData]
UserResp = BaseResponse[UserResponseData]
MessageResp = BaseResponse[None]