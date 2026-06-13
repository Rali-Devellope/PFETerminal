from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.pfe.models import AnneeAcademique, PFE, Livrable, Deadline


class Command(BaseCommand):
    help = "Envoie des rappels aux étudiants dont une deadline approche (J-7 et J-1)"

    JOURS_RAPPEL = [7, 1]

    def handle(self, *args, **options):
        annee = AnneeAcademique.objects.filter(active=True).first()
        if not annee:
            self.stdout.write("Aucune année académique active.")
            return

        from apps.notifications.services import notifier
        now = timezone.now()
        total = 0

        for deadline in annee.deadlines.all():
            for jours in self.JOURS_RAPPEL:
                debut_fenetre = now + timedelta(days=jours) - timedelta(hours=1)
                fin_fenetre   = now + timedelta(days=jours) + timedelta(hours=1)
                if not (debut_fenetre <= deadline.date_limite <= fin_fenetre):
                    continue

                # PFEs sans livrable de ce type (ou livrable refusé)
                pfe_sans_livrable = PFE.objects.filter(
                    annee_academique=annee, statut='EN_COURS'
                ).exclude(
                    livrables__type=deadline.type_livrable,
                    livrables__statut='VALIDE',
                )

                for pfe in pfe_sans_livrable.select_related('etudiant'):
                    titre = f"Rappel deadline : {deadline.get_type_livrable_display()}"
                    corps = (
                        f"Rappel J-{jours} : la deadline pour déposer votre "
                        f"{deadline.get_type_livrable_display()} est le "
                        f"{deadline.date_limite.strftime('%d/%m/%Y à %H:%M')}."
                    )
                    notifier(pfe.etudiant, titre, corps, 'deadline_rappel', envoyer_mail=True)
                    total += 1

        self.stdout.write(self.style.SUCCESS(f"{total} rappel(s) envoyé(s)."))
