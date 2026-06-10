from django.urls import path
from .views import (
    NotificationListView, marquer_lu, marquer_tout_lu,
    conversations, messages_avec, envoyer_message, non_lus_count,
)

urlpatterns = [
    path('notifications/',                       NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/lu/',           marquer_lu,                     name='notification-lu'),
    path('notifications/tout-lu/',               marquer_tout_lu,                name='notification-tout-lu'),
    path('messages/',                            envoyer_message,                name='message-envoyer'),
    path('messages/conversations/',              conversations,                  name='message-conversations'),
    path('messages/avec/<int:user_id>/',         messages_avec,                  name='messages-avec'),
    path('messages/non-lus/',                    non_lus_count,                  name='messages-non-lus'),
]
