import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.redis import redis_pool

logger = logging.getLogger("evhub.rate_limit")

RATE_LIMIT_RULES = {
    "/api/v1/auth/login": {"limit": 10, "window": 60},
    "/api/v1/auth/register": {"limit": 5, "window": 60},
    "/api/v1/media/upload": {"limit": 20, "window": 60},
    "default": {"limit": 200, "window": 60},
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        rule = RATE_LIMIT_RULES.get(path, RATE_LIMIT_RULES["default"])
        limit = rule["limit"]
        window = rule["window"]

        key = f"rate:{path}:{client_ip}"
        now = int(time.time())
        window_start = now - window

        try:
            async with redis_pool.pipeline() as pipe:
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, window)
                _, _, count, _ = await pipe.execute()

            if count > limit:
                return JSONResponse(
                    status_code=429,
                    content={"code": 429, "message": "请求过于频繁，请稍后再试", "data": None},
                )
        except Exception:
            logger.warning("Redis unavailable, skipping rate limit check")

        return await call_next(request)