from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

NO_THROTTLE = override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
)

from .models import CustomUser


def make_user(email='test@iscae.mr', role='etudiant', password='Pass1234!', first=False):
    return CustomUser.objects.create_user(
        email=email, nom='Test', prenom='User', role=role, password=password, is_first_login=first
    )


def make_admin(email='admin@iscae.mr', password='Admin1234!'):
    user = CustomUser.objects.create_superuser(
        email=email, nom='Admin', prenom='Super', role='admin', password=password
    )
    return user


def get_tokens(client, email, password):
    r = client.post(reverse('login'), {'email': email, 'password': password}, format='json')
    return r.data['data']['access'], r.data['data']['refresh']


@NO_THROTTLE
class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(password='Pass1234!')

    def test_login_success(self):
        r = self.client.post(reverse('login'), {'email': 'test@iscae.mr', 'password': 'Pass1234!'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data['data'])

    def test_login_wrong_password(self):
        r = self.client.post(reverse('login'), {'email': 'test@iscae.mr', 'password': 'wrong'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_unknown_email(self):
        r = self.client.post(reverse('login'), {'email': 'nobody@iscae.mr', 'password': 'Pass1234!'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


@NO_THROTTLE
class TokenRefreshTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(password='Pass1234!')

    def test_refresh_token(self):
        _, refresh = get_tokens(self.client, 'test@iscae.mr', 'Pass1234!')
        r = self.client.post(reverse('token-refresh'), {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)


@NO_THROTTLE
class LogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(password='Pass1234!')

    def test_logout_blacklists_token(self):
        access, refresh = get_tokens(self.client, 'test@iscae.mr', 'Pass1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = self.client.post(reverse('logout'), {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r2 = self.client.post(reverse('token-refresh'), {'refresh': refresh}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_401_UNAUTHORIZED)


@NO_THROTTLE
class MeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(password='Pass1234!')

    def test_me_authenticated(self):
        access, _ = get_tokens(self.client, 'test@iscae.mr', 'Pass1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = self.client.get(reverse('me'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['data']['email'], 'test@iscae.mr')

    def test_me_unauthenticated(self):
        r = self.client.get(reverse('me'))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


@NO_THROTTLE
class AdminCreateUserTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()

    def _auth(self):
        access, _ = get_tokens(self.client, 'admin@iscae.mr', 'Admin1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_admin_creates_user(self):
        self._auth()
        data = {'email': 'student@iscae.mr', 'nom': 'Alaoui', 'prenom': 'Rachid', 'role': 'etudiant'}
        r = self.client.post(reverse('user-create'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(email='student@iscae.mr').exists())

    def test_non_admin_cannot_create_user(self):
        user = make_user(email='enc@iscae.mr', role='encadrant_acad', password='Pass1234!')
        access, _ = get_tokens(self.client, 'enc@iscae.mr', 'Pass1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        data = {'email': 'x@iscae.mr', 'nom': 'X', 'prenom': 'X', 'role': 'etudiant'}
        r = self.client.post(reverse('user-create'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_email_domain(self):
        self._auth()
        data = {'email': 'student@gmail.com', 'nom': 'A', 'prenom': 'B', 'role': 'etudiant'}
        r = self.client.post(reverse('user-create'), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


@NO_THROTTLE
class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(password='Pass1234!')

    def test_change_password_success(self):
        access, _ = get_tokens(self.client, 'test@iscae.mr', 'Pass1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = self.client.put(reverse('change-password'),
                            {'old_password': 'Pass1234!', 'new_password': 'NewPass5678!'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_change_password_wrong_old(self):
        access, _ = get_tokens(self.client, 'test@iscae.mr', 'Pass1234!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = self.client.put(reverse('change-password'),
                            {'old_password': 'wrong', 'new_password': 'NewPass5678!'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

