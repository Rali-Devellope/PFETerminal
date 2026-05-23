from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsCoordinateur, IsEncadrant
from core.exceptions import success_response
from .models import PFE, Livrable
from .serializers import (
    PFESerializer, LivrableSerializer,
    LivrableUploadSerializer, LivrableActionSerializer,
)
from .filters import PFEFilter, LivrableFilter
from .services import upload_livrable, valider_livrable, refuser_livrable, archiver_pfe


class PFEViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PFESerializer
    filterset_class  = PFEFilter
    search_fields    = ['titre', 'filiere']
    ordering_fields  = ['created_at', 'annee', 'statut']

    def get_queryset(self):
        user = self.request.user
        qs = PFE.objects.select_related(
            'sujet', 'etudiant', 'encadrant_acad', 'encadrant_entr'
        ).prefetch_related('livrables')
        if user.role == 'etudiant':
            return qs.filter(etudiant=user)
        if user.role in ('encadrant_acad', 'encadrant_entr'):
            return qs.filter(Q(encadrant_acad=user) | Q(encadrant_entr=user))
        return qs

    def get_permissions(self):
        if self.action == 'archiver':
            return [IsCoordinateur()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def archiver(self, request, pk=None):
        pfe = archiver_pfe(self.get_object(), request.user)
        return success_response(data=PFESerializer(pfe).data)


class LivrableViewSet(viewsets.ModelViewSet):
    filterset_class = LivrableFilter
    ordering_fields = ['date_depot', 'statut']

    def get_queryset(self):
        user = self.request.user
        qs = Livrable.objects.select_related(
            'pfe__etudiant', 'pfe__encadrant_acad', 'pfe__encadrant_entr'
        )
        if user.role == 'etudiant':
            return qs.filter(pfe__etudiant=user)
        if user.role in ('encadrant_acad', 'encadrant_entr'):
            return qs.filter(Q(pfe__encadrant_acad=user) | Q(pfe__encadrant_entr=user))
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return LivrableUploadSerializer
        return LivrableSerializer

    def get_permissions(self):
        if self.action in ('valider', 'refuser'):
            return [IsEncadrant()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        ser = LivrableUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        livrable = upload_livrable(
            pfe=ser.validated_data['pfe'],
            type_livrable=ser.validated_data['type'],
            fichier=ser.validated_data['fichier'],
            deposant=request.user,
        )
        return success_response(data=LivrableSerializer(livrable).data, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        ser = LivrableActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        livrable = valider_livrable(self.get_object(), request.user, ser.validated_data.get('remarques', ''))
        return success_response(data=LivrableSerializer(livrable).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        ser = LivrableActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        livrable = refuser_livrable(self.get_object(), request.user, ser.validated_data.get('remarques', ''))
        return success_response(data=LivrableSerializer(livrable).data)
