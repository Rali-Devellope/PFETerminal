from django.urls import path
from .views import NotificationListView, marquer_lu, marquer_tout_lu

urlpatterns = [
    path('notifications/',              NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/lu/',  marquer_lu,                     name='notification-lu'),
    path('notifications/tout-lu/',      marquer_tout_lu,                name='notification-tout-lu'),
]
