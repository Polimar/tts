import logging
from pathlib import Path

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


def write_wav(path: Path, audio: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if audio.ndim > 1:
        audio = audio.squeeze()
    sf.write(str(path), audio, sample_rate)


def concatenate_chunks(chunks: list[np.ndarray]) -> np.ndarray:
    if not chunks:
        return np.array([], dtype=np.float32)
    normalized = []
    for chunk in chunks:
        arr = np.asarray(chunk, dtype=np.float32)
        if arr.ndim > 1:
            arr = arr.squeeze()
        normalized.append(arr)
    return np.concatenate(normalized)


def write_mp3_from_wav(wav_path: Path, mp3_path: Path) -> None:
    mp3_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        from pydub import AudioSegment

        segment = AudioSegment.from_wav(str(wav_path))
        segment.export(str(mp3_path), format="mp3")
    except Exception as exc:
        logger.warning("MP3 export failed (%s); writing silent placeholder", exc)
        # Fallback: copy wav bytes is not valid mp3; skip mp3
        raise


def mock_synthesis(duration_seconds: float = 1.0, sample_rate: int = 24000) -> tuple[np.ndarray, int]:
    samples = int(duration_seconds * sample_rate)
    t = np.linspace(0, duration_seconds, samples, endpoint=False)
    audio = 0.1 * np.sin(2 * np.pi * 440 * t)
    return audio.astype(np.float32), sample_rate
