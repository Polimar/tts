"""Run blocking HTTP I/O off the event loop with hard deadlines."""

import asyncio
import logging
from collections.abc import Callable
from typing import TypeVar

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

T = TypeVar("T")


class ServiceUnavailableError(Exception):
    """Dependency not ready or contended within deadline."""


async def run_blocking_io(
    fn: Callable[[], T],
    route_label: str,
    timeout_seconds: float | None = None,
) -> T:
    from tts_server.config import settings

    deadline = (
        timeout_seconds if timeout_seconds is not None else settings.http_read_timeout_seconds
    )
    try:
        return await asyncio.wait_for(asyncio.to_thread(fn), timeout=deadline)
    except asyncio.TimeoutError:
        logger.warning("HTTP timeout after %.1fs on %s", deadline, route_label)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request timed out",
        )
    except ServiceUnavailableError as exc:
        logger.warning("Service unavailable on %s: %s", route_label, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc) or "Service temporarily unavailable",
        )
