from django.apps import AppConfig


class PfeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.pfe'
    verbose_name = 'PFE & Livrables'

    def ready(self):
        import apps.pfe.signals  # noqa
