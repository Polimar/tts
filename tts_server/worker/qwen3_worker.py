import logging
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Optional

import numpy as np

from tts_server.config import settings
from tts_server.db.database import get_db
from tts_server.services.audio import concatenate_chunks, mock_synthesis, write_mp3_from_wav, write_wav
from tts_server.services.chunking import chunk_text
from tts_server.services.security import job_export_path, resolve_under

logger = logging.getLogger(__name__)

DeviceChoice = Literal["xpu", "cpu"]


@dataclass
class WorkerInfo:
    device: DeviceChoice
    model_id: str
    xpu_gate_passed: bool
    xpu_gate_reason: str
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
    """Qwen3-TTS 0.6B Base worker. CPU default; XPU only after full-generate gate passes."""

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
        if settings.mock_worker:
            self._info = WorkerInfo(
                device="cpu",
                model_id=settings.model_path,
                xpu_gate_passed=False,
                xpu_gate_reason="mock_worker",
                xpu_memory_bytes=0,
                cpu_warmup_seconds=0.0,
                xpu_warmup_seconds=None,
            )
            self._device = "cpu"
            self._initialized = True
            logger.info("XPU gate: SKIPPED (MOCK_WORKER=1) -> device=cpu")
            return self._info

        import torch
        from qwen_tts import Qwen3TTSModel

        model_path = settings.model_path
        logger.info("Loading Qwen3-TTS model from %s", model_path)

        model = Qwen3TTSModel.from_pretrained(
            model_path,
            device_map="cpu",
            dtype=torch.bfloat16,
        )

        warmup_ref = _ensure_warmup_reference(settings.data_dir / "warmup" / "reference.wav")
        warmup_ref_text = "Questo è un breve campione di riferimento per il warmup."

        cpu_time = self._benchmark_synthesis(
            model,
            device="cpu",
            text=settings.warmup_text,
            ref_audio=warmup_ref,
            ref_text=warmup_ref_text,
        )
        if cpu_time == float("inf"):
            logger.error("CPU warmup generate failed; worker may be unstable")

        xpu_memory = 0
        xpu_time: Optional[float] = None
        xpu_gate_passed = False
        gate_reason = "TTS_DEVICE=cpu (default)"
        chosen: DeviceChoice = "cpu"

        xpu_available = hasattr(torch, "xpu") and torch.xpu.is_available()
        if settings.tts_device == "xpu" and xpu_available:
            gate_reason = "evaluating"
            try:
                model.model = model.model.to("xpu")
                xpu_memory = int(torch.xpu.memory_allocated())
                if xpu_memory <= 0:
                    gate_reason = "xpu memory_allocated=0 after to('xpu')"
                    model.model = model.model.to("cpu")
                    logger.warning("XPU gate: FAILED (%s) -> device=cpu", gate_reason)
                else:
                    xpu_time = self._benchmark_synthesis(
                        model,
                        device="xpu",
                        text=settings.warmup_text,
                        ref_audio=warmup_ref,
                        ref_text=warmup_ref_text,
                    )
                    if xpu_time == float("inf"):
                        gate_reason = (
                            "XPU warmup generate failed or timing missing "
                            "(fail-closed to CPU)"
                        )
                        model.model = model.model.to("cpu")
                        logger.warning("XPU gate: FAILED (%s) -> device=cpu", gate_reason)
                    elif xpu_time >= cpu_time:
                        gate_reason = f"XPU slower than CPU (xpu={xpu_time:.2f}s cpu={cpu_time:.2f}s)"
                        model.model = model.model.to("cpu")
                        logger.warning("XPU gate: FAILED (%s) -> device=cpu", gate_reason)
                    else:
                        xpu_gate_passed = True
                        gate_reason = f"passed (xpu={xpu_time:.2f}s cpu={cpu_time:.2f}s)"
                        chosen = "xpu"
                        logger.info("XPU gate: PASSED %s -> device=xpu", gate_reason)
            except Exception as exc:
                gate_reason = f"XPU setup error: {exc}"
                try:
                    model.model = model.model.to("cpu")
                except Exception:
                    pass
                logger.warning("XPU gate: FAILED (%s) -> device=cpu", gate_reason)
        elif settings.tts_device == "xpu" and not xpu_available:
            gate_reason = "torch.xpu not available"
            logger.info("XPU gate: SKIPPED (%s) -> device=cpu", gate_reason)
        else:
            logger.info("XPU gate: SKIPPED (%s) -> device=cpu", gate_reason)

        self._model = model
        self._device = chosen
        self._info = WorkerInfo(
            device=chosen,
            model_id=model_path,
            xpu_gate_passed=xpu_gate_passed,
            xpu_gate_reason=gate_reason,
            xpu_memory_bytes=xpu_memory,
            cpu_warmup_seconds=cpu_time,
            xpu_warmup_seconds=xpu_time,
        )
        self._initialized = True
        logger.info(
            "Worker ready device=%s model=%s xpu_gate_passed=%s reason=%s",
            chosen,
            model_path,
            xpu_gate_passed,
            gate_reason,
        )
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
            logger.warning("Warmup generate on %s failed: %s", device, exc)
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
        if settings.mock_worker:
            audio, sr = mock_synthesis(duration_seconds=min(2.0, max(0.5, len(text) / 80.0)))
            return audio, sr, voice_prompt

        if not self._initialized or self._model is None:
            raise RuntimeError("Worker not initialized")

        with self._lock:
            try:
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
            except Exception as exc:
                if self._device == "xpu":
                    logger.warning(
                        "XPU synthesis failed (%s); fail-closed retry on CPU", exc
                    )
                    import torch

                    self._model.model = self._model.model.to("cpu")
                    self._device = "cpu"
                    if self._info:
                        self._info.device = "cpu"
                        self._info.xpu_gate_passed = False
                        self._info.xpu_gate_reason = f"runtime fail-closed: {exc}"
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
                else:
                    raise
            audio = np.asarray(wavs[0], dtype=np.float32)
            return audio, sr, voice_prompt


_worker: Optional[Qwen3Worker] = None


def get_worker() -> Qwen3Worker:
    global _worker
    if _worker is None:
        _worker = Qwen3Worker()
    return _worker


class JobQueue:
    """Serial inference queue — one synthesis job at a time on the active device."""

    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def start(self) -> None:
        if settings.gpu_queue_workers != 1:
            logger.warning(
                "GPU_QUEUE_WORKERS=%s; only one serial worker is supported",
                settings.gpu_queue_workers,
            )
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
        db = get_db()
        worker = get_worker()
        while not self._stop.is_set():
            job = db.claim_next_queued_job()
            if not job:
                time.sleep(settings.queue_poll_seconds)
                continue
            self._process_job(job, worker, db)

    def _process_job(self, job: dict[str, Any], worker: Qwen3Worker, db: Any) -> None:
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

            chunks = chunk_text(job["text"], settings.chunk_max_chars)
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
