from rest_framework.routers import DefaultRouter
from .views import SoutenanceViewSet

router = DefaultRouter()
router.register('soutenances', SoutenanceViewSet, basename='soutenance')

urlpatterns = router.urls
