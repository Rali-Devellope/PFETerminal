from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsCoordinateur, IsEncadrant, IsAdminOrScolarite, IsAdminOrCoordinateur
from core.exceptions import success_response
from django.http import FileResponse
from .models import PFE, Livrable, AnneeAcademique, Deadline
from .serializers import (
    PFESerializer, LivrableSerializer, LivrableDetailSerializer,
    LivrableUploadSerializer, LivrableNestedUploadSerializer, LivrableActionSerializer,
    AnneeAcademiqueSerializer, AnneeAcademiqueCreateSerializer,
    DeadlineSerializer, DeadlineCreateSerializer, FicheInscriptionSerializer,
)
from .filters import PFEFilter, LivrableFilter
from .services import (
    upload_livrable, valider_livrable, refuser_livrable, archiver_pfe,
    get_annee_active, creer_annee, ouvrir_annee, fermer_annee_active, definir_deadline,
    supprimer_deadline as _supprimer_deadline,
    notifier_deadlines_etudiants, get_stats_livrables,
    generer_fiche_inscription, signer_fiche,
)


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
        if self.action in ('archiver', 'generer_fiche'):
            return [IsCoordinateur()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='resume')
    def mettre_a_jour_resume(self, request, pk=None):
        pfe = self.get_object()
        if request.user != pfe.encadrant_acad and request.user != pfe.encadrant_entr and request.user.role not in ('coordinateur', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul l'encadrant ou le coordinateur peut modifier le résumé.")
        resume    = request.data.get('resume',    pfe.resume)
        mots_cles = request.data.get('mots_cles', pfe.mots_cles)
        pfe.resume    = resume
        pfe.mots_cles = mots_cles
        pfe.save(update_fields=['resume', 'mots_cles', 'updated_at'])
        return success_response(data=PFESerializer(pfe).data)

    @action(detail=False, methods=['get'], url_path='mon-pfe')
    def mon_pfe(self, request):
        pfe = PFE.objects.select_related(
            'sujet', 'etudiant', 'encadrant_acad', 'encadrant_entr'
        ).prefetch_related('livrables').filter(etudiant=request.user).first()
        if not pfe:
            return success_response(data=None)
        return success_response(data=PFESerializer(pfe).data)

    @action(detail=True, methods=['get', 'post'], url_path='livrables')
    def livrables_list(self, request, pk=None):
        pfe = self.get_object()
        if request.method == 'GET':
            qs = pfe.livrables.all().order_by('-date_depot')
            return success_response(data=LivrableSerializer(qs, many=True).data)
        ser = LivrableNestedUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        livrable = upload_livrable(
            pfe=pfe,
            type_livrable=ser.validated_data['type_livrable'],
            fichier=ser.validated_data['fichier'],
            deposant=request.user,
        )
        return success_response(data=LivrableSerializer(livrable).data, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def archiver(self, request, pk=None):
        pfe = archiver_pfe(self.get_object(), request.user)
        return success_response(data=PFESerializer(pfe).data)

    @action(detail=True, methods=['post'], url_path='generer-fiche')
    def generer_fiche(self, request, pk=None):
        fiche = generer_fiche_inscription(self.get_object())
        return success_response(data=FicheInscriptionSerializer(fiche).data, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='fiche-pdf')
    def fiche_pdf(self, request, pk=None):
        from django.conf import settings
        pfe = self.get_object()
        if not hasattr(pfe, 'fiche_inscription') or not pfe.fiche_inscription.chemin_pdf:
            return success_response(message="Fiche non encore générée.", status_code=status.HTTP_404_NOT_FOUND)
        import os
        filepath = os.path.join(settings.MEDIA_ROOT, pfe.fiche_inscription.chemin_pdf)
        if not os.path.exists(filepath):
            return success_response(message="Fichier PDF introuvable.", status_code=status.HTTP_404_NOT_FOUND)
        return FileResponse(open(filepath, 'rb'), content_type='application/pdf',
                            as_attachment=True, filename=f"fiche_pfe_{pfe.pk}.pdf")

    @action(detail=True, methods=['post'], url_path='signer-fiche')
    def signer_fiche_action(self, request, pk=None):
        pfe = self.get_object()
        if not hasattr(pfe, 'fiche_inscription'):
            return success_response(message="Fiche non encore générée.", status_code=status.HTTP_404_NOT_FOUND)
        fiche = signer_fiche(pfe.fiche_inscription, request.user)
        return success_response(data=FicheInscriptionSerializer(fiche).data)


class AnneeAcademiqueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnneeAcademiqueSerializer
    queryset         = AnneeAcademique.objects.all()

    def get_permissions(self):
        if self.action in ('creer', 'ouvrir', 'fermer'):
            return [IsAdminOrCoordinateur()]
        if self.action in ('set_date_limite_soutenance', 'definir_deadline',
                           'supprimer_deadline', 'notifier_deadlines', 'stats_livrables'):
            return [IsCoordinateur()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def creer(self, request):
        ser = AnneeAcademiqueCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        annee = creer_annee(
            libelle=ser.validated_data['libelle'],
            date_debut=ser.validated_data['date_debut'],
            date_fin=ser.validated_data['date_fin'],
            coordinateur=request.user,
            date_limite_soutenance=ser.validated_data.get('date_limite_soutenance'),
        )
        return success_response(data=AnneeAcademiqueSerializer(annee).data, status_code=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def ouvrir(self, request, pk=None):
        annee = ouvrir_annee(pk, request.user)
        return success_response(data=AnneeAcademiqueSerializer(annee).data, message=f"Année {annee.libelle} ouverte.")

    @action(detail=False, methods=['post'])
    def fermer(self, request):
        fermer_annee_active(request.user)
        return success_response(message="Année active fermée.")

    @action(detail=False, methods=['get'])
    def active(self, request):
        annee = get_annee_active()
        return success_response(data=AnneeAcademiqueSerializer(annee).data if annee else None)

    @action(detail=True, methods=['get'])
    def deadlines(self, request, pk=None):
        annee = self.get_object()
        qs = Deadline.objects.filter(annee_academique=annee)
        return success_response(data=DeadlineSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'], url_path='date-limite-soutenance')
    def set_date_limite_soutenance(self, request, pk=None):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        import datetime
        annee = self.get_object()
        raw = request.data.get('date_limite_soutenance')
        if not raw:
            annee.date_limite_soutenance = None
            annee.save(update_fields=['date_limite_soutenance'])
            return success_response(data=AnneeAcademiqueSerializer(annee).data, message="Date limite supprimée.")
        try:
            date_val = datetime.date.fromisoformat(str(raw))
        except ValueError:
            raise DRFValidationError("Format de date invalide. Utilisez YYYY-MM-DD.")
        if date_val < annee.date_debut:
            raise DRFValidationError("La date limite ne peut pas être avant le début de l'année.")
        if date_val > annee.date_fin:
            raise DRFValidationError("La date limite ne peut pas dépasser la fin de l'année.")
        annee.date_limite_soutenance = date_val
        annee.save(update_fields=['date_limite_soutenance'])
        return success_response(data=AnneeAcademiqueSerializer(annee).data, message="Date limite mise à jour.")

    @action(detail=False, methods=['post'], url_path='definir-deadline')
    def definir_deadline(self, request):
        ser = DeadlineCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        deadline = definir_deadline(
            annee_id=ser.validated_data['annee_id'],
            type_livrable=ser.validated_data['type_livrable'],
            date_limite=ser.validated_data['date_limite'],
            coordinateur=request.user,
        )
        return success_response(data=DeadlineSerializer(deadline).data)

    @action(detail=False, methods=['post'], url_path='supprimer-deadline')
    def supprimer_deadline(self, request):
        annee_id      = request.data.get('annee_id')
        type_livrable = request.data.get('type_livrable')
        if not annee_id or not type_livrable:
            return success_response(
                message="annee_id et type_livrable sont requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        _supprimer_deadline(annee_id, type_livrable, request.user)
        return success_response(message="Deadline supprimée.")

    @action(detail=True, methods=['post'], url_path='notifier-deadlines')
    def notifier_deadlines(self, request, pk=None):
        count = notifier_deadlines_etudiants(pk, request.user)
        return success_response(message=f"{count} étudiant(s) notifié(s).")

    @action(detail=True, methods=['get'], url_path='stats-livrables')
    def stats_livrables(self, request, pk=None):
        data = get_stats_livrables(pk)
        return success_response(data=data)


class BibliothequeViewSet(viewsets.ReadOnlyModelViewSet):
    """PFE archivés — accessibles à tous les rôles authentifiés."""
    serializer_class = PFESerializer
    permission_classes = [IsAuthenticated]
    search_fields   = ['titre', 'filiere', 'etudiant__nom', 'etudiant__prenom']
    ordering_fields = ['annee', 'filiere']
    ordering        = ['-annee']

    def get_queryset(self):
        qs = PFE.objects.filter(statut='ARCHIVE').select_related(
            'sujet', 'etudiant', 'encadrant_acad', 'encadrant_entr', 'annee_academique'
        ).prefetch_related('livrables')
        filiere  = self.request.query_params.get('filiere')
        annee    = self.request.query_params.get('annee')
        encadrant = self.request.query_params.get('encadrant_id')
        mention  = self.request.query_params.get('mention')
        if filiere:
            qs = qs.filter(filiere__icontains=filiere)
        if annee:
            qs = qs.filter(annee=annee)
        if encadrant:
            qs = qs.filter(encadrant_acad_id=encadrant)
        if mention:
            qs = qs.filter(mention=mention)
        return qs


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
        return LivrableDetailSerializer

    def get_permissions(self):
        if self.action in ('valider', 'refuser'):
            return [IsEncadrant()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        ser = LivrableUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        livrable = upload_livrable(
            pfe=ser.validated_data['pfe'],
            type_livrable=ser.validated_data['type_livrable'],
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
