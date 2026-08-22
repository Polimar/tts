from fastapi import APIRouter

from tts_server.schemas import HealthOut

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    """Public liveness probe — status only, no internals."""
    return HealthOut(status="ok")
