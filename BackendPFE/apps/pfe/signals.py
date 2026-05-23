from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.sujets.models import Sujet
from .models import PFE


@receiver(post_save, sender=Sujet)
def creer_pfe_automatiquement(sender, instance, **kwargs):
    if instance.statut != 'VALIDE':
        return
    if PFE.objects.filter(sujet=instance).exists():
        return

    etudiant = instance.etudiant
    if not etudiant:
        return

    encadrant = instance.encadrant
    PFE.objects.create(
        titre=instance.titre,
        filiere=instance.filiere,
        annee=instance.annee,
        sujet=instance,
        etudiant=etudiant,
        encadrant_acad=encadrant if encadrant and encadrant.role == 'encadrant_acad' else None,
        encadrant_entr=encadrant if encadrant and encadrant.role == 'encadrant_entr' else None,
    )
