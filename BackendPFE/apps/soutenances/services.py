from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.authentication.models import CustomUser
from apps.pfe.models import PFE
from .models import Soutenance, Note


def planifier_soutenance(pfe_id, date, salle, duree, coordinateur):
    try:
        pfe = PFE.objects.get(pk=pfe_id)
    except PFE.DoesNotExist:
        raise ValidationError("PFE introuvable.")

    if pfe.statut != 'EN_COURS':
        raise ValidationError("Le PFE doit être en cours pour planifier une soutenance.")

    if Soutenance.objects.filter(pfe=pfe).exists():
        raise ValidationError("Une soutenance existe déjà pour ce PFE.")

    if date <= timezone.now():
        raise ValidationError("La date de soutenance doit être dans le futur.")

    soutenance = Soutenance.objects.create(
        pfe=pfe,
        date=date,
        salle=salle,
        duree=duree,
        statut='PLANIFIEE',
    )
    from apps.notifications.services import notifier_soutenance_planifiee
    notifier_soutenance_planifiee(soutenance)
    return soutenance


def affecter_jury(soutenance, jury_ids):
    membres = CustomUser.objects.filter(pk__in=jury_ids, role='jury')
    if membres.count() != len(jury_ids):
        raise ValidationError("Un ou plusieurs membres du jury sont invalides.")
    if membres.count() < 2:
        raise ValidationError("Il faut au moins 2 membres dans le jury.")
    soutenance.membres_jury.set(membres)
    soutenance.save()
    return soutenance


def soumettre_note(soutenance, evaluateur, valeur, type_note, commentaire=''):
    if not (0 <= valeur <= 20):
        raise ValidationError("La note doit être entre 0 et 20.")

    if type_note == 'jury' and evaluateur not in soutenance.membres_jury.all():
        raise ValidationError("Vous n'êtes pas membre du jury de cette soutenance.")

    note, _ = Note.objects.update_or_create(
        soutenance=soutenance,
        evaluateur=evaluateur,
        type=type_note,
        defaults={'valeur': valeur, 'commentaire': commentaire},
    )
    return note


def calculer_note_finale(soutenance):
    notes_jury = soutenance.notes.filter(type='jury')
    notes_enc  = soutenance.notes.filter(type='encadrant')

    if not notes_jury.exists():
        raise ValidationError("Aucune note jury soumise.")

    moy_jury = sum(n.valeur for n in notes_jury) / notes_jury.count()

    if notes_enc.exists():
        moy_enc = sum(n.valeur for n in notes_enc) / notes_enc.count()
        finale  = round(moy_jury * 0.6 + moy_enc * 0.4, 2)
    else:
        finale = round(moy_jury, 2)

    soutenance.note_finale = finale
    soutenance.statut = 'TERMINEE'
    soutenance.save()

    Note.objects.update_or_create(
        soutenance=soutenance,
        evaluateur=soutenance.pfe.encadrant_acad or soutenance.membres_jury.first(),
        type='finale',
        defaults={'valeur': finale, 'commentaire': 'Calculée automatiquement'},
    )
    return soutenance


def generer_pv_pdf(soutenance):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h - 60, "PROCÈS-VERBAL DE SOUTENANCE")

        c.setFont("Helvetica", 12)
        pfe = soutenance.pfe
        lines = [
            f"Titre : {pfe.titre}",
            f"Étudiant : {pfe.etudiant.prenom} {pfe.etudiant.nom}",
            f"Filière : {pfe.filiere}",
            f"Année : {pfe.annee}",
            f"Date : {soutenance.date.strftime('%d/%m/%Y %H:%M')}",
            f"Salle : {soutenance.salle}",
            f"Durée : {soutenance.duree} minutes",
            "",
            "Membres du jury :",
        ]
        y = h - 120
        for line in lines:
            c.drawString(60, y, line)
            y -= 20

        for membre in soutenance.membres_jury.all():
            c.drawString(80, y, f"- {membre.prenom} {membre.nom}")
            y -= 20

        y -= 10
        c.drawString(60, y, "Notes :")
        y -= 20
        for note in soutenance.notes.select_related('evaluateur'):
            c.drawString(80, y, f"- {note.evaluateur.prenom} {note.evaluateur.nom} ({note.type}) : {note.valeur}/20")
            y -= 20

        if soutenance.note_finale is not None:
            y -= 10
            c.setFont("Helvetica-Bold", 13)
            c.drawString(60, y, f"Note finale : {soutenance.note_finale}/20")

        c.save()
        buf.seek(0)
        return buf
    except ImportError:
        raise ValidationError("reportlab n'est pas installé.")
