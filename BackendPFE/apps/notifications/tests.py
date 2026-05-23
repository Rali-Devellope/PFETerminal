from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser
from .models import Notification
from .services import creer_notification, notifier

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


@NO_THROTTLE
class NotificationModelTests(TestCase):
    def setUp(self):
        self.user = make_user('u@iscae.mr', 'etudiant')

    def test_creer_notification(self):
        notif = creer_notification(self.user, 'Test', 'Corps', 'sujet_valide')
        self.assertEqual(notif.destinataire, self.user)
        self.assertFalse(notif.lu)

    def test_notifier_cree_en_base(self):
        with override_settings(EMAIL_BACKEND='django.core.mail.backends.dummy.EmailBackend'):
            notif = notifier(self.user, 'Titre', 'Message', 'sujet_valide', envoyer_mail=False)
        self.assertTrue(Notification.objects.filter(pk=notif.pk).exists())


@NO_THROTTLE
class NotificationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('u@iscae.mr', 'etudiant')
        creer_notification(self.user, 'Notif 1', 'Message 1', 'sujet_valide')
        creer_notification(self.user, 'Notif 2', 'Message 2', 'livrable_valide')

    def _auth(self):
        token = get_token(self.client, 'u@iscae.mr')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_liste_notifications(self):
        self._auth()
        r = self.client.get(reverse('notification-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data['results']), 2)

    def test_marquer_lu(self):
        self._auth()
        notif = Notification.objects.filter(destinataire=self.user).first()
        r = self.client.post(reverse('notification-lu', args=[notif.pk]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.lu)

    def test_marquer_tout_lu(self):
        self._auth()
        r = self.client.post(reverse('notification-tout-lu'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(destinataire=self.user, lu=False).count(), 0)

    def test_unauthenticated_blocked(self):
        r = self.client.get(reverse('notification-list'))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_autre_user_ne_voit_pas(self):
        autre = make_user('autre@iscae.mr', 'etudiant')
        token = get_token(self.client, 'autre@iscae.mr')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        r = self.client.get(reverse('notification-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data['results']), 0)

