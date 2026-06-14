from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminCreateUserView, UserListView, UserDetailView, EtudiantsListView, JuryUsersView,
    login_view, logout_view, me_view, change_password_view
)

urlpatterns = [
    path('users/',              AdminCreateUserView.as_view(), name='user-create'),
    path('users/list/',         UserListView.as_view(),        name='user-list'),
    path('users/etudiants/',    EtudiantsListView.as_view(),   name='etudiants-list'),
    path('users/jury/',         JuryUsersView.as_view(),       name='jury-list'),
    path('users/<int:pk>/', UserDetailView.as_view(),   name='user-detail'),
    path('login/',        login_view,                    name='login'),
    path('logout/',       logout_view,                   name='logout'),
    path('me/',           me_view,                       name='me'),
    path('me/password/',  change_password_view,          name='change-password'),
    path('token/refresh/', TokenRefreshView.as_view(),   name='token-refresh'),
]
