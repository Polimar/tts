from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["system"])


@router.get("/health", include_in_schema=False)
def health() -> JSONResponse:
    """Public liveness probe — status only; no worker/model/device fields."""
    return JSONResponse(content={"status": "ok"})
