from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display  = ['email', 'nom', 'prenom', 'role', 'is_active', 'is_first_login']
    list_filter   = ['role', 'is_active', 'is_first_login']
    search_fields = ['email', 'nom', 'prenom']
    ordering      = ['-created_at']

    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Informations', {'fields': ('nom', 'prenom', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_first_login', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'nom', 'prenom', 'role', 'password1', 'password2')}),
    )
