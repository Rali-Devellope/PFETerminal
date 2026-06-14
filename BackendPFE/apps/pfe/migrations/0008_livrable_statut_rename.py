from django.db import migrations, models


def migrate_statuts_forward(apps, schema_editor):
    Livrable = apps.get_model('pfe', 'Livrable')
    Livrable.objects.filter(statut='EN_ATTENTE').update(statut='EN_ATTENTE_VALIDATION')
    Livrable.objects.filter(statut='REFUSE').update(statut='REJETE')


def migrate_statuts_backward(apps, schema_editor):
    Livrable = apps.get_model('pfe', 'Livrable')
    Livrable.objects.filter(statut='EN_ATTENTE_VALIDATION').update(statut='EN_ATTENTE')
    Livrable.objects.filter(statut='REJETE').update(statut='REFUSE')


class Migration(migrations.Migration):

    dependencies = [
        ('pfe', '0007_backfill_annee_academique'),
    ]

    operations = [
        # 1. Élargir le champ avant de mettre les nouvelles valeurs
        migrations.AlterField(
            model_name='livrable',
            name='statut',
            field=models.CharField(
                choices=[
                    ('EN_ATTENTE_VALIDATION', 'En attente de validation'),
                    ('VALIDE', 'Validé'),
                    ('REJETE', 'Rejeté'),
                ],
                default='EN_ATTENTE_VALIDATION',
                max_length=25,
            ),
        ),
        # 2. Migrer les données existantes
        migrations.RunPython(migrate_statuts_forward, migrate_statuts_backward),
    ]
