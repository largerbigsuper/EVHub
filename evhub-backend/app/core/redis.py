import redis.asyncio as aioredis
from app.config import get_settings

settings = get_settings()

if settings.USE_MEMORY_REDIS:
    import fakeredis.aioredis

    redis_pool = fakeredis.aioredis.FakeRedis(decode_responses=True)
else:
    redis_pool = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def get_redis():
    return redis_pool