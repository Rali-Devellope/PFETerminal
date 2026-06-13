from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Filiere',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('libelle',    models.CharField(max_length=100, unique=True)),
                ('code',       models.CharField(blank=True, max_length=10)),
                ('active',     models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Filière',
                'verbose_name_plural': 'Filières',
                'ordering': ['libelle'],
            },
        ),
    ]
