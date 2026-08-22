import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from tts_server.api import api_router
from tts_server.api.health import router as health_router
from tts_server.config import settings
from tts_server.static_mount import mount_frontend
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

    # API + NPM health (no /api/v1 prefix for health)
    app.include_router(health_router)
    app.include_router(api_router, prefix="/api/v1")

    # SPA last: same-origin UI at /
    mount_frontend(app)

    return app


app = create_app()
