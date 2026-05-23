# GestionPFE — Plan de création complet (Architecture DDD)

## Vue d'ensemble

Application Django de gestion des PFE (Projets de Fin d'Études) pour l'ISCAE.
Architecture Domain-Driven Design (DDD) avec Django REST Framework.

**Stack :** Django 4.2+ · DRF · SimpleJWT · Django Channels · PostgreSQL · Redis

---

## UX — Parcours utilisateurs & Écrans

### Les 7 acteurs & leurs rôles

```
┌─────────────────────────────────────────────────────────────────┐
│                        GESTION PFE — ISCAE                      │
│                    Qui fait quoi dans le système ?              │
└─────────────────────────────────────────────────────────────────┘

 👨‍🎓 ÉTUDIANT          👨‍🏫 ENCADRANT ACAD     🏢 ENCADRANT ENTR
 ──────────────        ──────────────────     ─────────────────
 • Parcourt sujets     • Propose sujets       • Propose sujets
 • Choisit un sujet    • Suit ses étudiants   • Suit l'étudiant
 • Dépose livrables    • Valide livrables     • Valide livrables
 • Voit ses notes      • Note la soutenance   • (optionnel)

 🗂️ COORDINATEUR       ⚖️ JURY                📋 SCOLARITÉ
 ───────────────       ──────────────         ────────────
 • Valide/refuse        • Reçoit planning      • Consulte archives
   sujets               • Note la soutenance   • Imprime relevés
 • Affecte encadrants  • Signe PV             • Télécharge PV
 • Planifie soutenances

 🔧 ADMIN
 ────────────
 • Gère tous les utilisateurs
 • Accès total lecture/écriture
 • Tableaux de bord système
```

### Flux principal — La vie d'un PFE

```
ÉTAPE 1 — PROPOSITION DE SUJET
──────────────────────────────
  Encadrant/Étudiant
       │
       ▼
  Formulaire sujet (titre, description, filière, origine)
       │
       ▼
  Statut : PROPOSÉ

ÉTAPE 2 — VALIDATION
─────────────────────
  Coordinateur reçoit notification
       │
       ├─► VALIDE  → PFE créé automatiquement (signal)
       │            → Encadrant affecté
       │            → Email envoyé à l'étudiant
       │
       └─► REFUSE  → Motif communiqué → Email envoyé

ÉTAPE 3 — TRAVAIL PFE
──────────────────────
  Étudiant dépose livrables :
       ├─► Rapport intermédiaire (PDF)
       ├─► Code source (zip)
       └─► Présentation finale
                │
                ▼
  Encadrant valide/commente chaque livrable
  Score plagiat calculé automatiquement

ÉTAPE 4 — SOUTENANCE
──────────────────────
  Coordinateur planifie : Date + Salle + Durée + Jury
       │
       ▼
  Notifications envoyées à tous (email + WebSocket)
       │
       ▼
  Jury note → calcul note finale (moyenne pondérée)
       │
       ▼
  Génération : PV PDF + Relevé de notes + Attestation

ÉTAPE 5 — ARCHIVAGE
────────────────────
  PFE → Statut ARCHIVÉ
  Disponible dans les statistiques et exports
```

### Écrans par rôle

#### Étudiant — Dashboard
```
┌──────────────────────────────────────────┐
│  Dashboard Étudiant                      │
│  Mon PFE : [Titre du sujet]   EN COURS   │
│  Encadrant : Pr. Mohamed Alami           │
│  Score plagiat : 3.2%  OK               │
│                                          │
│  Mes livrables                           │
│  ┌────────────────────────────────────┐  │
│  │ Rapport v1          VALIDÉ         │  │
│  │ Code source         EN ATTENTE     │  │
│  │ Présentation        NON DÉPOSÉ     │  │
│  └────────────────────────────────────┘  │
│  [+ Déposer un livrable]                 │
│  Ma soutenance : 15 juin 2025 – Salle A  │
│  Note finale : En attente                │
└──────────────────────────────────────────┘
```

#### Coordinateur — Dashboard
```
┌──────────────────────────────────────────┐
│  Dashboard Coordinateur                  │
│  Sujets en attente        [12]           │
│  PFE en cours             [48]           │
│  Soutenances à planifier  [5]            │
│                                          │
│  File de validation des sujets           │
│  ┌────────────────────────────────────┐  │
│  │ "Système de gestion RH"            │  │
│  │ Proposé par : Pr. Benali            │  │
│  │ Filière : Finance  Année : 2025     │  │
│  │ [Valider]  [Refuser]  [Voir]       │  │
│  └────────────────────────────────────┘  │
│  [Stats globales]  [Export CSV]  [PDF]   │
└──────────────────────────────────────────┘
```

#### Jury — Notation
```
┌──────────────────────────────────────────┐
│  Mes soutenances                         │
│  Lundi 15/06 – 09h00 – Salle A           │
│  PFE : "Système de gestion RH"           │
│  Étudiant : Rachid Alaoui               │
│  Rapport : [Télécharger]                 │
│  Score plagiat : 2.1%                    │
│                                          │
│  Ma note : [____] /20                   │
│  Commentaire : [________________]        │
│  [Soumettre ma note]                     │
└──────────────────────────────────────────┘
```

### Notifications temps-réel

```
  Action système               Qui reçoit            Canal
  ──────────────────           ──────────            ──────
  Sujet validé          →      Étudiant              Email + WebSocket
  Sujet refusé          →      Proposeur             Email
  Encadrant affecté     →      Encadrant + Étudiant  Email + WebSocket
  Livrable déposé       →      Encadrant             WebSocket
  Livrable validé       →      Étudiant              Email + WebSocket
  Soutenance planifiée  →      Étudiant+Jury+Enc.    Email + WebSocket
  Note finale publiée   →      Étudiant              Email
```

### Documents PDF générés automatiquement

| Document | Déclenché par | Destinataire |
|----------|--------------|--------------|
| Planning des soutenances | Coordinateur | Tout le monde |
| PV de soutenance | Coordinateur/Scolarité | Archives |
| Relevé de notes | Scolarité | Étudiant |
| Attestation de réussite | Scolarité | Étudiant |
| Export stats global | Admin/Coordinateur | Direction |

---

## Architecture DDD — Structure complète

```
GestionPFE/
├── apps/
│   ├── authentication/          # Phase 1 — Jours 2-4
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # CustomUser, AbstractBaseUser, 7 rôles
│   │   ├── serializers.py       # CreateUserSerializer (admin), LoginSerializer, UserSerializer
│   │   ├── views.py             # AdminCreateUserView, LoginView, LogoutView, MeView, UserListView
│   │   ├── services.py          # create_user_by_admin(), reset_password()
│   │   ├── urls.py              # /users/ /login/ /logout/ /me/ /token/refresh/
│   │   └── tests.py             # test_login, test_refresh, test_permissions, test_admin_create
│   │
│   ├── sujets/                  # Phase 2 — Jours 5-7
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # Sujet: titre, description, origine, statut, filière
│   │   ├── serializers.py       # SujetSerializer, SujetCreateSerializer
│   │   ├── views.py             # SujetViewSet + actions valider/refuser/affecter
│   │   ├── services.py          # valider_sujet(), refuser_sujet(), affecter_encadrant()
│   │   ├── filters.py           # SujetFilter: filière, année, statut, titre
│   │   ├── urls.py              # /api/v1/sujets/ + actions
│   │   └── tests.py             # test_valider, test_refuser, test_filtres
│   │
│   ├── pfe/                     # Phase 3 — Jours 8-12
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # PFE, Livrable
│   │   ├── serializers.py       # PFESerializer, LivrableSerializer
│   │   ├── views.py             # PFEViewSet, LivrableViewSet
│   │   ├── services.py          # upload_livrable(), detecter_plagiat(), archiver_pfe()
│   │   ├── signals.py           # Sujet VALIDÉ → PFE auto-créé (post_save)
│   │   ├── filters.py
│   │   ├── urls.py              # /api/v1/pfe/ + /api/v1/livrables/
│   │   └── tests.py             # test_upload, test_plagiat, test_archiver
│   │
│   ├── soutenances/             # Phase 4 — Jours 13-17
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # Soutenance, Note, DocumentOfficiel
│   │   ├── serializers.py
│   │   ├── views.py             # SoutenanceViewSet, NoteViewSet
│   │   ├── services.py          # planifier(), affecter_jury(), calculer_note_finale(), generer_pv_pdf()
│   │   ├── urls.py              # /api/v1/soutenances/ + /api/v1/notes/
│   │   └── tests.py             # test_planifier, test_noter, test_pdf
│   │
│   ├── notifications/           # Phase 5 — Jour 18
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # Notification: titre, message, lu, type, destinataire
│   │   ├── serializers.py
│   │   ├── views.py             # GET notifications, marquer_lu()
│   │   ├── services.py          # envoyer_email_smtp(), push_websocket()
│   │   ├── consumers.py         # WebSocket consumer Django Channels
│   │   ├── routing.py           # ws/notifications/ → consumer
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   └── statistiques/            # Phase 6 — Jour 19
│       ├── __init__.py
│       ├── apps.py
│       ├── models.py            # (pas de modèle propre, agrégation)
│       ├── serializers.py       # StatsSerializer
│       ├── views.py             # stats_globales, stats_par_filiere, classement
│       ├── services.py          # calculer_stats(), export_csv(), export_excel(), export_pdf()
│       ├── urls.py              # /api/v1/stats/ + /export_csv/ + /export_excel/
│       └── tests.py
│
├── core/                        # Code partagé entre toutes les apps
│   ├── __init__.py
│   ├── permissions.py           # IsEtudiant · IsCoordinateur · IsJury …
│   ├── exceptions.py            # Réponse JSON uniforme (Phase 7)
│   ├── throttling.py            # Rate limiting login (Phase 7)
│   ├── pagination.py            # page_size=20 standard
│   ├── mixins.py                # AuditMixin · TimestampMixin
│   └── utils.py                 # helpers partagés
│
├── config/                      # Settings séparés par environnement
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py              # INSTALLED_APPS, JWT, Channels, Swagger
│   │   ├── dev.py               # DEBUG=True, DB locale, CORS localhost
│   │   └── prod.py              # Railway, sécurisé, DEBUG=False
│   ├── urls.py                  # inclut apps/*/urls.py + swagger
│   └── asgi.py                  # WebSocket Channels routing
│
├── tests/                       # Tests intégration cross-apps
│   ├── __init__.py
│   ├── test_workflow_complet.py  # PFE end-to-end
│   └── conftest.py              # fixtures partagées
│
├── media/                       # Fichiers uploadés (livrables PDF)
├── static/
├── .env                         # JAMAIS dans git
├── .env.example
├── .gitignore
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
└── manage.py
```

---

## Plan 30 jours — Étape par étape

### PHASE 0 — Jour 1 : Setup & Configuration

**Objectif :** Environnement de développement opérationnel

**Étapes :**
1. Installer Python 3.11, PostgreSQL 15, Git, VS Code
2. Créer le projet :
   ```bash
   mkdir GestionPFE && cd GestionPFE
   python -m venv venv
   venv\Scripts\activate          # Windows
   pip install django djangorestframework
   django-admin startproject config .
   ```
3. Créer `.env` avec `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASS`
4. Configurer `config/settings/base.py` (voir ci-dessous)
5. Créer la base PostgreSQL : `CREATE DATABASE gestion_pfe;`
6. `python manage.py migrate` → vérifier connexion
7. `git init` + `.gitignore` + premier commit

**Fichiers à créer :**
- `config/settings/base.py` — INSTALLED_APPS, JWT, CORS
- `config/settings/dev.py` — DEBUG=True, DB depuis .env
- `.env` — variables sensibles
- `requirements/base.txt`

---

### PHASE 1 — Jours 2-4 : Users & Authentification JWT

**Objectif :** Système d'authentification avec 7 rôles via JWT
**Règle clé :** Pas d'auto-inscription publique. Seul l'admin crée les comptes
avec les emails institutionnels ISCAE (ex: r.alaoui@iscae.ma).

**Étapes :**
1. Créer l'app : `python manage.py startapp authentication apps/authentication`
2. Créer `CustomUser` dans `apps/authentication/models.py`
   - Hérite `AbstractBaseUser + PermissionsMixin`
   - Champs : `email` (unique, USERNAME_FIELD), `nom`, `prenom`, `role`
   - 7 rôles : `etudiant | encadrant_acad | encadrant_entr | coordinateur | jury | scolarite | admin`
   - `CustomUserManager` : `create_user()` + `create_superuser()`
3. Dans `config/settings/base.py` : `AUTH_USER_MODEL = 'authentication.CustomUser'`
4. `python manage.py makemigrations authentication && python manage.py migrate`
5. Créer `core/permissions.py` — 7 classes RBAC
6. Créer `apps/authentication/serializers.py` — CreateUser (admin), Login, User
7. Créer `apps/authentication/views.py` — 5 vues :
   - `AdminCreateUserView` (POST) — IsAdmin uniquement
   - `UserListView` (GET) — IsAdmin uniquement
   - `LoginView` (POST) — AllowAny
   - `LogoutView` (POST) — IsAuthenticated
   - `MeView` (GET/PUT) — IsAuthenticated
8. Configurer SimpleJWT dans settings (ACCESS_TOKEN_LIFETIME=15min, BLACKLIST)
9. Créer `apps/authentication/urls.py` — 5 endpoints
10. Écrire tests dans `apps/authentication/tests.py`
11. Tester avec Postman/curl

**Modèles :**
```python
# apps/authentication/models.py
class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLES = [
        ('etudiant', 'Étudiant'),
        ('encadrant_acad', 'Encadrant Académique'),
        ('encadrant_entr', 'Encadrant Entreprise'),
        ('coordinateur', 'Coordinateur'),
        ('jury', 'Jury'),
        ('scolarite', 'Scolarité'),
        ('admin', 'Administrateur'),
    ]
    email     = models.EmailField(unique=True)
    nom       = models.CharField(max_length=100)
    prenom    = models.CharField(max_length=100)
    role      = models.CharField(max_length=20, choices=ROLES)
    is_active = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom', 'role']
```

**Endpoints :**
| Méthode | URL | Permission | Description |
|---------|-----|------------|-------------|
| POST | `/api/v1/auth/users/` | IsAdmin | Admin crée un compte |
| GET | `/api/v1/auth/users/` | IsAdmin | Admin liste tous les comptes |
| GET/PUT | `/api/v1/auth/users/{id}/` | IsAdmin | Admin modifie/désactive un compte |
| POST | `/api/v1/auth/login/` | AllowAny | Login avec email + password |
| POST | `/api/v1/auth/logout/` | IsAuthenticated | Invalide le refresh token |
| GET | `/api/v1/auth/me/` | IsAuthenticated | Profil de l'utilisateur connecté |
| PUT | `/api/v1/auth/me/` | IsAuthenticated | Modifier son profil |
| POST | `/api/v1/auth/token/refresh/` | AllowAny | Renouveler l'access token |

**Aucun endpoint public d'inscription — le endpoint /register/ n'existe pas.**

---

### Gestion Authentication — Flux complet Admin-only

#### Règle fondamentale
```
Personne ne peut s'inscrire seul.
Seul l'admin crée les comptes avec les emails institutionnels ISCAE.

Format email ISCAE :
  Étudiant        →  r.alaoui@iscae.ma
  Encadrant       →  m.benali@iscae.ma
  Coordinateur    →  coordination@iscae.ma
  Admin           →  admin@iscae.ma
```

#### Flux création de compte par l'admin

```
ÉTAPE 1 — Admin se connecte
────────────────────────────
  POST /api/v1/auth/login/
  { email: "admin@iscae.ma", password: "••••" }
       │
       ▼
  Reçoit access_token (15 min) + refresh_token (7 jours)


ÉTAPE 2 — Admin crée un compte utilisateur
───────────────────────────────────────────
  POST /api/v1/auth/users/
  Authorization: Bearer <access_token_admin>

  {
    "email":    "r.alaoui@iscae.ma",
    "nom":      "Alaoui",
    "prenom":   "Rachid",
    "role":     "etudiant",
    "password": "MotDePasseTemp#2025"
  }
       │
       ▼
  Compte créé en base (is_first_login=True)
       │
       ▼
  Email envoyé automatiquement à r.alaoui@iscae.ma :
  "Votre compte GestionPFE est créé.
   Email : r.alaoui@iscae.ma
   Mot de passe temporaire : MotDePasseTemp#2025
   Veuillez le changer à la première connexion."


ÉTAPE 3 — L'utilisateur se connecte pour la 1ère fois
───────────────────────────────────────────────────────
  POST /api/v1/auth/login/
  { email: "r.alaoui@iscae.ma", password: "MotDePasseTemp#2025" }
       │
       ▼
  is_first_login=True → Redirect forcé vers /changer-mot-de-passe
       │
       ▼
  PUT /api/v1/auth/me/password/
  { "old_password": "MotDePasseTemp#2025",
    "new_password": "NouveauMotDePasse#" }
       │
       ▼
  is_first_login=False → Dashboard selon le rôle


FLUX LOGIN NORMAL (après 1ère connexion)
──────────────────────────────────────────
  POST /api/v1/auth/login/
       │
       ├─► Email inconnu     → {"error": "Utilisateur introuvable"}
       ├─► Mauvais password  → {"error": "Identifiants invalides"}
       │                        rate limiting : 5 essais/min bloqué
       │
       └─► OK → { access: "...", refresh: "...",
                  user: { id, email, nom, prenom, role } }
       │
       ▼
  Redirect dashboard selon role :
  etudiant        → /dashboard/etudiant
  encadrant_acad  → /dashboard/encadrant
  encadrant_entr  → /dashboard/encadrant
  coordinateur    → /dashboard/coordinateur
  jury            → /dashboard/jury
  scolarite       → /dashboard/scolarite
  admin           → /admin/dashboard


REFRESH TOKEN (transparent, côté frontend)
────────────────────────────────────────────
  Quand access_token expire (401 reçu) :
  POST /api/v1/auth/token/refresh/
  { refresh: "..." } → nouveau access_token
  (l'utilisateur ne voit rien)


LOGOUT
───────
  POST /api/v1/auth/logout/
  { refresh: "..." }
  → refresh_token mis en blacklist (inutilisable)
  → Redirect login
```

#### Champ is_first_login dans le modèle

```python
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
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom', 'role']
```

#### UI — Écran Admin : Gestion des utilisateurs

```
┌──────────────────────────────────────────────────────────────┐
│  Admin — Gestion des utilisateurs                            │
│  ───────────────────────────────────────────────────────     │
│  [+ Créer un compte]                 [Rechercher...]         │
│                                                              │
│  NOM              EMAIL                   RÔLE    STATUT     │
│  ──────────────── ──────────────────────  ──────  ────────   │
│  Rachid Alaoui    r.alaoui@iscae.ma       Étud.   Actif      │
│  Mohamed Benali   m.benali@iscae.ma       Enc.    Actif      │
│  Sara Idrissi     s.idrissi@iscae.ma      Jury    Actif      │
│  Karim Tazi       k.tazi@iscae.ma         Étud.   Inactif    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Créer un compte                                             │
│  ───────────────────────────────────────────────────────     │
│  Nom          [ Alaoui_______________ ]                      │
│  Prénom       [ Rachid_______________ ]                      │
│  Email ISCAE  [ r.alaoui@iscae.ma____ ]  ← vérifié domaine  │
│  Rôle         [ Étudiant          ▼  ]                      │
│  Mot de passe [ Générer automatiquement] ← envoyé par email  │
│                                                              │
│  [ Annuler ]       [ Créer le compte + envoyer email ]       │
└──────────────────────────────────────────────────────────────┘
```

#### UI — Écran Login (commun à tous les rôles)

```
┌────────────────────────────────────────────────┐
│           GestionPFE — ISCAE                   │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  Connexion à votre espace               │  │
│  │                                          │  │
│  │  Email                                   │  │
│  │  [ exemple@iscae.ma_________________ ]   │  │
│  │                                          │  │
│  │  Mot de passe                            │  │
│  │  [ ••••••••••••••••••  (afficher) ]      │  │
│  │                                          │  │
│  │  ⚠ 3 tentatives restantes (5 max/min)   │  │
│  │                                          │  │
│  │  [        Se connecter         ]         │  │
│  │                                          │  │
│  │  Mot de passe oublié ?                  │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

#### UI — Écran 1ère connexion (changement mot de passe forcé)

```
┌────────────────────────────────────────────────┐
│  Bienvenue Rachid !                            │
│  ─────────────────────────────────────────     │
│  Vous vous connectez pour la première fois.    │
│  Veuillez changer votre mot de passe.          │
│                                                │
│  Mot de passe actuel                           │
│  [ MotDePasseTemp#2025___________ ]            │
│                                                │
│  Nouveau mot de passe                          │
│  [ __________________________ ]               │
│                                                │
│  Confirmer le nouveau mot de passe             │
│  [ __________________________ ]               │
│                                                │
│  [      Enregistrer et continuer      ]        │
└────────────────────────────────────────────────┘
```

#### UI — Barre de navigation après login

```
┌────────────────────────────────────────────────────────────┐
│  GestionPFE    [menu selon rôle]       🔔 3    👤 Rachid   │
│                                           Rôle : Étudiant  │
│                                           [Se déconnecter] │
└────────────────────────────────────────────────────────────┘
```

#### Gestion des erreurs

```
Erreur               Message affiché                   Comportement
───────────────────  ────────────────────────────────  ──────────────────
Email inconnu        "Aucun compte avec cet email"     Champ rouge
Mauvais password     "Mot de passe incorrect"          Champ vidé
5 essais dépassés    "Trop de tentatives (60s)"        Bouton désactivé
Token expiré         (transparent)                     Refresh silencieux
Session expirée      "Session expirée, reconnectez"    Redirect login
Accès refusé         "Accès refusé. Rôle requis: X"   Page 403
Compte inactif       "Votre compte est désactivé"      Contacter admin
```

#### Sécurité

```
MÉCANISME              DÉTAIL
─────────────────────  ──────────────────────────────────────────
JWT Blacklist          Logout invalide définitivement le refresh
Rate limiting          5 essais login/minute par IP → blocage 60s
Hashage password       bcrypt Django (jamais en clair)
is_first_login         Changement mot de passe forcé 1ère connexion
Validation email       Domaine @iscae.ma vérifié côté backend
Rôle vérifié           Chaque endpoint contrôle request.user.role
Access token court     15 min → si volé, expire vite
Refresh httpOnly       Inaccessible au JavaScript (cookie sécurisé)
```

---

### PHASE 2 — Jours 5-7 : Gestion des Sujets

**Objectif :** CRUD sujets avec workflow de validation et filtres

**Étapes :**
1. Créer l'app : `python manage.py startapp sujets apps/sujets`
2. Créer `apps/sujets/models.py` — modèle Sujet
3. Créer `apps/sujets/services.py` — logique métier validation
4. Créer `apps/sujets/filters.py` — filtres django-filter
5. Créer `apps/sujets/serializers.py`
6. Créer `apps/sujets/views.py` — SujetViewSet + actions
7. `makemigrations sujets && migrate`
8. Tester le workflow complet : proposer → valider → affecter

**Modèle Sujet :**
```python
class Sujet(models.Model):
    STATUTS = [
        ('PROPOSE', 'Proposé'),
        ('VALIDE', 'Validé'),
        ('REFUSE', 'Refusé'),
        ('AFFECTE', 'Affecté'),
    ]
    ORIGINES = [('academique', 'Académique'), ('entreprise', 'Entreprise')]

    titre        = models.CharField(max_length=300)
    description  = models.TextField()
    origine      = models.CharField(max_length=20, choices=ORIGINES)
    statut       = models.CharField(max_length=10, choices=STATUTS, default='PROPOSE')
    filiere      = models.CharField(max_length=100)
    annee        = models.IntegerField()
    propose_par  = models.ForeignKey(CustomUser, on_delete=CASCADE, related_name='sujets_proposes')
    encadrant    = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=SET_NULL)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
```

**Endpoints :**
| Méthode | URL | Permission |
|---------|-----|------------|
| GET/POST | `/api/v1/sujets/` | IsAuthenticated |
| GET/PUT/DELETE | `/api/v1/sujets/{id}/` | rôle selon action |
| POST | `/api/v1/sujets/{id}/valider/` | IsCoordinateur |
| POST | `/api/v1/sujets/{id}/refuser/` | IsCoordinateur |
| POST | `/api/v1/sujets/{id}/affecter/` | IsCoordinateur |

---

### PHASE 3 — Jours 8-12 : PFE & Livrables

**Objectif :** Gestion des PFE, dépôt de livrables PDF, détection plagiat

**Étapes :**
1. Créer l'app : `python manage.py startapp pfe apps/pfe`
2. Créer `apps/pfe/models.py` — PFE + Livrable
3. Créer `apps/pfe/signals.py` — auto-création PFE quand Sujet → VALIDÉ
4. Créer `apps/pfe/services.py` — upload, plagiat, archivage
5. Configurer `MEDIA_ROOT` et `MEDIA_URL` dans settings
6. Créer serializers + views + urls
7. `makemigrations pfe && migrate`
8. Tester upload PDF (type/taille validés)

**Modèles :**
```python
class PFE(models.Model):
    STATUTS = [('EN_COURS','En cours'),('VALIDE','Validé'),
               ('REFUSE','Refusé'),('ARCHIVE','Archivé')]
    titre           = models.CharField(max_length=300)
    filiere         = models.CharField(max_length=100)
    annee           = models.IntegerField()
    statut          = models.CharField(max_length=10, choices=STATUTS, default='EN_COURS')
    score_plagiat   = models.FloatField(default=0.0)
    sujet           = models.OneToOneField(Sujet, on_delete=CASCADE)
    etudiant        = models.ForeignKey(CustomUser, on_delete=CASCADE, related_name='pfe')
    encadrant_acad  = models.ForeignKey(CustomUser, null=True, on_delete=SET_NULL, related_name='pfe_acad')
    encadrant_entr  = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=SET_NULL)

class Livrable(models.Model):
    TYPES   = [('rapport','Rapport'),('code','Code'),('presentation','Présentation')]
    STATUTS = [('EN_ATTENTE','En attente'),('VALIDE','Validé'),('REFUSE','Refusé')]
    pfe        = models.ForeignKey(PFE, on_delete=CASCADE, related_name='livrables')
    type       = models.CharField(max_length=20, choices=TYPES)
    fichier    = models.FileField(upload_to='livrables/')
    statut     = models.CharField(max_length=15, choices=STATUTS, default='EN_ATTENTE')
    remarques  = models.TextField(blank=True)
    date_depot = models.DateTimeField(auto_now_add=True)
```

---

### PHASE 4 — Jours 13-17 : Soutenances & Notes

**Objectif :** Planification soutenances, notation jury, génération PDF officiels

**Étapes :**
1. Créer l'app : `python manage.py startapp soutenances apps/soutenances`
2. Créer `apps/soutenances/models.py` — Soutenance, Note, DocumentOfficiel
3. Créer `apps/soutenances/services.py` :
   - `planifier_soutenance()` — date, salle, durée
   - `affecter_jury()` — 2-3 membres jury
   - `calculer_note_finale()` — moyenne pondérée
   - `generer_pv_pdf()` — reportlab
   - `generer_planning_pdf()` — planning global
4. Créer serializers + views + urls
5. `makemigrations soutenances && migrate`

**Modèles :**
```python
class Soutenance(models.Model):
    STATUTS = [('PLANIFIEE','Planifiée'),('EN_COURS','En cours'),
               ('TERMINEE','Terminée'),('REPORTEE','Reportée')]
    pfe         = models.OneToOneField(PFE, on_delete=CASCADE)
    date        = models.DateTimeField()
    salle       = models.CharField(max_length=50)
    duree       = models.IntegerField(help_text='durée en minutes')
    statut      = models.CharField(max_length=10, choices=STATUTS)
    note_finale = models.FloatField(null=True, blank=True)
    membres_jury = models.ManyToManyField(CustomUser, related_name='jurys')

class Note(models.Model):
    TYPES = [('jury','Jury'),('encadrant','Encadrant'),('finale','Finale')]
    soutenance = models.ForeignKey(Soutenance, on_delete=CASCADE, related_name='notes')
    evaluateur = models.ForeignKey(CustomUser, on_delete=CASCADE)
    valeur     = models.FloatField()
    type       = models.CharField(max_length=10, choices=TYPES)
    commentaire = models.TextField(blank=True)
```

---

### PHASE 5 — Jour 18 : Notifications Email + WebSocket

**Objectif :** Notifications temps-réel (WS) + emails SMTP automatiques

**Étapes :**
1. Créer l'app : `python manage.py startapp notifications apps/notifications`
2. Installer : `pip install channels channels-redis`
3. Configurer Redis dans `config/settings/dev.py`
4. Créer `apps/notifications/consumers.py` — WebSocket consumer
5. Créer `apps/notifications/routing.py` — ws/notifications/
6. Configurer `config/asgi.py` avec ProtocolTypeRouter
7. Créer `apps/notifications/services.py` :
   - `envoyer_email_smtp(destinataire, sujet, corps)`
   - `push_websocket(user_id, message)`
   - `notifier_sujet_valide(sujet)`
   - `notifier_soutenance_planifiee(soutenance)`
8. Brancher les services dans les signals des autres apps

**Configuration ASGI (config/asgi.py) :**
```python
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(notifications.routing.websocket_urlpatterns)
    ),
})
```

---

### PHASE 6 — Jour 19 : Statistiques & Exports

**Objectif :** Dashboard stats + exports CSV/Excel/PDF

**Étapes :**
1. Créer l'app : `python manage.py startapp statistiques apps/statistiques`
2. Installer : `pip install openpyxl reportlab`
3. Créer `apps/statistiques/services.py` :
   - `calculer_stats_globales()` — agrégations Django ORM
   - `calculer_stats_filiere(filiere)` — par filière
   - `calculer_stats_encadrant(encadrant_id)` — par encadrant
   - `export_csv(queryset)` — réponse StreamingHttpResponse
   - `export_excel_openpyxl(data)` — fichier .xlsx
   - `export_pdf_reportlab(data)` — fichier .pdf
4. Créer views + serializers + urls

**Endpoints :**
| URL | Description |
|-----|-------------|
| `GET /api/v1/stats/` | Stats globales |
| `GET /api/v1/stats/filiere/{filiere}/` | Stats par filière |
| `GET /api/v1/stats/encadrant/{id}/` | Stats par encadrant |
| `GET /api/v1/stats/classement/` | Classement étudiants |
| `GET /api/v1/stats/export_csv/` | Export CSV |
| `GET /api/v1/stats/export_excel/` | Export Excel |

---

### PHASE 7 — Jour 20 : Finalisation Backend

**Objectif :** Sécurité, documentation Swagger, couverture tests 70%

**Étapes :**
1. Créer `core/exceptions.py` — handler global JSON uniforme
2. Créer `core/throttling.py` — rate limiting login 5/min
3. Installer `drf-yasg` : `pip install drf-yasg`
4. Configurer Swagger dans `config/settings/base.py` + `config/urls.py`
5. Lancer `coverage run manage.py test && coverage report` → viser 70%
6. Corriger les tests jusqu'à 70% minimum
7. Vérifier toutes les permissions par rôle
8. Tester le workflow complet end-to-end

**Format réponse uniforme (core/exceptions.py) :**
```python
# Succès
{"success": true, "data": {...}, "message": "...", "count": N}

# Erreur
{"success": false, "error": {"code": "...", "message": "...", "details": {...}}}
```

---

## Requirements

### requirements/base.txt
```
Django>=4.2,<5.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-filter>=24.0
django-cors-headers>=4.0
channels>=4.0
channels-redis>=4.2
psycopg2-binary>=2.9
python-decouple>=3.8
Pillow>=10.0
openpyxl>=3.1
reportlab>=4.0
drf-yasg>=1.21
```

### requirements/dev.txt
```
-r base.txt
pytest-django>=4.8
coverage>=7.4
factory-boy>=3.3
faker>=25.0
```

---

## Variables d'environnement (.env)

```env
SECRET_KEY=django-insecure-changez-moi-en-prod
DEBUG=True
DB_NAME=gestion_pfe
DB_USER=postgres
DB_PASS=votre_mot_de_passe
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=votre@email.com
EMAIL_HOST_PASSWORD=votre_app_password
```

---

## Règles DDD à respecter

1. **Services** — toute la logique métier est dans `services.py`, jamais dans les vues
2. **Views** — légères, appellent uniquement les services
3. **Models** — données + propriétés simples uniquement, pas de logique
4. **Permissions** — toujours dans `core/permissions.py`, jamais inline
5. **Signals** — uniquement pour les effets de bord automatiques (création PFE, notifications)
6. **Tests** — 1 fichier `tests.py` par app, fixtures dans `tests/conftest.py`

---

## Ordre des commandes de création

```bash
# 1. Créer toutes les apps d'un coup
python manage.py startapp authentication apps/authentication
python manage.py startapp sujets apps/sujets
python manage.py startapp pfe apps/pfe
python manage.py startapp soutenances apps/soutenances
python manage.py startapp notifications apps/notifications
python manage.py startapp statistiques apps/statistiques

# 2. Créer le dossier core
mkdir core && touch core/__init__.py core/permissions.py core/exceptions.py
touch core/throttling.py core/pagination.py core/mixins.py core/utils.py

# 3. Migrations dans l'ordre (respecter les dépendances FK)
python manage.py makemigrations authentication
python manage.py makemigrations sujets
python manage.py makemigrations pfe
python manage.py makemigrations soutenances
python manage.py makemigrations notifications
python manage.py migrate

# 4. Créer superuser
python manage.py createsuperuser

# 5. Lancer
python manage.py runserver
```

---

## Dépendances entre apps (ordre à respecter)

```
authentication  ──►  core/permissions.py
     │
     ▼
   sujets  ──────────────────────────────┐
     │                                   │
     ▼  (signal post_save)               │
    pfe  ◄──────────────────────────────┘
     │
     ▼
soutenances  ──► generer_pdf (reportlab)
     │
     ├──► notifications  ──► email SMTP + WebSocket
     │
     └──► statistiques  ──► export CSV/Excel/PDF
```
