from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.core.database import engine
from app.core.redis import redis_pool
from sqlalchemy import text

from app.core.response import success_response, error_response
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
import app.models

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()
    await redis_pool.close()


app = FastAPI(
    title="EVHub API",
    description="两轮电动车专业内容与数据平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    health = {"db": "ok", "redis": "ok"}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        health["db"] = "error"

    try:
        await redis_pool.ping()
    except Exception:
        health["redis"] = "error"

    return success_response(data=health)


@app.get("/health/ready")
async def readiness_check():
    return success_response(data={"status": "ready"})