from django.core.mail import send_mail
from django.conf import settings
from rest_framework.exceptions import ValidationError

from core.utils import generate_temp_password
from .models import CustomUser


def create_user_by_admin(email, nom, prenom, role, password=None, filiere='', telephone='', matricule=''):
    if CustomUser.objects.filter(email=email).exists():
        raise ValidationError("Un compte avec cet email existe déjà")

    temp_password = password or generate_temp_password()
    user = CustomUser.objects.create_user(
        email=email, nom=nom, prenom=prenom, role=role, password=temp_password,
        filiere=filiere, telephone=telephone, matricule=matricule,
    )
    _send_account_created_email(user, temp_password)
    return user


def reset_password(user, old_password, new_password):
    if not user.check_password(old_password):
        raise ValidationError("Mot de passe actuel incorrect")
    user.set_password(new_password)
    user.is_first_login = False
    user.save(update_fields=['password', 'is_first_login'])
    return user


def _send_account_created_email(user, temp_password):
    subject = "Votre compte GestionPFE — ISCAE"
    message = (
        f"Bonjour {user.prenom} {user.nom},\n\n"
        f"Votre compte GestionPFE a été créé.\n"
        f"Email : {user.email}\n"
        f"Mot de passe temporaire : {temp_password}\n\n"
        f"Veuillez le changer à votre première connexion.\n\n"
        f"L'équipe ISCAE"
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
