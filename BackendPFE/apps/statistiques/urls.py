from django.urls import path

from . import views

urlpatterns = [
    path('stats/',                            views.stats_globales,              name='stats-globales'),
    path('stats/filieres/',                   views.stats_filieres,              name='stats-filieres'),
    path('stats/filiere/<str:filiere>/',      views.stats_filiere,               name='stats-filiere'),
    path('stats/encadrant/me/',               views.stats_encadrant_me,          name='stats-encadrant-me'),
    path('stats/encadrant/<int:pk>/',         views.stats_encadrant,             name='stats-encadrant'),
    path('stats/classement/',                 views.classement,                  name='stats-classement'),
    path('stats/dashboard/coordinateur/',     views.dashboard_coordinateur_view, name='stats-dashboard-coordinateur'),
    path('stats/dashboard/encadrant/<int:pk>/', views.dashboard_encadrant_view,  name='stats-dashboard-encadrant'),
    path('stats/export_csv/',                 views.export_csv_view,             name='stats-export-csv'),
    path('stats/export_excel/',               views.export_excel_view,           name='stats-export-excel'),
    path('stats/export_pdf/',                 views.export_pdf_view,             name='stats-export-pdf'),
]
