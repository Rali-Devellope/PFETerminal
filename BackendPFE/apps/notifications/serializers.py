from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import Notification, Message


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'titre', 'message', 'type', 'lu', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    expediteur   = UserSerializer(read_only=True)
    destinataire = UserSerializer(read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'expediteur', 'destinataire', 'contenu', 'lu', 'created_at']


class EnvoyerMessageSerializer(serializers.Serializer):
    destinataire_id = serializers.IntegerField()
    contenu         = serializers.CharField()
