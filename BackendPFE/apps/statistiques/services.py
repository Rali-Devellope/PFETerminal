import csv
import io

from django.db.models import Avg, Count

from apps.pfe.models import PFE
from apps.sujets.models import Sujet
from apps.soutenances.models import Soutenance


def calculer_stats_globales():
    notes = Soutenance.objects.filter(note_finale__isnull=False)
    return {
        'total_pfe':              PFE.objects.count(),
        'pfe_en_cours':           PFE.objects.filter(statut='EN_COURS').count(),
        'pfe_archives':           PFE.objects.filter(statut='ARCHIVE').count(),
        'total_sujets':           Sujet.objects.count(),
        'sujets_en_attente':      Sujet.objects.filter(statut='PROPOSE').count(),
        'total_soutenances':      Soutenance.objects.count(),
        'soutenances_terminees':  Soutenance.objects.filter(statut='TERMINEE').count(),
        'moyenne_notes':          round(notes.aggregate(avg=Avg('note_finale'))['avg'] or 0, 2),
    }


def calculer_stats_toutes_filieres():
    from django.db.models import Count, Avg
    filieres = PFE.objects.values('filiere').annotate(
        total=Count('id'),
        en_cours=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(statut='EN_COURS')),
        archives=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(statut='ARCHIVE')),
    ).order_by('-total')
    result = []
    for f in filieres:
        avg = Soutenance.objects.filter(pfe__filiere=f['filiere'], note_finale__isnull=False).aggregate(avg=Avg('note_finale'))['avg']
        result.append({
            'filiere': f['filiere'],
            'total': f['total'],
            'en_cours': f['en_cours'],
            'archives': f['archives'],
            'moyenne': round(avg or 0, 2),
        })
    return result


def calculer_stats_filiere(filiere):
    pfe_qs = PFE.objects.filter(filiere=filiere)
    avg = Soutenance.objects.filter(
        pfe__filiere=filiere, note_finale__isnull=False
    ).aggregate(avg=Avg('note_finale'))['avg']
    plagiat = pfe_qs.aggregate(avg=Avg('score_plagiat'))['avg']
    return {
        'filiere':             filiere,
        'total_pfe':           pfe_qs.count(),
        'pfe_en_cours':        pfe_qs.filter(statut='EN_COURS').count(),
        'pfe_archives':        pfe_qs.filter(statut='ARCHIVE').count(),
        'moyenne_notes':       round(avg or 0, 2),
        'taux_plagiat_moyen':  round(plagiat or 0, 2),
    }


def calculer_stats_encadrant(encadrant_id):
    from rest_framework.exceptions import ValidationError
    from apps.authentication.models import CustomUser
    try:
        encadrant = CustomUser.objects.get(pk=encadrant_id)
    except CustomUser.DoesNotExist:
        raise ValidationError("Encadrant introuvable.")
    pfe_qs = PFE.objects.filter(encadrant_acad=encadrant)
    avg = Soutenance.objects.filter(
        pfe__encadrant_acad=encadrant, note_finale__isnull=False
    ).aggregate(avg=Avg('note_finale'))['avg']
    return {
        'encadrant':    f"{encadrant.prenom} {encadrant.nom}",
        'total_pfe':    pfe_qs.count(),
        'pfe_en_cours': pfe_qs.filter(statut='EN_COURS').count(),
        'pfe_archives': pfe_qs.filter(statut='ARCHIVE').count(),
        'moyenne_notes': round(avg or 0, 2),
    }


def classement_etudiants(filiere=None, annee=None):
    qs = Soutenance.objects.filter(
        note_finale__isnull=False
    ).select_related('pfe__etudiant', 'pfe')
    if filiere:
        qs = qs.filter(pfe__filiere=filiere)
    if annee:
        qs = qs.filter(pfe__annee=annee)
    return qs.order_by('-note_finale')


def export_csv(filiere=None, annee=None):
    qs = classement_etudiants(filiere, annee)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['Rang', 'Etudiant', 'Filiere', 'Annee', 'Titre PFE', 'Note Finale', 'Score Plagiat'])
    for i, s in enumerate(qs, 1):
        writer.writerow([
            i,
            f"{s.pfe.etudiant.prenom} {s.pfe.etudiant.nom}",
            s.pfe.filiere,
            s.pfe.annee,
            s.pfe.titre,
            s.note_finale,
            s.pfe.score_plagiat,
        ])
    buf.seek(0)
    return buf


def export_excel(filiere=None, annee=None):
    from openpyxl import Workbook
    qs = classement_etudiants(filiere, annee)
    wb = Workbook()
    ws = wb.active
    ws.title = "Classement PFE"
    ws.append(['Rang', 'Etudiant', 'Filiere', 'Annee', 'Titre PFE', 'Note Finale', 'Score Plagiat'])
    for i, s in enumerate(qs, 1):
        ws.append([
            i,
            f"{s.pfe.etudiant.prenom} {s.pfe.etudiant.nom}",
            s.pfe.filiere,
            s.pfe.annee,
            s.pfe.titre,
            s.note_finale,
            s.pfe.score_plagiat,
        ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def export_pdf(filiere=None, annee=None):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas
    except ImportError:
        from rest_framework.exceptions import ValidationError
        raise ValidationError("reportlab n'est pas installé.")

    qs = classement_etudiants(filiere, annee)
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    pw, ph = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(pw / 2, ph - 60, "Classement PFE — ISCAE")

    c.setFont("Helvetica-Bold", 11)
    cols = [50, 185, 300, 365, 415, 475]
    headers = ["Rang", "Etudiant", "Filiere", "Annee", "Note", "Plagiat"]
    y = ph - 100
    for col, h in zip(cols, headers):
        c.drawString(col, y, h)
    y -= 5
    c.line(50, y, 530, y)
    y -= 15

    c.setFont("Helvetica", 10)
    for i, s in enumerate(qs, 1):
        if y < 60:
            c.showPage()
            y = ph - 60
            c.setFont("Helvetica", 10)
        c.drawString(cols[0], y, str(i))
        c.drawString(cols[1], y, f"{s.pfe.etudiant.prenom} {s.pfe.etudiant.nom}"[:18])
        c.drawString(cols[2], y, s.pfe.filiere[:14])
        c.drawString(cols[3], y, str(s.pfe.annee))
        c.drawString(cols[4], y, f"{s.note_finale}/20")
        c.drawString(cols[5], y, f"{s.pfe.score_plagiat}%")
        y -= 18

    c.save()
    buf.seek(0)
    return buf
