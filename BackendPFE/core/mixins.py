from django.db import models


class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditMixin(TimestampMixin):
    created_by = models.ForeignKey(
        'authentication.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    class Meta:
        abstract = True
