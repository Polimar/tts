from fastapi import APIRouter

from app.auth.routes import router as auth_router
from app.api.voices import router as voices_router
from app.api.jobs import router as jobs_router
from app.api.system import router as system_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(voices_router)
api_router.include_router(jobs_router)
api_router.include_router(system_router)
