"""Bounded streaming reads for multipart uploads."""

import asyncio
import logging
import time
from pathlib import Path

from fastapi import HTTPException, Request, UploadFile, status

logger = logging.getLogger(__name__)

CHUNK_SIZE = 64 * 1024
# Small allowance for multipart form field overhead beyond the file part.
MULTIPART_OVERHEAD_BYTES = 8192


async def stream_upload_bounded(
    request: Request,
    upload: UploadFile,
    dest: Path,
    max_bytes: int,
    timeout_seconds: float | None = None,
) -> tuple[int, bytes]:
    """
    Stream upload to disk without loading the full body into memory.
    Rejects oversize payloads using Content-Length (when present) and incremental byte count.
    Returns (total_bytes, header_bytes) for content validation.
    """
    from tts_server.config import settings

    upload_limit = timeout_seconds if timeout_seconds is not None else settings.http_upload_timeout_seconds
    deadline = time.monotonic() + upload_limit

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > max_bytes + MULTIPART_OVERHEAD_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Upload too large",
                )
        except ValueError:
            pass

    if upload.size is not None and upload.size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Upload too large",
        )

    total = 0
    header = bytearray()
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        with dest.open("wb") as out:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    logger.warning(
                        "Upload stream timeout after %.1fs for %s",
                        upload_limit,
                        dest.name,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="Upload timed out",
                    )
                try:
                    chunk = await asyncio.wait_for(upload.read(CHUNK_SIZE), timeout=remaining)
                except asyncio.TimeoutError:
                    logger.warning(
                        "Upload read timeout after %.1fs for %s",
                        upload_limit,
                        dest.name,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="Upload timed out",
                    )
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="Upload too large",
                    )
                if len(header) < 16:
                    remaining_header = 16 - len(header)
                    header.extend(chunk[:remaining_header])
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise

    if total == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload")

    return total, bytes(header)
