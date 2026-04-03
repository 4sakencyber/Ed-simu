import threading
from .simulation import run_simulation_export_channel
from . import simu_state

def start_simulation():

    if simu_state.simulation_thread and simu_state.simulation_thread.is_alive():
        return

    simu_state.state["command"] = "start"

    simu_state.simulation_thread = threading.Thread(
        target=run_simulation_export_channel,
        kwargs=simu_state.meta
    )
    # print('meta',meta)
    simu_state.simulation_thread.start()


def pause_simulation():
    simu_state.state["command"] = "pause"


def resume_simulation():
    simu_state.state["command"] = "start"


def reset_simulation():
    simu_state.state["command"] = "reset"
