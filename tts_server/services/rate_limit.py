import threading
import time
from collections import defaultdict


class SlidingWindowRateLimiter:
    """In-memory per-key rate limiter (e.g. login attempts per IP)."""

    def __init__(self, max_events: int, window_seconds: float = 60.0) -> None:
        self._max_events = max_events
        self._window = window_seconds
        self._events: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] < cutoff:
                bucket.pop(0)
            if len(bucket) >= self._max_events:
                return False
            bucket.append(now)
            return True
