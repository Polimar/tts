from fastapi import APIRouter, Depends

from tts_server.auth.dependencies import get_current_user_id
from tts_server.schemas import DeviceInfoOut
from tts_server.services.http_timeouts import run_blocking_io
from tts_server.worker.qwen3_worker import get_worker

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/device", response_model=DeviceInfoOut)
async def device_info(_user_id: str = Depends(get_current_user_id)) -> DeviceInfoOut:
    def _info() -> DeviceInfoOut:
        worker = get_worker()
        if not worker.initialized:
            return DeviceInfoOut(device="cpu", status="initializing")
        info = worker.info
        if not info:
            return DeviceInfoOut(device="cpu", status="initializing")
        return DeviceInfoOut(device=info.device, status="ready")

    return await run_blocking_io(_info, "GET /system/device")
