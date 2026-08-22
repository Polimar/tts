from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import bearer_scheme, get_current_user_id
from app.db.database import get_db
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.services.security import hash_password, new_id, new_token, token_expiry, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest) -> AuthResponse:
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
def login(body: LoginRequest) -> AuthResponse:
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
