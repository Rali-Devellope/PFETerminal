import django_filters
from .models import PFE, Livrable


class PFEFilter(django_filters.FilterSet):
    filiere = django_filters.CharFilter(lookup_expr='icontains')
    annee   = django_filters.NumberFilter()
    statut  = django_filters.ChoiceFilter(choices=PFE.STATUTS)

    class Meta:
        model  = PFE
        fields = ['filiere', 'annee', 'statut']


class LivrableFilter(django_filters.FilterSet):
    type   = django_filters.ChoiceFilter(choices=Livrable.TYPES)
    statut = django_filters.ChoiceFilter(choices=Livrable.STATUTS)

    class Meta:
        model  = Livrable
        fields = ['type', 'statut', 'pfe']
