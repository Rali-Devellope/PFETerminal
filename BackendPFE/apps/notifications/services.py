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


def notifier_livrable_refuse(livrable):
    notifier(
        livrable.pfe.etudiant,
        "Livrable refusé",
        f"Votre livrable ({livrable.type}) pour « {livrable.pfe.titre} » a été refusé."
        + (f" Motif : {livrable.remarques}" if livrable.remarques else ""),
        'livrable_refuse',
    )


def notifier_note_finale(soutenance):
    note = soutenance.note_finale
    mention = (
        "Très bien"  if note >= 16 else
        "Bien"       if note >= 14 else
        "Assez bien" if note >= 12 else
        "Passable"   if note >= 10 else
        "Insuffisant"
    )
    pfe = soutenance.pfe
    corps = (
        f"La note finale du PFE « {pfe.titre} » "
        f"de {pfe.etudiant.prenom} {pfe.etudiant.nom} "
        f"est de {note}/20 — {mention}."
    )

    # Étudiant
    notifier(pfe.etudiant, "Note finale publiée", corps, 'note_publiee')

    # Encadrant
    if pfe.encadrant_acad:
        notifier(pfe.encadrant_acad, "Note finale publiée", corps, 'note_publiee', envoyer_mail=False)
    if pfe.encadrant_entr:
        notifier(pfe.encadrant_entr, "Note finale publiée", corps, 'note_publiee', envoyer_mail=False)

    # Scolarité (tous les utilisateurs avec rôle scolarite)
    from apps.authentication.models import CustomUser
    for scol in CustomUser.objects.filter(role='scolarite', is_active=True):
        notifier(scol, "Note finale publiée", corps, 'note_publiee', envoyer_mail=False)


def notifier_resultats_publies(soutenance, mention_code):
    from apps.soutenances.services import _get_mention
    mention = _get_mention(soutenance.note_finale)
    pfe = soutenance.pfe
    if soutenance.note_finale >= 10:
        corps = (
            f"Félicitations ! Votre PFE « {pfe.titre} » est validé avec la note "
            f"{soutenance.note_finale}/20 — Mention : {mention}."
        )
    else:
        corps = (
            f"Votre PFE « {pfe.titre} » n'a pas été validé (note : {soutenance.note_finale}/20). "
            f"Veuillez contacter le coordinateur pour la suite."
        )
    notifier(pfe.etudiant, "Résultats officiels publiés", corps, 'note_publiee')


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
