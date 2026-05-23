# GestionPFE — ISCAE Mauritanie

Plateforme de gestion des Projets de Fin d'Études (PFE) : dépôt des livrables, planification des soutenances, notation et statistiques.

---

## Stack technique

| Côté | Technologie |
|------|-------------|
| Backend | Django 6.0 + Django REST Framework + SimpleJWT |
| Base de données | PostgreSQL |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| État | Zustand + React Query v5 |
| Routing | React Router v6 |

---

## Prérequis

- **Python** 3.11+
- **Node.js** 18+
- **PostgreSQL** 14+ (en cours d'exécution)
- **Git**

---

## 1. Cloner le projet

```bash
git clone <URL_DU_REPO>
cd AppPFETerminal
```

---

## 2. Configuration du Backend

### 2.1 Créer l'environnement virtuel

```bash
cd BackendPFE
python -m venv venv
```

### 2.2 Activer l'environnement virtuel

```bash
# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate
```

### 2.3 Installer les dépendances

```bash
pip install -r requirements/dev.txt
```

### 2.4 Créer le fichier `.env`

Créer un fichier `.env` dans le dossier `BackendPFE/` :

```env
SECRET_KEY=django-insecure-change-this-in-production
DB_NAME=gestion_pfe
DB_USER=postgres
DB_PASS=123
DB_HOST=localhost
DB_PORT=5432
```

> Adaptez `DB_USER` et `DB_PASS` selon votre installation PostgreSQL.

### 2.5 Créer la base de données

```bash
# Connectez-vous à PostgreSQL et créez la base
psql -U postgres -c "CREATE DATABASE gestion_pfe;"
```

### 2.6 Appliquer les migrations

```bash
python manage.py migrate --settings=config.settings.dev
```

### 2.7 Créer un superutilisateur (admin)

```bash
python manage.py createsuperuser --settings=config.settings.dev
```

### 2.8 Démarrer le serveur backend

```bash
python manage.py runserver --settings=config.settings.dev
```

Le backend tourne sur : **http://localhost:8000**

---

## 3. Configuration du Frontend

### 3.1 Aller dans le dossier frontend

```bash
cd FrontendPFE/webPFE
```

### 3.2 Installer les dépendances

```bash
npm install
```

### 3.3 Démarrer le serveur de développement

```bash
npm run dev
```

Le frontend tourne sur : **http://localhost:3000**

> Le proxy Vite redirige automatiquement `/api/v1/` vers `http://localhost:8000`.

---

## 4. Rôles utilisateurs

| Rôle | Accès | Dashboard |
|------|-------|-----------|
| `etudiant` | Ses livrables et soutenance | `/etudiant` |
| `encadrant_acad` | Étudiants supervisés | `/encadrant` |
| `encadrant_entr` | Étudiants supervisés | `/encadrant` |
| `jury` | Ses soutenances à noter | `/jury` |
| `coordinateur` | Sujets + soutenances | `/coordinateur` |
| `admin` | Gestion des utilisateurs | `/admin` |
| `scolarite` | Statistiques | `/stats` |

---

## 5. Endpoints API principaux

La documentation Swagger est accessible sur : **http://localhost:8000/swagger/**

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/v1/auth/login/` | Connexion |
| POST | `/api/v1/auth/logout/` | Déconnexion |
| PUT | `/api/v1/auth/me/password/` | Changer mot de passe |
| GET | `/api/v1/auth/me/` | Profil utilisateur |
| GET | `/api/v1/auth/users/` | Liste utilisateurs (admin) |
| GET/POST | `/api/v1/sujets/` | Sujets PFE |
| GET/POST | `/api/v1/pfe/` | PFE |
| GET/POST | `/api/v1/soutenances/` | Soutenances |
| GET | `/api/v1/stats/` | Statistiques globales |
| GET | `/api/v1/stats/classement/` | Classement étudiants |
| GET | `/api/v1/stats/export_csv/` | Export CSV |
| GET | `/api/v1/stats/export_excel/` | Export Excel |
| GET | `/api/v1/stats/export_pdf/` | Export PDF |

---

## 6. Structure du projet

```
AppPFETerminal/
├── BackendPFE/
│   ├── apps/
│   │   ├── authentication/   # Utilisateurs, JWT, rôles
│   │   ├── sujets/           # Sujets PFE
│   │   ├── pfe/              # PFE + livrables
│   │   ├── soutenances/      # Soutenances + notes
│   │   ├── statistiques/     # Stats + exports
│   │   └── notifications/    # Notifications
│   ├── config/
│   │   └── settings/
│   │       ├── base.py       # Settings communs
│   │       └── dev.py        # Settings développement
│   ├── requirements/
│   │   └── dev.txt
│   ├── manage.py
│   └── .env                  # Variables d'environnement (à créer)
│
└── FrontendPFE/
    └── webPFE/
        ├── src/
        │   ├── api/          # Appels API (axios)
        │   ├── components/   # Composants réutilisables
        │   ├── hooks/        # Hooks React
        │   ├── pages/        # Pages par rôle
        │   ├── router/       # Routes React Router
        │   └── store/        # État global (Zustand)
        ├── package.json
        └── vite.config.js
```

---

## 7. Notes importantes

- **Premier login** : lors de la première connexion, l'utilisateur est redirigé vers une page de changement de mot de passe.
- **JWT** : le token d'accès expire après 15 minutes, le refresh token après 7 jours.
- **Channels** : désactivé en développement (incompatibilité Django 6.0 + channels 4.x). Utiliser Redis en production.
- **Fichiers média** : uploadés dans `BackendPFE/media/`.
