import redis.asyncio as aioredis
from app.config import get_settings

settings = get_settings()

redis_pool = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)


async def get_redis():
    return redis_pool