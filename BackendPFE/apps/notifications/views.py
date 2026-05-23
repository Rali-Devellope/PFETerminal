from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core.exceptions import success_response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marquer_lu(request, pk):
    try:
        notif = Notification.objects.get(pk=pk, destinataire=request.user)
    except Notification.DoesNotExist:
        from core.exceptions import error_response
        return error_response('Notification introuvable', status.HTTP_404_NOT_FOUND)
    notif.lu = True
    notif.save()
    return success_response(data=NotificationSerializer(notif).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marquer_tout_lu(request):
    Notification.objects.filter(destinataire=request.user, lu=False).update(lu=True)
    return success_response(message='Toutes les notifications marquées comme lues')
