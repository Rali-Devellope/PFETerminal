import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('soutenances', '0002_soutenance_annee_academique_alter_soutenance_statut'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='soutenance',
            name='president_jury',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='presidence_soutenances',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
