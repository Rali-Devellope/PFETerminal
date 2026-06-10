from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.sujets.serializers import SujetSerializer
from .models import PFE, Livrable, AnneeAcademique, Deadline, FicheInscription


class LivrableSerializer(serializers.ModelSerializer):
    type_livrable         = serializers.CharField(source='type')
    type_livrable_display = serializers.CharField(source='get_type_display', read_only=True)
    statut_display        = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Livrable
        fields = [
            'id', 'pfe', 'type_livrable', 'type_livrable_display', 'fichier',
            'statut', 'statut_display', 'remarques', 'hors_delai', 'date_depot',
        ]
        read_only_fields = ['id', 'statut', 'hors_delai', 'date_depot']

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
        fields = ['id', 'libelle', 'date_debut', 'date_fin', 'active']


class AnneeAcademiqueCreateSerializer(serializers.Serializer):
    libelle    = serializers.CharField(max_length=20)
    date_debut = serializers.DateField()
    date_fin   = serializers.DateField()


class DeadlineSerializer(serializers.ModelSerializer):
    type_livrable_display = serializers.CharField(source='get_type_livrable_display', read_only=True)

    class Meta:
        model  = Deadline
        fields = ['id', 'annee_academique', 'type_livrable', 'type_livrable_display', 'date_limite']


class DeadlineCreateSerializer(serializers.Serializer):
    annee_id      = serializers.IntegerField()
    type_livrable = serializers.ChoiceField(choices=Deadline.TYPES)
    date_limite   = serializers.DateTimeField()


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
            'annee_academique', 'sujet', 'etudiant',
            'encadrant_acad', 'encadrant_entr',
            'livrables', 'fiche_inscription', 'created_at', 'updated_at',
        ]
        read_only_fields = fields
