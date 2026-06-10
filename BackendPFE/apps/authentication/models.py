from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):
    def create_user(self, email, nom, prenom, role, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, nom=nom, prenom=prenom, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nom, prenom, role='admin', password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_first_login', False)
        return self.create_user(email, nom, prenom, role, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLES = [
        ('etudiant',       'Étudiant'),
        ('encadrant_acad', 'Encadrant Académique'),
        ('encadrant_entr', 'Encadrant Entreprise'),
        ('coordinateur',   'Coordinateur'),
        ('jury',           'Jury'),
        ('scolarite',      'Scolarité'),
        ('admin',          'Administrateur'),
    ]

    email          = models.EmailField(unique=True)
    nom            = models.CharField(max_length=100)
    prenom         = models.CharField(max_length=100)
    role           = models.CharField(max_length=20, choices=ROLES)
    is_active      = models.BooleanField(default=True)
    is_staff       = models.BooleanField(default=False)
    is_first_login = models.BooleanField(default=True)
    max_etudiants  = models.PositiveIntegerField(default=5)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom', 'role']

    objects = CustomUserManager()

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.role})"

    @property
    def full_name(self):
        return f"{self.prenom} {self.nom}"
