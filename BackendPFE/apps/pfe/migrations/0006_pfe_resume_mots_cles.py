from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pfe', '0005_livrable_version'),
    ]

    operations = [
        migrations.AddField(
            model_name='pfe',
            name='resume',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='pfe',
            name='mots_cles',
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
