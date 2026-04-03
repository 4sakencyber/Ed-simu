from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from typing import Any

_MAX_LOGS = 120
_lock = RLock()
_logs: list[dict[str, Any]] = []


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def add_log(level: str, message: str) -> None:
    entry = {
        "time": _utc_now_iso(),
        "level": str(level or "info"),
        "message": str(message or ""),
    }
    with _lock:
        _logs.insert(0, entry)
        del _logs[_MAX_LOGS:]


def list_logs(limit: int = 30) -> list[dict[str, Any]]:
    with _lock:
        return deepcopy(_logs[: max(0, int(limit))])


def clear_logs() -> None:
    with _lock:
        _logs.clear()

