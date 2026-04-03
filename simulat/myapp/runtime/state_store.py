from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from typing import Any

from ..simulate import simu_state

_lock = RLock()
_state: dict[str, Any] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _copy_turtles(turtles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [deepcopy(item) for item in turtles]


def reset_runtime_state(clear_meta: bool = False) -> None:
    with _lock:
        default_meta = getattr(simu_state, "meta", None) or {
            "num_persons": 10,
            "leader": True,
            "random_pos": True,
            "panic": 0.2,
            "expV": 1.3,
        }
        meta = deepcopy(default_meta if clear_meta else _state.get("meta", default_meta))
        _state.clear()
        _state.update(
            {
                "meta": meta,
                "turtles": [],
                "frame": 0,
                "status": "idle",
                "last_command": "reset",
                "started_at": None,
                "updated_at": None,
                "completed_at": None,
                "last_error": None,
                "callback_url": None,
                "run_token": 0,
                "accept_updates": True,
            }
        )


def set_meta(meta: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        _state["meta"] = deepcopy(meta)
        _state["updated_at"] = _utc_now_iso()
        return deepcopy(_state["meta"])


def get_meta() -> dict[str, Any]:
    with _lock:
        return deepcopy(_state["meta"])


def record_turtles(frame: int, turtles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    with _lock:
        if not _state.get("accept_updates", True):
            return _copy_turtles(_state["turtles"])

        turtles_copy = _copy_turtles(turtles)
        now = _utc_now_iso()
        _state["frame"] = max(0, int(frame or 0))
        _state["turtles"] = turtles_copy
        _state["updated_at"] = now
        _state["last_error"] = None

        if turtles_copy:
            if _state.get("last_command") == "reset":
                _state["last_command"] = "start"
            all_finished = all(bool(item.get("finished")) for item in turtles_copy)
            if all_finished:
                _state["status"] = "completed"
                _state["completed_at"] = now
            elif _state.get("last_command") != "pause":
                _state["status"] = "running"
                _state["completed_at"] = None

        return turtles_copy


def get_turtles() -> list[dict[str, Any]]:
    with _lock:
        return _copy_turtles(_state["turtles"])


def mark_started(callback_url: str | None = None, restart: bool = False) -> None:
    with _lock:
        now = _utc_now_iso()
        if restart or _state["status"] in {"idle", "completed", "error"}:
            _state["run_token"] += 1
            _state["frame"] = 0
            _state["turtles"] = []
            _state["completed_at"] = None
            _state["started_at"] = now
        elif _state["started_at"] is None:
            _state["started_at"] = now

        _state["status"] = "running"
        _state["last_command"] = "start"
        _state["updated_at"] = now
        _state["last_error"] = None
        _state["accept_updates"] = True
        if callback_url:
            _state["callback_url"] = callback_url


def mark_paused() -> None:
    with _lock:
        _state["status"] = "paused"
        _state["last_command"] = "pause"
        _state["updated_at"] = _utc_now_iso()


def mark_resumed() -> None:
    with _lock:
        _state["status"] = "running"
        _state["last_command"] = "resume"
        _state["updated_at"] = _utc_now_iso()
        _state["accept_updates"] = True


def mark_reset() -> None:
    with _lock:
        _state["status"] = "idle"
        _state["last_command"] = "reset"
        _state["frame"] = 0
        _state["turtles"] = []
        _state["started_at"] = None
        _state["completed_at"] = None
        _state["updated_at"] = _utc_now_iso()
        _state["last_error"] = None
        _state["accept_updates"] = False


def mark_completed() -> None:
    with _lock:
        now = _utc_now_iso()
        _state["status"] = "completed"
        _state["completed_at"] = now
        _state["updated_at"] = now


def mark_error(message: str) -> None:
    with _lock:
        _state["status"] = "error"
        _state["updated_at"] = _utc_now_iso()
        _state["last_error"] = str(message or "unknown error")
        _state["accept_updates"] = False


def set_last_error(message: str) -> None:
    with _lock:
        _state["last_error"] = str(message or "unknown error")
        _state["updated_at"] = _utc_now_iso()


def get_snapshot() -> dict[str, Any]:
    with _lock:
        snapshot = deepcopy(_state)
        snapshot["turtle_count"] = len(snapshot["turtles"])
        snapshot["all_finished"] = bool(snapshot["turtles"]) and all(
            bool(item.get("finished")) for item in snapshot["turtles"]
        )
        return snapshot


reset_runtime_state(clear_meta=True)
