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


def generer_planning_pdf(soutenances):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        # En-tête
        c.setFillColorRGB(0.118, 0.227, 0.373)
        c.rect(0, h - 70, w, 70, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h - 30, "PLANNING DES SOUTENANCES PFE")
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, h - 48, "ISCAE Mauritanie")

        c.setFillColorRGB(0, 0, 0)
        y = h - 95

        # En-tête tableau
        cols = [50, 120, 250, 365, 435, 500]
        headers = ["Date", "Heure", "Étudiant", "Salle", "Durée", "Jury"]
        c.setFont("Helvetica-Bold", 9)
        for col, h_label in zip(cols, headers):
            c.drawString(col, y, h_label)
        y -= 5
        c.line(45, y, w - 45, y)
        y -= 12

        c.setFont("Helvetica", 8)
        for s in soutenances:
            if y < 60:
                c.showPage()
                y = h - 60
                c.setFont("Helvetica", 8)
            jury = ", ".join(f"{m.prenom[0]}. {m.nom}" for m in s.membres_jury.all()[:2])
            c.drawString(cols[0], y, s.date.strftime('%d/%m/%Y'))
            c.drawString(cols[1], y, s.date.strftime('%H:%M'))
            etudiant = f"{s.pfe.etudiant.prenom} {s.pfe.etudiant.nom}"
            c.drawString(cols[2], y, etudiant[:22])
            c.drawString(cols[3], y, s.salle[:10])
            c.drawString(cols[4], y, f"{s.duree}mn")
            c.drawString(cols[5], y, jury[:12])
            y -= 15
            c.line(45, y + 2, w - 45, y + 2)
            y -= 3

        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(w / 2, 40, f"Généré le {__import__('datetime').date.today().strftime('%d/%m/%Y')} — ISCAE Mauritanie")
        c.save()
        buf.seek(0)
        return buf
    except ImportError:
        from rest_framework.exceptions import ValidationError
        raise ValidationError("reportlab n'est pas installé.")


def _get_mention(note):
    if note >= 16: return "Très bien"
    if note >= 14: return "Bien"
    if note >= 12: return "Assez bien"
    if note >= 10: return "Passable"
    return "Insuffisant"


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


def generer_releve_notes(soutenance):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        import io

        if soutenance.note_finale is None:
            raise ValidationError("La note finale n'a pas encore été calculée.")

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4
        pfe = soutenance.pfe
        etudiant = pfe.etudiant

        # En-tête
        c.setFillColorRGB(0.118, 0.227, 0.373)
        c.rect(0, h - 80, w, 80, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h - 35, "RELEVÉ DE NOTES — PFE")
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, h - 55, "ISCAE Mauritanie — Institut Supérieur de Comptabilité et d'Administration des Entreprises")

        c.setFillColorRGB(0, 0, 0)
        y = h - 110

        # Infos étudiant
        c.setFont("Helvetica-Bold", 12)
        c.drawString(60, y, "Informations de l'étudiant")
        c.line(60, y - 4, 300, y - 4)
        y -= 25
        c.setFont("Helvetica", 11)
        infos = [
            ("Nom complet", f"{etudiant.prenom} {etudiant.nom}"),
            ("Email", etudiant.email),
            ("Filière", pfe.filiere),
            ("Année universitaire", str(pfe.annee)),
        ]
        for label, value in infos:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(60, y, f"{label} :")
            c.setFont("Helvetica", 10)
            c.drawString(200, y, value)
            y -= 18
        y -= 10

        # PFE
        c.setFont("Helvetica-Bold", 12)
        c.drawString(60, y, "Projet de Fin d'Études")
        c.line(60, y - 4, 300, y - 4)
        y -= 25
        c.setFont("Helvetica", 10)
        c.drawString(60, y, "Titre :")
        c.setFont("Helvetica-Bold", 10)
        titre = pfe.titre if len(pfe.titre) <= 60 else pfe.titre[:57] + "..."
        c.drawString(120, y, titre)
        y -= 18

        if soutenance.date:
            c.setFont("Helvetica", 10)
            c.drawString(60, y, "Date de soutenance :")
            c.drawString(200, y, soutenance.date.strftime('%d/%m/%Y'))
            y -= 18
        y -= 15

        # Notes
        c.setFont("Helvetica-Bold", 12)
        c.drawString(60, y, "Détail des notes")
        c.line(60, y - 4, 300, y - 4)
        y -= 25

        for note in soutenance.notes.select_related('evaluateur').exclude(type='finale'):
            c.setFont("Helvetica", 10)
            type_label = {"jury": "Jury", "encadrant": "Encadrant"}.get(note.type, note.type)
            c.drawString(80, y, f"• {type_label} — {note.evaluateur.prenom} {note.evaluateur.nom}")
            c.setFont("Helvetica-Bold", 10)
            c.drawString(380, y, f"{note.valeur}/20")
            y -= 18

        y -= 10
        mention = _get_mention(soutenance.note_finale)

        # Note finale encadrée
        c.setFillColorRGB(0.94, 1.0, 0.95)
        c.rect(55, y - 10, w - 110, 36, fill=1, stroke=0)
        c.setFillColorRGB(0.12, 0.55, 0.2)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(70, y + 12, "Note finale :")
        c.drawString(200, y + 12, f"{soutenance.note_finale}/20  —  {mention}")
        c.setFillColorRGB(0, 0, 0)

        y -= 50
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(w / 2, 40, f"Document généré le {soutenance.updated_at.strftime('%d/%m/%Y')} — ISCAE Mauritanie")

        c.save()
        buf.seek(0)
        return buf
    except ImportError:
        raise ValidationError("reportlab n'est pas installé.")


def generer_attestation(soutenance):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io

        if soutenance.note_finale is None:
            raise ValidationError("La note finale n'a pas encore été calculée.")
        if soutenance.note_finale < 10:
            raise ValidationError("L'étudiant n'a pas validé son PFE (note < 10).")

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4
        pfe = soutenance.pfe
        etudiant = pfe.etudiant
        mention = _get_mention(soutenance.note_finale)

        # Bordure décorative
        c.setStrokeColorRGB(0.118, 0.227, 0.373)
        c.setLineWidth(3)
        c.rect(30, 30, w - 60, h - 60, fill=0, stroke=1)
        c.setLineWidth(1)
        c.rect(40, 40, w - 80, h - 80, fill=0, stroke=1)

        # Logo texte ISCAE
        c.setFillColorRGB(0.118, 0.227, 0.373)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(w / 2, h - 90, "ISCAE MAURITANIE")
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, h - 108, "Institut Supérieur de Comptabilité et d'Administration des Entreprises")

        c.setFillColorRGB(0.118, 0.227, 0.373)
        c.line(100, h - 120, w - 100, h - 120)

        # Titre
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(w / 2, h - 175, "ATTESTATION DE RÉUSSITE")
        c.setFont("Helvetica", 12)
        c.drawCentredString(w / 2, h - 200, "Projet de Fin d'Études")

        # Corps
        y = h - 260
        c.setFont("Helvetica", 12)
        c.drawCentredString(w / 2, y, "L'ISCAE Mauritanie atteste que")
        y -= 35

        c.setFont("Helvetica-Bold", 18)
        c.setFillColorRGB(0.118, 0.227, 0.373)
        c.drawCentredString(w / 2, y, f"{etudiant.prenom.upper()} {etudiant.nom.upper()}")
        y -= 30

        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 12)
        c.drawCentredString(w / 2, y, f"de la filière {pfe.filiere} — promotion {pfe.annee}")
        y -= 45

        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, y, "a soutenu avec succès le projet de fin d'études intitulé :")
        y -= 30

        c.setFont("Helvetica-Bold", 12)
        titre = pfe.titre if len(pfe.titre) <= 65 else pfe.titre[:62] + "..."
        c.drawCentredString(w / 2, y, f'« {titre} »')
        y -= 45

        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, y, f"le {soutenance.date.strftime('%d %B %Y')} avec la note de")
        y -= 30

        c.setFont("Helvetica-Bold", 24)
        c.setFillColorRGB(0.118, 0.55, 0.2)
        c.drawCentredString(w / 2, y, f"{soutenance.note_finale}/20")
        y -= 25

        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(w / 2, y, f"Mention : {mention}")
        c.setFillColorRGB(0, 0, 0)

        # Signature
        y -= 70
        c.setFont("Helvetica", 10)
        c.drawString(w - 220, y, "Le Directeur de l'ISCAE")
        y -= 50
        c.line(w - 220, y, w - 80, y)
        y -= 15
        c.drawString(w - 220, y, "Signature et cachet")

        # Pied de page
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(w / 2, 60, f"Délivré le {soutenance.updated_at.strftime('%d/%m/%Y')} — Document officiel ISCAE Mauritanie")

        c.save()
        buf.seek(0)
        return buf
    except ImportError:
        raise ValidationError("reportlab n'est pas installé.")
