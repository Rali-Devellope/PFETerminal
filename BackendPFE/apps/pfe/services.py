import hashlib
import io
import os

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import PFE, Livrable, AnneeAcademique, Deadline, FicheInscription


# ── Année académique ───────────────────────────────────────────────────────────

def get_annee_active():
    return AnneeAcademique.objects.filter(active=True).first()


def creer_annee(libelle, date_debut, date_fin, coordinateur, date_limite_soutenance=None):
    if AnneeAcademique.objects.filter(libelle=libelle).exists():
        raise ValidationError(f"L'année académique '{libelle}' existe déjà.")
    if date_fin <= date_debut:
        raise ValidationError("La date de fin doit être postérieure à la date de début.")
    if date_limite_soutenance:
        if date_limite_soutenance < date_debut:
            raise ValidationError("La date limite des soutenances ne peut pas être avant le début de l'année.")
        if date_limite_soutenance > date_fin:
            raise ValidationError("La date limite des soutenances ne peut pas dépasser la fin de l'année.")
    return AnneeAcademique.objects.create(
        libelle=libelle, date_debut=date_debut, date_fin=date_fin,
        date_limite_soutenance=date_limite_soutenance,
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
    if date_limite <= timezone.now():
        raise ValidationError("La date limite doit être dans le futur.")
    deadline, _ = Deadline.objects.update_or_create(
        annee_academique=annee,
        type_livrable=type_livrable,
        defaults={'date_limite': date_limite},
    )
    return deadline


def supprimer_deadline(annee_id, type_livrable, coordinateur):
    try:
        annee = AnneeAcademique.objects.get(pk=annee_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")
    deleted, _ = Deadline.objects.filter(
        annee_academique=annee, type_livrable=type_livrable
    ).delete()
    if not deleted:
        raise ValidationError("Cette deadline n'existe pas.")


def notifier_deadlines_etudiants(annee_id, coordinateur):
    try:
        annee = AnneeAcademique.objects.get(pk=annee_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")
    deadlines = list(Deadline.objects.filter(annee_academique=annee).order_by('date_limite'))
    if not deadlines:
        raise ValidationError("Aucune deadline définie pour cette année.")
    labels = dict(Deadline.TYPES)
    lines = [
        f"• {labels.get(d.type_livrable, d.type_livrable)} : {d.date_limite.strftime('%d/%m/%Y à %H:%M')}"
        for d in deadlines
    ]
    message = "Deadlines de dépôt des livrables :\n" + "\n".join(lines)
    etudiants = (
        PFE.objects.filter(
            Q(annee_academique=annee) | Q(annee_academique__isnull=True),
            statut='EN_COURS',
        )
        .select_related('etudiant')
        .values_list('etudiant', flat=True)
        .distinct()
    )
    from apps.authentication.models import CustomUser
    from apps.notifications.services import notifier
    count = 0
    for etudiant in CustomUser.objects.filter(pk__in=etudiants):
        notifier(etudiant, "Deadlines livrables", message, 'deadline', envoyer_mail=True)
        count += 1
    return count


def get_stats_livrables(annee_id):
    try:
        annee = AnneeAcademique.objects.get(pk=annee_id)
    except AnneeAcademique.DoesNotExist:
        raise ValidationError("Année académique introuvable.")
    total_pfe = PFE.objects.filter(annee_academique=annee, statut='EN_COURS').count()
    result = []
    for type_key, type_label in Deadline.TYPES:
        qs = Livrable.objects.filter(pfe__annee_academique=annee, type=type_key)
        result.append({
            'type_livrable': type_key,
            'label': type_label,
            'total_pfe': total_pfe,
            'total_deposes': qs.count(),
            'en_delai': qs.filter(hors_delai=False).count(),
            'hors_delai': qs.filter(hors_delai=True).count(),
        })
    return result

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

    from django.db.models import Max
    max_version = pfe.livrables.filter(type=type_livrable).aggregate(m=Max('version'))['m'] or 0

    livrable = Livrable.objects.create(
        pfe=pfe, type=type_livrable, fichier=fichier,
        hors_delai=hors_delai, version=max_version + 1
    )
    _calculer_plagiat(pfe)
    from apps.notifications.services import notifier_livrable_depose
    notifier_livrable_depose(livrable)
    return livrable


def _extraire_texte_pdf(fichier_field):
    try:
        import PyPDF2
        fichier_field.seek(0)
        reader = PyPDF2.PdfReader(io.BytesIO(fichier_field.read()))
        texte = ' '.join(page.extract_text() or '' for page in reader.pages)
        return texte.strip()
    except Exception:
        return ''


def _similarite_jaccard(texte1, texte2):
    mots1 = set(texte1.lower().split())
    mots2 = set(texte2.lower().split())
    if not mots1 or not mots2:
        return 0.0
    return len(mots1 & mots2) / len(mots1 | mots2) * 100


def _calculer_plagiat(pfe):
    rapport = pfe.livrables.filter(type='rapport').order_by('-version').first()
    if not rapport or not rapport.fichier:
        pfe.score_plagiat = 0.0
        pfe.save(update_fields=['score_plagiat', 'updated_at'])
        return

    # Détection par hash (doublon exact)
    rapport.fichier.seek(0)
    hash_actuel = hashlib.md5(rapport.fichier.read()).hexdigest()

    autres = Livrable.objects.filter(
        type='rapport', statut='VALIDE'
    ).exclude(pfe=pfe).select_related('pfe')

    score_max = 0.0

    for autre in autres:
        if not autre.fichier:
            continue
        try:
            autre.fichier.seek(0)
            hash_autre = hashlib.md5(autre.fichier.read()).hexdigest()
        except Exception:
            continue
        if hash_actuel == hash_autre:
            score_max = 100.0
            break
        texte_actuel = _extraire_texte_pdf(rapport.fichier)
        texte_autre  = _extraire_texte_pdf(autre.fichier)
        if texte_actuel and texte_autre:
            sim = _similarite_jaccard(texte_actuel, texte_autre)
            score_max = max(score_max, sim)

    pfe.score_plagiat = round(score_max, 2)
    pfe.save(update_fields=['score_plagiat', 'updated_at'])


def valider_livrable(livrable, encadrant, remarques=''):
    if livrable.statut != 'EN_ATTENTE_VALIDATION':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'VALIDE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    from apps.notifications.services import notifier_livrable_valide
    notifier_livrable_valide(livrable)
    return livrable


def rejeter_livrable(livrable, encadrant, remarques):
    if not remarques:
        raise ValidationError("Des remarques sont obligatoires pour rejeter un livrable")
    if livrable.statut != 'EN_ATTENTE_VALIDATION':
        raise ValidationError("Ce livrable a déjà été traité")
    livrable.statut = 'REJETE'
    livrable.remarques = remarques
    livrable.save(update_fields=['statut', 'remarques'])
    from apps.notifications.services import notifier_livrable_refuse
    notifier_livrable_refuse(livrable)
    return livrable


# Alias conservé pour compatibilité avec les imports existants
refuser_livrable = rejeter_livrable


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
