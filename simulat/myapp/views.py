import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .runtime import bridge
from .simulate.constants import geometry


@csrf_exempt
def receive_meta(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid json"}, status=400)

        bridge.set_meta(data)
        return JsonResponse({"status": "meta received"})

    return JsonResponse({"meta": bridge.get_meta()})


@csrf_exempt
def receive_turtles(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid json"}, status=400)

        bridge.record_turtles(data)
        return JsonResponse({"status": "turtles received"})

    return JsonResponse({"turtles": bridge.get_turtles()})


@csrf_exempt
def simulation_control(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"})

    raw_body = request.body.decode("utf-8", errors="ignore")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid json", "raw": raw_body}, status=400)

    command = body.get("command")
    if command not in {"start", "pause", "resume", "reset"}:
        return JsonResponse({"error": "unknown command"}, status=400)

    bridge.control_simulation(request, command)
    return JsonResponse({"status": command})


def runtime_status(request):
    return JsonResponse(bridge.get_runtime_snapshot())


@csrf_exempt
def building_layout(request):
    return JsonResponse({"building": geometry})
