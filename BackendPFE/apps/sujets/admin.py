from django.contrib import admin
from .models import Sujet


@admin.register(Sujet)
class SujetAdmin(admin.ModelAdmin):
    list_display  = ['titre', 'filiere', 'annee', 'statut', 'origine', 'propose_par', 'encadrant']
    list_filter   = ['statut', 'origine', 'filiere', 'annee']
    search_fields = ['titre', 'description']
    ordering      = ['-created_at']
