import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .simulate.constants import geometry
from .simulate import simu_state
from .simulate.simu_runner import (
    start_simulation,
    pause_simulation,
    resume_simulation,
    reset_simulation
)


simulation_meta = {}
latest_turtles = []


@csrf_exempt
def receive_meta(request):

    if request.method == "POST":

        data = json.loads(request.body)

        global simulation_meta
        simulation_meta = data
        simu_state.meta = data
        print("Meta received:", simulation_meta)

        return JsonResponse({"status": "meta received"})

    # GET 请求返回当前 meta
    return JsonResponse({
        "meta": simulation_meta
    })


@csrf_exempt
def receive_turtles(request):

    if request.method == "POST":

        data = json.loads(request.body)

        global latest_turtles
        latest_turtles = data.get("turtles", [])

        return JsonResponse({"status": "turtles received"})

    # GET 请求返回当前 turtles
    return JsonResponse({
        "turtles": latest_turtles
    })

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
    print("COMMAND:", command)

    if command == "start":
        start_simulation()

    elif command == "pause":
        pause_simulation()

    elif command == "resume":
        resume_simulation()

    elif command == "reset":
        reset_simulation()

    else:
        return JsonResponse({"error": "unknown command"}, status=400)

    return JsonResponse({"status": command})

@csrf_exempt
def building_layout(request):

    data = {
        "building": geometry,
    }

    return JsonResponse(data)