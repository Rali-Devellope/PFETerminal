# Rapport d'état — GestionPFE ISCAE
**Date :** 03 juin 2026  
**Projet :** Application de gestion des Projets de Fin d'Études — ISCAE Mauritanie  
**Stack :** Django DDD + React + PostgreSQL + SimpleJWT

---

## 1. Présentation du projet

GestionPFE est une plateforme web destinée à l'ISCAE Mauritanie pour gérer l'ensemble du cycle de vie des Projets de Fin d'Études : proposition de sujets, validation, suivi des livrables, planification des soutenances et notation.

L'application couvre **7 rôles utilisateurs** :

| Rôle | Description |
|------|-------------|
| Étudiant | Choisit un sujet, dépose des livrables, consulte ses notes |
| Encadrant académique | Propose des sujets, valide les livrables, note la soutenance |
| Encadrant entreprise | Propose des sujets, suit l'étudiant |
| Coordinateur | Valide les sujets, planifie les soutenances, affecte le jury |
| Jury | Reçoit le planning, note la soutenance |
| Scolarité | Consulte les archives, télécharge les documents officiels |
| Admin | Gère tous les utilisateurs, accès total |

---

## 2. Architecture technique

```
GestionPFE/
├── BackendPFE/          Django 4.2 · DRF · SimpleJWT · PostgreSQL
│   ├── apps/
│   │   ├── authentication/   Authentification JWT + 7 rôles
│   │   ├── sujets/           CRUD sujets + workflow validation
│   │   ├── pfe/              PFE + livrables (upload fichiers)
│   │   ├── soutenances/      Planification + jury + notes
│   │   ├── notifications/    WebSocket (Channels) + email SMTP
│   │   └── statistiques/     Agrégations + exports
│   └── core/                 Permissions RBAC, exceptions, throttling
│
└── FrontendPFE/         React 18 · Vite · TailwindCSS · React Query
    └── webPFE/
        ├── src/
        │   ├── pages/       Dashboard par rôle
        │   ├── components/  Layout, UI
        │   ├── api/         Axios + endpoints
        │   ├── store/       Zustand (auth, notifs)
        │   └── i18n/        Traductions FR + AR
        └── public/
            └── logo-iscae.png
```

---

## 3. Fonctionnalités réalisées

### Backend
- [x] Authentification JWT (login, logout, refresh token, blacklist)
- [x] Gestion des 7 rôles avec permissions RBAC (`core/permissions.py`)
- [x] Création de comptes par l'admin uniquement (domaine `@iscae.mr`)
- [x] Changement de mot de passe forcé à la première connexion (`is_first_login`)
- [x] Rate limiting sur le login (5 tentatives/min)
- [x] CRUD sujets complet avec workflow : PROPOSÉ → VALIDÉ → REFUSÉ → AFFECTÉ
- [x] Signal Django : création automatique du PFE quand le sujet est validé
- [x] Dépôt de livrables (PDF, code, présentation)
- [x] Planification des soutenances (date, salle, durée)
- [x] Affectation du jury à une soutenance
- [x] Calcul de la note finale
- [x] Format de réponse JSON uniforme (`success_response` / `error_response`)
- [x] Pagination standard (20 éléments par page)
- [x] Configuration multi-environnements (dev.py / prod.py)

### Frontend
- [x] Authentification complète (login, logout, refresh automatique)
- [x] Routing protégé par rôle (`ProtectedRoute`)
- [x] Dashboard étudiant (PFE, livrables, soutenance)
- [x] Dashboard encadrant (liste des étudiants suivis)
- [x] Dashboard coordinateur (validation sujets, planification soutenances)
- [x] Dashboard jury (soutenances assignées, saisie de notes)
- [x] Dashboard admin (gestion des utilisateurs)
- [x] Interface bilingue Français / Arabe (i18next)
- [x] Support RTL complet pour l'arabe (CSS logical properties)
- [x] Logo ISCAE intégré (navbar + page login)
- [x] Notifications non lues (badge compteur)
- [x] Design cohérent (palette ISCAE : bleu #1e3a5f + vert #2db84b)

---

## 4. Fonctionnalités manquantes

### Fonctionnalités métier

| Fonctionnalité | Priorité | Détail |
|----------------|----------|--------|
| Page sujets disponibles (étudiant) | Haute | L'étudiant ne peut pas encore parcourir et choisir un sujet |
| Validation livrables (encadrant) | Haute | L'encadrant ne peut pas valider/refuser les livrables déposés |
| Dashboard Scolarité | Moyenne | Rôle redirigé vers l'admin, pas d'interface propre |
| Page statistiques | Moyenne | Route `/stats` présente dans le menu mais page inexistante |
| Génération PDF officiels | Moyenne | PV de soutenance, relevé de notes, attestation (reportlab prévu) |
| Détection plagiat | Basse | Champ `score_plagiat` en base mais aucun service ne le calcule |

### Backend

| Module | État | Détail |
|--------|------|--------|
| `apps/statistiques/` | Vide | Modèle vide, vues non implémentées |
| `apps/notifications/` | Partiel | WebSockets non testés, désactivés en dev |
| Génération PDF | Non fait | Dépendance reportlab installée mais services non écrits |
| Upload fichiers | Non vérifié | `MEDIA_ROOT` configuré, flow end-to-end non testé |

---

## 5. Points de sécurité à adresser avant production

| Point | Risque | Solution recommandée |
|-------|--------|----------------------|
| Refresh token en localStorage | XSS peut voler le token | Passer en cookie HttpOnly |
| `DEBUG=True` en dev | Pas un risque en prod si bien séparé | Vérifier `DEBUG=False` en prod |
| `SECRET_KEY` de dev | Compromise si committée | Utiliser une clé forte dans `.env` prod |
| Pas de HTTPS | Tokens interceptables | Certificat SSL (Let's Encrypt) |
| CORS ouvert en dev | Normal, à restreindre en prod | `CORS_ALLOWED_ORIGINS` sur le vrai domaine |

---

## 6. Infrastructure manquante pour la production

| Élément | Détail |
|---------|--------|
| Conteneurisation | Pas de `Dockerfile` ni `docker-compose.yml` |
| Serveur WSGI/ASGI | Gunicorn + Uvicorn nécessaires pour Channels |
| Redis | Requis pour les WebSockets en production |
| Stockage media | Les fichiers uploadés doivent être sur un volume persistant ou S3 |
| Reverse proxy | Nginx pour servir les fichiers statiques et media |
| Backup BDD | Aucune stratégie de sauvegarde PostgreSQL définie |
| Variables prod | SMTP réel, SECRET_KEY forte, ALLOWED_HOSTS, REDIS_URL |

---

## 7. Résumé — Prêt pour

| Contexte | État |
|----------|------|
| Démo interne / présentation | ✅ Oui (créer les utilisateurs via shell) |
| Tests fonctionnels | ✅ Oui (flux principal complet) |
| Démo client complète | ⚠️ Partiel (manque Scolarité, Stats, PDF) |
| Production réelle | ❌ Non (infrastructure, sécurité, fonctionnalités métier) |

---

## 8. Prochaines étapes recommandées

1. **Court terme** — Page sujets pour l'étudiant + validation livrables encadrant
2. **Moyen terme** — Dashboard Scolarité + page Stats + génération PDF
3. **Avant déploiement** — Docker + nginx + HTTPS + refresh token HttpOnly
4. **Optionnel** — Détection plagiat (intégration API externe ou algorithme TF-IDF)

---

*Rapport généré automatiquement — GestionPFE ISCAE Mauritanie*
