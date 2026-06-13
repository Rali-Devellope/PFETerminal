from django.db import models


class Filiere(models.Model):
    libelle    = models.CharField(max_length=100, unique=True)
    code       = models.CharField(max_length=10, blank=True)
    active     = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Filière'
        verbose_name_plural = 'Filières'
        ordering = ['libelle']

    def __str__(self):
        return self.libelle
