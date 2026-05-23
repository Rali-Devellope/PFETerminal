import django_filters
from .models import Sujet


class SujetFilter(django_filters.FilterSet):
    titre   = django_filters.CharFilter(lookup_expr='icontains')
    filiere = django_filters.CharFilter(lookup_expr='icontains')
    annee   = django_filters.NumberFilter()
    statut  = django_filters.ChoiceFilter(choices=Sujet.STATUTS)
    origine = django_filters.ChoiceFilter(choices=Sujet.ORIGINES)

    class Meta:
        model = Sujet
        fields = ['titre', 'filiere', 'annee', 'statut', 'origine']
