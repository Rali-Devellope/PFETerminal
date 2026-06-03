from rest_framework.exceptions import ValidationError

from .models import Sujet


def choisir_sujet(sujet, etudiant):
    from apps.pfe.models import PFE
    if sujet.statut != 'VALIDE':
        raise ValidationError("Ce sujet n'est pas disponible")
    if sujet.etudiant_cible and sujet.etudiant_cible != etudiant:
        raise ValidationError("Ce sujet est déjà assigné à un autre étudiant")
    if PFE.objects.filter(etudiant=etudiant).exists():
        raise ValidationError("Vous avez déjà un PFE en cours")
    sujet.etudiant_cible = etudiant
    sujet.save()
    return sujet


def valider_sujet(sujet, coordinateur):
    if sujet.statut != 'PROPOSE':
        raise ValidationError("Seul un sujet PROPOSÉ peut être validé")
    sujet.statut = 'VALIDE'
    sujet.save(update_fields=['statut', 'updated_at'])
    from apps.notifications.services import notifier_sujet_valide
    notifier_sujet_valide(sujet)
    return sujet


def refuser_sujet(sujet, coordinateur, motif):
    if sujet.statut != 'PROPOSE':
        raise ValidationError("Seul un sujet PROPOSÉ peut être refusé")
    if not motif:
        raise ValidationError("Un motif de refus est obligatoire")
    sujet.statut = 'REFUSE'
    sujet.motif_refus = motif
    sujet.save(update_fields=['statut', 'motif_refus', 'updated_at'])
    from apps.notifications.services import notifier_sujet_refuse
    notifier_sujet_refuse(sujet)
    return sujet


def affecter_encadrant(sujet, encadrant_id, coordinateur):
    from apps.authentication.models import CustomUser
    try:
        encadrant = CustomUser.objects.get(pk=encadrant_id)
    except CustomUser.DoesNotExist:
        raise ValidationError("Encadrant introuvable")
    if sujet.statut not in ('VALIDE', 'AFFECTE'):
        raise ValidationError("Le sujet doit être VALIDÉ pour affecter un encadrant")
    if encadrant.role not in ('encadrant_acad', 'encadrant_entr'):
        raise ValidationError("L'utilisateur n'a pas le rôle d'encadrant")
    sujet.encadrant = encadrant
    sujet.statut = 'AFFECTE'
    sujet.save(update_fields=['encadrant', 'statut', 'updated_at'])
    from apps.notifications.services import notifier_encadrant_affecte
    notifier_encadrant_affecte(sujet)
    return sujet
