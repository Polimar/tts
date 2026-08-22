import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from tts_server.api import api_router
from tts_server.api.health import router as health_router
from tts_server.static_mount import mount_frontend
from tts_server.worker.qwen3_worker import get_job_queue, get_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from tts_server.config import settings

    settings.ensure_data_dir()
    worker = get_worker()
    queue = get_job_queue()

    async def _init_worker() -> None:
        try:
            await asyncio.to_thread(worker.initialize)
            logger.info("Worker model initialization finished")
        except Exception:
            logger.exception("Worker model initialization failed")

    init_task = asyncio.create_task(_init_worker())
    queue.start()
    logger.info(
        "TTS service listening on %s:%s (inference worker boots in background)",
        settings.host,
        settings.port,
    )
    yield
    init_task.cancel()
    try:
        await init_task
    except asyncio.CancelledError:
        pass
    queue.stop()


def create_app() -> FastAPI:
    from tts_server.config import settings

    doc_kwargs: dict[str, None] = {}
    if not settings.debug_mode:
        doc_kwargs = {
            "docs_url": None,
            "redoc_url": None,
            "openapi_url": None,
        }

    app = FastAPI(
        title="TTS Service",
        description="Local Qwen3-TTS voice cloning API",
        version="0.1.0",
        lifespan=lifespan,
        **doc_kwargs,
    )

    # API + NPM health (no /api/v1 prefix for health)
    app.include_router(health_router)
    app.include_router(api_router, prefix="/api/v1")

    # SPA last: same-origin UI at /
    mount_frontend(app)

    return app


app = create_app()
