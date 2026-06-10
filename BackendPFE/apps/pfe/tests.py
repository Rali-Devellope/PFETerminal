import io
import tempfile
import shutil
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from apps.sujets.models import Sujet
from .models import PFE, Livrable, AnneeAcademique, Deadline, FicheInscription

NO_THROTTLE = override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
)


def make_user(email, role, password='Pass1234!'):
    return CustomUser.objects.create_user(
        email=email, nom='Test', prenom='User', role=role, password=password
    )


def auth_client(user, password='Pass1234!'):
    client = APIClient()
    r = client.post(reverse('login'), {'email': user.email, 'password': password}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['data']['access']}")
    return client


def make_sujet(propose_par, statut='PROPOSE', encadrant=None):
    return Sujet.objects.create(
        titre='Sujet Test', description='Desc', origine='academique',
        filiere='Finance', annee=2025, statut=statut,
        propose_par=propose_par, encadrant=encadrant
    )


def make_pfe(etudiant, sujet, encadrant_acad=None):
    return PFE.objects.create(
        titre=sujet.titre, filiere=sujet.filiere, annee=sujet.annee,
        sujet=sujet, etudiant=etudiant, encadrant_acad=encadrant_acad
    )


def pdf_file(name='rapport.pdf'):
    content = b'%PDF-1.4 fake pdf content'
    return SimpleUploadedFile(name, content, content_type='application/pdf')


@NO_THROTTLE
class SignalPFETests(TestCase):
    def test_pfe_cree_automatiquement_quand_sujet_valide(self):
        etudiant = make_user('etud@iscae.mr', 'etudiant')
        sujet    = make_sujet(etudiant)
        self.assertEqual(PFE.objects.count(), 0)
        sujet.statut = 'VALIDE'
        sujet.save()
        self.assertEqual(PFE.objects.count(), 1)
        pfe = PFE.objects.first()
        self.assertEqual(pfe.etudiant, etudiant)
        self.assertEqual(pfe.titre, sujet.titre)

    def test_pas_de_doublon_si_valide_deux_fois(self):
        etudiant = make_user('etud@iscae.mr', 'etudiant')
        sujet    = make_sujet(etudiant)
        sujet.statut = 'VALIDE'
        sujet.save()
        sujet.save()  # 2Ã¨me save
        self.assertEqual(PFE.objects.count(), 1)

    def test_pfe_avec_encadrant_acad(self):
        etudiant  = make_user('etud@iscae.mr',  'etudiant')
        encadrant = make_user('enc@iscae.mr',   'encadrant_acad')
        sujet     = make_sujet(etudiant, encadrant=encadrant)
        sujet.statut = 'VALIDE'
        sujet.save()
        pfe = PFE.objects.first()
        self.assertEqual(pfe.encadrant_acad, encadrant)


@NO_THROTTLE
class PFEViewTests(TestCase):
    def setUp(self):
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.client_etud  = auth_client(self.etudiant)
        self.client_coord = auth_client(self.coordinateur)
        sujet    = make_sujet(self.etudiant)
        self.pfe = make_pfe(self.etudiant, sujet, self.encadrant)

    def test_etudiant_voit_son_pfe(self):
        r = self.client_etud.get('/api/v1/pfe/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)

    def test_coordinateur_archive_pfe(self):
        r = self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/archiver/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.pfe.refresh_from_db()
        self.assertEqual(self.pfe.statut, 'ARCHIVE')

    def test_etudiant_ne_peut_pas_archiver(self):
        r = self.client_etud.post(f'/api/v1/pfe/{self.pfe.pk}/archiver/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


@NO_THROTTLE
class LivrableTests(TestCase):
    def setUp(self):
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.client_etud  = auth_client(self.etudiant)
        self.client_enc   = auth_client(self.encadrant)
        sujet     = make_sujet(self.etudiant)
        self.pfe  = make_pfe(self.etudiant, sujet, self.encadrant)

    def test_etudiant_depose_rapport_pdf(self):
        data = {'pfe': self.pfe.pk, 'type_livrable': 'rapport', 'fichier': pdf_file()}
        r = self.client_etud.post('/api/v1/livrables/', data, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Livrable.objects.count(), 1)
        self.assertEqual(Livrable.objects.first().statut, 'EN_ATTENTE')

    def test_extension_invalide_refusee(self):
        bad_file = SimpleUploadedFile('rapport.exe', b'content', content_type='application/octet-stream')
        data = {'pfe': self.pfe.pk, 'type_livrable': 'rapport', 'fichier': bad_file}
        r = self.client_etud.post('/api/v1/livrables/', data, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_encadrant_valide_livrable(self):
        livrable = Livrable.objects.create(
            pfe=self.pfe, type='rapport', fichier=pdf_file()
        )
        r = self.client_enc.post(
            f'/api/v1/livrables/{livrable.pk}/valider/',
            {'remarques': 'Bon travail'}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        livrable.refresh_from_db()
        self.assertEqual(livrable.statut, 'VALIDE')

    def test_encadrant_refuse_livrable_avec_remarques(self):
        livrable = Livrable.objects.create(
            pfe=self.pfe, type='rapport', fichier=pdf_file()
        )
        r = self.client_enc.post(
            f'/api/v1/livrables/{livrable.pk}/refuser/',
            {'remarques': 'Ã€ revoir'}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        livrable.refresh_from_db()
        self.assertEqual(livrable.statut, 'REFUSE')

    def test_refus_sans_remarques_echoue(self):
        livrable = Livrable.objects.create(
            pfe=self.pfe, type='rapport', fichier=pdf_file()
        )
        r = self.client_enc.post(
            f'/api/v1/livrables/{livrable.pk}/refuser/',
            {'remarques': ''}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_autre_etudiant_ne_peut_pas_deposer(self):
        autre = make_user('autre@iscae.mr', 'etudiant')
        client_autre = auth_client(autre)
        data = {'pfe': self.pfe.pk, 'type': 'rapport', 'fichier': pdf_file()}
        r = client_autre.post('/api/v1/livrables/', data, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─── A1 + A2 — Année académique & Deadlines ───────────────────────────────────

@NO_THROTTLE
class AnneeAcademiqueTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.client_coord = auth_client(self.coordinateur)
        self.client_etud  = auth_client(self.etudiant)

    def test_creer_annee(self):
        data = {'libelle': '2024-2025', 'date_debut': '2024-09-01', 'date_fin': '2025-07-31'}
        r = self.client_coord.post(reverse('annee-creer'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AnneeAcademique.objects.count(), 1)

    def test_etudiant_ne_peut_pas_creer_annee(self):
        data = {'libelle': '2024-2025', 'date_debut': '2024-09-01', 'date_fin': '2025-07-31'}
        r = self.client_etud.post(reverse('annee-creer'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_une_seule_annee_active(self):
        a1 = AnneeAcademique.objects.create(
            libelle='2023-2024', date_debut='2023-09-01', date_fin='2024-07-31', active=True
        )
        a2 = AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31'
        )
        r = self.client_coord.post(reverse('annee-ouvrir', args=[a2.pk]), format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        a1.refresh_from_db()
        a2.refresh_from_db()
        self.assertFalse(a1.active)
        self.assertTrue(a2.active)

    def test_get_annee_active(self):
        AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31', active=True
        )
        r = self.client_etud.get(reverse('annee-active'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['data']['libelle'], '2024-2025')

    def test_get_annee_active_aucune(self):
        r = self.client_etud.get(reverse('annee-active'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNone(r.data['data'])

    def test_definir_deadline(self):
        annee = AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31'
        )
        data = {'annee_id': annee.pk, 'type_livrable': 'rapport', 'date_limite': '2025-05-01T23:59:00Z'}
        r = self.client_coord.post(reverse('annee-definir-deadline'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(Deadline.objects.count(), 1)

    def test_livrable_hors_delai(self):
        from django.utils import timezone
        from datetime import timedelta
        from apps.pfe.services import upload_livrable

        annee = AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31', active=True
        )
        Deadline.objects.create(
            annee_academique=annee, type_livrable='rapport',
            date_limite=timezone.now() - timedelta(hours=1),
        )
        sujet = Sujet.objects.create(
            titre='Test', description='Desc', origine='academique',
            filiere='Finance', annee=2025, statut='VALIDE', propose_par=self.etudiant,
        )
        pfe = PFE.objects.get(sujet=sujet)
        pfe.annee_academique = annee
        pfe.save()
        livrable = upload_livrable(pfe, 'rapport', pdf_file(), self.etudiant)
        self.assertTrue(livrable.hors_delai)

    def test_livrable_dans_delai_non_hors_delai(self):
        from django.utils import timezone
        from datetime import timedelta
        from apps.pfe.services import upload_livrable

        annee = AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31', active=True
        )
        Deadline.objects.create(
            annee_academique=annee, type_livrable='rapport',
            date_limite=timezone.now() + timedelta(days=10),
        )
        sujet = Sujet.objects.create(
            titre='Test', description='Desc', origine='academique',
            filiere='Finance', annee=2025, statut='VALIDE', propose_par=self.etudiant,
        )
        pfe = PFE.objects.get(sujet=sujet)
        pfe.annee_academique = annee
        pfe.save()
        livrable = upload_livrable(pfe, 'rapport', pdf_file(), self.etudiant)
        self.assertFalse(livrable.hors_delai)


# ─── B1 — Fiche d'inscription PDF ─────────────────────────────────────────────

FICHE_TMPDIR = tempfile.mkdtemp()


@NO_THROTTLE
@override_settings(MEDIA_ROOT=FICHE_TMPDIR)
class FicheInscriptionTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.client_coord = auth_client(self.coordinateur)
        self.client_enc   = auth_client(self.encadrant)
        sujet = make_sujet(self.etudiant)
        self.pfe = make_pfe(self.etudiant, sujet, self.encadrant)

    def test_generer_fiche_coordinateur(self):
        r = self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/generer-fiche/')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FicheInscription.objects.filter(pfe=self.pfe).exists())

    def test_etudiant_ne_peut_pas_generer_fiche(self):
        client_etud = auth_client(self.etudiant)
        r = client_etud.post(f'/api/v1/pfe/{self.pfe.pk}/generer-fiche/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_workflow_signature(self):
        self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/generer-fiche/')
        r = self.client_enc.post(f'/api/v1/pfe/{self.pfe.pk}/signer-fiche/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        fiche = FicheInscription.objects.get(pfe=self.pfe)
        self.assertEqual(fiche.statut, 'EN_ATTENTE_COORDINATEUR')
        self.assertTrue(fiche.signe_encadrant)

        r = self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/signer-fiche/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        fiche.refresh_from_db()
        self.assertEqual(fiche.statut, 'SIGNEE')
        self.assertTrue(fiche.signe_coordinateur)

    def test_coordinateur_ne_peut_pas_signer_avant_encadrant(self):
        self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/generer-fiche/')
        r = self.client_coord.post(f'/api/v1/pfe/{self.pfe.pk}/signer-fiche/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─── B2 — Bibliothèque PFE archivés ───────────────────────────────────────────

@NO_THROTTLE
class BibliothequeTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.client_etud  = auth_client(self.etudiant)
        self.client_coord = auth_client(self.coordinateur)

    def _make_pfe(self, statut='EN_COURS'):
        sujet = Sujet.objects.create(
            titre='PFE Test', description='Desc', origine='academique',
            filiere='Finance', annee=2025, statut='VALIDE',
            propose_par=self.etudiant,
        )
        pfe = PFE.objects.get(sujet=sujet)
        if statut != 'EN_COURS':
            pfe.statut = statut
            pfe.save()
        return pfe

    def test_liste_archives_vide(self):
        r = self.client_etud.get('/api/v1/bibliotheque/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 0)

    def test_pfe_archive_visible(self):
        self._make_pfe(statut='ARCHIVE')
        r = self.client_etud.get('/api/v1/bibliotheque/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)

    def test_pfe_en_cours_invisible(self):
        self._make_pfe(statut='EN_COURS')
        r = self.client_etud.get('/api/v1/bibliotheque/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 0)

    def test_filtre_filiere(self):
        self._make_pfe(statut='ARCHIVE')
        r = self.client_etud.get('/api/v1/bibliotheque/?filiere=Informatique')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 0)
        r2 = self.client_etud.get('/api/v1/bibliotheque/?filiere=Finance')
        self.assertEqual(r2.data['count'], 1)

