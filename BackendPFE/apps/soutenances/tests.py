from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from apps.sujets.models import Sujet
from apps.pfe.models import PFE, AnneeAcademique
from .models import Soutenance, Note

NO_THROTTLE = override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
)


def make_user(email, role, password='Pass1234!'):
    return CustomUser.objects.create_user(
        email=email, nom='Test', prenom='User', role=role, password=password
    )


def make_pfe(etudiant, encadrant):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from apps.pfe.models import Livrable
    sujet = Sujet.objects.create(
        titre='Test Sujet', description='Desc', origine='academique',
        filiere='Finance', annee=2025, statut='VALIDE',
        propose_par=encadrant, etudiant_cible=etudiant,
        encadrant=encadrant,
    )
    pfe = PFE.objects.get(sujet=sujet)
    Livrable.objects.create(
        pfe=pfe, type='rapport',
        fichier=SimpleUploadedFile('rapport.pdf', b'%PDF-1.4', content_type='application/pdf'),
        statut='VALIDE',
    )
    return pfe


def get_token(client, email, password='Pass1234!'):
    r = client.post(reverse('login'), {'email': email, 'password': password}, format='json')
    return r.data['data']['access']


@NO_THROTTLE
class PlanifierSoutenanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etu@iscae.mr',   'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.pfe = make_pfe(self.etudiant, self.encadrant)

    def _auth(self, email):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_coordinateur_planifie_soutenance(self):
        self._auth('coord@iscae.mr')
        data = {
            'pfe_id': self.pfe.pk,
            'date': (timezone.now() + timedelta(days=10)).isoformat(),
            'salle': 'A1',
            'duree': 30,
        }
        r = self.client.post(reverse('soutenance-planifier'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Soutenance.objects.filter(pfe=self.pfe).exists())

    def test_double_planification_echoue(self):
        self._auth('coord@iscae.mr')
        data = {
            'pfe_id': self.pfe.pk,
            'date': (timezone.now() + timedelta(days=10)).isoformat(),
            'salle': 'A1',
            'duree': 30,
        }
        self.client.post(reverse('soutenance-planifier'), data, format='json')
        r = self.client.post(reverse('soutenance-planifier'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_etudiant_ne_peut_pas_planifier(self):
        self._auth('etu@iscae.mr')
        data = {
            'pfe_id': self.pfe.pk,
            'date': (timezone.now() + timedelta(days=10)).isoformat(),
            'salle': 'A1',
            'duree': 30,
        }
        r = self.client.post(reverse('soutenance-planifier'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_date_passee_echoue(self):
        self._auth('coord@iscae.mr')
        data = {
            'pfe_id': self.pfe.pk,
            'date': (timezone.now() - timedelta(days=1)).isoformat(),
            'salle': 'A1',
            'duree': 30,
        }
        r = self.client.post(reverse('soutenance-planifier'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


@NO_THROTTLE
class AffecterJuryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etu@iscae.mr',   'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.jury1 = make_user('j1@iscae.mr', 'jury')
        self.jury2 = make_user('j2@iscae.mr', 'jury')
        pfe = make_pfe(self.etudiant, self.encadrant)
        self.soutenance = Soutenance.objects.create(
            pfe=pfe,
            date=timezone.now() + timedelta(days=5),
            salle='B2',
            duree=45,
        )

    def _auth(self, email):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_affecter_jury_valide(self):
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-affecter-jury', args=[self.soutenance.pk]),
            {'jury_ids': [self.jury1.pk, self.jury2.pk]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self.soutenance.membres_jury.count(), 2)

    def test_affecter_mauvais_role_echoue(self):
        self._auth('coord@iscae.mr')
        non_jury = make_user('nj@iscae.mr', 'etudiant')
        r = self.client.post(
            reverse('soutenance-affecter-jury', args=[self.soutenance.pk]),
            {'jury_ids': [non_jury.pk, self.jury1.pk]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_affecter_un_seul_echoue(self):
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-affecter-jury', args=[self.soutenance.pk]),
            {'jury_ids': [self.jury1.pk]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


@NO_THROTTLE
class NoterSoutenanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etu@iscae.mr',   'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.jury1 = make_user('j1@iscae.mr', 'jury')
        self.jury2 = make_user('j2@iscae.mr', 'jury')
        pfe = make_pfe(self.etudiant, self.encadrant)
        self.soutenance = Soutenance.objects.create(
            pfe=pfe,
            date=timezone.now() + timedelta(days=5),
            salle='B2',
            duree=45,
        )
        self.soutenance.membres_jury.set([self.jury1, self.jury2])

    def _auth(self, email):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_jury_soumet_note(self):
        self._auth('j1@iscae.mr')
        r = self.client.post(
            reverse('soutenance-noter', args=[self.soutenance.pk]),
            {'valeur': 15.5, 'type': 'jury', 'commentaire': 'Bon travail'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(Note.objects.filter(soutenance=self.soutenance, evaluateur=self.jury1).exists())

    def test_non_jury_ne_peut_pas_noter_jury(self):
        self._auth('enc@iscae.mr')
        r = self.client.post(
            reverse('soutenance-noter', args=[self.soutenance.pk]),
            {'valeur': 15, 'type': 'jury'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_note_hors_plage_echoue(self):
        self._auth('j1@iscae.mr')
        r = self.client.post(
            reverse('soutenance-noter', args=[self.soutenance.pk]),
            {'valeur': 25, 'type': 'jury'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_calculer_note_finale(self):
        self._auth('j1@iscae.mr')
        self.client.post(
            reverse('soutenance-noter', args=[self.soutenance.pk]),
            {'valeur': 14, 'type': 'jury'},
            format='json',
        )
        self._auth('j2@iscae.mr')
        self.client.post(
            reverse('soutenance-noter', args=[self.soutenance.pk]),
            {'valeur': 16, 'type': 'jury'},
            format='json',
        )
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-calculer-finale', args=[self.soutenance.pk]),
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.soutenance.refresh_from_db()
        self.assertEqual(self.soutenance.note_finale, 15.0)
        self.assertEqual(self.soutenance.statut, 'TERMINEE')


# ─── A3 — Autorisation soutenance + convocation PDF ───────────────────────────

@NO_THROTTLE
class AutoriserSoutenanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etu@iscae.mr',   'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.jury1 = make_user('j1@iscae.mr', 'jury')
        self.jury2 = make_user('j2@iscae.mr', 'jury')
        pfe = make_pfe(self.etudiant, self.encadrant)
        self.soutenance = Soutenance.objects.create(
            pfe=pfe,
            date=timezone.now() + timedelta(days=10),
            salle='Salle C',
            duree=30,
            statut='EN_ATTENTE_AUTORISATION',
        )

    def _auth(self, email):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_autoriser_sans_jury_echoue(self):
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-autoriser', args=[self.soutenance.pk]),
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_autoriser_avec_jury_ok(self):
        self.soutenance.membres_jury.set([self.jury1, self.jury2])
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-autoriser', args=[self.soutenance.pk]),
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.soutenance.refresh_from_db()
        self.assertEqual(self.soutenance.statut, 'PLANIFIEE')

    def test_etudiant_ne_peut_pas_autoriser(self):
        self.soutenance.membres_jury.set([self.jury1, self.jury2])
        self._auth('etu@iscae.mr')
        r = self.client.post(
            reverse('soutenance-autoriser', args=[self.soutenance.pk]),
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_autoriser_deux_fois_echoue(self):
        self.soutenance.membres_jury.set([self.jury1, self.jury2])
        self._auth('coord@iscae.mr')
        self.client.post(reverse('soutenance-autoriser', args=[self.soutenance.pk]))
        r = self.client.post(reverse('soutenance-autoriser', args=[self.soutenance.pk]))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─── A4 — Délibération et mentions ────────────────────────────────────────────

@NO_THROTTLE
class CloturerSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etu@iscae.mr',   'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.annee = AnneeAcademique.objects.create(
            libelle='2024-2025', date_debut='2024-09-01', date_fin='2025-07-31', active=True
        )
        pfe = make_pfe(self.etudiant, self.encadrant)
        self.soutenance = Soutenance.objects.create(
            pfe=pfe,
            date=timezone.now() - timedelta(days=1),
            salle='Salle A',
            duree=30,
            statut='TERMINEE',
            note_finale=16.5,
            annee_academique=self.annee,
        )

    def _auth(self, email):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_cloturer_session_mention_tres_bien(self):
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-cloturer-session'),
            {'annee_academique_id': self.annee.pk},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        pfe = self.soutenance.pfe
        pfe.refresh_from_db()
        self.assertEqual(pfe.mention, 'tres_bien')
        self.assertEqual(pfe.statut, 'VALIDE')
        self.annee.refresh_from_db()
        self.assertFalse(self.annee.active)

    def test_cloturer_session_ajourne(self):
        self.soutenance.note_finale = 8.0
        self.soutenance.save()
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-cloturer-session'),
            {'annee_academique_id': self.annee.pk},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        pfe = self.soutenance.pfe
        pfe.refresh_from_db()
        self.assertEqual(pfe.mention, 'ajourne')
        self.assertEqual(pfe.statut, 'REFUSE')

    def test_cloturer_avec_soutenance_non_terminee_echoue(self):
        self.soutenance.statut = 'PLANIFIEE'
        self.soutenance.save()
        self._auth('coord@iscae.mr')
        r = self.client.post(
            reverse('soutenance-cloturer-session'),
            {'annee_academique_id': self.annee.pk},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_etudiant_ne_peut_pas_cloturer(self):
        self._auth('etu@iscae.mr')
        r = self.client.post(
            reverse('soutenance-cloturer-session'),
            {'annee_academique_id': self.annee.pk},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

