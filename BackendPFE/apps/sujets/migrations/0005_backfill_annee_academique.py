from django.db import migrations


def backfill_annee_academique(apps, schema_editor):
    Sujet = apps.get_model('sujets', 'Sujet')
    AnneeAcademique = apps.get_model('pfe', 'AnneeAcademique')
    annee_active = AnneeAcademique.objects.filter(active=True).first()
    if annee_active:
        Sujet.objects.filter(annee_academique__isnull=True).update(annee_academique=annee_active)


class Migration(migrations.Migration):

    dependencies = [
        ('sujets', '0004_sujet_annee_academique'),
        ('pfe', '0007_backfill_annee_academique'),
    ]

    operations = [
        migrations.RunPython(backfill_annee_academique, migrations.RunPython.noop),
    ]
