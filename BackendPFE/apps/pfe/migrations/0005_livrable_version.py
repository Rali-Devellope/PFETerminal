from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pfe', '0004_annee_date_limite_soutenance'),
    ]

    operations = [
        migrations.AddField(
            model_name='livrable',
            name='version',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
