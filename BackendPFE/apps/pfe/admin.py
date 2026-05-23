from django.contrib import admin
from .models import PFE, Livrable


@admin.register(PFE)
class PFEAdmin(admin.ModelAdmin):
    list_display  = ['titre', 'filiere', 'annee', 'statut', 'score_plagiat', 'etudiant']
    list_filter   = ['statut', 'filiere', 'annee']
    search_fields = ['titre', 'etudiant__email']
    ordering      = ['-created_at']


@admin.register(Livrable)
class LivrableAdmin(admin.ModelAdmin):
    list_display = ['pfe', 'type', 'statut', 'date_depot']
    list_filter  = ['type', 'statut']
    ordering     = ['-date_depot']
