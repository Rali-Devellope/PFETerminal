from rest_framework import serializers
from .models import Filiere


class FiliereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filiere
        fields = ['id', 'libelle', 'code', 'active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_libelle(self, value):
        return value.strip()
