from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin
from core.exceptions import success_response
from .models import Filiere
from .serializers import FiliereSerializer


class FiliereViewSet(viewsets.ModelViewSet):
    serializer_class = FiliereSerializer
    queryset = Filiere.objects.all()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = Filiere.objects.all()
        if self.action == 'list':
            active_only = self.request.query_params.get('active')
            if active_only == 'true':
                qs = qs.filter(active=True)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return success_response(data=FiliereSerializer(qs, many=True).data)

    def create(self, request, *args, **kwargs):
        ser = FiliereSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        filiere = ser.save()
        return success_response(data=FiliereSerializer(filiere).data, status_code=201)

    def update(self, request, *args, **kwargs):
        filiere = self.get_object()
        ser = FiliereSerializer(filiere, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        filiere = ser.save()
        return success_response(data=FiliereSerializer(filiere).data)

    def destroy(self, request, *args, **kwargs):
        filiere = self.get_object()
        filiere.delete()
        return success_response(message='Filière supprimée.')
