from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.pfe.serializers import PFESerializer
from .models import Soutenance, Note


class NoteSerializer(serializers.ModelSerializer):
    evaluateur = UserSerializer(read_only=True)

    class Meta:
        model  = Note
        fields = ['id', 'evaluateur', 'valeur', 'type', 'commentaire', 'created_at']


class SoutenanceSerializer(serializers.ModelSerializer):
    pfe            = PFESerializer(read_only=True)
    membres_jury   = UserSerializer(many=True, read_only=True)
    president_jury = UserSerializer(read_only=True)
    notes          = NoteSerializer(many=True, read_only=True)

    class Meta:
        model  = Soutenance
        fields = [
            'id', 'pfe', 'date', 'salle', 'duree', 'statut',
            'note_finale', 'membres_jury', 'president_jury', 'notes', 'created_at', 'updated_at',
        ]


class PlanifierSerializer(serializers.Serializer):
    pfe_id = serializers.IntegerField()
    date   = serializers.DateTimeField()
    salle  = serializers.CharField(max_length=50)
    duree  = serializers.IntegerField(min_value=1)


class AffecterJurySerializer(serializers.Serializer):
    jury_ids     = serializers.ListField(child=serializers.IntegerField(), min_length=2)
    president_id = serializers.IntegerField(required=False, allow_null=True)


class SoumettreNoteSerializer(serializers.Serializer):
    valeur      = serializers.FloatField(min_value=0, max_value=20)
    type        = serializers.ChoiceField(choices=['jury', 'encadrant'])
    commentaire = serializers.CharField(required=False, allow_blank=True, default='')


class PlanifierSessionSerializer(serializers.Serializer):
    filiere    = serializers.CharField(max_length=100)
    date_debut = serializers.DateTimeField()
    salle      = serializers.CharField(max_length=50)
    duree      = serializers.IntegerField(min_value=15, max_value=120)
