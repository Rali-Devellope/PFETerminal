import io
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from apps.sujets.models import Sujet
from .models import PFE, Livrable

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
        data = {'pfe': self.pfe.pk, 'type': 'rapport', 'fichier': pdf_file()}
        r = self.client_etud.post('/api/v1/livrables/', data, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Livrable.objects.count(), 1)
        self.assertEqual(Livrable.objects.first().statut, 'EN_ATTENTE')

    def test_extension_invalide_refusee(self):
        bad_file = SimpleUploadedFile('rapport.exe', b'content', content_type='application/octet-stream')
        data = {'pfe': self.pfe.pk, 'type': 'rapport', 'fichier': bad_file}
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

