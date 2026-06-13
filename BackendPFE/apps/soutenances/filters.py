import django_filters
from .models import Soutenance


class SoutenanceFilter(django_filters.FilterSet):
    statut  = django_filters.CharFilter(lookup_expr='exact')
    annee   = django_filters.NumberFilter(field_name='pfe__annee')
    filiere = django_filters.CharFilter(field_name='pfe__filiere', lookup_expr='icontains')
    pfe     = django_filters.NumberFilter(field_name='pfe__id')

    class Meta:
        model  = Soutenance
        fields = ['statut', 'annee', 'filiere', 'pfe']
