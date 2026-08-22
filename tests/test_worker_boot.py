"""Worker boot coordination — queue waits for initialize() before inference."""

import io
import os
import time
import wave
from pathlib import Path

from tts_server.worker.qwen3_worker import JobQueue, Qwen3Worker, WorkerInfo


def _wav_bytes() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(b"\x00\x00" * 1200)
    return buf.getvalue()


def test_wait_until_ready_while_booting():
    worker = Qwen3Worker()
    assert worker.boot_status() == "booting"
    assert worker.wait_until_ready(timeout=0.05) is False

    worker._initialized = True
    worker._boot_finished.set()

    assert worker.wait_until_ready(timeout=0.05) is True
    assert worker.boot_status() == "ready"


def test_queue_defers_claim_until_worker_ready(tmp_path: Path):
    os.environ["DATA_DIR"] = str(tmp_path / "data")
    os.environ["TTS_MOCK_WORKER"] = "1"
    os.environ["QUEUE_POLL_SECONDS"] = "0.05"

    from tts_server import config as config_module
    from tts_server.db.database import get_db
    from tts_server.services.security import resolve_under
    from tts_server.worker import qwen3_worker as worker_module

    config_module.settings = config_module.Settings()
    worker_module.settings = config_module.settings
    worker_module._queue = None
    worker_module._worker = None

    worker = Qwen3Worker()
    worker._initialized = False
    worker._boot_failed = False
    worker._boot_finished.clear()
    worker_module._worker = worker

    db = get_db()
    user = db.create_user("u1", "waituser", "hash")
    voice = db.create_voice(
        "v1",
        user["id"],
        "voice",
        "ref text",
        "users/u1/voices/v1/ref.wav",
        "Italian",
    )
    ref_path = resolve_under(config_module.settings.users_dir, voice["audio_rel_path"])
    ref_path.parent.mkdir(parents=True, exist_ok=True)
    ref_path.write_bytes(_wav_bytes())

    db.create_job("j1", user["id"], voice["id"], "Italian", "Test sentence for boot wait.")

    queue = JobQueue()
    queue.start()

    time.sleep(0.15)
    polled = db.get_job("j1", user["id"])
    assert polled is not None
    assert polled["status"] == "queued"

    worker._initialized = True
    worker._info = WorkerInfo(
        device="cpu",
        model_id="mock",
        xpu_gate_passed=False,
        xpu_gate_reason="mock",
        xpu_memory_bytes=0,
        cpu_warmup_seconds=0.0,
        xpu_warmup_seconds=None,
    )
    worker._boot_finished.set()

    deadline = time.time() + 10
    status = "queued"
    while time.time() < deadline:
        polled = db.get_job("j1", user["id"])
        status = polled["status"]
        if status in {"completed", "failed"}:
            break
        time.sleep(0.1)

    queue.stop()
    assert status == "completed"
