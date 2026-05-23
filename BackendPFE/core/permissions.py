from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsEtudiant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'etudiant'


class IsEncadrantAcad(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'encadrant_acad'


class IsEncadrantEntr(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'encadrant_entr'


class IsEncadrant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('encadrant_acad', 'encadrant_entr')


class IsCoordinateur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'coordinateur'


class IsJury(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'jury'


class IsScolarite(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'scolarite'


class IsAdminOrCoordinateur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'coordinateur')


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == 'admin'
