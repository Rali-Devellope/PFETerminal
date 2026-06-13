from django.contrib import admin
from .models import Filiere


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ['libelle', 'code', 'active', 'created_at']
    list_filter = ['active']
    search_fields = ['libelle', 'code']
