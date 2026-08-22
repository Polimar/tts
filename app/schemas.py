from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    username: str
    created_at: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    expires_at: str
    user: UserOut


class VoiceOut(BaseModel):
    id: str
    name: str
    ref_text: str
    language: str
    created_at: str


class JobCreateRequest(BaseModel):
    voice_id: str
    text: str = Field(min_length=1)
    language: str = "Italian"


JobStatus = Literal["queued", "running", "completed", "failed"]


class JobOut(BaseModel):
    id: str
    voice_id: str
    status: JobStatus
    language: str
    text: str
    chunk_count: int
    error: Optional[str] = None
    wav_available: bool
    mp3_available: bool
    device_used: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class HealthOut(BaseModel):
    status: str
    worker_initialized: bool
    device: Optional[str] = None
    model_id: Optional[str] = None
    xpu_gate_passed: Optional[bool] = None


class DeviceInfoOut(BaseModel):
    device: str
    model_id: str
    xpu_gate_passed: bool
    xpu_memory_bytes: int
    cpu_warmup_seconds: float
    xpu_warmup_seconds: Optional[float] = None
