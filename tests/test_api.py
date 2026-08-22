import io
import os
import time
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["TTS_MOCK_WORKER"] = "1"
os.environ["TTS_DATA_DIR"] = "/tmp/tts-test-data"
os.environ["TTS_SECRET_KEY"] = "test-secret-key"
os.environ["TTS_QUEUE_POLL_SECONDS"] = "0.1"

from app.config import get_settings
from app.main import create_app


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
    os.environ["TTS_DATA_DIR"] = str(tmp_path / "data")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, username: str = "alice") -> str:
    resp = client.post(
        "/auth/register",
        json={"username": username, "password": "password123"},
    )
    assert resp.status_code == 201
    return resp.json()["token"]


def test_health(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["worker_initialized"] is True


def test_auth_isolation_and_job_flow(client: TestClient):
    token_a = _register(client, "alice")
    token_b = _register(client, "bob")

    wav = _make_wav_bytes()
    voice_resp = client.post(
        "/voices",
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
        f"/voices/{voice_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert other_voice.status_code == 404

    job_resp = client.post(
        "/jobs",
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
        f"/jobs/{job_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert other_job.status_code == 404

    deadline = time.time() + 15
    status = "queued"
    while time.time() < deadline:
        poll = client.get(
            f"/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        status = poll.json()["status"]
        if status in {"completed", "failed"}:
            break
        time.sleep(0.2)

    assert status == "completed"
    final = client.get(
        f"/jobs/{job_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    ).json()
    assert final["wav_available"] is True
    assert final["chunk_count"] >= 1

    wav_download = client.get(
        f"/jobs/{job_id}/download/wav",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert wav_download.status_code == 200
    assert len(wav_download.content) > 0


def test_chunking_service():
    from app.services.chunking import chunk_text

    text = "A. " + "B. " * 50
    chunks = chunk_text(text, max_chars=40)
    assert len(chunks) > 1
    assert all(len(c) <= 40 for c in chunks)
