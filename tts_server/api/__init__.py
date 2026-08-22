from fastapi import APIRouter

from tts_server.auth.routes import router as auth_router
from tts_server.api.voices import router as voices_router
from tts_server.api.jobs import router as jobs_router
from tts_server.api.health import router as health_router
from tts_server.api.system import router as system_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(voices_router)
api_router.include_router(jobs_router)
api_router.include_router(system_router)
