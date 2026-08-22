import io
import os
import time
import wave
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ["MOCK_WORKER"] = "1"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["API_KEY"] = "test-api-key"
os.environ["QUEUE_POLL_SECONDS"] = "0.1"

from tts_server.main import create_app

API = "/api/v1"


def _make_wav_bytes(duration: float = 0.5, sample_rate: int = 24000) -> bytes:
    n = int(duration * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * n)
    return buf.getvalue()


@pytest.fixture()
def client(tmp_path: Path):
    os.environ["DATA_DIR"] = str(tmp_path / "data")
    from tts_server import config as config_module
    from tts_server.db import database as db_module
    from tts_server.worker import qwen3_worker as worker_module

    config_module.settings = config_module.Settings()
    db_module._db = None
    db_module._db_bound_path = None
    worker_module._worker = None
    worker_module._queue = None

    from tts_server.auth import routes as auth_routes
    from tts_server.services.rate_limit import SlidingWindowRateLimiter

    auth_routes._auth_limiter = SlidingWindowRateLimiter(
        max_events=config_module.settings.login_rate_limit_per_minute,
        window_seconds=60.0,
    )

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, username: str = "alice") -> str:
    resp = client.post(
        f"{API}/auth/register",
        headers={"X-API-Key": os.environ["API_KEY"]},
        json={"username": username, "password": "password123"},
    )
    assert resp.status_code == 201
    return resp.json()["token"]


def test_health_public(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"status": "ok"}
    assert set(body.keys()) == {"status"}


def test_static_index(client: TestClient):
    resp = client.get("/")
    if resp.status_code == 200:
        assert "html" in resp.text.lower()


def test_system_device_requires_auth(client: TestClient):
    resp = client.get(f"{API}/system/device")
    assert resp.status_code == 401


def test_system_device_minimal(client: TestClient):
    token = _register(client, "deviceuser")
    resp = client.get(
        f"{API}/system/device",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"device", "status"}
    assert body["device"] in {"cpu", "xpu"}
    assert body["status"] in {"ready", "initializing"}


def test_register_requires_api_key(client: TestClient):
    resp = client.post(
        f"{API}/auth/register",
        json={"username": "nokey", "password": "password123"},
    )
    assert resp.status_code == 401


def test_auth_isolation_and_job_flow(client: TestClient):
    token_a = _register(client, "alice")
    token_b = _register(client, "bob")

    wav = _make_wav_bytes()
    voice_resp = client.post(
        f"{API}/voices",
        headers={"Authorization": f"Bearer {token_a}"},
        data={
            "name": "Mia voce",
            "ref_text": "Ciao mondo",
            "language": "Italian",
        },
        files={"audio": ("ref.wav", wav, "audio/wav")},
    )
    assert voice_resp.status_code == 201
    voice_id = voice_resp.json()["id"]

    other_voice = client.get(
        f"{API}/voices/{voice_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert other_voice.status_code == 404

    job_resp = client.post(
        f"{API}/jobs",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "voice_id": voice_id,
            "text": "Prima frase. Seconda frase molto lunga per testare il chunking automatico del testo.",
            "language": "Italian",
        },
    )
    assert job_resp.status_code == 201
    job_id = job_resp.json()["id"]
    assert job_resp.json()["status"] == "queued"

    other_job = client.get(
        f"{API}/jobs/{job_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert other_job.status_code == 404

    deadline = time.time() + 15
    status = "queued"
    while time.time() < deadline:
        poll = client.get(
            f"{API}/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        status = poll.json()["status"]
        if status in {"completed", "failed"}:
            break
        time.sleep(0.2)

    assert status == "completed"
    final = client.get(
        f"{API}/jobs/{job_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    ).json()
    assert final["wav_available"] is True
    assert final["chunk_count"] >= 1

    wav_download = client.get(
        f"{API}/jobs/{job_id}/download/wav",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert wav_download.status_code == 200
    assert len(wav_download.content) > 0


def test_login_rate_limit(client: TestClient):
    for _ in range(12):
        client.post(
            f"{API}/auth/login",
            json={"username": "nobody", "password": "wrong"},
        )
    blocked = client.post(
        f"{API}/auth/login",
        json={"username": "nobody", "password": "wrong"},
    )
    assert blocked.status_code == 429


def test_register_rate_limit(client: TestClient):
    for i in range(12):
        client.post(
            f"{API}/auth/register",
            headers={"X-API-Key": os.environ["API_KEY"]},
            json={"username": f"user{i}", "password": "password123"},
        )
    blocked = client.post(
        f"{API}/auth/register",
        headers={"X-API-Key": os.environ["API_KEY"]},
        json={"username": "user_blocked", "password": "password123"},
    )
    assert blocked.status_code == 429


def test_upload_rejects_non_audio_content(client: TestClient):
    token = _register(client, "uploaduser")
    resp = client.post(
        f"{API}/voices",
        headers={"Authorization": f"Bearer {token}"},
        data={"name": "bad", "ref_text": "test", "language": "Italian"},
        files={"audio": ("fake.wav", b"not-audio-content", "audio/wav")},
    )
    assert resp.status_code == 400


def test_chunking_service():
    from tts_server.services.chunking import chunk_text

    text = "A. " + "B. " * 50
    chunks = chunk_text(text, max_chars=40)
    assert len(chunks) > 1
    assert all(len(c) <= 40 for c in chunks)


def test_default_data_dir_outside_repo():
    from tts_server import config as config_module

    old = os.environ.pop("DATA_DIR", None)
    try:
        cfg = config_module.Settings()
        repo = config_module._repo_root().resolve()
        assert not str(cfg.data_dir).startswith(str(repo))
    finally:
        if old is not None:
            os.environ["DATA_DIR"] = old


def test_resolve_rejects_traversal():
    from tts_server.services.security import resolve_under

    base = Path("/tmp/tts-safe-base").resolve()
    base.mkdir(parents=True, exist_ok=True)
    try:
        with pytest.raises(ValueError):
            resolve_under(base, "../outside")
    finally:
        base.rmdir()


def test_audio_magic_validation():
    from tts_server.services.audio_validate import detect_audio_format, validate_audio_upload

    wav = _make_wav_bytes(0.1)
    assert detect_audio_format(wav[:16]) == "wav"
    validate_audio_upload(wav[:16], "audio/wav", ".wav")

    with pytest.raises(ValueError):
        validate_audio_upload(b"plaintext", "audio/wav", ".wav")


def test_stream_upload_rejects_content_length():
    import asyncio
    from starlette.requests import Request
    from starlette.datastructures import UploadFile

    from tts_server.services.upload import stream_upload_bounded

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "headers": [(b"content-length", b"99999999")],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def run():
        request = Request(scope, receive)
        upload = UploadFile(filename="a.wav", file=io.BytesIO(b"data"))
        dest = Path("/tmp/tts-upload-test.bin")
        with pytest.raises(HTTPException) as exc:
            await stream_upload_bounded(request, upload, dest, max_bytes=1024)
        assert exc.value.status_code == 413
        assert not dest.exists()

    asyncio.run(run())
