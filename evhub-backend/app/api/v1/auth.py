from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.response import success_response
from app.dependencies import get_current_user
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    UserUpdateRequest,
    TokenResp,
    UserResp,
    MessageResp,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])


def _set_auth_cookies(response: JSONResponse, access_token: str, role: str = "user"):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        secure=False,
        samesite="lax",
        path="/",
        max_age=7 * 86400,
    )
    response.set_cookie(
        key="user_role",
        value=role,
        httponly=False,
        secure=False,
        samesite="lax",
        path="/",
        max_age=7 * 86400,
    )


@router.post("/register", response_model=TokenResp)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register(
        username=req.username,
        email=req.email,
        password=req.password,
    )
    return success_response(data=user, message="注册成功")


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    tokens = await service.login(login=req.login, password=req.password)
    resp = JSONResponse(
        content={"code": 200, "message": "登录成功", "data": tokens},
    )
    _set_auth_cookies(resp, tokens["access_token"], tokens.get("role", "user"))
    return resp


@router.post("/refresh", response_model=TokenResp)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    tokens = await service.refresh(refresh_token=req.refresh_token)
    return success_response(data=tokens, message="Token 刷新成功")


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.logout(user_id=current_user["user_id"])
    resp = JSONResponse(
        content={"code": 200, "message": "已退出登录", "data": None},
    )
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("user_role", path="/")
    return resp


@router.get("/me", response_model=UserResp)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.get_current_user(user_id=current_user["user_id"])
    return success_response(data=user)


@router.put("/me", response_model=UserResp)
async def update_me(
    req: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.update_profile(
        user_id=current_user["user_id"],
        nickname=req.nickname,
        avatar=req.avatar,
    )
    return success_response(data=user, message="更新成功")