from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsCoordinateur
from core.exceptions import success_response
from .models import Sujet
from .serializers import (
    SujetSerializer, SujetCreateSerializer,
    ValiderRefuserSerializer, AffecterEncadrantSerializer
)
from .filters import SujetFilter
from .services import valider_sujet, refuser_sujet, affecter_encadrant, choisir_sujet


class SujetViewSet(viewsets.ModelViewSet):
    queryset = Sujet.objects.select_related('propose_par', 'encadrant', 'etudiant_cible').all()
    filterset_class = SujetFilter
    search_fields   = ['titre', 'description']
    ordering_fields = ['created_at', 'annee', 'statut']

    def get_permissions(self):
        if self.action in ('valider', 'refuser', 'affecter'):
            return [IsCoordinateur()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'etudiant':
            from django.db.models import Q
            return qs.filter(
                Q(propose_par=user) |
                Q(etudiant_cible=user) |
                Q(statut='VALIDE', etudiant_cible=None)
            ).distinct()
        if user.role in ('encadrant_acad', 'encadrant_entr'):
            from django.db.models import Q
            return qs.filter(Q(encadrant=user) | Q(propose_par=user))
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SujetCreateSerializer
        return SujetSerializer

    def perform_create(self, serializer):
        from apps.pfe.services import get_annee_active
        serializer.save(propose_par=self.request.user, annee_academique=get_annee_active())

    @action(detail=True, methods=['post'])
    def choisir(self, request, pk=None):
        sujet = choisir_sujet(self.get_object(), request.user)
        return success_response(data=SujetSerializer(sujet).data, message='Sujet choisi avec succès')

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        sujet = valider_sujet(self.get_object(), request.user)
        return success_response(data=SujetSerializer(sujet).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        ser = ValiderRefuserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sujet = refuser_sujet(self.get_object(), request.user, ser.validated_data.get('motif', ''))
        return success_response(data=SujetSerializer(sujet).data)

    @action(detail=True, methods=['post'])
    def affecter(self, request, pk=None):
        ser = AffecterEncadrantSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sujet = affecter_encadrant(self.get_object(), ser.validated_data['encadrant_id'], request.user)
        return success_response(data=SujetSerializer(sujet).data)
