from django.db import models
from apps.authentication.models import CustomUser
from apps.pfe.models import PFE


class Soutenance(models.Model):
    STATUTS = [
        ('EN_ATTENTE_AUTORISATION', 'En attente d\'autorisation'),
        ('PLANIFIEE', 'Planifiée'),
        ('EN_COURS',  'En cours'),
        ('TERMINEE',  'Terminée'),
        ('REPORTEE',  'Reportée'),
    ]
    pfe              = models.OneToOneField(PFE, on_delete=models.CASCADE, related_name='soutenance')
    date             = models.DateTimeField()
    salle            = models.CharField(max_length=50)
    duree            = models.PositiveIntegerField(help_text='durée en minutes')
    statut           = models.CharField(max_length=30, choices=STATUTS, default='PLANIFIEE')
    note_finale      = models.FloatField(null=True, blank=True)
    annee_academique = models.ForeignKey(
        'pfe.AnneeAcademique', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='soutenances'
    )
    membres_jury   = models.ManyToManyField(
        CustomUser, related_name='jurys', limit_choices_to={'role': 'jury'}, blank=True
    )
    president_jury = models.ForeignKey(
        CustomUser, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='presidence_soutenances'
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"Soutenance {self.pfe.titre} – {self.date}"


class Note(models.Model):
    TYPES = [
        ('jury',      'Jury'),
        ('encadrant', 'Encadrant'),
        ('finale',    'Finale'),
    ]
    soutenance  = models.ForeignKey(Soutenance, on_delete=models.CASCADE, related_name='notes')
    evaluateur  = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notes_donnees')
    valeur      = models.FloatField()
    type        = models.CharField(max_length=10, choices=TYPES)
    commentaire = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('soutenance', 'evaluateur', 'type')

    def __str__(self):
        return f"Note {self.valeur}/20 par {self.evaluateur.email}"
