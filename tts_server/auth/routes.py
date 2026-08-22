from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from tts_server.auth.dependencies import bearer_scheme, get_current_user_id, verify_api_key
from tts_server.config import settings
from tts_server.db.database import get_db
from tts_server.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from tts_server.services.rate_limit import SlidingWindowRateLimiter
from tts_server.services.security import hash_password, new_id, new_token, token_expiry, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_login_limiter = SlidingWindowRateLimiter(
    max_events=settings.login_rate_limit_per_minute,
    window_seconds=60.0,
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> AuthResponse:
    verify_api_key(x_api_key)
    db = get_db()
    if db.get_user_by_username(body.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user_id = new_id()
    user = db.create_user(user_id, body.username, hash_password(body.password))
    token = new_token()
    expires = token_expiry()
    db.create_session(token, user_id, expires)

    return AuthResponse(
        token=token,
        expires_at=expires.isoformat(),
        user=UserOut(id=user["id"], username=user["username"], created_at=user["created_at"]),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, request: Request) -> AuthResponse:
    if not _login_limiter.allow(_client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts; try again later",
        )

    db = get_db()
    user = db.get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = new_token()
    expires = token_expiry()
    db.create_session(token, user["id"], expires)

    return AuthResponse(
        token=token,
        expires_at=expires.isoformat(),
        user=UserOut(id=user["id"], username=user["username"], created_at=user["created_at"]),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials=Depends(bearer_scheme),
    user_id: str = Depends(get_current_user_id),
) -> None:
    if credentials and credentials.credentials:
        get_db().delete_session(credentials.credentials)


@router.get("/me", response_model=UserOut)
def me(user_id: str = Depends(get_current_user_id)) -> UserOut:
    user = get_db().get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(id=user["id"], username=user["username"], created_at=user["created_at"])
