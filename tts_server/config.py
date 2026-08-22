"""Runtime configuration from environment (DevOps + backend)."""

import os
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
        self.data_dir = Path(_env_str("DATA_DIR", "./data")).expanduser().resolve()
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
        """Create DATA_DIR if missing; per-user paths live under data/users/."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_dir.mkdir(parents=True, exist_ok=True)
        return self.data_dir


settings = Settings()
