"""Runtime configuration from environment (DevOps + backend)."""

import os
import stat
from pathlib import Path


def _env_str(key: str, default: str) -> str:
    value = os.getenv(key, default).strip()
    return value if value else default


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    return int(raw.strip())


def _env_float(key: str, default: float) -> float:
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    return float(raw.strip())


def _env_bool(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _default_data_dir() -> Path:
    """Prefer a data root outside the repository tree."""
    if os.name == "nt":
        local_app = os.environ.get("LOCALAPPDATA")
        if local_app:
            return Path(local_app) / "Polimar" / "tts"
        return Path.home() / "AppData" / "Local" / "Polimar" / "tts"
    xdg_data = os.environ.get("XDG_DATA_HOME")
    if xdg_data:
        return Path(xdg_data) / "polimar-tts"
    return Path.home() / ".local" / "share" / "polimar-tts"


def _resolve_data_dir(raw: str | None) -> Path:
    if raw is None or not raw.strip():
        return _default_data_dir().expanduser().resolve()
    path = Path(raw.strip()).expanduser()
    if not path.is_absolute():
        path = (_repo_root() / path).resolve()
    else:
        path = path.resolve()
    return path


def _secure_chmod_dir(path: Path) -> None:
    """Restrict directory permissions (owner-only); avoid world-writable paths."""
    try:
        if os.name == "nt":
            os.chmod(path, stat.S_IREAD | stat.S_IWRITE | stat.S_IEXEC)
        else:
            os.chmod(path, 0o700)
    except OSError:
        pass


def secure_mkdir(path: Path) -> None:
    """Create directory with owner-only permissions."""
    path.mkdir(parents=True, exist_ok=True)
    _secure_chmod_dir(path)


class Settings:
    """Runtime settings read from environment variables."""

    host: str
    port: int
    data_dir: Path
    jwt_secret: str
    api_key: str
    max_upload_bytes: int
    model_id: str
    tts_device: str
    gpu_queue_workers: int
    token_expire_hours: int
    max_text_chars: int
    chunk_max_chars: int
    warmup_text: str
    mock_worker: bool
    queue_poll_seconds: float
    login_rate_limit_per_minute: int

    def __init__(self) -> None:
        self.host = _env_str("HOST", "0.0.0.0")
        self.port = _env_int("PORT", 8765)
        self.data_dir = _resolve_data_dir(os.getenv("DATA_DIR"))
        self.jwt_secret = _env_str("JWT_SECRET", "change-me-generate-a-random-secret")
        self.api_key = _env_str("API_KEY", "change-me-optional-static-api-key")
        self.max_upload_bytes = _env_int("MAX_UPLOAD_BYTES", 20 * 1024 * 1024)
        self.model_id = _env_str("MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-Base")
        self.tts_device = _env_str("TTS_DEVICE", "cpu").lower()
        self.gpu_queue_workers = _env_int("GPU_QUEUE_WORKERS", 1)
        self.token_expire_hours = _env_int("TOKEN_EXPIRE_HOURS", 168)
        self.max_text_chars = _env_int("MAX_TEXT_CHARS", 500000)
        self.chunk_max_chars = _env_int("CHUNK_MAX_CHARS", 400)
        self.warmup_text = _env_str(
            "WARMUP_TEXT",
            "Ciao, questo è un test di sintesi vocale.",
        )
        self.mock_worker = _env_bool("MOCK_WORKER", False)
        self.queue_poll_seconds = _env_float("QUEUE_POLL_SECONDS", 0.5)
        self.login_rate_limit_per_minute = _env_int("LOGIN_RATE_LIMIT_PER_MINUTE", 10)

    @property
    def users_dir(self) -> Path:
        return self.data_dir / "users"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "tts.db"

    @property
    def model_path(self) -> str:
        return self.model_id

    def ensure_data_dir(self) -> Path:
        """Create DATA_DIR (owner-only) if missing; user files under users/<user_id>/."""
        secure_mkdir(self.data_dir)
        secure_mkdir(self.users_dir)
        return self.data_dir


settings = Settings()
