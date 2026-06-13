from django.db import migrations


FILIERES_INITIALES = [
    {'libelle': 'Finance',        'code': 'FIN'},
    {'libelle': 'Comptabilité',   'code': 'CPT'},
    {'libelle': 'Audit',          'code': 'AUD'},
    {'libelle': 'Management',     'code': 'MGT'},
    {'libelle': 'Informatique',   'code': 'INF'},
]


def inserer_filieres(apps, schema_editor):
    Filiere = apps.get_model('config', 'Filiere')
    for f in FILIERES_INITIALES:
        Filiere.objects.get_or_create(libelle=f['libelle'], defaults={'code': f['code']})


def supprimer_filieres(apps, schema_editor):
    Filiere = apps.get_model('config', 'Filiere')
    Filiere.objects.filter(libelle__in=[f['libelle'] for f in FILIERES_INITIALES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(inserer_filieres, supprimer_filieres),
    ]
