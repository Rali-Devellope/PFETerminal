from django.db import migrations


def backfill_annee_academique(apps, schema_editor):
    PFE = apps.get_model('pfe', 'PFE')
    AnneeAcademique = apps.get_model('pfe', 'AnneeAcademique')
    annee_active = AnneeAcademique.objects.filter(active=True).first()
    if annee_active:
        PFE.objects.filter(annee_academique__isnull=True).update(annee_academique=annee_active)


class Migration(migrations.Migration):

    dependencies = [
        ('pfe', '0006_pfe_resume_mots_cles'),
    ]

    operations = [
        migrations.RunPython(backfill_annee_academique, migrations.RunPython.noop),
    ]
