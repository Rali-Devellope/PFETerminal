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

    # Vérification des conditions pour soutenir
    rapport_valide = pfe.livrables.filter(type='rapport', statut='VALIDE').exists()
    if not rapport_valide:
        raise ValidationError(
            "Condition non remplie : le rapport doit être déposé et validé avant de planifier une soutenance."
        )

    SEUIL_PLAGIAT = 30.0
    if pfe.score_plagiat > SEUIL_PLAGIAT:
        raise ValidationError(
            f"Condition non remplie : le score de plagiat ({pfe.score_plagiat}%) dépasse le seuil autorisé ({SEUIL_PLAGIAT}%)."
        )

    if pfe.annee_academique and pfe.annee_academique.date_limite_soutenance:
        limite = pfe.annee_academique.date_limite_soutenance
        if date.date() > limite:
            raise ValidationError(
                f"La date de soutenance ({date.strftime('%d/%m/%Y')}) dépasse la date limite "
                f"des soutenances de l'année {pfe.annee_academique.libelle} ({limite.strftime('%d/%m/%Y')})."
            )

    soutenance = Soutenance.objects.create(
        pfe=pfe,
        date=date,
        salle=salle,
        duree=duree,
        statut='EN_ATTENTE_AUTORISATION',
        annee_academique=pfe.annee_academique,
    )
    return soutenance


def planifier_session_filiere(filiere, date_debut, salle, duree, coordinateur):
    from datetime import timedelta
    from apps.pfe.models import PFE

    pfe_qs = PFE.objects.filter(
        filiere=filiere,
        statut='EN_COURS',
        livrables__type='rapport',
        livrables__statut='VALIDE',
        score_plagiat__lte=30,
    ).exclude(soutenance__isnull=False).distinct()

    if not pfe_qs.exists():
        raise ValidationError(
            f"Aucun PFE éligible trouvé pour la filière « {filiere} ». "
            "Vérifiez que les rapports sont validés et qu'aucune soutenance n'est déjà planifiée."
        )

    if date_debut <= timezone.now():
        raise ValidationError("La date de début doit être dans le futur.")

    annee_ref = pfe_qs.first().annee_academique
    if annee_ref and annee_ref.date_limite_soutenance:
        derniere_date = date_debut + timedelta(minutes=duree * (pfe_qs.count() - 1))
        if derniere_date.date() > annee_ref.date_limite_soutenance:
            raise ValidationError(
                f"La session dépasse la date limite des soutenances "
                f"({annee_ref.date_limite_soutenance.strftime('%d/%m/%Y')}). "
                f"Choisissez une date de début plus tôt ou réduisez la durée."
            )

    soutenances = []
    current_time = date_debut
    for pfe in pfe_qs.order_by('etudiant__nom'):
        s = Soutenance.objects.create(
            pfe=pfe,
            date=current_time,
            salle=salle,
            duree=duree,
            statut='EN_ATTENTE_AUTORISATION',
            annee_academique=pfe.annee_academique,
        )
        soutenances.append(s)
        current_time += timedelta(minutes=duree)

    return soutenances


def preview_session_filiere(filiere):
    from apps.pfe.models import PFE
    pfe_qs = PFE.objects.filter(
        filiere=filiere,
        statut='EN_COURS',
        livrables__type='rapport',
        livrables__statut='VALIDE',
        score_plagiat__lte=30,
    ).exclude(soutenance__isnull=False).distinct().order_by('etudiant__nom')

    return [
        {
            'pfe_id': p.pk,
            'etudiant': f"{p.etudiant.prenom} {p.etudiant.nom}",
            'titre': p.titre,
        }
        for p in pfe_qs
    ]


def autoriser_soutenance(soutenance):
    if soutenance.statut != 'EN_ATTENTE_AUTORISATION':
        raise ValidationError("Cette soutenance est déjà autorisée ou dans un autre état.")
    if soutenance.membres_jury.count() < 2:
        raise ValidationError("Impossible d'autoriser : le jury doit être affecté (minimum 2 membres).")
    soutenance.statut = 'PLANIFIEE'
    soutenance.save(update_fields=['statut', 'updated_at'])
    from apps.notifications.services import notifier_soutenance_planifiee
    notifier_soutenance_planifiee(soutenance)
    generer_convocation_pdf(soutenance)
    return soutenance


def affecter_jury(soutenance, jury_ids, president_id=None):
    membres = CustomUser.objects.filter(pk__in=jury_ids, role='jury')
    if membres.count() != len(jury_ids):
        raise ValidationError("Un ou plusieurs membres du jury sont invalides.")
    if membres.count() < 2:
        raise ValidationError("Il faut au moins 2 membres dans le jury.")
    soutenance.membres_jury.set(membres)
    if president_id is not None:
        if not membres.filter(pk=president_id).exists():
            raise ValidationError("Le président doit être l'un des membres du jury.")
        soutenance.president_jury = membres.get(pk=president_id)
    soutenance.save()
    return soutenance


def soumettre_note(soutenance, evaluateur, valeur, type_note, commentaire=''):
    if not (0 <= valeur <= 20):
        raise ValidationError("La note doit être entre 0 et 20.")

    if type_note == 'jury' and evaluateur not in soutenance.membres_jury.all():
        raise ValidationError("Vous n'êtes pas membre du jury de cette soutenance.")

    if type_note == 'encadrant':
        encadrants_autorises = [e for e in [soutenance.pfe.encadrant_acad, soutenance.pfe.encadrant_entr] if e]
        if evaluateur not in encadrants_autorises:
            raise ValidationError("Vous n'êtes pas l'encadrant de ce PFE.")

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

    from apps.notifications.services import notifier_note_finale
    notifier_note_finale(soutenance)

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


def _get_mention_code(note):
    if note >= 16: return "tres_bien"
    if note >= 14: return "bien"
    if note >= 12: return "assez_bien"
    if note >= 10: return "passable"
    return "ajourne"


def generer_convocation_pdf(soutenance):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io

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
        c.drawCentredString(w / 2, h - 35, "CONVOCATION À LA SOUTENANCE DE PFE")
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, h - 55, "ISCAE Mauritanie — Institut Supérieur de Comptabilité et d'Administration des Entreprises")

        c.setFillColorRGB(0, 0, 0)
        y = h - 110

        c.setFont("Helvetica", 11)
        c.drawString(60, y, f"Monsieur / Madame  {etudiant.prenom} {etudiant.nom.upper()}  est convoqué(e) à la soutenance")
        y -= 18
        c.drawString(60, y, "de son Projet de Fin d'Études dans les conditions suivantes :")
        y -= 35

        infos = [
            ("Titre du PFE",        pfe.titre),
            ("Filière",             pfe.filiere),
            ("Date",                soutenance.date.strftime('%A %d %B %Y')),
            ("Heure",               soutenance.date.strftime('%H:%M')),
            ("Salle",               soutenance.salle),
            ("Durée",               f"{soutenance.duree} minutes"),
            ("Encadrant",           f"{pfe.encadrant_acad.prenom} {pfe.encadrant_acad.nom}" if pfe.encadrant_acad else "—"),
        ]
        for label, value in infos:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(70, y, f"{label} :")
            c.setFont("Helvetica", 10)
            val = value if len(str(value)) <= 65 else str(value)[:62] + "..."
            c.drawString(210, y, val)
            y -= 20

        y -= 15
        c.setFont("Helvetica-Bold", 11)
        c.drawString(60, y, "Composition du jury :")
        y -= 20
        c.setFont("Helvetica", 10)
        for membre in soutenance.membres_jury.all():
            c.drawString(80, y, f"•  {membre.prenom} {membre.nom}")
            y -= 18

        y -= 30
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(60, y, "Veuillez vous présenter 15 minutes avant l'heure prévue avec une pièce d'identité.")
        y -= 50

        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 10)
        c.drawString(w - 220, y, "Le Coordinateur PFE")
        y -= 55
        c.line(w - 220, y, w - 80, y)
        y -= 15
        c.setFont("Helvetica", 9)
        c.drawString(w - 220, y, "Signature et cachet")

        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        import datetime
        c.drawCentredString(w / 2, 40, f"Document généré le {datetime.date.today().strftime('%d/%m/%Y')} — ISCAE Mauritanie")

        c.save()
        buf.seek(0)
        return buf
    except ImportError:
        raise ValidationError("reportlab n'est pas installé.")


def cloturer_session(annee_academique_id):
    from apps.pfe.models import AnneeAcademique

    try:
        annee = AnneeAcademique.objects.get(pk=annee_academique_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")

    soutenances_terminees = Soutenance.objects.filter(
        annee_academique=annee, statut='TERMINEE'
    ).select_related('pfe')

    soutenances_en_attente = Soutenance.objects.filter(
        annee_academique=annee
    ).exclude(statut='TERMINEE').count()

    if soutenances_en_attente > 0:
        raise ValidationError(
            f"{soutenances_en_attente} soutenance(s) ne sont pas encore terminées dans cette année."
        )

    resultats = []
    for soutenance in soutenances_terminees:
        pfe = soutenance.pfe
        if soutenance.note_finale is None:
            continue
        mention_code = _get_mention_code(soutenance.note_finale)
        nouveau_statut = 'VALIDE' if soutenance.note_finale >= 10 else 'REFUSE'
        pfe.mention = mention_code
        pfe.statut = nouveau_statut
        pfe.save(update_fields=['mention', 'statut', 'updated_at'])

        from apps.notifications.services import notifier_resultats_publies
        notifier_resultats_publies(soutenance, mention_code)
        resultats.append({
            'pfe_id': pfe.pk,
            'etudiant': pfe.etudiant.full_name,
            'note_finale': soutenance.note_finale,
            'mention': _get_mention(soutenance.note_finale),
            'statut': nouveau_statut,
        })

    annee.active = False
    annee.save(update_fields=['active'])

    return resultats


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
            is_president = soutenance.president_jury_id == membre.pk
            label = f"- {membre.prenom} {membre.nom}" + (" (Président)" if is_president else "")
            c.drawString(80, y, label)
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
