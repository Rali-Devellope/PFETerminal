from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import (
    calculer_stats_encadrant,
    calculer_stats_filiere,
    calculer_stats_globales,
    classement_etudiants,
    export_csv,
    export_excel,
    export_pdf,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_globales(request):
    return Response({'success': True, 'data': calculer_stats_globales()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_filiere(request, filiere):
    return Response({'success': True, 'data': calculer_stats_filiere(filiere)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_encadrant(request, pk):
    return Response({'success': True, 'data': calculer_stats_encadrant(pk)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classement(request):
    filiere = request.query_params.get('filiere')
    annee = request.query_params.get('annee')
    qs = classement_etudiants(filiere, annee)
    data = [
        {
            'rang': i,
            'soutenance_id': s.id,
            'etudiant': f"{s.pfe.etudiant.prenom} {s.pfe.etudiant.nom}",
            'filiere': s.pfe.filiere,
            'annee': s.pfe.annee,
            'titre': s.pfe.titre,
            'note_finale': s.note_finale,
            'score_plagiat': s.pfe.score_plagiat,
        }
        for i, s in enumerate(qs, 1)
    ]
    return Response({'success': True, 'count': len(data), 'data': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_csv_view(request):
    filiere = request.query_params.get('filiere')
    annee = request.query_params.get('annee')
    buf = export_csv(filiere, annee)
    response = HttpResponse(buf.read(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="pfe_classement.csv"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_excel_view(request):
    filiere = request.query_params.get('filiere')
    annee = request.query_params.get('annee')
    buf = export_excel(filiere, annee)
    content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    response = HttpResponse(buf.read(), content_type=content_type)
    response['Content-Disposition'] = 'attachment; filename="pfe_classement.xlsx"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf_view(request):
    filiere = request.query_params.get('filiere')
    annee = request.query_params.get('annee')
    buf = export_pdf(filiere, annee)
    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="pfe_classement.pdf"'
    return response
