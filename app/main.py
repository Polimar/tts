import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import api_router
from app.config import get_settings
from app.worker.qwen3_worker import get_job_queue, get_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.tts_data_dir.mkdir(parents=True, exist_ok=True)
    settings.users_dir.mkdir(parents=True, exist_ok=True)

    worker = get_worker()
    worker.initialize()
    queue = get_job_queue()
    queue.start()
    logger.info("TTS service started on %s:%s", settings.tts_host, settings.tts_port)

    yield

    queue.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title="TTS Service",
        description="Local Qwen3-TTS voice cloning API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(api_router)
    return app


app = create_app()
