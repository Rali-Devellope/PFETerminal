from django.db import models
from django.conf import settings


class Sujet(models.Model):
    STATUTS = [
        ('PROPOSE', 'Proposé'),
        ('VALIDE',  'Validé'),
        ('REFUSE',  'Refusé'),
        ('AFFECTE', 'Affecté'),
    ]
    ORIGINES = [
        ('academique', 'Académique'),
        ('entreprise', 'Entreprise'),
    ]

    titre       = models.CharField(max_length=300)
    description = models.TextField()
    origine     = models.CharField(max_length=20, choices=ORIGINES)
    statut      = models.CharField(max_length=10, choices=STATUTS, default='PROPOSE')
    filiere     = models.CharField(max_length=100)
    annee       = models.IntegerField()
    motif_refus = models.TextField(blank=True)

    propose_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='sujets_proposes'
    )
    confidentiel     = models.BooleanField(default=False)
    annee_academique = models.ForeignKey(
        'pfe.AnneeAcademique', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='sujets'
    )

    etudiant_cible = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='sujets_cibles',
        limit_choices_to={'role': 'etudiant'}
    )
    encadrant = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='sujets_encadres'
    )

    @property
    def etudiant(self):
        """Étudiant concerné : propose_par si c'est un étudiant, sinon etudiant_cible."""
        if self.propose_par.role == 'etudiant':
            return self.propose_par
        return self.etudiant_cible

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Sujet'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.titre} [{self.statut}]"
