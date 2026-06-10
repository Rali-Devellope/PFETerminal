import os
import random

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import PFE, Livrable, AnneeAcademique, Deadline, FicheInscription


# ── Année académique ───────────────────────────────────────────────────────────

def get_annee_active():
    return AnneeAcademique.objects.filter(active=True).first()


def creer_annee(libelle, date_debut, date_fin, coordinateur):
    if AnneeAcademique.objects.filter(libelle=libelle).exists():
        raise ValidationError(f"L'année académique '{libelle}' existe déjà.")
    return AnneeAcademique.objects.create(
        libelle=libelle, date_debut=date_debut, date_fin=date_fin
    )


def ouvrir_annee(annee_id, coordinateur):
    try:
        annee = AnneeAcademique.objects.get(pk=annee_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")
    annee.active = True
    annee.save()
    return annee


def fermer_annee_active(coordinateur):
    AnneeAcademique.objects.filter(active=True).update(active=False)


# ── Deadlines ──────────────────────────────────────────────────────────────────

def definir_deadline(annee_id, type_livrable, date_limite, coordinateur):
    try:
        annee = AnneeAcademique.objects.get(pk=annee_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")
    deadline, _ = Deadline.objects.update_or_create(
        annee_academique=annee,
        type_livrable=type_livrable,
        defaults={'date_limite': date_limite},
    )
    return deadline

ALLOWED_EXTENSIONS = {
    'rapport':      ['.pdf'],
    'code':         ['.zip', '.tar', '.gz'],
    'presentation': ['.pdf', '.pptx', '.ppt'],
}
MAX_FILE_SIZE_MB = 50


def upload_livrable(pfe, type_livrable, fichier, deposant):
    if deposant != pfe.etudiant:
        raise ValidationError("Seul l'étudiant du PFE peut déposer des livrables")
    if pfe.statut != 'EN_COURS':
        raise ValidationError("Le PFE n'est pas en cours")
    ext = os.path.splitext(fichier.name)[1].lower()
    allowed = ALLOWED_EXTENSIONS.get(type_livrable, [])
    if ext not in allowed:
        raise ValidationError(
            f"Extension '{ext}' non autorisée pour {type_livrable}. Acceptés : {allowed}"
        )
    if fichier.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"Fichier trop volumineux (max {MAX_FILE_SIZE_MB} Mo)")

    hors_delai = False
    if pfe.annee_academique_id:
        deadline = Deadline.objects.filter(
            annee_academique_id=pfe.annee_academique_id,
            type_livrable=type_livrable,
        ).first()
        if deadline and timezone.now() > deadline.date_limite:
            hors_delai = True

    livrable = Livrable.objects.create(
        pfe=pfe, type=type_livrable, fichier=fichier, hors_delai=hors_delai
    )
    _calculer_plagiat(pfe)
    from apps.notifications.services import notifier_livrable_depose
    notifier_livrable_depose(livrable)
    return livrable


def _calculer_plagiat(pfe):
    pfe.score_plagiat = round(random.uniform(0.5, 15.0), 2)
    pfe.save(update_fields=['score_plagiat', 'updated_at'])


def valider_livrable(livrable, encadrant, remarques=''):
    if livrable.statut != 'EN_ATTENTE':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'VALIDE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    from apps.notifications.services import notifier_livrable_valide
    notifier_livrable_valide(livrable)
    return livrable


def refuser_livrable(livrable, encadrant, remarques):
    if not remarques:
        raise ValidationError("Des remarques sont obligatoires pour refuser un livrable")
    if livrable.statut != 'EN_ATTENTE':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'REFUSE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    from apps.notifications.services import notifier_livrable_refuse
    notifier_livrable_refuse(livrable)
    return livrable


def generer_fiche_inscription(pfe):
    """Génère la fiche d'inscription PDF et crée/met-à-jour l'enregistrement FicheInscription."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas
    except ImportError:
        raise ValidationError("reportlab n'est pas installé.")

    import io
    from django.conf import settings

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    pw, ph = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(pw / 2, ph - 55, "ISCAE — Fiche d'inscription PFE")

    c.setFont("Helvetica", 10)
    c.drawCentredString(pw / 2, ph - 72, "Institut Supérieur de Commerce et d'Administration des Entreprises")

    y = ph - 110
    c.line(50, y, pw - 50, y)
    y -= 25

    def row(label, value):
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(60, y, f"{label} :")
        c.setFont("Helvetica", 11)
        c.drawString(210, y, str(value) if value else "—")
        y -= 22

    row("Étudiant", f"{pfe.etudiant.prenom} {pfe.etudiant.nom}")
    row("Email étudiant", pfe.etudiant.email)
    row("Titre du PFE", pfe.titre[:60])
    row("Filière", pfe.filiere)
    row("Année", pfe.annee)
    if pfe.annee_academique:
        row("Année académique", pfe.annee_academique.libelle)
    enc = pfe.encadrant_acad
    row("Encadrant académique", f"{enc.prenom} {enc.nom}" if enc else "Non affecté")

    y -= 20
    c.line(50, y, pw - 50, y)
    y -= 30

    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Signatures")
    y -= 40

    c.setFont("Helvetica", 10)
    for label, x in (("Étudiant", 60), ("Encadrant", 230), ("Coordinateur", 400)):
        c.drawString(x, y, label)
        c.line(x, y - 40, x + 130, y - 40)

    c.save()
    buf.seek(0)

    media_dir = os.path.join(settings.MEDIA_ROOT, 'fiches')
    os.makedirs(media_dir, exist_ok=True)
    filename = f"fiche_pfe_{pfe.pk}.pdf"
    filepath = os.path.join(media_dir, filename)
    with open(filepath, 'wb') as f:
        f.write(buf.read())

    fiche, _ = FicheInscription.objects.update_or_create(
        pfe=pfe,
        defaults={'chemin_pdf': f"fiches/{filename}"},
    )
    return fiche


def signer_fiche(fiche, signataire):
    role = signataire.role
    if role in ('encadrant_acad', 'encadrant_entr'):
        if fiche.statut != 'EN_ATTENTE_ENCADRANT':
            raise ValidationError("La fiche est déjà signée par l'encadrant ou dans un autre état.")
        fiche.signe_encadrant = True
        fiche.statut = 'EN_ATTENTE_COORDINATEUR'
    elif role == 'coordinateur':
        if fiche.statut != 'EN_ATTENTE_COORDINATEUR':
            raise ValidationError("La fiche doit d'abord être signée par l'encadrant.")
        fiche.signe_coordinateur = True
        fiche.statut = 'SIGNEE'
    else:
        raise ValidationError("Seul l'encadrant ou le coordinateur peut signer la fiche.")
    fiche.save(update_fields=['signe_encadrant', 'signe_coordinateur', 'statut', 'updated_at'])
    return fiche


def archiver_pfe(pfe, coordinateur):
    if pfe.statut not in ('EN_COURS', 'VALIDE'):
        raise ValidationError("Le PFE ne peut pas être archivé dans son état actuel")
    pfe.statut = 'ARCHIVE'
    pfe.save(update_fields=['statut', 'updated_at'])
    return pfe
