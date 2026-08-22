"""DevOps configuration: HOST, PORT, DATA_DIR from environment."""

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


class Settings:
    """Runtime settings read from environment variables."""

    host: str
    port: int
    data_dir: Path

    def __init__(self) -> None:
        self.host = _env_str("HOST", "0.0.0.0")
        self.port = _env_int("PORT", 8765)
        self.data_dir = Path(_env_str("DATA_DIR", "./data")).expanduser().resolve()

    def ensure_data_dir(self) -> Path:
        """Create DATA_DIR if missing; backend isolates per-user paths under it."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return self.data_dir


settings = Settings()
