from django.urls import path
from . import views

urlpatterns = [

    path("api/meta/", views.receive_meta),
    path("api/turtles/", views.receive_turtles),

    path("api/simulation/controls/", views.simulation_control),
    path("api/building/", views.building_layout)
]