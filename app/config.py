from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    tts_host: str = Field(default="0.0.0.0", alias="TTS_HOST")
    tts_port: int = Field(default=8765, alias="TTS_PORT")
    tts_secret_key: str = Field(default="dev-secret-change-me", alias="TTS_SECRET_KEY")
    tts_token_expire_hours: int = Field(default=168, alias="TTS_TOKEN_EXPIRE_HOURS")
    tts_data_dir: Path = Field(default=Path("./data"), alias="TTS_DATA_DIR")
    tts_model_id: str = Field(
        default="Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        alias="TTS_MODEL_ID",
    )
    tts_model_local_dir: str = Field(default="", alias="TTS_MODEL_LOCAL_DIR")
    tts_max_upload_bytes: int = Field(default=20 * 1024 * 1024, alias="TTS_MAX_UPLOAD_BYTES")
    tts_max_text_chars: int = Field(default=500_000, alias="TTS_MAX_TEXT_CHARS")
    tts_chunk_max_chars: int = Field(default=400, alias="TTS_CHUNK_MAX_CHARS")
    tts_warmup_text: str = Field(
        default="Ciao, questo è un test di sintesi vocale.",
        alias="TTS_WARMUP_TEXT",
    )
    tts_mock_worker: bool = Field(default=False, alias="TTS_MOCK_WORKER")
    tts_queue_poll_seconds: float = Field(default=0.5, alias="TTS_QUEUE_POLL_SECONDS")

    @property
    def model_path(self) -> str:
        if self.tts_model_local_dir.strip():
            return self.tts_model_local_dir.strip()
        return self.tts_model_id

    @property
    def db_path(self) -> Path:
        return self.tts_data_dir / "tts.db"

    @property
    def users_dir(self) -> Path:
        return self.tts_data_dir / "users"


@lru_cache
def get_settings() -> Settings:
    return Settings()
