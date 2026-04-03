from __future__ import annotations

from copy import deepcopy
from typing import Any

from django.urls import reverse

from . import log_store, state_store
from ..simulate import simu_state
from ..simulate import simulation as simulation_module
from ..simulate.simu_runner import pause_simulation, reset_simulation, resume_simulation, start_simulation

_ORIGINAL_REQUESTS = simulation_module.requests


class RuntimeRequestsProxy:
    """Adds timeout/error reporting without editing upstream simulation sources."""

    def __init__(self, wrapped: Any):
        self._wrapped = wrapped

    def __getattr__(self, name: str) -> Any:
        return getattr(self._wrapped, name)

    def post(self, url: str, *args: Any, **kwargs: Any) -> Any:
        kwargs.setdefault("timeout", 3)
        try:
            response = self._wrapped.post(url, *args, **kwargs)
        except Exception as exc:
            message = f"Simulation callback failed: {exc}"
            state_store.mark_error(message)
            log_store.add_log("error", message)
            raise

        if not response.ok:
            message = f"Simulation callback returned HTTP {response.status_code}"
            state_store.set_last_error(message)
            log_store.add_log("warn", message)

        return response


def _thread_alive() -> bool:
    thread = getattr(simu_state, "simulation_thread", None)
    return bool(thread and thread.is_alive())


def _install_request_proxy() -> None:
    if isinstance(simulation_module.requests, RuntimeRequestsProxy):
        return
    simulation_module.requests = RuntimeRequestsProxy(_ORIGINAL_REQUESTS)


def _configure_simulation_endpoints(request: Any) -> str:
    turtle_url = request.build_absolute_uri(reverse("myapp_api_turtles"))
    meta_url = request.build_absolute_uri(reverse("myapp_api_meta"))
    simulation_module.TURTLE_API = turtle_url
    simulation_module.META_API = meta_url
    return turtle_url


def _refresh_status_from_thread() -> None:
    snapshot = state_store.get_snapshot()
    if _thread_alive():
        return

    if snapshot["status"] in {"running", "paused"}:
        if snapshot["all_finished"]:
            state_store.mark_completed()
        elif snapshot["last_command"] == "reset":
            state_store.mark_reset()
        elif snapshot["last_error"]:
            state_store.mark_error(snapshot["last_error"])


def set_meta(meta: dict[str, Any]) -> dict[str, Any]:
    meta_copy = deepcopy(meta)
    simu_state.meta = deepcopy(meta_copy)
    stored = state_store.set_meta(meta_copy)
    log_store.add_log("event", "Runtime meta updated")
    return stored


def get_meta() -> dict[str, Any]:
    return state_store.get_meta()


def record_turtles(payload: dict[str, Any]) -> list[dict[str, Any]]:
    frame = payload.get("frame", 0)
    turtles = payload.get("turtles", [])
    return state_store.record_turtles(frame, turtles if isinstance(turtles, list) else [])


def get_turtles() -> list[dict[str, Any]]:
    return state_store.get_turtles()


def control_simulation(request: Any, command: str) -> dict[str, Any]:
    if command == "start":
        callback_url = _configure_simulation_endpoints(request)
        _install_request_proxy()
        thread_was_alive = _thread_alive()
        start_simulation()
        state_store.mark_started(callback_url=callback_url, restart=not thread_was_alive)
        log_store.add_log("event", f"Simulation start requested via {callback_url}")
    elif command == "pause":
        pause_simulation()
        state_store.mark_paused()
        log_store.add_log("event", "Simulation pause requested")
    elif command == "resume":
        resume_simulation()
        state_store.mark_resumed()
        log_store.add_log("event", "Simulation resume requested")
    elif command == "reset":
        reset_simulation()
        state_store.mark_reset()
        log_store.add_log("event", "Simulation reset requested")
    else:
        raise ValueError(f"unknown command: {command}")

    _refresh_status_from_thread()
    return get_runtime_snapshot()


def get_runtime_snapshot() -> dict[str, Any]:
    _refresh_status_from_thread()
    snapshot = state_store.get_snapshot()
    snapshot["thread_alive"] = _thread_alive()
    snapshot["recent_logs"] = log_store.list_logs()
    snapshot["meta"] = state_store.get_meta()
    snapshot.pop("turtles", None)
    snapshot.pop("accept_updates", None)
    return snapshot

