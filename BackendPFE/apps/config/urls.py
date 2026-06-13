from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FiliereViewSet

router = DefaultRouter()
router.register('filieres', FiliereViewSet, basename='filiere')

urlpatterns = [
    path('', include(router.urls)),
]
