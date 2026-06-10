from django.db import models
from apps.authentication.models import CustomUser


class Notification(models.Model):
    TYPES = [
        ('sujet_valide',          'Sujet validé'),
        ('sujet_refuse',          'Sujet refusé'),
        ('encadrant_affecte',     'Encadrant affecté'),
        ('livrable_depose',       'Livrable déposé'),
        ('livrable_valide',       'Livrable validé'),
        ('livrable_refuse',       'Livrable refusé'),
        ('soutenance_planifiee',  'Soutenance planifiée'),
        ('note_publiee',          'Note publiée'),
    ]
    destinataire = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='notifications'
    )
    titre   = models.CharField(max_length=200)
    message = models.TextField()
    type    = models.CharField(max_length=30, choices=TYPES)
    lu      = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] → {self.destinataire.email}"


class Message(models.Model):
    expediteur  = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_recus')
    contenu     = models.TextField()
    lu          = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.expediteur.email} → {self.destinataire.email}"
