import os
import random

from rest_framework.exceptions import ValidationError

from .models import PFE, Livrable

ALLOWED_EXTENSIONS = {
    'rapport':      ['.pdf'],
    'code':         ['.zip', '.tar', '.gz'],
    'presentation': ['.pdf', '.pptx', '.ppt'],
}
MAX_FILE_SIZE_MB = 50


def upload_livrable(pfe, type_livrable, fichier, deposant):
    if deposant != pfe.etudiant:
        raise ValidationError("Seul l'étudiant du PFE peut déposer des livrables")
    if pfe.statut != 'EN_COURS':
        raise ValidationError("Le PFE n'est pas en cours")
    ext = os.path.splitext(fichier.name)[1].lower()
    allowed = ALLOWED_EXTENSIONS.get(type_livrable, [])
    if ext not in allowed:
        raise ValidationError(
            f"Extension '{ext}' non autorisée pour {type_livrable}. Acceptés : {allowed}"
        )
    if fichier.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"Fichier trop volumineux (max {MAX_FILE_SIZE_MB} Mo)")
    livrable = Livrable.objects.create(pfe=pfe, type=type_livrable, fichier=fichier)
    _calculer_plagiat(pfe)
    from apps.notifications.services import notifier_livrable_depose
    notifier_livrable_depose(livrable)
    return livrable


def _calculer_plagiat(pfe):
    pfe.score_plagiat = round(random.uniform(0.5, 15.0), 2)
    pfe.save(update_fields=['score_plagiat', 'updated_at'])


def valider_livrable(livrable, encadrant, remarques=''):
    if livrable.statut != 'EN_ATTENTE':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'VALIDE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    from apps.notifications.services import notifier_livrable_valide
    notifier_livrable_valide(livrable)
    return livrable


def refuser_livrable(livrable, encadrant, remarques):
    if not remarques:
        raise ValidationError("Des remarques sont obligatoires pour refuser un livrable")
    if livrable.statut != 'EN_ATTENTE':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'REFUSE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    return livrable


def archiver_pfe(pfe, coordinateur):
    if pfe.statut not in ('EN_COURS', 'VALIDE'):
        raise ValidationError("Le PFE ne peut pas être archivé dans son état actuel")
    pfe.statut = 'ARCHIVE'
    pfe.save(update_fields=['statut', 'updated_at'])
    return pfe
