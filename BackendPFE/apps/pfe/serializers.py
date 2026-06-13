from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.sujets.serializers import SujetSerializer
from .models import PFE, Livrable, AnneeAcademique, Deadline, FicheInscription


class PFEMinSerializer(serializers.ModelSerializer):
    etudiant = serializers.SerializerMethodField()

    class Meta:
        model  = PFE
        fields = ['id', 'titre', 'filiere', 'etudiant']

    def get_etudiant(self, obj):
        return {
            'id':     obj.etudiant_id,
            'prenom': obj.etudiant.prenom,
            'nom':    obj.etudiant.nom,
        }


class LivrableSerializer(serializers.ModelSerializer):
    type_livrable         = serializers.CharField(source='type')
    type_livrable_display = serializers.CharField(source='get_type_display', read_only=True)
    statut_display        = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Livrable
        fields = [
            'id', 'pfe', 'type_livrable', 'type_livrable_display', 'fichier',
            'statut', 'statut_display', 'remarques', 'hors_delai', 'version', 'date_depot',
        ]
        read_only_fields = ['id', 'statut', 'hors_delai', 'version', 'date_depot']


class LivrableDetailSerializer(LivrableSerializer):
    """Utilisé dans LivrableViewSet (top-level) — inclut pfe+etudiant pour l'affichage encadrant."""
    pfe = PFEMinSerializer(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if not request:
            return data
        if instance.pfe.sujet and instance.pfe.sujet.confidentiel:
            user = request.user
            pfe = instance.pfe
            autorise = (
                user == pfe.etudiant or
                user == pfe.encadrant_acad or
                user == pfe.encadrant_entr or
                user.role in ('coordinateur', 'admin', 'scolarite') or
                (hasattr(pfe, 'soutenance') and pfe.soutenance.membres_jury.filter(pk=user.pk).exists())
            )
            if not autorise:
                data['fichier'] = None
        return data


class LivrableUploadSerializer(serializers.Serializer):
    pfe           = serializers.PrimaryKeyRelatedField(queryset=PFE.objects.all())
    type_livrable = serializers.ChoiceField(choices=Livrable.TYPES)
    fichier       = serializers.FileField()


class LivrableNestedUploadSerializer(serializers.Serializer):
    type_livrable = serializers.ChoiceField(choices=Livrable.TYPES)
    fichier       = serializers.FileField()


class LivrableActionSerializer(serializers.Serializer):
    remarques = serializers.CharField(required=False, allow_blank=True)


class AnneeAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AnneeAcademique
        fields = ['id', 'libelle', 'date_debut', 'date_fin', 'active', 'date_limite_soutenance']


class AnneeAcademiqueCreateSerializer(serializers.Serializer):
    libelle                = serializers.CharField(max_length=20)
    date_debut             = serializers.DateField()
    date_fin               = serializers.DateField()
    date_limite_soutenance = serializers.DateField(required=False, allow_null=True)

    def validate(self, data):
        if data['date_fin'] <= data['date_debut']:
            raise serializers.ValidationError(
                "La date de fin doit être postérieure à la date de début."
            )
        dls = data.get('date_limite_soutenance')
        if dls:
            if dls < data['date_debut']:
                raise serializers.ValidationError(
                    "La date limite des soutenances ne peut pas être avant le début de l'année."
                )
            if dls > data['date_fin']:
                raise serializers.ValidationError(
                    "La date limite des soutenances ne peut pas dépasser la fin de l'année."
                )
        return data


class DeadlineSerializer(serializers.ModelSerializer):
    type_livrable_display = serializers.CharField(source='get_type_livrable_display', read_only=True)

    class Meta:
        model  = Deadline
        fields = ['id', 'annee_academique', 'type_livrable', 'type_livrable_display', 'date_limite']


class DeadlineCreateSerializer(serializers.Serializer):
    annee_id      = serializers.IntegerField()
    type_livrable = serializers.ChoiceField(choices=Deadline.TYPES)
    date_limite   = serializers.DateTimeField()

    def validate_date_limite(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("La date limite doit être dans le futur.")
        return value


class FicheInscriptionSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = FicheInscription
        fields = [
            'id', 'pfe', 'statut', 'statut_display',
            'signe_encadrant', 'signe_coordinateur', 'chemin_pdf',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class PFESerializer(serializers.ModelSerializer):
    etudiant         = UserSerializer(read_only=True)
    encadrant_acad   = UserSerializer(read_only=True)
    encadrant_entr   = UserSerializer(read_only=True)
    sujet            = SujetSerializer(read_only=True)
    livrables        = LivrableSerializer(many=True, read_only=True)
    statut_display   = serializers.CharField(source='get_statut_display', read_only=True)
    mention_display  = serializers.CharField(source='get_mention_display', read_only=True)
    annee_academique = AnneeAcademiqueSerializer(read_only=True)
    fiche_inscription = FicheInscriptionSerializer(read_only=True)

    class Meta:
        model  = PFE
        fields = [
            'id', 'titre', 'filiere', 'annee', 'statut', 'statut_display',
            'score_plagiat', 'mention', 'mention_display',
            'resume', 'mots_cles',
            'annee_academique', 'sujet', 'etudiant',
            'encadrant_acad', 'encadrant_entr',
            'livrables', 'fiche_inscription', 'created_at', 'updated_at',
        ]
        read_only_fields = fields
