from django.db import models
from django.conf import settings


class AnneeAcademique(models.Model):
    libelle    = models.CharField(max_length=20, unique=True)  # ex: "2024-2025"
    date_debut = models.DateField()
    date_fin   = models.DateField()
    active     = models.BooleanField(default=False)
    date_limite_soutenance = models.DateField(
        null=True, blank=True,
        help_text="Dernière date à laquelle une soutenance peut être planifiée dans cette année."
    )

    class Meta:
        verbose_name        = 'Année académique'
        verbose_name_plural = 'Années académiques'
        ordering            = ['-libelle']

    def __str__(self):
        return self.libelle

    def save(self, *args, **kwargs):
        if self.active:
            AnneeAcademique.objects.exclude(pk=self.pk).update(active=False)
        super().save(*args, **kwargs)


class PFE(models.Model):
    STATUTS = [
        ('EN_COURS', 'En cours'),
        ('VALIDE',   'Validé'),
        ('REFUSE',   'Refusé'),
        ('ARCHIVE',  'Archivé'),
    ]
    MENTIONS = [
        ('tres_bien',  'Très bien'),
        ('bien',       'Bien'),
        ('assez_bien', 'Assez bien'),
        ('passable',   'Passable'),
        ('ajourne',    'Ajourné'),
    ]

    titre            = models.CharField(max_length=300)
    filiere          = models.CharField(max_length=100)
    annee            = models.IntegerField()
    statut           = models.CharField(max_length=10, choices=STATUTS, default='EN_COURS')
    score_plagiat    = models.FloatField(default=0.0)
    mention          = models.CharField(max_length=20, choices=MENTIONS, blank=True)
    resume           = models.TextField(blank=True)
    mots_cles        = models.CharField(max_length=500, blank=True)
    annee_academique = models.ForeignKey(
        AnneeAcademique, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='pfe_set'
    )

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


class Deadline(models.Model):
    TYPES = [
        ('rapport',      'Rapport'),
        ('code',         'Code source'),
        ('presentation', 'Présentation'),
    ]
    annee_academique = models.ForeignKey(
        AnneeAcademique, on_delete=models.CASCADE, related_name='deadlines'
    )
    type_livrable = models.CharField(max_length=20, choices=TYPES)
    date_limite   = models.DateTimeField()

    class Meta:
        unique_together = ('annee_academique', 'type_livrable')
        verbose_name    = 'Deadline'
        ordering        = ['date_limite']

    def __str__(self):
        return f"{self.get_type_livrable_display()} — {self.date_limite.strftime('%d/%m/%Y')}"


class FicheInscription(models.Model):
    STATUTS = [
        ('EN_ATTENTE_ENCADRANT',    "En attente signature encadrant"),
        ('EN_ATTENTE_COORDINATEUR', "En attente signature coordinateur"),
        ('SIGNEE',                  "Signée"),
    ]
    pfe                = models.OneToOneField(PFE, on_delete=models.CASCADE, related_name='fiche_inscription')
    statut             = models.CharField(max_length=30, choices=STATUTS, default='EN_ATTENTE_ENCADRANT')
    signe_encadrant    = models.BooleanField(default=False)
    signe_coordinateur = models.BooleanField(default=False)
    chemin_pdf         = models.CharField(max_length=255, blank=True)
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Fiche d'inscription PFE"

    def __str__(self):
        return f"Fiche {self.pfe.titre} [{self.statut}]"


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
    hors_delai = models.BooleanField(default=False)
    version    = models.PositiveIntegerField(default=1)
    date_depot = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Livrable'
        ordering = ['-date_depot']

    def __str__(self):
        return f"{self.get_type_display()} — PFE {self.pfe.pk} [{self.statut}]"
