import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import Request


class AttemptLimiter:
    """Counts attempts per key and locks a key out once it reaches `max_attempts` in `window`.

    State lives in this process: it resets on restart and is not shared between workers.
    That is enough for a single API instance; a multi-instance deployment needs a shared
    store (Redis) behind the same interface.
    """

    def __init__(
        self,
        *,
        max_attempts: int,
        window_seconds: float,
        lockout_seconds: float,
        max_keys: int = 10_000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.lockout = lockout_seconds
        self.max_keys = max_keys
        self._clock = clock
        self._attempts: dict[str, deque[float]] = {}
        self._locked_until: dict[str, float] = {}
        self._lock = threading.Lock()

    def retry_after(self, key: str) -> int | None:
        """Seconds until the key may try again, or None when it is not locked."""
        with self._lock:
            until = self._locked_until.get(key)
            if until is None:
                return None
            remaining = until - self._clock()
            if remaining <= 0:
                del self._locked_until[key]
                self._attempts.pop(key, None)
                return None
            return int(remaining) + 1

    def record(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            self._evict(now)
            attempts = self._attempts.setdefault(key, deque())
            attempts.append(now)
            while attempts and attempts[0] <= now - self.window:
                attempts.popleft()
            if len(attempts) >= self.max_attempts:
                self._locked_until[key] = now + self.lockout

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)
            self._locked_until.pop(key, None)

    def _evict(self, now: float) -> None:
        if len(self._attempts) < self.max_keys:
            return
        for key in [k for k, until in self._locked_until.items() if until <= now]:
            del self._locked_until[key]
            self._attempts.pop(key, None)
        for key in [k for k, a in self._attempts.items() if not a or a[-1] <= now - self.window]:
            if key not in self._locked_until:
                del self._attempts[key]
        while len(self._attempts) >= self.max_keys:
            oldest = next(iter(self._attempts))
            del self._attempts[oldest]
            self._locked_until.pop(oldest, None)


class AuthLimiters:
    def __init__(
        self,
        *,
        max_failures: int,
        window_seconds: int,
        lockout_seconds: int,
        register_per_hour: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        # One address may fail on behalf of many accounts, so it gets a wider allowance.
        self.login_email = AttemptLimiter(
            max_attempts=max_failures,
            window_seconds=window_seconds,
            lockout_seconds=lockout_seconds,
            clock=clock,
        )
        self.login_ip = AttemptLimiter(
            max_attempts=max_failures * 4,
            window_seconds=window_seconds,
            lockout_seconds=lockout_seconds,
            clock=clock,
        )
        self.register_ip = AttemptLimiter(
            max_attempts=register_per_hour,
            window_seconds=3600,
            lockout_seconds=3600,
            clock=clock,
        )


def client_ip(request: Request, trusted_proxies: int) -> str:
    """The caller's address. X-Forwarded-For is read only when trusted proxies are configured.
    Each proxy appends the address it received from, so the entry `trusted_proxies` from the
    end is the one our outermost proxy saw; entries to its left can be forged by the client."""
    if trusted_proxies > 0:
        parts = [
            p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()
        ]
        if len(parts) >= trusted_proxies:
            return parts[-trusted_proxies]
    return request.client.host if request.client else "unknown"
