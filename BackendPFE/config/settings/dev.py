from .base import *
from decouple import config

DEBUG = True

# Désactiver ASGI/Channels en dev pour éviter l'incompatibilité Django 6.0 + channels
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'channels']
ASGI_APPLICATION = None

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='gestion_pfe'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASS', default='123'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {'client_encoding': 'UTF8'},
    }
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
]

CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# InMemoryChannelLayer pour dev — pas besoin de Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}
