from django.db import models
from django.conf import settings


class PFE(models.Model):
    STATUTS = [
        ('EN_COURS', 'En cours'),
        ('VALIDE',   'Validé'),
        ('REFUSE',   'Refusé'),
        ('ARCHIVE',  'Archivé'),
    ]

    titre          = models.CharField(max_length=300)
    filiere        = models.CharField(max_length=100)
    annee          = models.IntegerField()
    statut         = models.CharField(max_length=10, choices=STATUTS, default='EN_COURS')
    score_plagiat  = models.FloatField(default=0.0)

    sujet          = models.OneToOneField(
        'sujets.Sujet', on_delete=models.CASCADE, related_name='pfe'
    )
    etudiant       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pfe'
    )
    encadrant_acad = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pfe_acad'
    )
    encadrant_entr = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pfe_entr'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'PFE'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.titre} — {self.etudiant} [{self.statut}]"


def livrable_upload_path(instance, filename):
    return f"livrables/pfe_{instance.pfe.pk}/{instance.type}/{filename}"


class Livrable(models.Model):
    TYPES = [
        ('rapport',       'Rapport'),
        ('code',          'Code source'),
        ('presentation',  'Présentation'),
    ]
    STATUTS = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDE',     'Validé'),
        ('REFUSE',     'Refusé'),
    ]

    pfe        = models.ForeignKey(PFE, on_delete=models.CASCADE, related_name='livrables')
    type       = models.CharField(max_length=20, choices=TYPES)
    fichier    = models.FileField(upload_to=livrable_upload_path)
    statut     = models.CharField(max_length=15, choices=STATUTS, default='EN_ATTENTE')
    remarques  = models.TextField(blank=True)
    date_depot = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Livrable'
        ordering = ['-date_depot']

    def __str__(self):
        return f"{self.get_type_display()} — PFE {self.pfe.pk} [{self.statut}]"
