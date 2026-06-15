from django.db.models import Q, Max, Subquery, OuterRef
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core.exceptions import success_response, error_response
from apps.authentication.models import CustomUser
from .models import Notification, Message
from .serializers import NotificationSerializer, MessageSerializer, EnvoyerMessageSerializer


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


# ── Messagerie interne ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversations(request):
    """Retourne la liste des conversations avec le dernier message."""
    user = request.user
    msgs = Message.objects.filter(Q(expediteur=user) | Q(destinataire=user))
    interlocuteurs_ids = set()
    for m in msgs:
        other = m.destinataire_id if m.expediteur_id == user.id else m.expediteur_id
        interlocuteurs_ids.add(other)

    result = []
    for uid in interlocuteurs_ids:
        last = Message.objects.filter(
            Q(expediteur=user, destinataire_id=uid) |
            Q(expediteur_id=uid, destinataire=user)
        ).order_by('-created_at').first()
        non_lus = Message.objects.filter(expediteur_id=uid, destinataire=user, lu=False).count()
        try:
            other_user = CustomUser.objects.get(pk=uid)
        except CustomUser.DoesNotExist:
            continue
        from apps.authentication.serializers import UserSerializer
        result.append({
            'interlocuteur': UserSerializer(other_user).data,
            'dernier_message': last.contenu[:60] if last else '',
            'date': last.created_at if last else None,
            'non_lus': non_lus,
        })

    result.sort(key=lambda x: x['date'] or '', reverse=True)
    return success_response(data=result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_avec(request, user_id):
    """Retourne tous les messages entre l'utilisateur courant et user_id."""
    user = request.user
    msgs = Message.objects.filter(
        Q(expediteur=user, destinataire_id=user_id) |
        Q(expediteur_id=user_id, destinataire=user)
    ).order_by('created_at')
    # Marquer comme lus les messages reçus
    msgs.filter(destinataire=user, lu=False).update(lu=True)
    return success_response(data=MessageSerializer(msgs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def envoyer_message(request):
    ser = EnvoyerMessageSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    try:
        dest = CustomUser.objects.get(pk=ser.validated_data['destinataire_id'])
    except CustomUser.DoesNotExist:
        return error_response('Destinataire introuvable', status.HTTP_404_NOT_FOUND)
    msg = Message.objects.create(
        expediteur=request.user,
        destinataire=dest,
        contenu=ser.validated_data['contenu'],
    )
    return success_response(data=MessageSerializer(msg).data, status_code=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def non_lus_count(request):
    count = Message.objects.filter(destinataire=request.user, lu=False).count()
    return success_response(data={'count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contacts_disponibles(request):
    """Retourne les contacts autorisés selon le rôle de l'utilisateur."""
    user = request.user
    role = user.role

    if role == 'etudiant':
        from apps.pfe.models import PFE
        pfe = PFE.objects.filter(etudiant=user).select_related('encadrant_acad', 'encadrant_entr').first()
        contacts = []
        if pfe:
            if pfe.encadrant_acad:
                contacts.append(pfe.encadrant_acad)
            if pfe.encadrant_entr and pfe.encadrant_entr != pfe.encadrant_acad:
                contacts.append(pfe.encadrant_entr)
    elif role in ('encadrant_acad', 'encadrant_entr'):
        from apps.pfe.models import PFE
        pfe_qs = PFE.objects.filter(
            Q(encadrant_acad=user) | Q(encadrant_entr=user)
        ).select_related('etudiant')
        seen = set()
        contacts = []
        for p in pfe_qs:
            if p.etudiant and p.etudiant.pk not in seen:
                contacts.append(p.etudiant)
                seen.add(p.etudiant.pk)
    else:
        contacts = list(CustomUser.objects.filter(is_active=True).exclude(pk=user.pk).order_by('nom', 'prenom'))

    from apps.authentication.serializers import UserSerializer
    return success_response(data=UserSerializer(contacts, many=True).data)
