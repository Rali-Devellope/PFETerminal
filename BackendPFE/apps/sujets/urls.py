from rest_framework.routers import DefaultRouter
from .views import SujetViewSet

router = DefaultRouter()
router.register(r'', SujetViewSet, basename='sujet')

urlpatterns = router.urls
