from rest_framework.routers import DefaultRouter
from .views import PFEViewSet, LivrableViewSet

router = DefaultRouter()
router.register(r'pfe',        PFEViewSet,      basename='pfe')
router.register(r'livrables',  LivrableViewSet, basename='livrable')

urlpatterns = router.urls
