from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsCoordinateur, IsJury
from core.exceptions import success_response
from .models import Soutenance
from .serializers import (
    SoutenanceSerializer, PlanifierSerializer,
    AffecterJurySerializer, SoumettreNoteSerializer,
)
from .filters import SoutenanceFilter
from .services import (
    planifier_soutenance, affecter_jury,
    soumettre_note, calculer_note_finale,
    generer_pv_pdf, generer_releve_notes, generer_attestation, generer_planning_pdf,
)


class SoutenanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SoutenanceSerializer
    filterset_class  = SoutenanceFilter
    ordering_fields  = ['date', 'statut']

    def get_queryset(self):
        user = self.request.user
        qs = Soutenance.objects.select_related(
            'pfe__etudiant', 'pfe__encadrant_acad', 'pfe__encadrant_entr'
        ).prefetch_related('membres_jury', 'notes__evaluateur')

        if user.role == 'etudiant':
            return qs.filter(pfe__etudiant=user)
        if user.role in ('encadrant_acad', 'encadrant_entr'):
            from django.db.models import Q
            return qs.filter(Q(pfe__encadrant_acad=user) | Q(pfe__encadrant_entr=user))
        if user.role == 'jury':
            return qs.filter(membres_jury=user)
        return qs

    def get_permissions(self):
        if self.action in ('planifier', 'affecter_jury', 'calculer_finale'):
            return [IsCoordinateur()]
        if self.action in ('noter', 'pv_pdf'):
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def planifier(self, request):
        ser = PlanifierSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        soutenance = planifier_soutenance(
            pfe_id=ser.validated_data['pfe_id'],
            date=ser.validated_data['date'],
            salle=ser.validated_data['salle'],
            duree=ser.validated_data['duree'],
            coordinateur=request.user,
        )
        return success_response(
            data=SoutenanceSerializer(soutenance).data,
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def affecter_jury(self, request, pk=None):
        ser = AffecterJurySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        soutenance = affecter_jury(self.get_object(), ser.validated_data['jury_ids'])
        return success_response(data=SoutenanceSerializer(soutenance).data)

    @action(detail=True, methods=['post'])
    def noter(self, request, pk=None):
        ser = SoumettreNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = soumettre_note(
            soutenance=self.get_object(),
            evaluateur=request.user,
            valeur=ser.validated_data['valeur'],
            type_note=ser.validated_data['type'],
            commentaire=ser.validated_data.get('commentaire', ''),
        )
        from .serializers import NoteSerializer
        return success_response(data=NoteSerializer(note).data)

    @action(detail=True, methods=['post'])
    def calculer_finale(self, request, pk=None):
        soutenance = calculer_note_finale(self.get_object())
        return success_response(data=SoutenanceSerializer(soutenance).data)

    @action(detail=True, methods=['get'])
    def pv_pdf(self, request, pk=None):
        buf = generer_pv_pdf(self.get_object())
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="pv_soutenance_{pk}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def releve_pdf(self, request, pk=None):
        buf = generer_releve_notes(self.get_object())
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="releve_notes_{pk}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def attestation_pdf(self, request, pk=None):
        buf = generer_attestation(self.get_object())
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="attestation_{pk}.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def planning_pdf(self, request):
        qs = self.get_queryset().prefetch_related('membres_jury', 'pfe__etudiant').order_by('date')
        buf = generer_planning_pdf(qs)
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="planning_soutenances.pdf"'
        return response
