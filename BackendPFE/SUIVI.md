# GestionPFE — Suivi des phases

---

## Phase 0 — Setup & Configuration ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `config/settings/base.py` | Settings communs : INSTALLED_APPS, JWT (15min/7j), DRF, Channels, Swagger, EMAIL |
| `config/settings/dev.py` | Dev : DEBUG=True, PostgreSQL local, emails dans console |
| `config/settings/prod.py` | Prod : DEBUG=False, headers sécurité |
| `config/asgi.py` | Routing WebSocket Channels (HTTP + WS) |
| `manage.py` | Pointe sur `config.settings.dev` |
| `.env` | Variables sensibles (SECRET_KEY, DB, Redis, Email) |
| `.env.example` | Template à mettre dans git |
| `requirements/base.txt` | Dépendances prod |
| `requirements/dev.txt` | Dépendances dev (pytest, coverage, factory-boy) |
| `core/permissions.py` | 10 classes RBAC (IsAdmin, IsEtudiant, IsCoordinateur…) |
| `core/exceptions.py` | Handler global — format `{success, error{code,message,details}}` |
| `core/pagination.py` | `StandardPagination` page_size=20 |
| `core/throttling.py` | `LoginRateThrottle` — 5 req/min |
| `core/utils.py` | `generate_temp_password()`, `validate_iscae_email()` |
| `apps/authentication/models.py` | `CustomUser` + `CustomUserManager` — 7 rôles + `is_first_login` |
| Stubs 6 apps | `__init__.py`, `apps.py`, `models.py`, `urls.py`, `migrations/` |

### Test
```
python manage.py check  →  System check identified no issues (0 silenced)
```

---

## Phase 1 — Authentication JWT ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/authentication/models.py` | `CustomUser` (7 rôles, `is_first_login`) + `CustomUserManager` |
| `apps/authentication/serializers.py` | `UserSerializer`, `CreateUserSerializer`, `LoginSerializer`, `ChangePasswordSerializer` |
| `apps/authentication/views.py` | login, logout, me, change_password, AdminCreateUserView, UserListView, UserDetailView |
| `apps/authentication/services.py` | `create_user_by_admin()` (valide @iscae.ma + envoie email), `reset_password()` |
| `apps/authentication/urls.py` | 8 endpoints |
| `apps/authentication/admin.py` | Interface Django Admin pour CustomUser |
| `apps/authentication/tests.py` | 12 tests : login, refresh, logout blacklist, me, admin CRUD, change password |
| `config/urls.py` | Routes globales + Swagger/Redoc |

### Endpoints
| Méthode | URL | Permission |
|---|---|---|
| POST | `/api/v1/auth/users/` | IsAdmin |
| GET | `/api/v1/auth/users/list/` | IsAdmin |
| GET/PUT | `/api/v1/auth/users/{id}/` | IsAdmin |
| POST | `/api/v1/auth/login/` | AllowAny — throttle 5/min |
| POST | `/api/v1/auth/logout/` | IsAuthenticated — blacklist refresh |
| GET/PUT | `/api/v1/auth/me/` | IsAuthenticated |
| PUT | `/api/v1/auth/me/password/` | IsAuthenticated |
| POST | `/api/v1/auth/token/refresh/` | AllowAny |

### Tests automatiques
```
Ran 12 tests in 18s  →  OK (12/12) sur PostgreSQL
```

### Comment tester manuellement (Postman / curl)

#### 0. Lancer le serveur
```bash
python manage.py runserver
# → http://127.0.0.1:8000
# → Swagger : http://127.0.0.1:8000/swagger/
```

#### 1. Créer le compte admin (une seule fois)
```bash
python manage.py createsuperuser
# → Email : admin@iscae.ma
# → Nom : Admin
# → Prenom : Super
# → Role : admin
# → Password : Admin1234!
```

#### 2. Login Admin → récupérer le token
```
POST http://127.0.0.1:8000/api/v1/auth/login/
Content-Type: application/json

{
  "email": "admin@iscae.ma",
  "password": "Admin1234!"
}

→ Réponse :
{
  "success": true,
  "data": {
    "access": "eyJ...",       ← copier ce token
    "refresh": "eyJ...",
    "user": { "id":1, "email":"admin@iscae.ma", "role":"admin" },
    "must_change_password": false
  }
}
```

#### 3. Admin crée un étudiant
```
POST http://127.0.0.1:8000/api/v1/auth/users/
Authorization: Bearer <access_token_admin>
Content-Type: application/json

{
  "email": "r.alaoui@iscae.ma",
  "nom": "Alaoui",
  "prenom": "Rachid",
  "role": "etudiant"
}

→ 201 Created — mot de passe temp généré + email console affiché
```

#### 4. Voir son profil
```
GET http://127.0.0.1:8000/api/v1/auth/me/
Authorization: Bearer <access_token>

→ { "success": true, "data": { "email": "...", "role": "...", ... } }
```

#### 5. Changer son mot de passe (1ère connexion)
```
PUT http://127.0.0.1:8000/api/v1/auth/me/password/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "old_password": "MotDePasseTemp",
  "new_password": "NouveauPass#2025"
}
```

#### 6. Refresh token
```
POST http://127.0.0.1:8000/api/v1/auth/token/refresh/
Content-Type: application/json

{ "refresh": "eyJ..." }

→ { "access": "eyJ..." }   ← nouvel access token
```

#### 7. Logout (blacklist refresh)
```
POST http://127.0.0.1:8000/api/v1/auth/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

{ "refresh": "eyJ..." }

→ { "success": true, "message": "Déconnexion réussie" }
```

#### 8. Erreurs attendues
| Situation | Status | Réponse |
|---|---|---|
| Email inconnu | 400 | `{"success":false,"error":{"message":"Identifiants invalides"}}` |
| Mauvais mot de passe | 400 | idem |
| Plus de 5 login/min | 429 | `Too Many Requests` |
| Token expiré | 401 | `Unauthorized` |
| Accès refusé (mauvais rôle) | 403 | `Forbidden` |
| Email hors @iscae.ma | 400 | `L'email doit appartenir au domaine @iscae.ma` |

#### 9. Interface Swagger (documentation interactive)
```
http://127.0.0.1:8000/swagger/
→ Tester tous les endpoints directement dans le navigateur
→ Cliquer "Authorize" → entrer : Bearer <access_token>
```

---

## Phase 2 — Sujets ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/sujets/models.py` | `Sujet` — titre, description, origine, statut (PROPOSE/VALIDE/REFUSE/AFFECTE), filiere, annee, motif_refus |
| `apps/sujets/services.py` | `valider_sujet()`, `refuser_sujet()` (motif obligatoire), `affecter_encadrant()` |
| `apps/sujets/filters.py` | `SujetFilter` — filtre par titre, filiere, annee, statut, origine |
| `apps/sujets/serializers.py` | `SujetSerializer`, `SujetCreateSerializer`, `AffecterEncadrantSerializer` |
| `apps/sujets/views.py` | `SujetViewSet` + actions `valider`, `refuser`, `affecter` |
| `apps/sujets/urls.py` | Router DRF → `/api/v1/sujets/` |
| `apps/sujets/admin.py` | Interface Django Admin |
| `apps/sujets/tests.py` | 12 tests : CRUD, filtres, validation, refus, affectation |

### Endpoints
| Méthode | URL | Permission |
|---|---|---|
| GET/POST | `/api/v1/sujets/` | IsAuthenticated |
| GET/PUT/DELETE | `/api/v1/sujets/{id}/` | IsAuthenticated |
| POST | `/api/v1/sujets/{id}/valider/` | IsCoordinateur |
| POST | `/api/v1/sujets/{id}/refuser/` | IsCoordinateur — motif obligatoire |
| POST | `/api/v1/sujets/{id}/affecter/` | IsCoordinateur — `{"encadrant_id": N}` |

### Visibilité par rôle
- **Étudiant** → voit seulement ses propres sujets
- **Encadrant** → voit ses sujets proposés + ceux qu'il encadre
- **Coordinateur/Admin** → voit tout

### Tests
```
Ran 12 tests  →  OK (12/12) sur PostgreSQL
```

### Comment tester (Postman)

#### Proposer un sujet (étudiant)
```
POST /api/v1/sujets/
Authorization: Bearer <token_etudiant>

{ "titre":"Système RH", "description":"...", "origine":"academique", "filiere":"Finance", "annee":2025 }
```

#### Valider un sujet (coordinateur)
```
POST /api/v1/sujets/1/valider/
Authorization: Bearer <token_coordinateur>
```

#### Refuser un sujet (coordinateur)
```
POST /api/v1/sujets/1/refuser/
Authorization: Bearer <token_coordinateur>

{ "motif": "Hors filière" }
```

#### Affecter un encadrant (coordinateur)
```
POST /api/v1/sujets/1/affecter/
Authorization: Bearer <token_coordinateur>

{ "encadrant_id": 3 }
```

#### Filtres disponibles
```
GET /api/v1/sujets/?statut=PROPOSE
GET /api/v1/sujets/?filiere=Finance
GET /api/v1/sujets/?annee=2025
GET /api/v1/sujets/?titre=RH
GET /api/v1/sujets/?search=gestion
```
## Phase 3 — PFE & Livrables ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/pfe/models.py` | `PFE` (OneToOne Sujet, score_plagiat, statut) + `Livrable` (upload fichier, type, statut) |
| `apps/pfe/signals.py` | `post_save` sur Sujet → crée PFE automatiquement quand statut=VALIDE |
| `apps/pfe/services.py` | `upload_livrable()` (validation ext/taille), `valider_livrable()`, `refuser_livrable()`, `archiver_pfe()` |
| `apps/pfe/serializers.py` | `PFESerializer`, `LivrableSerializer`, `LivrableUploadSerializer` |
| `apps/pfe/filters.py` | `PFEFilter`, `LivrableFilter` |
| `apps/pfe/views.py` | `PFEViewSet` + action archiver / `LivrableViewSet` + actions valider, refuser |
| `apps/pfe/urls.py` | `/api/v1/pfe/` + `/api/v1/livrables/` |
| `apps/pfe/tests.py` | 12 tests : signal, upload, extension invalide, valider, refuser, archiver |

### Endpoints
| Méthode | URL | Permission |
|---|---|---|
| GET | `/api/v1/pfe/` | IsAuthenticated |
| GET | `/api/v1/pfe/{id}/` | IsAuthenticated |
| POST | `/api/v1/pfe/{id}/archiver/` | IsCoordinateur |
| GET/POST | `/api/v1/livrables/` | IsAuthenticated |
| POST | `/api/v1/livrables/{id}/valider/` | IsEncadrant |
| POST | `/api/v1/livrables/{id}/refuser/` | IsEncadrant — remarques obligatoires |

### Extensions acceptées
| Type | Extensions |
|---|---|
| rapport | `.pdf` |
| code | `.zip`, `.tar`, `.gz` |
| presentation | `.pdf`, `.pptx`, `.ppt` |

### Correction ajoutée — etudiant_cible (après Phase 3)

**Problème détecté :** le signal utilisait `propose_par` comme étudiant du PFE.
Si un encadrant propose le sujet → `propose_par` = encadrant ❌

**Correction :**

| Fichier modifié | Ce qui a changé |
|---|---|
| `apps/sujets/models.py` | Ajout champ `etudiant_cible` (FK vers étudiant, null si proposeur est étudiant) + propriété `etudiant` |
| `apps/sujets/serializers.py` | `SujetCreateSerializer` — `etudiant_cible` obligatoire si proposeur est encadrant |
| `apps/pfe/signals.py` | Utilise `sujet.etudiant` (propriété) au lieu de `propose_par` |

**Logique `sujet.etudiant` :**
```
propose_par.role == 'etudiant'  →  etudiant = propose_par
propose_par.role == 'encadrant' →  etudiant = etudiant_cible
```

**Tests :** 24/24 OK (12 sujets + 12 pfe, aucune régression)

### Comment tester (Postman)

#### Étudiant propose un sujet
```
POST /api/v1/sujets/
Authorization: Bearer <token_etudiant>

{ "titre":"Mon PFE", "description":"...", "origine":"academique", "filiere":"Finance", "annee":2025 }
```

#### Encadrant propose un sujet pour un étudiant
```
POST /api/v1/sujets/
Authorization: Bearer <token_encadrant>

{ "titre":"Sujet IA", "description":"...", "origine":"academique",
  "filiere":"Info", "annee":2025, "etudiant_cible": 3 }
```

#### Valider un sujet → PFE créé automatiquement
```
POST /api/v1/sujets/1/valider/
Authorization: Bearer <token_coordinateur>
→ PFE créé automatiquement en base avec le bon étudiant
→ GET /api/v1/pfe/ pour vérifier
```

#### Déposer un rapport (multipart)
```
POST /api/v1/livrables/
Authorization: Bearer <token_etudiant>
Content-Type: multipart/form-data

pfe=1 | type=rapport | fichier=<fichier.pdf>
```

#### Encadrant valide le livrable
```
POST /api/v1/livrables/1/valider/
Authorization: Bearer <token_encadrant>

{ "remarques": "Bon travail" }
```

---

## Phase 4 — Soutenances & Notes ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/soutenances/models.py` | `Soutenance` (PFE OneToOne, date, salle, durée, jury M2M) + `Note` (jury/encadrant/finale) |
| `apps/soutenances/services.py` | `planifier_soutenance()`, `affecter_jury()`, `soumettre_note()`, `calculer_note_finale()`, `generer_pv_pdf()` |
| `apps/soutenances/serializers.py` | `SoutenanceSerializer`, `PlanifierSerializer`, `AffecterJurySerializer`, `SoumettreNoteSerializer` |
| `apps/soutenances/filters.py` | `SoutenanceFilter` : statut, annee, filiere |
| `apps/soutenances/views.py` | `SoutenanceViewSet` + actions : planifier, affecter_jury, noter, calculer_finale, pv_pdf |
| `apps/soutenances/urls.py` | `/api/v1/soutenances/` |
| `apps/soutenances/tests.py` | 12 tests : planification, jury, notes, calcul finale |

### Endpoints

| Méthode | URL | Permission |
|---|---|---|
| GET | `/api/v1/soutenances/` | IsAuthenticated |
| GET | `/api/v1/soutenances/{id}/` | IsAuthenticated |
| POST | `/api/v1/soutenances/planifier/` | IsCoordinateur |
| POST | `/api/v1/soutenances/{id}/affecter_jury/` | IsCoordinateur |
| POST | `/api/v1/soutenances/{id}/noter/` | IsAuthenticated (jury ou encadrant) |
| POST | `/api/v1/soutenances/{id}/calculer_finale/` | IsCoordinateur |
| GET | `/api/v1/soutenances/{id}/pv_pdf/` | IsAuthenticated |

### Calcul note finale
```
Note finale = 60% × moyenne jury + 40% × note encadrant
Si pas de note encadrant → 100% moyenne jury
```

### Visibilité par rôle
- **Étudiant** → voit sa propre soutenance
- **Encadrant** → voit les soutenances de ses PFE
- **Jury** → voit les soutenances où il est membre
- **Coordinateur/Admin** → voit tout

### Tests
```
Ran 11 tests  →  OK (11/11)
```

### Comment tester (Postman)

#### Planifier une soutenance
```
POST /api/v1/soutenances/planifier/
Authorization: Bearer <token_coordinateur>

{
  "pfe_id": 1,
  "date": "2025-06-15T09:00:00Z",
  "salle": "Salle A",
  "duree": 30
}
```

#### Affecter le jury
```
POST /api/v1/soutenances/1/affecter_jury/
Authorization: Bearer <token_coordinateur>

{ "jury_ids": [4, 5] }
```

#### Jury soumet sa note
```
POST /api/v1/soutenances/1/noter/
Authorization: Bearer <token_jury>

{ "valeur": 15.5, "type": "jury", "commentaire": "Très bon travail" }
```

#### Calculer la note finale
```
POST /api/v1/soutenances/1/calculer_finale/
Authorization: Bearer <token_coordinateur>
→ statut passe à TERMINEE, note_finale calculée
```

#### Télécharger le PV PDF
```
GET /api/v1/soutenances/1/pv_pdf/
Authorization: Bearer <token>
→ télécharge pv_soutenance_1.pdf
```

---

## Phase 5 — Notifications Email + WebSocket ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/notifications/models.py` | `Notification` (destinataire, titre, message, type, lu, created_at) |
| `apps/notifications/services.py` | `creer_notification()`, `envoyer_email()`, `push_websocket()`, `notifier()` + helpers métier |
| `apps/notifications/consumers.py` | `NotificationConsumer` — WebSocket async, auth JWT via query string |
| `apps/notifications/routing.py` | `ws/notifications/` → `NotificationConsumer` |
| `apps/notifications/serializers.py` | `NotificationSerializer` |
| `apps/notifications/views.py` | `NotificationListView` (GET paginé), `marquer_lu`, `marquer_tout_lu` |
| `apps/notifications/urls.py` | `/api/v1/notifications/`, `/notifications/<pk>/lu/`, `/notifications/tout-lu/` |
| `apps/notifications/tests.py` | 7 tests : créer, notifier, liste, marquer lu, tout lu, non-auth, isolation user |
| `config/asgi.py` | `ProtocolTypeRouter` HTTP + WebSocket avec `AuthMiddlewareStack` |

### Endpoints HTTP

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/notifications/` | IsAuthenticated | Liste paginée des notifications |
| POST | `/api/v1/notifications/<pk>/lu/` | IsAuthenticated | Marquer une notification comme lue |
| POST | `/api/v1/notifications/tout-lu/` | IsAuthenticated | Marquer toutes comme lues |

### WebSocket

```
ws://localhost:8000/ws/notifications/?token=<access_token>
```
- Auth : JWT extrait du query string, validé avec `UntypedToken`
- Groupe : `user_<id>` — chaque utilisateur a son propre canal
- Message reçu : `{ "titre": "...", "message": "...", "type": "..." }`

### Événements déclencheurs

| Action | Destinataire | Canal |
|---|---|---|
| Sujet validé | Étudiant | Email + WebSocket |
| Sujet refusé | Proposeur | Email |
| Encadrant affecté | Encadrant + Étudiant | Email + WebSocket |
| Livrable déposé | Encadrant | WebSocket |
| Livrable validé | Étudiant | Email + WebSocket |
| Soutenance planifiée | Étudiant + Jury + Encadrant | Email + WebSocket |

### Tests
```
Ran 7 tests  →  OK (7/7)
```

### Comment tester (Postman)

#### Lister les notifications
```
GET /api/v1/notifications/
Authorization: Bearer <token>
→ { "count": 2, "results": [...] }
```

#### Marquer une notification comme lue
```
POST /api/v1/notifications/1/lu/
Authorization: Bearer <token>
→ { "success": true }
```

#### Marquer tout comme lu
```
POST /api/v1/notifications/tout-lu/
Authorization: Bearer <token>
→ { "success": true }
```

#### Tester le WebSocket (wscat)
```
wscat -c "ws://localhost:8000/ws/notifications/?token=<access_token>"
→ Connecté — reçoit les notifications en temps réel
```

---

## Phase 6 — Statistiques & Exports ✅

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/statistiques/services.py` | `calculer_stats_globales()`, `calculer_stats_filiere()`, `calculer_stats_encadrant()`, `classement_etudiants()`, `export_csv()`, `export_excel()`, `export_pdf()` |
| `apps/statistiques/views.py` | 7 vues : stats globales, par filière, par encadrant, classement, export CSV/Excel/PDF |
| `apps/statistiques/urls.py` | 7 endpoints sous `/api/v1/stats/` |
| `apps/statistiques/tests.py` | 11 tests : stats, classement, filtres, exports, non-auth |

### Endpoints

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/stats/` | IsAuthenticated | Stats globales |
| GET | `/api/v1/stats/filiere/<filiere>/` | IsAuthenticated | Stats par filière |
| GET | `/api/v1/stats/encadrant/<id>/` | IsAuthenticated | Stats par encadrant |
| GET | `/api/v1/stats/classement/` | IsAuthenticated | Classement étudiants par note |
| GET | `/api/v1/stats/export_csv/` | IsAuthenticated | Export CSV téléchargeable |
| GET | `/api/v1/stats/export_excel/` | IsAuthenticated | Export Excel .xlsx |
| GET | `/api/v1/stats/export_pdf/` | IsAuthenticated | Export PDF reportlab |

### Filtres disponibles (classement + exports)
```
?filiere=Finance
?annee=2025
?filiere=Finance&annee=2025
```

### Tests
```
Ran 11 tests  →  OK (11/11)
```

### Comment tester (Postman)

#### Stats globales
```
GET /api/v1/stats/
Authorization: Bearer <token>
→ { "success": true, "data": { "total_pfe": 5, "moyenne_notes": 14.2, ... } }
```

#### Classement étudiants
```
GET /api/v1/stats/classement/?filiere=Finance&annee=2025
Authorization: Bearer <token>
→ { "count": 3, "data": [{ "rang": 1, "etudiant": "...", "note_finale": 17.5 }, ...] }
```

#### Export CSV
```
GET /api/v1/stats/export_csv/
Authorization: Bearer <token>
→ télécharge pfe_classement.csv
```

#### Export Excel
```
GET /api/v1/stats/export_excel/
Authorization: Bearer <token>
→ télécharge pfe_classement.xlsx
```

#### Export PDF
```
GET /api/v1/stats/export_pdf/
Authorization: Bearer <token>
→ télécharge pfe_classement.pdf
```

---

## Phase 7 — Finalisation Backend ✅

### Bilan final

| Élément | Statut | Détail |
|---|---|---|
| Tests | ✅ | 65 tests — 0 erreur |
| Coverage | ✅ | **94%** (objectif : 70%) |
| Swagger | ✅ | `/swagger/` + `/redoc/` opérationnels |
| Throttling | ✅ | `LoginRateThrottle` — 5 req/min |
| Format réponse | ✅ | `{success, data, message}` / `{success, error{code,message}}` |
| Permissions RBAC | ✅ | 10 classes dans `core/permissions.py` |

### Coverage par app

| Fichier | Coverage |
|---|---|
| apps/authentication | 85–100% |
| apps/sujets | 89–98% |
| apps/pfe | 90–100% |
| apps/soutenances | 51–100% (services.py : branches PDF non testées) |
| apps/notifications | 89–100% |
| apps/statistiques | 92–100% |
| core/ | 73–100% |
| **TOTAL** | **94%** |

### Endpoints complets — récapitulatif

| App | Endpoints |
|---|---|
| auth | `/api/v1/auth/users/` · `/login/` · `/logout/` · `/me/` · `/token/refresh/` |
| sujets | `/api/v1/sujets/` · `valider/` · `refuser/` · `affecter/` |
| pfe | `/api/v1/pfe/` · `archiver/` · `/api/v1/livrables/` · `valider/` · `refuser/` |
| soutenances | `/api/v1/soutenances/` · `planifier/` · `affecter_jury/` · `noter/` · `calculer_finale/` · `pv_pdf/` |
| notifications | `/api/v1/notifications/` · `<pk>/lu/` · `tout-lu/` |
| statistiques | `/api/v1/stats/` · `filiere/` · `encadrant/` · `classement/` · `export_csv/` · `export_excel/` · `export_pdf/` |
| docs | `/swagger/` · `/redoc/` |
| ws | `ws://localhost:8000/ws/notifications/?token=<jwt>` |

### Commande coverage
```
python -m coverage run manage.py test apps.authentication apps.sujets apps.pfe apps.soutenances apps.notifications apps.statistiques
python -m coverage report
→ TOTAL : 94%
```

---

## Améliorations — Priorité 1 : Fondations universitaires ✅

> Implémentées après la Phase 7. Tests : 65/65 OK.

### A1 — Année académique

**Modèle `AnneeAcademique`** (`apps/pfe/models.py`) — une seule active à la fois (save() auto-désactive les autres).

**Modèle `Deadline`** (`apps/pfe/models.py`) — deadline par type de livrable, liée à une année. Flag `hors_delai` sur `Livrable` (soft enforcement).

**Services** (`apps/pfe/services.py`) — `get_annee_active()`, `creer_annee()`, `ouvrir_annee()`, `fermer_annee_active()`, `definir_deadline()`. `upload_livrable()` détecte et enregistre `hors_delai` automatiquement.

**Nouveaux endpoints** (`AnneeAcademiqueViewSet`) :

| Méthode | URL | Permission |
|---|---|---|
| POST | `/api/v1/annees/creer/` | IsCoordinateur |
| POST | `/api/v1/annees/{id}/ouvrir/` | IsCoordinateur |
| POST | `/api/v1/annees/{id}/fermer/` | IsCoordinateur |
| GET | `/api/v1/annees/active/` | IsAuthenticated |
| GET/POST | `/api/v1/annees/{id}/deadlines/` | IsCoordinateur |

**Migrations :** `pfe/migrations/0002_anneeacademique_livrable_hors_delai_pfe_mention_and_more.py`

---

### A2 — Deadlines souples pour les livrables

Lié à A1. Lors du dépôt d'un livrable, `upload_livrable()` compare `timezone.now()` à la deadline de l'année active. Si dépassé → `hors_delai=True` sur le livrable (aucun blocage, le coordinateur voit le flag). `LivrableSerializer` expose le champ `hors_delai`.

---

### A3 — Convocation PDF à l'autorisation de soutenance

Nouveau statut initial `EN_ATTENTE_AUTORISATION` (max_length porté à 30).

**`autoriser_soutenance()`** (`apps/soutenances/services.py`) :
- Exige jury ≥ 2 membres avant autorisation
- Passe le statut `EN_ATTENTE_AUTORISATION` → `PLANIFIEE`
- Génère automatiquement la convocation PDF (ReportLab) : en-tête ISCAE, infos étudiant/soutenance, composition jury, zone signatures
- Envoie notification `notifier_soutenance_planifiee()`

**`generer_convocation_pdf()`** (`apps/soutenances/services.py`) — génère `convocation_<pk>.pdf` dans `media/convocations/`.

**Nouveau endpoint** :

| Méthode | URL | Permission |
|---|---|---|
| GET | `/api/v1/soutenances/{id}/convocation_pdf/` | IsAuthenticated |

**Migration :** `soutenances/migrations/0002_soutenance_annee_academique_alter_soutenance_statut.py`

---

### A4 — Délibération et mentions après clôture de session

**`_get_mention_code(note)`** — retourne le code mention selon le barème ISCAE :
- ≥ 16 → `TB` (Très Bien)
- ≥ 14 → `B` (Bien)
- ≥ 12 → `AB` (Assez Bien)
- ≥ 10 → `P` (Passable)
- < 10 → `AJ` (Ajourné)

**`cloturer_session(annee_academique_id)`** (`apps/soutenances/services.py`) :
- Vérifie que **toutes** les soutenances de l'année sont `TERMINEE`
- Calcule et enregistre la mention sur chaque `PFE`
- Passe le statut PFE à `VALIDE` (≥10) ou `REFUSE` (<10)
- Envoie notification résultats à chaque étudiant
- Ferme l'année (active=False)

**`PFE`** : champ `mention` (choices `MENTIONS`) + FK `annee_academique`.

**`notifier_resultats_publies()`** (`apps/notifications/services.py`) — notification email+WS résultats publiés.

**Nouveau endpoint** :

| Méthode | URL | Permission |
|---|---|---|
| POST | `/api/v1/soutenances/cloturer_session/` | IsCoordinateur — body `{"annee_academique_id": N}` |

---

### A5 — Limite max étudiants par encadrant

Champ `max_etudiants = PositiveIntegerField(default=5)` sur `CustomUser`.

**`affecter_encadrant()`** (`apps/sujets/services.py`) — compte les PFE `EN_COURS` de l'encadrant et lève `ValidationError` si `charge_actuelle >= max_etudiants`.

**Migration :** `authentication/migrations/0002_customuser_max_etudiants.py`

---

### Bilan Priorité 1

| Amélioration | Fichiers modifiés | Tests |
|---|---|---|
| A1 Année académique | `pfe/models.py`, `pfe/services.py`, `pfe/serializers.py`, `pfe/views.py`, `pfe/urls.py` | ✅ |
| A2 Deadlines livrables | `pfe/models.py`, `pfe/services.py`, `pfe/serializers.py` | ✅ |
| A3 Convocation PDF | `soutenances/models.py`, `soutenances/services.py`, `soutenances/views.py` | ✅ |
| A4 Délibération/mentions | `pfe/models.py`, `soutenances/services.py`, `notifications/services.py` | ✅ |
| A5 Limite encadrant | `authentication/models.py`, `sujets/services.py` | ✅ |

```
python manage.py test apps.authentication apps.sujets apps.pfe apps.soutenances apps.notifications apps.statistiques
Ran 65 tests  →  OK (65/65)
```

---

## Améliorations — Priorité 2 : Processus universitaire complet ✅

> Implémentées après Priorité 1. Tests : 65/65 OK.

### B1 — Fiche d'inscription PFE officielle

**Modèle `FicheInscription`** (`apps/pfe/models.py`) — OneToOne PFE, statut de signature (`EN_ATTENTE_ENCADRANT` → `EN_ATTENTE_COORDINATEUR` → `SIGNEE`), champs `signe_encadrant`, `signe_coordinateur`, `chemin_pdf`.

**Signal** (`apps/pfe/signals.py`) — génère automatiquement la fiche PDF quand le PFE est créé. Erreur silencieuse si ReportLab absent.

**Services** (`apps/pfe/services.py`) :
- `generer_fiche_inscription(pfe)` — PDF ReportLab dans `media/fiches/`
- `signer_fiche(fiche, signataire)` — workflow : encadrant signe en premier, coordinateur en second

**Endpoints** :

| Méthode | URL | Permission |
|---|---|---|
| POST | `/api/v1/pfe/{id}/generer-fiche/` | IsCoordinateur |
| GET | `/api/v1/pfe/{id}/fiche-pdf/` | IsAuthenticated |
| POST | `/api/v1/pfe/{id}/signer-fiche/` | IsAuthenticated (encadrant ou coordinateur) |

**Migration :** `pfe/migrations/0003_fiche_inscription.py`

---

### B2 — Bibliothèque des PFE archivés

**`BibliothequeViewSet`** (`apps/pfe/views.py`) — filtre `statut=ARCHIVE`, respecte le champ `confidentiel`.

```
GET /api/v1/bibliotheque/?filiere=Finance
GET /api/v1/bibliotheque/?annee=2025
GET /api/v1/bibliotheque/?encadrant_id=3
GET /api/v1/bibliotheque/?mention=tres_bien
GET /api/v1/bibliotheque/?search=gestion
```

---

### B3 — Dashboard coordinateur enrichi

**`dashboard_coordinateur(annee_id=None)`** (`apps/statistiques/services.py`) — sujets en attente, PFE sans encadrant, livrables en attente, soutenances en attente d'autorisation, % rapport validé, étudiants sans soutenance, alertes deadlines (7 jours).

| Méthode | URL |
|---|---|
| GET | `/api/v1/stats/dashboard/coordinateur/?annee_id=N` |

---

### B4 — Dashboard encadrant enrichi

**`dashboard_encadrant(encadrant_id)`** (`apps/statistiques/services.py`) — progression livrable (rapport/code/présentation) + soutenance pour chaque étudiant EN_COURS.

| Méthode | URL |
|---|---|
| GET | `/api/v1/stats/dashboard/encadrant/{id}/` |

---

### Bilan Priorité 2

| Amélioration | Tests |
|---|---|
| B1 Fiche inscription PDF | ✅ |
| B2 Bibliothèque archivés | ✅ |
| B3 Dashboard coordinateur | ✅ |
| B4 Dashboard encadrant | ✅ |

```
Ran 97 tests  →  OK (97/97)
```

**+32 nouveaux tests couvrant A1 à B4 :**

| Fichier | Nouvelles classes | Tests |
|---|---|---|
| `pfe/tests.py` | `AnneeAcademiqueTests`, `FicheInscriptionTests`, `BibliothequeTests` | A1+A2, B1, B2 |
| `sujets/tests.py` | `LimiteEncadrantTests` | A5 |
| `soutenances/tests.py` | `AutoriserSoutenanceTests`, `CloturerSessionTests` | A3, A4 |
| `statistiques/tests.py` | `DashboardCoordinateurTests`, `DashboardEncadrantTests` | B3, B4 |

---

## Améliorations compétitives — Session 2026-06-12

### Profil utilisateur complet (Option A)

**Problème corrigé :** Le champ filière dans le formulaire admin était affiché mais jamais sauvegardé (données silencieusement perdues côté backend).

**Champs ajoutés à `CustomUser` :**

| Champ | Type | Rôles concernés |
|---|---|---|
| `filiere` | `CharField(blank=True)` | Étudiant |
| `telephone` | `CharField(blank=True)` | Tous |
| `matricule` | `CharField(blank=True)` | Étudiant |

**Fichiers modifiés :**

| Fichier | Changement |
|---|---|
| `apps/authentication/models.py` | +3 champs |
| `apps/authentication/migrations/0003_customuser_filiere_telephone_matricule.py` | Migration |
| `apps/authentication/serializers.py` | `UserSerializer`, `CreateUserSerializer`, `UpdateUserSerializer` : +3 champs |
| `apps/authentication/services.py` | `create_user_by_admin()` : +3 paramètres optionnels |
| `FrontendPFE/src/pages/admin/Users.jsx` | Formulaire créa/édition : filière sauvegardée, +téléphone, +matricule |
| `FrontendPFE/src/pages/auth/Profile.jsx` | Page profil : +téléphone (tous), +filière+matricule (étudiant) |
| `i18n/locales/fr.json` + `ar.json` | Clés `telephone`, `matricule` ajoutées |

---

## App `apps/config/` — Filières dynamiques (2026-06-13)

### Objectif
Remplacer les listes de filières hardcodées par une table en base gérée par l'admin.

### Modèle `Filiere`
```python
class Filiere(models.Model):
    libelle    = CharField(max_length=100, unique=True)
    code       = CharField(max_length=10, blank=True)   # ex: FIN, CPT
    active     = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
```

**Migration 0002** : insère les 5 filières initiales (Finance/FIN, Comptabilité/CPT, Audit/AUD, Management/MGT, Informatique/INF).

### Endpoint
| Méthode | URL | Permission |
|---|---|---|
| GET | `/api/v1/config/filieres/` | IsAuthenticated |
| GET | `/api/v1/config/filieres/?active=true` | IsAuthenticated |
| POST | `/api/v1/config/filieres/` | IsAdmin |
| PATCH | `/api/v1/config/filieres/{id}/` | IsAdmin |
| DELETE | `/api/v1/config/filieres/{id}/` | IsAdmin |

### Fichiers créés/modifiés

| Fichier | Rôle |
|---|---|
| `apps/config/models.py` | Modèle `Filiere` |
| `apps/config/serializers.py` | `FiliereSerializer` |
| `apps/config/views.py` | `FiliereViewSet` |
| `apps/config/urls.py` | Router `/config/filieres/` |
| `apps/config/apps.py` | Config app |
| `apps/config/admin.py` | Interface Django admin |
| `apps/config/migrations/0001_initial.py` | Création table |
| `apps/config/migrations/0002_data_filieres_initiales.py` | Données initiales |
| `config/settings/base.py` | `apps.config` ajouté à INSTALLED_APPS |
| `config/urls.py` | `/api/v1/config/` ajouté |
| `FrontendPFE/src/api/config.js` | `getFilieres`, `createFiliere`, `updateFiliere`, `deleteFiliere` |
| `FrontendPFE/src/hooks/useFilieres.js` | Hook partagé `useFilieres()` |
| `FrontendPFE/src/pages/admin/Users.jsx` | Section gestion filières (CRUD) + selects dynamiques |
| `FrontendPFE/src/pages/auth/Profile.jsx` | Select filière dynamique |
