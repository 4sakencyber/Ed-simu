from django.urls import path

from . import views

urlpatterns = [
    path("api/meta/", views.receive_meta, name="myapp_api_meta"),
    path("api/turtles/", views.receive_turtles, name="myapp_api_turtles"),
    path("api/runtime/", views.runtime_status, name="myapp_api_runtime"),
    path("api/simulation/controls/", views.simulation_control, name="myapp_api_controls"),
    path("api/building/", views.building_layout, name="myapp_api_building"),
]
