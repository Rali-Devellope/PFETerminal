from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.sujets.serializers import SujetSerializer
from .models import PFE, Livrable


class LivrableSerializer(serializers.ModelSerializer):
    type_display   = serializers.CharField(source='get_type_display',   read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Livrable
        fields = [
            'id', 'pfe', 'type', 'type_display', 'fichier',
            'statut', 'statut_display', 'remarques', 'date_depot',
        ]
        read_only_fields = ['id', 'statut', 'date_depot']


class LivrableUploadSerializer(serializers.Serializer):
    pfe     = serializers.PrimaryKeyRelatedField(queryset=PFE.objects.all())
    type    = serializers.ChoiceField(choices=Livrable.TYPES)
    fichier = serializers.FileField()


class LivrableActionSerializer(serializers.Serializer):
    remarques = serializers.CharField(required=False, allow_blank=True)


class PFESerializer(serializers.ModelSerializer):
    etudiant       = UserSerializer(read_only=True)
    encadrant_acad = UserSerializer(read_only=True)
    encadrant_entr = UserSerializer(read_only=True)
    sujet          = SujetSerializer(read_only=True)
    livrables      = LivrableSerializer(many=True, read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = PFE
        fields = [
            'id', 'titre', 'filiere', 'annee', 'statut', 'statut_display',
            'score_plagiat', 'sujet', 'etudiant',
            'encadrant_acad', 'encadrant_entr',
            'livrables', 'created_at', 'updated_at',
        ]
        read_only_fields = fields
