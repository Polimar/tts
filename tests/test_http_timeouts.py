import asyncio
import time

import pytest
from fastapi import HTTPException

from tts_server.services.http_timeouts import run_blocking_io


def test_run_blocking_io_times_out():
    def _slow() -> str:
        time.sleep(2.0)
        return "done"

    async def _run() -> None:
        with pytest.raises(HTTPException) as exc_info:
            await run_blocking_io(_slow, "test/slow", timeout_seconds=0.1)
        assert exc_info.value.status_code == 504

    asyncio.run(_run())
