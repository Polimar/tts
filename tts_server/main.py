import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from tts_server.api import api_router
from tts_server.config import settings
from tts_server.static import frontend_available, router as static_router
from tts_server.worker.qwen3_worker import get_job_queue, get_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_data_dir()
    worker = get_worker()
    worker.initialize()
    queue = get_job_queue()
    queue.start()
    logger.info("TTS service started on %s:%s", settings.host, settings.port)
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
    if frontend_available():
        app.include_router(static_router)
    return app


app = create_app()
