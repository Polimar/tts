from fastapi import APIRouter, Depends

from tts_server.auth.dependencies import get_current_user_id
from tts_server.schemas import DeviceInfoOut
from tts_server.worker.qwen3_worker import get_worker

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/device", response_model=DeviceInfoOut)
def device_info(_user_id: str = Depends(get_current_user_id)) -> DeviceInfoOut:
    worker = get_worker()
    if not worker.initialized:
        return DeviceInfoOut(device="cpu", status="initializing")
    info = worker.info
    if not info:
        return DeviceInfoOut(device="cpu", status="initializing")
    return DeviceInfoOut(device=info.device, status="ready")
