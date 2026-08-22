from fastapi import APIRouter

from tts_server.schemas import HealthOut
from tts_server.worker.qwen3_worker import get_worker

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    """Public liveness probe — no env, secrets, or filesystem paths."""
    worker = get_worker()
    return HealthOut(
        status="ok",
        worker_ready=worker.initialized,
    )
