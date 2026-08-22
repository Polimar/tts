from fastapi import APIRouter, Depends

from tts_server.auth.dependencies import get_current_user_id
from tts_server.schemas import ReadyOut
from tts_server.services.http_timeouts import run_blocking_io
from tts_server.worker.qwen3_worker import get_worker

router = APIRouter(tags=["system"])


@router.get("/ready", response_model=ReadyOut)
async def readiness(_user_id: str = Depends(get_current_user_id)) -> ReadyOut:
    def _status() -> ReadyOut:
        worker = get_worker()
        return ReadyOut(status=worker.boot_status())

    return await run_blocking_io(_status, "GET /ready")
