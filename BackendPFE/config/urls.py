# -*- coding: utf-8 -*-
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

schema_view = get_schema_view(
    openapi.Info(
        title="GestionPFE API",
        default_version='v1',
        description="API GestionPFE - ISCAE Mauritanie",
        contact=openapi.Contact(email="admin@iscae.mr"),
    ),
    public=True,
    permission_classes=[AllowAny],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/',   include('apps.authentication.urls')),
    path('api/v1/sujets/', include('apps.sujets.urls')),
    path('api/v1/',        include('apps.pfe.urls')),
    path('api/v1/',        include('apps.soutenances.urls')),
    path('api/v1/',        include('apps.notifications.urls')),
    path('api/v1/',        include('apps.statistiques.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger-ui'),
    path('redoc/',   schema_view.with_ui('redoc',   cache_timeout=0), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
