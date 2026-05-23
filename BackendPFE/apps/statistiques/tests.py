from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from apps.sujets.models import Sujet
from apps.pfe.models import PFE
from apps.soutenances.models import Soutenance

NO_THROTTLE = override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
)


def make_user(email, role, password='Pass1234!'):
    return CustomUser.objects.create_user(
        email=email, nom='Test', prenom='User', role=role, password=password
    )


def get_token(client, email, password='Pass1234!'):
    r = client.post(reverse('login'), {'email': email, 'password': password}, format='json')
    return r.data['data']['access']


def make_pfe_avec_soutenance(etudiant, encadrant, filiere='Finance', annee=2025, note=15.5):
    sujet = Sujet.objects.create(
        titre='Test Sujet', description='Desc', origine='academique',
        filiere=filiere, annee=annee, statut='VALIDE',
        propose_par=encadrant, etudiant_cible=etudiant,
        encadrant=encadrant,
    )
    pfe = PFE.objects.get(sujet=sujet)
    soutenance = Soutenance.objects.create(
        pfe=pfe, date='2025-06-15T09:00:00Z',
        salle='Salle A', duree=30, statut='TERMINEE',
        note_finale=note,
    )
    return pfe, soutenance


@NO_THROTTLE
class StatsGlobalesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.etudiant = make_user('e@iscae.mr', 'etudiant')
        self.encadrant = make_user('enc@iscae.mr', 'encadrant_acad')
        make_pfe_avec_soutenance(self.etudiant, self.encadrant)

    def _auth(self, email='e@iscae.mr'):
        token = get_token(self.client, email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_stats_globales(self):
        self._auth()
        r = self.client.get(reverse('stats-globales'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.data['data']
        self.assertIn('total_pfe', data)
        self.assertEqual(data['total_pfe'], 1)
        self.assertEqual(data['soutenances_terminees'], 1)

    def test_stats_filiere(self):
        self._auth()
        r = self.client.get(reverse('stats-filiere', args=['Finance']))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.data['data']
        self.assertEqual(data['filiere'], 'Finance')
        self.assertEqual(data['total_pfe'], 1)
        self.assertEqual(data['moyenne_notes'], 15.5)

    def test_stats_encadrant(self):
        self._auth()
        r = self.client.get(reverse('stats-encadrant', args=[self.encadrant.pk]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.data['data']
        self.assertEqual(data['total_pfe'], 1)
        self.assertEqual(data['moyenne_notes'], 15.5)

    def test_stats_encadrant_invalide(self):
        self._auth()
        r = self.client.get(reverse('stats-encadrant', args=[9999]))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_classement(self):
        self._auth()
        r = self.client.get(reverse('stats-classement'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['data'][0]['rang'], 1)
        self.assertEqual(r.data['data'][0]['note_finale'], 15.5)

    def test_classement_filtre_filiere(self):
        self._auth()
        r = self.client.get(reverse('stats-classement') + '?filiere=Finance')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)

    def test_classement_filtre_filiere_vide(self):
        self._auth()
        r = self.client.get(reverse('stats-classement') + '?filiere=Inconnu')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 0)

    def test_export_csv(self):
        self._auth()
        r = self.client.get(reverse('stats-export-csv'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r['Content-Type'], 'text/csv')
        self.assertIn('attachment', r['Content-Disposition'])

    def test_export_excel(self):
        self._auth()
        r = self.client.get(reverse('stats-export-excel'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', r['Content-Type'])

    def test_export_pdf(self):
        self._auth()
        r = self.client.get(reverse('stats-export-pdf'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r['Content-Type'], 'application/pdf')

    def test_unauthenticated_blocked(self):
        r = self.client.get(reverse('stats-globales'))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

