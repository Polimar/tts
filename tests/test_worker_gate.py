"""Worker XPU gate and fail-closed behaviour (no cross-device .to())."""

import os
import sys
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("API_KEY", "test-api-key")


def test_fail_closed_reloads_cpu_model_instead_of_to():
    from tts_server.worker.qwen3_worker import Qwen3Worker

    worker = Qwen3Worker()
    worker._initialized = True
    worker._device = "xpu"
    worker._info = MagicMock()
    worker._model = MagicMock()
    worker._model.create_voice_clone_prompt.return_value = "prompt"
    worker._model.generate_voice_clone.side_effect = RuntimeError("ids on cpu")

    cpu_model = MagicMock()
    cpu_model.create_voice_clone_prompt.return_value = "cpu-prompt"
    cpu_model.generate_voice_clone.return_value = ([np.zeros(8, dtype=np.float32)], 24000)

    with patch("tts_server.worker.qwen3_worker.settings") as settings_mock, patch.object(
        worker, "_reload_on_cpu"
    ) as reload_mock:
        settings_mock.mock_worker = False

        def _reload(reason: str) -> None:
            worker._model = cpu_model
            worker._device = "cpu"

        reload_mock.side_effect = _reload

        audio, sr, prompt = worker.synthesize_chunk(
            text="testo",
            language="Italian",
            ref_audio_path=MagicMock(),
            ref_text="ref",
            voice_prompt=None,
        )

    reload_mock.assert_called_once()
    assert "fail-closed" in reload_mock.call_args[0][0]
    assert worker._device == "cpu"
    assert sr == 24000
    assert prompt == "cpu-prompt"
    cpu_model.generate_voice_clone.assert_called_once()


def test_reload_on_cpu_disposes_and_loads_fresh():
    from tts_server.worker.qwen3_worker import Qwen3Worker

    worker = Qwen3Worker()
    old_model = MagicMock()
    worker._model = old_model
    worker._info = MagicMock()

    fresh = MagicMock()
    with patch.object(worker, "_dispose_model") as dispose_mock, patch.object(
        worker, "_load_model", return_value=fresh
    ) as load_mock:
        worker._reload_on_cpu("test reason")

    dispose_mock.assert_called_once_with(old_model)
    load_mock.assert_called_once_with("cpu")
    assert worker._model is fresh
    assert worker._device == "cpu"
    assert worker._info.xpu_gate_passed is False


def test_xpu_gate_fails_when_slower_than_cpu():
    from tts_server.worker.qwen3_worker import Qwen3Worker

    worker = Qwen3Worker()
    cpu_model = MagicMock()
    xpu_model = MagicMock()

    fake_torch = MagicMock()
    fake_torch.xpu.is_available.return_value = True
    fake_torch.xpu.memory_allocated.return_value = 1_800_000_000

    with patch("tts_server.worker.qwen3_worker.settings") as settings_mock, patch.object(
        worker, "_load_model", side_effect=[cpu_model, xpu_model, cpu_model]
    ) as load_mock, patch.object(
        worker, "_dispose_model"
    ), patch.object(
        worker,
        "_benchmark_synthesis",
        side_effect=[4.96, 6.86],
    ), patch(
        "tts_server.worker.qwen3_worker._ensure_warmup_reference",
        return_value=MagicMock(),
    ), patch.dict(sys.modules, {"torch": fake_torch}):
        settings_mock.mock_worker = False
        settings_mock.model_path = "Qwen/Qwen3-TTS"
        settings_mock.warmup_text = "warmup"
        settings_mock.tts_device = "xpu"
        settings_mock.data_dir = MagicMock()

        info = worker.initialize()

    assert info.device == "cpu"
    assert info.xpu_gate_passed is False
    assert "slower" in info.xpu_gate_reason.lower()
    assert load_mock.call_args_list[-1].args == ("cpu",)
    assert worker._model is cpu_model
