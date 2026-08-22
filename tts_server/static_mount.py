import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from tts_server.config import _repo_root

logger = logging.getLogger(__name__)

# Root segments reserved for API — SPA must never serve HTML for these paths.
_RESERVED_API_SEGMENTS = frozenset({"api", "auth", "voices", "jobs", "system"})
_RESERVED_EXACT_PATHS = frozenset(
    {
        "health",
        "openapi.json",
        "docs",
        "redoc",
    }
)


def is_reserved_api_path(full_path: str) -> bool:
    """True if path belongs to API surface, not the SPA."""
    if not full_path:
        return False
    if full_path in _RESERVED_EXACT_PATHS:
        return True
    if full_path.startswith("api/"):
        return True
    first_segment = full_path.split("/", 1)[0]
    return first_segment in _RESERVED_API_SEGMENTS


def frontend_dist_dir() -> Path:
    return _repo_root() / "frontend" / "dist"


def mount_frontend(app: FastAPI) -> None:
    """Serve built Vite SPA at / (same origin as API). API routes must be registered first."""
    dist = frontend_dist_dir()
    if not dist.is_dir():
        logger.warning(
            "Frontend build missing at %s — run: cd frontend && npm ci && npm run build",
            dist,
        )
        return

    index_path = dist / "index.html"
    assets_dir = dist / "assets"

    logger.info("Serving frontend SPA from %s at GET /", dist)

    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    for name in ("favicon.svg", "icons.svg"):
        icon = dist / name
        if icon.is_file():

            def _serve_icon(icon_path: Path = icon) -> FileResponse:
                return FileResponse(icon_path)

            app.add_api_route(
                f"/{name}",
                _serve_icon,
                methods=["GET"],
                include_in_schema=False,
            )

    @app.get("/", include_in_schema=False)
    async def spa_index() -> FileResponse:
        return FileResponse(index_path)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        if is_reserved_api_path(full_path):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index_path)
