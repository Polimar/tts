import re
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from passlib.context import CryptContext

from app.config import get_settings
from app.db.database import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAFE_SEGMENT = re.compile(r"^[a-zA-Z0-9_-]+$")
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def new_id() -> str:
    return uuid.uuid4().hex


def token_expiry() -> datetime:
    settings = get_settings()
    return utcnow() + timedelta(hours=settings.tts_token_expire_hours)


def sanitize_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return cleaned[:128] or "upload.wav"


def validate_safe_segment(value: str, field_name: str) -> str:
    if not value or not SAFE_SEGMENT.match(value):
        raise ValueError(f"Invalid {field_name}")
    return value


def user_root(users_dir: Path, user_id: str) -> Path:
    validate_safe_segment(user_id, "user_id")
    return users_dir / user_id


def voice_audio_path(users_dir: Path, user_id: str, voice_id: str, filename: str) -> Path:
    validate_safe_segment(user_id, "user_id")
    validate_safe_segment(voice_id, "voice_id")
    safe_name = sanitize_filename(filename)
    return user_root(users_dir, user_id) / "voices" / voice_id / safe_name


def job_export_path(users_dir: Path, user_id: str, job_id: str, ext: str) -> Path:
    validate_safe_segment(user_id, "user_id")
    validate_safe_segment(job_id, "job_id")
    if ext not in {".wav", ".mp3"}:
        raise ValueError("Invalid export extension")
    return user_root(users_dir, user_id) / "exports" / job_id / f"output{ext}"


def resolve_under(base: Path, rel_path: str) -> Path:
    candidate = (base / rel_path).resolve()
    base_resolved = base.resolve()
    if not str(candidate).startswith(str(base_resolved)):
        raise ValueError("Path traversal detected")
    return candidate


def rel_to_users_dir(users_dir: Path, path: Path) -> str:
    users_resolved = users_dir.resolve()
    path_resolved = path.resolve()
    if not str(path_resolved).startswith(str(users_resolved)):
        raise ValueError("Path outside user data directory")
    return str(path_resolved.relative_to(users_resolved))
