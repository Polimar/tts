import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from tts_server.config import _repo_root

logger = logging.getLogger(__name__)


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

    blocked_prefixes = ("api/",)
    blocked_exact = {
        "health",
        "openapi.json",
        "docs",
        "redoc",
    }

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        if full_path in blocked_exact or full_path.startswith(blocked_prefixes):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")
        candidate = dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index_path)
