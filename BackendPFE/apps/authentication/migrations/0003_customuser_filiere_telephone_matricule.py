from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_customuser_max_etudiants'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='filiere',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='customuser',
            name='telephone',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='customuser',
            name='matricule',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
