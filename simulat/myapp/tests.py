import json
from unittest.mock import patch

from django.test import Client, TestCase

from myapp.runtime import bridge, log_store, state_store


class RuntimeBridgeApiTests(TestCase):
    def setUp(self):
        state_store.reset_runtime_state(clear_meta=True)
        log_store.clear_logs()
        self.client = Client(HTTP_HOST="127.0.0.1:8001")

    def test_meta_round_trip_uses_runtime_store(self):
        payload = {
            "num_persons": 24,
            "random_pos": False,
            "leader": False,
            "panic": 0.35,
            "expV": 1.75,
        }

        response = self.client.post(
            "/myapp/api/meta/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "meta received")

        get_response = self.client.get("/myapp/api/meta/")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["meta"], payload)
        self.assertEqual(state_store.get_meta(), payload)

    def test_turtles_round_trip_and_runtime_snapshot(self):
        turtles_payload = {
            "frame": 7,
            "turtles": [
                {
                    "id": 1,
                    "pos": [0, 0, 0],
                    "floor": 1,
                    "room": 2,
                    "is_leader": False,
                    "finished": False,
                    "region": "chamber",
                    "dose": 0.5,
                }
            ],
        }

        post_response = self.client.post(
            "/myapp/api/turtles/",
            data=json.dumps(turtles_payload),
            content_type="application/json",
        )
        self.assertEqual(post_response.status_code, 200)
        self.assertEqual(post_response.json()["status"], "turtles received")

        get_response = self.client.get("/myapp/api/turtles/")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["turtles"], turtles_payload["turtles"])

        runtime_response = self.client.get("/myapp/api/runtime/")
        self.assertEqual(runtime_response.status_code, 200)
        runtime = runtime_response.json()
        self.assertEqual(runtime["frame"], 7)
        self.assertEqual(runtime["turtle_count"], 1)
        self.assertEqual(runtime["status"], "running")

    def test_start_control_configures_dynamic_callback_url(self):
        with patch("myapp.runtime.bridge.start_simulation") as mocked_start:
            response = self.client.post(
                "/myapp/api/simulation/controls/",
                data=json.dumps({"command": "start"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "start")
        mocked_start.assert_called_once()

        runtime = bridge.get_runtime_snapshot()
        self.assertEqual(runtime["callback_url"], "http://127.0.0.1:8001/myapp/api/turtles/")
        self.assertEqual(runtime["last_command"], "start")

    def test_reset_clears_runtime_turtles_without_touching_core_sources(self):
        state_store.record_turtles(
            4,
            [
                {
                    "id": 9,
                    "pos": [1, 2, 3],
                    "floor": 2,
                    "room": 1,
                    "is_leader": True,
                    "finished": False,
                    "region": "chamber",
                    "dose": 0.0,
                }
            ],
        )

        with patch("myapp.runtime.bridge.reset_simulation") as mocked_reset:
            response = self.client.post(
                "/myapp/api/simulation/controls/",
                data=json.dumps({"command": "reset"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        mocked_reset.assert_called_once()
        self.assertEqual(self.client.get("/myapp/api/turtles/").json()["turtles"], [])
