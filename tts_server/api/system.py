from fastapi import APIRouter, Depends, HTTPException, status

from tts_server.auth.dependencies import get_current_user_id
from tts_server.config import settings
from tts_server.schemas import DeviceInfoOut, HealthOut
from tts_server.worker.qwen3_worker import get_worker

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    worker = get_worker()
    info = worker.info
    return HealthOut(
        status="ok",
        worker_initialized=worker.initialized,
        device=info.device if info else None,
        model_id=info.model_id if info else settings.model_path,
        xpu_gate_passed=info.xpu_gate_passed if info else None,
        xpu_gate_reason=info.xpu_gate_reason if info else None,
    )


@router.get("/system/device", response_model=DeviceInfoOut)
def device_info(_user_id: str = Depends(get_current_user_id)) -> DeviceInfoOut:
    worker = get_worker()
    info = worker.info
    if not info:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Worker not initialized")
    return DeviceInfoOut(
        device=info.device,
        model_id=info.model_id,
        xpu_gate_passed=info.xpu_gate_passed,
        xpu_gate_reason=info.xpu_gate_reason,
        xpu_memory_bytes=info.xpu_memory_bytes,
        cpu_warmup_seconds=info.cpu_warmup_seconds,
        xpu_warmup_seconds=info.xpu_warmup_seconds,
    )
