from rest_framework.routers import DefaultRouter
from .views import PFEViewSet, LivrableViewSet, AnneeAcademiqueViewSet, BibliothequeViewSet

router = DefaultRouter()
router.register(r'pfe',          PFEViewSet,             basename='pfe')
router.register(r'livrables',    LivrableViewSet,        basename='livrable')
router.register(r'annees',       AnneeAcademiqueViewSet, basename='annee')
router.register(r'bibliotheque', BibliothequeViewSet,    basename='bibliotheque')

urlpatterns = router.urls
