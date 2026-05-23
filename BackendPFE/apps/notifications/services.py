from django.core.mail import send_mail
from django.conf import settings

from .models import Notification


def creer_notification(destinataire, titre, message, type_notif):
    return Notification.objects.create(
        destinataire=destinataire,
        titre=titre,
        message=message,
        type=type_notif,
    )


def envoyer_email(destinataire_email, sujet, corps):
    try:
        send_mail(
            subject=sujet,
            message=corps,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[destinataire_email],
            fail_silently=True,
        )
    except Exception:
        pass


def push_websocket(user_id, payload):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {'type': 'notification.message', 'data': payload},
        )
    except Exception:
        pass


def notifier(destinataire, titre, message, type_notif, envoyer_mail=True):
    notif = creer_notification(destinataire, titre, message, type_notif)
    push_websocket(destinataire.pk, {'titre': titre, 'message': message, 'type': type_notif})
    if envoyer_mail:
        envoyer_email(destinataire.email, titre, message)
    return notif


# --- Helpers métier ---

def notifier_sujet_valide(sujet):
    if sujet.etudiant:
        notifier(
            sujet.etudiant,
            "Sujet validé",
            f"Votre sujet « {sujet.titre} » a été validé par le coordinateur.",
            'sujet_valide',
        )


def notifier_sujet_refuse(sujet):
    notifier(
        sujet.propose_par,
        "Sujet refusé",
        f"Votre sujet « {sujet.titre} » a été refusé. Motif : {sujet.motif_refus}",
        'sujet_refuse',
    )


def notifier_encadrant_affecte(sujet):
    if sujet.encadrant:
        notifier(
            sujet.encadrant,
            "Affectation encadrant",
            f"Vous avez été affecté comme encadrant du sujet « {sujet.titre} ».",
            'encadrant_affecte',
        )
    if sujet.etudiant:
        notifier(
            sujet.etudiant,
            "Encadrant affecté",
            f"Un encadrant a été affecté à votre PFE : {sujet.encadrant.prenom} {sujet.encadrant.nom}.",
            'encadrant_affecte',
            envoyer_mail=False,
        )


def notifier_livrable_depose(livrable):
    pfe = livrable.pfe
    for enc in filter(None, [pfe.encadrant_acad, pfe.encadrant_entr]):
        notifier(
            enc,
            "Nouveau livrable déposé",
            f"{pfe.etudiant.prenom} {pfe.etudiant.nom} a déposé un livrable ({livrable.type}) pour « {pfe.titre} ».",
            'livrable_depose',
            envoyer_mail=False,
        )


def notifier_livrable_valide(livrable):
    notifier(
        livrable.pfe.etudiant,
        "Livrable validé",
        f"Votre livrable ({livrable.type}) pour « {livrable.pfe.titre} » a été validé.",
        'livrable_valide',
    )


def notifier_soutenance_planifiee(soutenance):
    pfe = soutenance.pfe
    destinataires = [pfe.etudiant] + list(soutenance.membres_jury.all())
    for enc in filter(None, [pfe.encadrant_acad, pfe.encadrant_entr]):
        destinataires.append(enc)
    for dest in destinataires:
        notifier(
            dest,
            "Soutenance planifiée",
            f"La soutenance du PFE « {pfe.titre} » est planifiée le "
            f"{soutenance.date.strftime('%d/%m/%Y à %H:%M')} en salle {soutenance.salle}.",
            'soutenance_planifiee',
        )
