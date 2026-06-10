from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from .models import Sujet

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


def make_sujet(propose_par, **kwargs):
    defaults = dict(
        titre='SystÃ¨me RH', description='Desc', origine='academique',
        filiere='Finance', annee=2025
    )
    defaults.update(kwargs)
    return Sujet.objects.create(propose_par=propose_par, **defaults)


@NO_THROTTLE
class SujetCRUDTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.client_coord = auth_client(self.coordinateur)
        self.client_etud  = auth_client(self.etudiant)

    def test_etudiant_propose_sujet(self):
        data = {'titre': 'Mon PFE', 'description': 'Desc', 'origine': 'academique',
                'filiere': 'Finance', 'annee': 2025}
        r = self.client_etud.post('/api/v1/sujets/', data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Sujet.objects.count(), 1)
        self.assertEqual(Sujet.objects.first().statut, 'PROPOSE')

    def test_liste_sujets_coordinateur(self):
        make_sujet(self.etudiant)
        make_sujet(self.etudiant, titre='Sujet 2')
        r = self.client_coord.get('/api/v1/sujets/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 2)

    def test_etudiant_voit_seulement_ses_sujets(self):
        make_sujet(self.etudiant)
        make_sujet(self.coordinateur, titre='Autre')
        r = self.client_etud.get('/api/v1/sujets/')
        self.assertEqual(r.data['count'], 1)

    def test_filtre_statut(self):
        make_sujet(self.etudiant, statut='PROPOSE')
        make_sujet(self.coordinateur, statut='VALIDE')
        r = self.client_coord.get('/api/v1/sujets/?statut=PROPOSE')
        self.assertEqual(r.data['count'], 1)

    def test_filtre_filiere(self):
        make_sujet(self.etudiant, filiere='Finance')
        make_sujet(self.etudiant, titre='S2', filiere='Marketing')
        r = self.client_etud.get('/api/v1/sujets/?filiere=Finance')
        self.assertEqual(r.data['count'], 1)


@NO_THROTTLE
class SujetValidationTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant     = make_user('etud@iscae.mr',  'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.client_coord = auth_client(self.coordinateur)
        self.client_etud  = auth_client(self.etudiant)
        self.sujet = make_sujet(self.etudiant)

    def test_coordinateur_valide_sujet(self):
        r = self.client_coord.post(f'/api/v1/sujets/{self.sujet.pk}/valider/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.sujet.refresh_from_db()
        self.assertEqual(self.sujet.statut, 'VALIDE')

    def test_etudiant_ne_peut_pas_valider(self):
        r = self.client_etud.post(f'/api/v1/sujets/{self.sujet.pk}/valider/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinateur_refuse_avec_motif(self):
        r = self.client_coord.post(
            f'/api/v1/sujets/{self.sujet.pk}/refuser/',
            {'motif': 'Sujet hors filiÃ¨re'}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.sujet.refresh_from_db()
        self.assertEqual(self.sujet.statut, 'REFUSE')
        self.assertEqual(self.sujet.motif_refus, 'Sujet hors filiÃ¨re')

    def test_refus_sans_motif_echoue(self):
        r = self.client_coord.post(
            f'/api/v1/sujets/{self.sujet.pk}/refuser/',
            {'motif': ''}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valider_sujet_deja_valide_echoue(self):
        self.sujet.statut = 'VALIDE'
        self.sujet.save()
        r = self.client_coord.post(f'/api/v1/sujets/{self.sujet.pk}/valider/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_affecter_encadrant(self):
        self.sujet.statut = 'VALIDE'
        self.sujet.save()
        r = self.client_coord.post(
            f'/api/v1/sujets/{self.sujet.pk}/affecter/',
            {'encadrant_id': self.encadrant.pk}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.sujet.refresh_from_db()
        self.assertEqual(self.sujet.statut, 'AFFECTE')
        self.assertEqual(self.sujet.encadrant, self.encadrant)

    def test_affecter_mauvais_role_echoue(self):
        self.sujet.statut = 'VALIDE'
        self.sujet.save()
        r = self.client_coord.post(
            f'/api/v1/sujets/{self.sujet.pk}/affecter/',
            {'encadrant_id': self.etudiant.pk}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─── A5 — Limite de charge par encadrant ──────────────────────────────────────

@NO_THROTTLE
class LimiteEncadrantTests(TestCase):
    def setUp(self):
        self.coordinateur = make_user('coord@iscae.mr', 'coordinateur')
        self.etudiant1    = make_user('etud1@iscae.mr', 'etudiant')
        self.etudiant2    = make_user('etud2@iscae.mr', 'etudiant')
        self.encadrant    = make_user('enc@iscae.mr',   'encadrant_acad')
        self.encadrant.max_etudiants = 1
        self.encadrant.save()
        self.client_coord = auth_client(self.coordinateur)

    def test_affectation_dans_limite(self):
        sujet = make_sujet(self.etudiant1, statut='VALIDE')
        r = self.client_coord.post(
            f'/api/v1/sujets/{sujet.pk}/affecter/',
            {'encadrant_id': self.encadrant.pk}, format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_affectation_hors_limite_echoue(self):
        from apps.pfe.models import PFE
        sujet1 = make_sujet(self.etudiant1, statut='VALIDE', encadrant=self.encadrant)
        sujet1.statut = 'VALIDE'
        sujet1.save()
        pfe = PFE.objects.get(sujet=sujet1)
        pfe.encadrant_acad = self.encadrant
        pfe.statut = 'EN_COURS'
        pfe.save()

        sujet2 = make_sujet(self.etudiant2, statut='VALIDE')
        r = self.client_coord.post(
            f'/api/v1/sujets/{sujet2.pk}/affecter/',
            {'encadrant_id': self.encadrant.pk}, format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

