from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'nom', 'prenom', 'role', 'full_name',
                  'is_active', 'is_first_login', 'max_etudiants',
                  'filiere', 'telephone', 'matricule', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'is_first_login', 'created_at']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['email', 'nom', 'prenom', 'role', 'password', 'filiere', 'telephone', 'matricule']

    def validate_email(self, value):
        from core.utils import validate_iscae_email
        if not validate_iscae_email(value):
            raise serializers.ValidationError("L'email doit appartenir au domaine @iscae.mr")
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['nom', 'prenom', 'is_active', 'role', 'max_etudiants', 'filiere', 'telephone', 'matricule']


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Identifiants invalides")
        if not user.is_active:
            raise serializers.ValidationError("Votre compte est désactivé. Contactez l'administrateur.")
        data['user'] = user
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value
