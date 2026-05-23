from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'

    def get_rate(self):
        from django.conf import settings
        rates = getattr(settings, 'DEFAULT_THROTTLE_RATES', {})
        return rates.get(self.scope, '5/min')
