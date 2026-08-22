"""Serve la build Vite del frontend come SPA sulla stessa origine dell'API."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

_REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

router = APIRouter(include_in_schema=False)


def frontend_available() -> bool:
    return (FRONTEND_DIST / "index.html").is_file()


@router.get("/")
def serve_index() -> FileResponse:
    index = FRONTEND_DIST / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="Frontend non compilato. Esegui: cd frontend && npm run build")
    return FileResponse(index, media_type="text/html")


@router.get("/{asset_path:path}")
def serve_spa_asset(asset_path: str) -> FileResponse:
    if asset_path.startswith(("auth", "voices", "jobs", "health", "system", "docs", "openapi.json", "redoc")):
        raise HTTPException(status_code=404)

    if not asset_path or asset_path == "index.html":
        index = FRONTEND_DIST / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=404, detail="Frontend non compilato")
        return FileResponse(index, media_type="text/html")

    candidate = (FRONTEND_DIST / asset_path).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")

    if candidate.is_file():
        return FileResponse(candidate)

    index = FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index, media_type="text/html")
    raise HTTPException(status_code=404, detail="Frontend non compilato")
