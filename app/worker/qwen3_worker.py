import logging
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Optional

import numpy as np

from app.config import get_settings
from app.db.database import get_db
from app.services.audio import concatenate_chunks, mock_synthesis, write_mp3_from_wav, write_wav
from app.services.chunking import chunk_text
from app.services.security import job_export_path, resolve_under

logger = logging.getLogger(__name__)

DeviceChoice = Literal["xpu", "cpu"]


@dataclass
class WorkerInfo:
    device: DeviceChoice
    model_id: str
    xpu_gate_passed: bool
    xpu_memory_bytes: int
    cpu_warmup_seconds: float
    xpu_warmup_seconds: Optional[float]


def _ensure_warmup_reference(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        return path
    import soundfile as sf

    sample_rate = 24000
    duration = 3.0
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    audio = 0.15 * np.sin(2 * np.pi * 220 * t)
    sf.write(str(path), audio.astype(np.float32), sample_rate)
    return path


class Qwen3Worker:
    """Qwen3-TTS 0.6B Base synthesis worker with startup XPU gate."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model: Any = None
        self._device: DeviceChoice = "cpu"
        self._info: Optional[WorkerInfo] = None
        self._initialized = False

    @property
    def info(self) -> Optional[WorkerInfo]:
        return self._info

    @property
    def initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> WorkerInfo:
        settings = get_settings()
        if settings.tts_mock_worker:
            self._info = WorkerInfo(
                device="cpu",
                model_id=settings.model_path,
                xpu_gate_passed=False,
                xpu_memory_bytes=0,
                cpu_warmup_seconds=0.0,
                xpu_warmup_seconds=None,
            )
            self._device = "cpu"
            self._initialized = True
            logger.info("Mock worker initialized (no Qwen3 model loaded)")
            return self._info

        import torch
        from qwen_tts import Qwen3TTSModel

        model_path = settings.model_path
        logger.info("Loading Qwen3-TTS model from %s", model_path)

        dtype = torch.bfloat16
        model = Qwen3TTSModel.from_pretrained(
            model_path,
            device_map="cpu",
            dtype=dtype,
        )

        warmup_ref = _ensure_warmup_reference(settings.tts_data_dir / "warmup" / "reference.wav")
        warmup_ref_text = "Questo è un breve campione di riferimento per il warmup."

        cpu_time = self._benchmark_synthesis(
            model,
            device="cpu",
            text=settings.tts_warmup_text,
            ref_audio=warmup_ref,
            ref_text=warmup_ref_text,
        )

        xpu_available = hasattr(torch, "xpu") and torch.xpu.is_available()
        xpu_memory = 0
        xpu_time: Optional[float] = None
        xpu_gate_passed = False
        chosen: DeviceChoice = "cpu"

        if xpu_available:
            try:
                model.model = model.model.to("xpu")
                xpu_memory = int(torch.xpu.memory_allocated())
                if xpu_memory > 0:
                    xpu_time = self._benchmark_synthesis(
                        model,
                        device="xpu",
                        text=settings.tts_warmup_text,
                        ref_audio=warmup_ref,
                        ref_text=warmup_ref_text,
                    )
                    if xpu_time < cpu_time:
                        xpu_gate_passed = True
                        chosen = "xpu"
                    else:
                        logger.warning(
                            "XPU slower than CPU (xpu=%.2fs cpu=%.2fs); falling back to CPU",
                            xpu_time,
                            cpu_time,
                        )
                        model.model = model.model.to("cpu")
                else:
                    logger.warning("XPU memory_allocated is 0 after to('xpu'); falling back to CPU")
                    model.model = model.model.to("cpu")
            except Exception as exc:
                logger.warning("XPU initialization failed: %s; falling back to CPU", exc)
                try:
                    model.model = model.model.to("cpu")
                except Exception:
                    pass
        else:
            logger.info("torch.xpu not available; using CPU")

        self._model = model
        self._device = chosen
        self._info = WorkerInfo(
            device=chosen,
            model_id=model_path,
            xpu_gate_passed=xpu_gate_passed,
            xpu_memory_bytes=xpu_memory,
            cpu_warmup_seconds=cpu_time,
            xpu_warmup_seconds=xpu_time,
        )
        self._initialized = True
        logger.info("Worker ready on device=%s xpu_gate=%s", chosen, xpu_gate_passed)
        return self._info

    def _benchmark_synthesis(
        self,
        model: Any,
        device: str,
        text: str,
        ref_audio: Path,
        ref_text: str,
    ) -> float:
        import torch

        try:
            if device == "xpu" and hasattr(torch, "xpu"):
                model.model = model.model.to("xpu")
            else:
                model.model = model.model.to("cpu")
        except Exception as exc:
            logger.warning("Could not move model to %s for benchmark: %s", device, exc)
            return float("inf")

        start = time.perf_counter()
        try:
            with torch.inference_mode():
                prompt = model.create_voice_clone_prompt(
                    ref_audio=str(ref_audio),
                    ref_text=ref_text,
                    x_vector_only_mode=False,
                )
                model.generate_voice_clone(
                    text=text,
                    language="Italian",
                    voice_clone_prompt=prompt,
                )
        except Exception as exc:
            logger.warning("Warmup synthesis on %s failed: %s", device, exc)
            return float("inf")
        return time.perf_counter() - start

    def synthesize_chunk(
        self,
        text: str,
        language: str,
        ref_audio_path: Path,
        ref_text: str,
        voice_prompt: Any,
    ) -> tuple[np.ndarray, int, Any]:
        settings = get_settings()
        if settings.tts_mock_worker:
            audio, sr = mock_synthesis(duration_seconds=min(2.0, max(0.5, len(text) / 80.0)))
            return audio, sr, voice_prompt

        if not self._initialized or self._model is None:
            raise RuntimeError("Worker not initialized")

        with self._lock:
            if voice_prompt is None:
                voice_prompt = self._model.create_voice_clone_prompt(
                    ref_audio=str(ref_audio_path),
                    ref_text=ref_text,
                    x_vector_only_mode=False,
                )
            wavs, sr = self._model.generate_voice_clone(
                text=text,
                language=language,
                voice_clone_prompt=voice_prompt,
            )
            audio = np.asarray(wavs[0], dtype=np.float32)
            return audio, sr, voice_prompt


_worker: Optional[Qwen3Worker] = None


def get_worker() -> Qwen3Worker:
    global _worker
    if _worker is None:
        _worker = Qwen3Worker()
    return _worker


class JobQueue:
    """Serial GPU/XPU job queue — one synthesis at a time."""

    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="tts-job-queue", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        settings = get_settings()
        db = get_db()
        worker = get_worker()
        while not self._stop.is_set():
            job = db.claim_next_queued_job()
            if not job:
                time.sleep(settings.tts_queue_poll_seconds)
                continue
            self._process_job(job, worker, db)

    def _process_job(self, job: dict[str, Any], worker: Qwen3Worker, db: Any) -> None:
        settings = get_settings()
        job_id = job["id"]
        user_id = job["user_id"]
        voice_id = job["voice_id"]

        try:
            voice = db.get_voice(voice_id, user_id)
            if not voice:
                db.update_job(job_id, status="failed", error="Voice not found", completed=True)
                return

            audio_rel = voice["audio_rel_path"]
            ref_audio_path = resolve_under(settings.users_dir, audio_rel)
            if not ref_audio_path.is_file():
                db.update_job(job_id, status="failed", error="Reference audio missing", completed=True)
                return

            chunks = chunk_text(job["text"], settings.tts_chunk_max_chars)
            if not chunks:
                db.update_job(job_id, status="failed", error="Empty text", completed=True)
                return

            db.update_job(job_id, chunk_count=len(chunks))

            audio_parts: list[np.ndarray] = []
            sample_rate = 24000
            voice_prompt = None
            language = job["language"]

            for chunk in chunks:
                audio, sample_rate, voice_prompt = worker.synthesize_chunk(
                    text=chunk,
                    language=language,
                    ref_audio_path=ref_audio_path,
                    ref_text=voice["ref_text"],
                    voice_prompt=voice_prompt,
                )
                audio_parts.append(audio)

            combined = concatenate_chunks(audio_parts)
            wav_path = job_export_path(settings.users_dir, user_id, job_id, ".wav")
            write_wav(wav_path, combined, sample_rate)
            wav_rel = str(wav_path.relative_to(settings.users_dir.resolve()))

            mp3_rel: Optional[str] = None
            mp3_path = job_export_path(settings.users_dir, user_id, job_id, ".mp3")
            try:
                write_mp3_from_wav(wav_path, mp3_path)
                mp3_rel = str(mp3_path.relative_to(settings.users_dir.resolve()))
            except Exception as exc:
                logger.warning("Job %s MP3 export skipped: %s", job_id, exc)

            device_used = worker.info.device if worker.info else "cpu"
            db.update_job(
                job_id,
                status="completed",
                wav_rel_path=wav_rel,
                mp3_rel_path=mp3_rel,
                device_used=device_used,
                completed=True,
            )
        except Exception as exc:
            logger.exception("Job %s failed", job_id)
            db.update_job(job_id, status="failed", error=str(exc), completed=True)


_queue: Optional[JobQueue] = None


def get_job_queue() -> JobQueue:
    global _queue
    if _queue is None:
        _queue = JobQueue()
    return _queue
