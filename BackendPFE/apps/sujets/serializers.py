from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.authentication.models import CustomUser
from .models import Sujet


class SujetSerializer(serializers.ModelSerializer):
    propose_par    = UserSerializer(read_only=True)
    encadrant      = UserSerializer(read_only=True)
    etudiant_cible = UserSerializer(read_only=True)
    etudiant       = serializers.SerializerMethodField()

    class Meta:
        model  = Sujet
        fields = [
            'id', 'titre', 'description', 'origine', 'statut',
            'filiere', 'annee', 'motif_refus', 'confidentiel',
            'propose_par', 'etudiant_cible', 'etudiant',
            'encadrant', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'statut', 'motif_refus', 'created_at', 'updated_at']

    def get_etudiant(self, obj):
        etudiant = obj.etudiant
        if etudiant:
            return UserSerializer(etudiant).data
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.confidentiel:
            return data
        request = self.context.get('request')
        if not request:
            return data
        user = request.user
        autorise = (
            user == instance.propose_par or
            user == instance.encadrant or
            user == instance.etudiant_cible or
            user.role in ('coordinateur', 'admin', 'scolarite')
        )
        if not autorise:
            data['description'] = '🔒 Description confidentielle'
        return data


class SujetCreateSerializer(serializers.ModelSerializer):
    etudiant_cible = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='etudiant'),
        required=False, allow_null=True
    )

    class Meta:
        model  = Sujet
        fields = ['titre', 'description', 'origine', 'filiere', 'annee', 'etudiant_cible', 'confidentiel']

    def validate_annee(self, value):
        if value < 2000 or value > 2100:
            raise serializers.ValidationError("Année invalide")
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request:
            proposeur = request.user
            if proposeur.role in ('encadrant_acad', 'encadrant_entr'):
                if not data.get('etudiant_cible'):
                    raise serializers.ValidationError(
                        "Un encadrant doit désigner un étudiant (etudiant_cible) pour proposer un sujet."
                    )
            elif proposeur.role == 'etudiant':
                data['etudiant_cible'] = None
        return data


class ValiderRefuserSerializer(serializers.Serializer):
    motif = serializers.CharField(required=False, allow_blank=True)


class AffecterEncadrantSerializer(serializers.Serializer):
    encadrant_id = serializers.IntegerField()
