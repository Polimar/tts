from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from tts_server.auth.cookies import SESSION_COOKIE
from tts_server.db.database import get_db
from tts_server.services.http_timeouts import run_blocking_io
from tts_server.services.security import validate_safe_segment

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    tts_session: Optional[str] = Cookie(default=None),
) -> str:
    token: Optional[str] = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif tts_session:
        token = tts_session

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    def _resolve() -> str:
        session = get_db().get_session(token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = session["user_id"]
        try:
            validate_safe_segment(user_id, "user_id")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        return user_id

    return await run_blocking_io(_resolve, "auth/session")


def verify_api_key(x_api_key: Optional[str] = None) -> None:
    from tts_server.config import settings

    if settings.allow_public_registration:
        return
    if settings.mock_worker and settings.api_key.startswith("change-me"):
        return
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-API-Key required for registration",
        )
