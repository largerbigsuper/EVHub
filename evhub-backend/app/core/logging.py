import logging
import os
from logging.handlers import RotatingFileHandler

from app.config import get_settings


def setup_logging() -> None:
    settings = get_settings()

    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
    os.makedirs(log_dir, exist_ok=True)

    log_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(log_format)
    file_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_format)
    console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.WARNING)

    logging.basicConfig(
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
        handlers=[file_handler, console_handler],
    )

    for noisy in ("aiosqlite", "asyncio", "urllib3", "watchfiles"):
        logging.getLogger(noisy).setLevel(logging.WARNING)