from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.schemas import DeviceInfoOut, HealthOut
from app.worker.qwen3_worker import get_worker

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    worker = get_worker()
    info = worker.info
    return HealthOut(
        status="ok",
        worker_initialized=worker.initialized,
        device=info.device if info else None,
        model_id=info.model_id if info else get_settings().model_path,
        xpu_gate_passed=info.xpu_gate_passed if info else None,
    )


@router.get("/system/device", response_model=DeviceInfoOut)
def device_info() -> DeviceInfoOut:
    worker = get_worker()
    info = worker.info
    if not info:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Worker not initialized")
    return DeviceInfoOut(
        device=info.device,
        model_id=info.model_id,
        xpu_gate_passed=info.xpu_gate_passed,
        xpu_memory_bytes=info.xpu_memory_bytes,
        cpu_warmup_seconds=info.cpu_warmup_seconds,
        xpu_warmup_seconds=info.xpu_warmup_seconds,
    )
