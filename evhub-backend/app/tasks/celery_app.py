from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "evhub",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    imports=("app.tasks.article_tasks",),
)

celery_app.conf.beat_schedule = {
    "sync-article-view-counts": {
        "task": "app.tasks.article_tasks.sync_article_view_counts",
        "schedule": 300.0,
    },
}