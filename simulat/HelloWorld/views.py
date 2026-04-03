from django.shortcuts import render
from django.http import HttpResponse

def runbood(request):
    return render(request, "runbood.html")

def hello(request):
    return HttpResponse("Hello django. I am comming.")
