# GestionPFE — Guide complet : Architecture & Tests
**Date :** 12 juin 2026  
**Projet :** Application de gestion des PFE — ISCAE Mauritanie  
**Stack :** Django 4.2 DDD · React 18 · PostgreSQL · SimpleJWT · TanStack Query · i18n (fr/ar)

---

## Table des matières

1. [Vue d'ensemble de l'application](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Les 7 rôles et leurs responsabilités](#3-les-7-rôles)
4. [Cycle de vie complet d'un PFE](#4-cycle-de-vie-dun-pfe)
5. [API — Tous les endpoints](#5-api--tous-les-endpoints)
6. [Pages Frontend par rôle](#6-pages-frontend-par-rôle)
7. [Guide de test de A à Z](#7-guide-de-test-de-a-à-z)
8. [Vérifications transversales](#8-vérifications-transversales)
9. [Données de test recommandées](#9-données-de-test-recommandées)

---

## 1. Vue d'ensemble

GestionPFE est une plateforme web pour gérer l'ensemble du cycle de vie des Projets de Fin d'Études à l'ISCAE Mauritanie :

- **Proposition** de sujets par les encadrants ou les étudiants
- **Validation** et affectation par le coordinateur
- **Suivi** des livrables avec détection de délai
- **Planification** des soutenances avec affectation du jury
- **Notation** et calcul de la note finale
- **Archivage** et exports officiels (CSV, Excel, PDF)
- **Notifications** temps-réel (WebSocket + email SMTP)
- **Statistiques** par filière, classement, taux de réussite

---

## 2. Architecture technique

```
D:\AppPFETerminal\
├── BackendPFE\                  Django DDD
│   ├── apps\
│   │   ├── authentication\      Authentification JWT, 7 rôles, is_first_login
│   │   ├── sujets\              Proposition, validation, refus, affectation
│   │   ├── pfe\                 PFE, Livrable, AnneeAcademique, Deadline
│   │   ├── soutenances\         Soutenance, Note, documents officiels
│   │   ├── notifications\       Notification in-app + email SMTP + WebSocket
│   │   └── statistiques\        Stats globales, par filière, classement, exports
│   ├── core\
│   │   ├── permissions.py       IsCoordinateur, IsEncadrant, IsAdminOrScolarite...
│   │   ├── exceptions.py        Réponse JSON uniforme {success, data, message}
│   │   └── throttling.py        Rate limiting 5 essais/min sur login
│   └── config\
│       ├── settings\base.py     INSTALLED_APPS, JWT, CORS, Channels
│       └── urls.py              Routage principal + Swagger
│
├── FrontendPFE\webPFE\          React 18 + Vite
│   ├── src\
│   │   ├── api\                 Fonctions axios par domaine (pfe.js, sujets.js...)
│   │   ├── components\          Layout, UI (Card, Badge, ProtectedRoute...)
│   │   ├── i18n\locales\        fr.json + ar.json (bilingue)
│   │   ├── pages\               7 espaces : admin, coordinateur, encadrant...
│   │   ├── router\index.jsx     Routes protégées par rôle
│   │   └── store\authStore.js   Zustand — token JWT + user
│
└── docs\                        Documentation du projet
```

### Modèles de données

```
CustomUser          → 7 rôles, email unique, is_first_login
AnneeAcademique     → libelle, date_debut, date_fin, active (1 seule à la fois)
Deadline            → annee_academique × type_livrable (rapport/code/presentation)
Sujet               → titre, statut (PROPOSE→VALIDE→AFFECTE/REFUSE), filiere
PFE                 → sujet (1-1), etudiant, encadrant_acad, encadrant_entr, statut
Livrable            → pfe × type, fichier, statut, hors_delai
Soutenance          → pfe (1-1), date, salle, duree, membres_jury (M2M), note_finale
Note                → soutenance × evaluateur, valeur, type (jury/encadrant/finale)
Notification        → destinataire, titre, message, type, lu
FicheInscription    → pfe (1-1), signe_encadrant, signe_coordinateur, chemin_pdf
```

### Format de réponse uniforme

```json
// Succès
{ "success": true, "data": { ... }, "message": "...", "count": 10 }

// Erreur
{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }
```

---

## 3. Les 7 rôles

| Rôle | Email type | Accès principal |
|---|---|---|
| **admin** | admin@iscae.mr | Crée tous les comptes, accès total |
| **scolarite** | scolarite@iscae.mr | Années académiques, inscription étudiants, archivage, classement |
| **coordinateur** | coord@iscae.mr | Validation sujets, affectation, soutenances, deadlines |
| **encadrant_acad** | enc.acad@iscae.mr | Propose sujets, valide livrables, note soutenances |
| **encadrant_entr** | enc.entr@iscae.mr | Idem encadrant_acad (côté entreprise) |
| **etudiant** | etudiant@iscae.mr | Choisit sujet, dépose livrables, consulte résultats |
| **jury** | jury@iscae.mr | Note les soutenances assignées |

### Règles de permission par action

| Action | Rôle requis |
|---|---|
| Créer un compte utilisateur | admin |
| Créer / ouvrir / fermer une année académique | admin ou scolarite |
| Définir / supprimer deadlines livrables | coordinateur |
| Valider / refuser un sujet | coordinateur |
| Affecter un encadrant | coordinateur |
| Planifier une soutenance | coordinateur |
| Affecter le jury | coordinateur |
| Calculer la note finale | coordinateur |
| Proposer un sujet | encadrant_acad, encadrant_entr, etudiant |
| Déposer un livrable | etudiant (propriétaire du PFE uniquement) |
| Valider / refuser un livrable | encadrant_acad, encadrant_entr |
| Noter une soutenance | jury |
| Archiver un PFE | coordinateur ou scolarite |
| Exporter classements | scolarite, coordinateur, admin |
| Générer fiche d'inscription | coordinateur |

---

## 4. Cycle de vie d'un PFE

```
[SCOLARITÉ] Crée l'année 2024-2025 → l'ouvre (active = true)
                ↓
[COORDINATEUR] Définit les deadlines :
                • Rapport      → 15 mai 2025
                • Code         → 20 mai 2025
                • Présentation → 01 juin 2025
                ↓
[ENCADRANT/ÉTUDIANT] Propose un sujet
                ↓   statut = PROPOSE
[COORDINATEUR] Valide le sujet
                ↓   statut = VALIDE
               Signal Django → PFE créé automatiquement (statut = EN_COURS)
[COORDINATEUR] Affecte l'encadrant + étudiant cible
                ↓   statut = AFFECTE
                    → Notifications : étudiant + encadrant informés
                ↓
[ÉTUDIANT] Dépose les livrables (max 50 Mo)
           • rapport       → .pdf
           • code          → .zip / .tar / .gz
           • presentation  → .pdf / .pptx / .ppt
           hors_delai = true si dépôt après la deadline
                ↓
[ENCADRANT] Valide ou refuse chaque livrable
           statut VALIDE → notification étudiant
           statut REFUSE → notification avec motif
                ↓
[COORDINATEUR] Planifie la soutenance
           date, salle, durée, jury assigné
           → Notifications : étudiant + jury + encadrant
                ↓
[JURY] Note la soutenance (0–20)
                ↓
[COORDINATEUR] Calcule la note finale (moyenne pondérée)
           soutenance.note_finale définie
           soutenance.statut = TERMINEE
           → Notification étudiant avec la note
                ↓
[SCOLARITÉ] Archive le PFE → statut = ARCHIVE
           PFE visible dans bibliothèque + classement
           Exports CSV / Excel / PDF disponibles
```

---

## 5. API — Tous les endpoints

> **Base URL :** `http://localhost:8000/api/v1/`  
> **Swagger UI :** `http://localhost:8000/swagger/`  
> **Authentification :** `Authorization: Bearer <access_token>`

### Authentification (`/auth/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| POST | `auth/login/` | Public | Connexion → access + refresh tokens |
| POST | `auth/logout/` | Authentifié | Invalide le refresh token |
| GET/PUT | `auth/me/` | Authentifié | Profil de l'utilisateur connecté |
| POST | `auth/me/password/` | Authentifié | Changer son mot de passe |
| POST | `auth/token/refresh/` | Public | Renouveler l'access token |
| POST | `auth/users/` | admin | Créer un compte |
| GET | `auth/users/list/` | admin | Lister tous les comptes |
| GET/PUT | `auth/users/{id}/` | admin | Détail / modifier un compte |
| GET | `auth/users/etudiants/` | Authentifié | Liste des étudiants |

### Sujets (`/sujets/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `sujets/` | Authentifié | Lister les sujets (filtres : statut, filiere, search) |
| POST | `sujets/` | encadrant, etudiant | Proposer un sujet |
| GET | `sujets/{id}/` | Authentifié | Détail d'un sujet |
| POST | `sujets/{id}/valider/` | coordinateur | Valider un sujet |
| POST | `sujets/{id}/refuser/` | coordinateur | Refuser avec motif |
| POST | `sujets/{id}/affecter/` | coordinateur | Affecter encadrant + étudiant |
| GET | `sujets/disponibles/` | etudiant | Sujets disponibles à choisir |
| POST | `sujets/{id}/choisir/` | etudiant | Choisir un sujet disponible |

### PFE (`/pfe/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `pfe/` | Authentifié | Lister les PFE (filtré par rôle) |
| GET | `pfe/mon-pfe/` | etudiant | Mon PFE personnel |
| GET | `pfe/{id}/livrables/` | Authentifié | Livrables d'un PFE |
| POST | `pfe/{id}/livrables/` | etudiant | Déposer un livrable (multipart) |
| POST | `pfe/{id}/archiver/` | coordinateur, scolarite | Archiver le PFE |
| POST | `pfe/{id}/generer-fiche/` | coordinateur | Générer fiche PDF |
| GET | `pfe/{id}/fiche-pdf/` | Authentifié | Télécharger fiche PDF |
| POST | `pfe/{id}/signer-fiche/` | encadrant, coordinateur | Signer la fiche |

### Livrables (`/livrables/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `livrables/` | Authentifié | Lister les livrables (filtré par rôle) |
| POST | `livrables/` | etudiant | Déposer un livrable (alternatif) |
| POST | `livrables/{id}/valider/` | encadrant | Valider avec remarques |
| POST | `livrables/{id}/refuser/` | encadrant | Refuser avec motif obligatoire |

### Années académiques (`/annees/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `annees/` | Authentifié | Lister toutes les années |
| GET | `annees/active/` | Authentifié | Année académique active |
| POST | `annees/creer/` | admin, scolarite | Créer une année |
| POST | `annees/{id}/ouvrir/` | admin, scolarite | Activer une année |
| POST | `annees/fermer/` | admin, scolarite | Fermer l'année active |
| GET | `annees/{id}/deadlines/` | Authentifié | Deadlines de l'année |
| POST | `annees/definir-deadline/` | coordinateur | Définir/modifier une deadline |
| POST | `annees/supprimer-deadline/` | coordinateur | Supprimer une deadline |
| POST | `annees/{id}/notifier-deadlines/` | coordinateur | Notifier tous les étudiants |
| GET | `annees/{id}/stats-livrables/` | coordinateur | Stats dépôts par type |
| PATCH | `annees/{id}/date-limite-soutenance/` | coordinateur | Date limite soutenances |

### Soutenances (`/soutenances/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `soutenances/` | Authentifié | Lister les soutenances |
| POST | `soutenances/` | coordinateur | Planifier une soutenance |
| POST | `soutenances/{id}/affecter-jury/` | coordinateur | Affecter les membres jury |
| POST | `soutenances/{id}/noter/` | jury | Soumettre une note |
| POST | `soutenances/{id}/calculer-note-finale/` | coordinateur | Calculer la note finale |
| GET | `soutenances/{id}/pv-pdf/` | Authentifié | Télécharger le PV PDF |
| GET | `soutenances/{id}/releve-pdf/` | Authentifié | Relevé de notes PDF |
| GET | `soutenances/{id}/attestation-pdf/` | Authentifié | Attestation de réussite |
| GET | `soutenances/planning-pdf/` | coordinateur | Planning global PDF |
| GET | `soutenances/filieres/` | coordinateur | Liste des filières |
| GET | `soutenances/session-preview/` | coordinateur | Aperçu planification session |
| POST | `soutenances/planifier-session/` | coordinateur | Planifier une session complète |

### Notifications (`/notifications/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `notifications/` | Authentifié | Mes notifications |
| POST | `notifications/{id}/marquer-lu/` | Authentifié | Marquer comme lue |
| POST | `notifications/marquer-toutes-lues/` | Authentifié | Tout marquer comme lu |

### Statistiques (`/stats/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `stats/` | Authentifié | Stats globales |
| GET | `stats/filieres/` | Authentifié | Stats par filière (toutes) |
| GET | `stats/filiere/{filiere}/` | Authentifié | Stats d'une filière |
| GET | `stats/encadrant/{id}/` | Authentifié | Stats d'un encadrant |
| GET | `stats/classement/` | Authentifié | Classement des étudiants |
| GET | `stats/dashboard/coordinateur/` | coordinateur | KPIs coordinateur |
| GET | `stats/dashboard/encadrant/{id}/` | encadrant | KPIs encadrant |
| GET | `stats/export_csv/` | Authentifié | Export classement CSV |
| GET | `stats/export_excel/` | Authentifié | Export classement Excel |
| GET | `stats/export_pdf/` | Authentifié | Export classement PDF |

### Bibliothèque (`/bibliotheque/`)

| Méthode | URL | Permission | Description |
|---|---|---|---|
| GET | `bibliotheque/` | Authentifié | PFE archivés consultables |

---

## 6. Pages Frontend par rôle

### Admin — `/admin`
- Liste de tous les utilisateurs
- Formulaire de création de compte (tous rôles)

### Scolarité
| URL | Description |
|---|---|
| `/scolarite` | Vue d'ensemble : stats + année active |
| `/scolarite/annees` | Créer, activer, fermer les années académiques |
| `/scolarite/etudiants` | Inscrire un étudiant (crée son compte) |
| `/scolarite/archivage` | Archiver les PFE EN_COURS terminés |
| `/scolarite/classement` | Classement avec filtres + exports CSV/Excel/PDF |

### Coordinateur
| URL | Description |
|---|---|
| `/coordinateur` | Dashboard : KPIs temps réel, alertes deadlines, actions requises |
| `/coordinateur/sujets` | Valider/refuser sujets, affecter encadrant + étudiant |
| `/coordinateur/soutenances` | Planifier soutenances (individuelle ou par session), affecter jury, noter |
| `/coordinateur/deadlines` | Définir/modifier/supprimer deadlines livrables, notifier étudiants, stats dépôts |
| `/stats` | Statistiques globales avec nav coordinateur complète |

### Encadrant (acad + entr)
| URL | Description |
|---|---|
| `/encadrant` | Dashboard : mes étudiants, livrables en attente |
| `/encadrant/sujets` | Proposer un sujet, voir mes sujets |
| `/encadrant/livrables` | Valider/refuser les livrables de mes étudiants |
| `/encadrant/etudiant/:id` | Détail d'un étudiant : livrables, soutenance, note |

### Étudiant
| URL | Description |
|---|---|
| `/etudiant` | Mon PFE : statut, encadrant, prochaine deadline |
| `/etudiant/sujets` | Sujets disponibles à choisir + formulaire proposition |
| `/etudiant/livrables` | Déposer rapport/code/présentation, voir statut |
| `/etudiant/soutenance` | Date, salle, jury, note finale |

### Jury
| URL | Description |
|---|---|
| `/jury` | Mes soutenances assignées, formulaire de notation |

### Commun (tous rôles)
| URL | Description |
|---|---|
| `/profile` | Modifier son profil |
| `/notifications` | Centre de notifications |
| `/messages` | Messagerie interne |
| `/stats` | Statistiques (selon rôle : nav adaptée) |
| `/change-password` | Changement de mot de passe (1ère connexion) |

---

## 7. Guide de test de A à Z

### Prérequis — Démarrer les serveurs

```bash
# Terminal 1 — Backend
cd D:\AppPFETerminal\BackendPFE
# Activer le virtual environment
python manage.py runserver
# → http://localhost:8000

# Terminal 2 — Frontend
cd D:\AppPFETerminal\FrontendPFE\webPFE
npm run dev
# → http://localhost:3000

# Swagger (tester l'API sans frontend)
# → http://localhost:8000/swagger/
```

---

### ÉTAPE 1 — Admin : Créer les comptes

**Connexion admin** via http://localhost:3000 ou Swagger :

```json
POST /api/v1/auth/login/
{
  "email": "admin@iscae.mr",
  "password": "VotreMotDePasse"
}
→ Récupérer access_token
```

**Créer un compte pour chaque rôle** (`POST /api/v1/auth/users/`) :

```json
{ "email": "scolarite@iscae.mr",  "nom": "Ben Ali",  "prenom": "Fatima",  "role": "scolarite",      "password": "Scol@2025" }
{ "email": "coord@iscae.mr",      "nom": "Ould Dah", "prenom": "Ahmed",   "role": "coordinateur",   "password": "Coord@2025" }
{ "email": "enc.acad@iscae.mr",   "nom": "Mohamed",  "prenom": "Salem",   "role": "encadrant_acad", "password": "Enc@2025" }
{ "email": "enc.entr@iscae.mr",   "nom": "Mint Sid", "prenom": "Aichetou","role": "encadrant_entr", "password": "Entr@2025" }
{ "email": "jury@iscae.mr",       "nom": "El Mokhtar","prenom": "Ibrahima","role": "jury",           "password": "Jury@2025" }
{ "email": "etudiant@iscae.mr",   "nom": "Alaoui",   "prenom": "Rachid",  "role": "etudiant",       "password": "Etud@2025" }
```

**Vérification** :
```
GET /api/v1/auth/users/list/
→ 6 comptes listés avec is_first_login: true
```

---

### ÉTAPE 2 — Scolarité : Créer et ouvrir l'année académique

**Connexion** : scolarite@iscae.mr / Scol@2025  
**Page** : http://localhost:3000/scolarite/annees

```json
POST /api/v1/annees/creer/
{
  "libelle": "2024-2025",
  "date_debut": "2024-09-01",
  "date_fin": "2025-07-31"
}
→ { "id": 1, "libelle": "2024-2025", "active": false }
```

```
POST /api/v1/annees/1/ouvrir/
→ { "active": true }
```

**Vérification** :
```
GET /api/v1/annees/active/
→ { "data": { "id": 1, "libelle": "2024-2025", "active": true } }
```

**Frontend** : Le badge vert "2024-2025 — Active" doit apparaître en haut du dashboard coordinateur.

---

### ÉTAPE 3 — Coordinateur : Définir les deadlines livrables

**Connexion** : coord@iscae.mr / Coord@2025  
**Page** : http://localhost:3000/coordinateur/deadlines

```json
POST /api/v1/annees/definir-deadline/
{ "annee_id": 1, "type_livrable": "rapport",      "date_limite": "2025-12-15T23:59:00Z" }
{ "annee_id": 1, "type_livrable": "code",          "date_limite": "2025-12-20T23:59:00Z" }
{ "annee_id": 1, "type_livrable": "presentation",  "date_limite": "2026-01-10T23:59:00Z" }
```

**Vérification** :
```
GET /api/v1/annees/1/deadlines/
→ 3 objets Deadline avec leurs dates

GET /api/v1/annees/1/stats-livrables/
→ [
    { "type_livrable": "rapport", "total_pfe": 0, "total_deposes": 0, "en_delai": 0, "hors_delai": 0 },
    ...
  ]
```

**Frontend** : 3 lignes colorées selon urgence (vert = délai OK, orange = < 7j, rouge = dépassé), barre stats `0/0`.

---

### ÉTAPE 4 — Encadrant : Proposer un sujet

**Connexion** : enc.acad@iscae.mr / Enc@2025  
**Page** : http://localhost:3000/encadrant/sujets

```json
POST /api/v1/sujets/
{
  "titre": "Système de gestion des stocks avec Machine Learning",
  "description": "Application Django + React pour optimiser la gestion des stocks via un modèle ML de prédiction de demande.",
  "origine": "academique",
  "filiere": "Informatique",
  "annee": 2025
}
→ { "id": 1, "statut": "PROPOSE" }
```

**Tester aussi depuis l'étudiant** :
```json
POST /api/v1/sujets/          (connecté en étudiant)
{
  "titre": "Tableau de bord analytique pour PME",
  "description": "Dashboard BI avec Power BI et Django REST API",
  "origine": "entreprise",
  "filiere": "Finance",
  "annee": 2025
}
```

**Vérification** :
```
GET /api/v1/sujets/?statut=PROPOSE
→ 2 sujets listés
```

---

### ÉTAPE 5 — Coordinateur : Valider + Affecter

**Page** : http://localhost:3000/coordinateur/sujets

**Valider le sujet de l'encadrant** :
```
POST /api/v1/sujets/1/valider/
→ { "statut": "VALIDE" }
```

**Affecter encadrant + étudiant cible** :
```json
POST /api/v1/sujets/1/affecter/
{
  "encadrant_id": <id_enc_acad>,
  "etudiant_id": <id_etudiant>
}
→ { "statut": "AFFECTE" }
```

**Vérification critique — Signal Django** :
```
GET /api/v1/pfe/
→ 1 PFE créé automatiquement :
  { "id": 1, "titre": "Système de gestion...", "statut": "EN_COURS",
    "etudiant": { ... }, "encadrant_acad": { ... } }
```

**Vérification notifications** :
```
GET /api/v1/notifications/     (connecté en étudiant)
→ Notification "Encadrant affecté" non lue
```

**Refuser l'autre sujet** pour tester ce workflow :
```json
POST /api/v1/sujets/2/refuser/
{ "motif_refus": "Le sujet est trop vague, merci de préciser le périmètre fonctionnel." }
→ { "statut": "REFUSE" }
```

---

### ÉTAPE 6 — Étudiant : Déposer les livrables

**Connexion** : etudiant@iscae.mr / Etud@2025  
**Page** : http://localhost:3000/etudiant/livrables

Via Swagger (`POST /api/v1/pfe/1/livrables/`) — **multipart/form-data** :

```
type_livrable = rapport
fichier       = rapport_pfe.pdf      ← .pdf, max 50 Mo
```

```
type_livrable = code
fichier       = code_source.zip      ← .zip, max 50 Mo
```

```
type_livrable = presentation
fichier       = presentation.pptx    ← .pptx, max 50 Mo
```

**Vérification** :
```
GET /api/v1/pfe/1/livrables/
→ [
    { "type": "rapport", "statut": "EN_ATTENTE", "hors_delai": false },
    { "type": "code",    "statut": "EN_ATTENTE", "hors_delai": false },
    { "type": "presentation", "statut": "EN_ATTENTE", "hors_delai": false }
  ]
```

**Vérification stats deadlines** :
```
GET /api/v1/annees/1/stats-livrables/
→ total_deposes: 1 pour chaque type
```

**Vérification notification encadrant** :
```
GET /api/v1/notifications/     (connecté en encadrant)
→ "Rachid Alaoui a déposé un livrable (rapport)"
```

---

### ÉTAPE 7 — Encadrant : Valider/Refuser les livrables

**Connexion** : enc.acad@iscae.mr  
**Page** : http://localhost:3000/encadrant/livrables

**Valider le rapport** :
```json
POST /api/v1/livrables/<id_rapport>/valider/
{ "remarques": "Rapport bien structuré, introduction claire. Attention à la bibliographie." }
→ { "statut": "VALIDE" }
```

**Refuser le code** (pour tester) :
```json
POST /api/v1/livrables/<id_code>/refuser/
{ "remarques": "Le ZIP est corrompu. Merci de renvoyer l'archive complète." }
→ { "statut": "REFUSE" }
```

**Vérification notifications étudiant** :
```
GET /api/v1/notifications/     (connecté en étudiant)
→ "Votre livrable (rapport) a été validé."
→ "Votre livrable (code) a été refusé. Motif : Le ZIP est corrompu..."
```

---

### ÉTAPE 8 — Coordinateur : Planifier la soutenance

**Page** : http://localhost:3000/coordinateur/soutenances

```json
POST /api/v1/soutenances/
{
  "pfe_id": 1,
  "date": "2026-06-25T09:00:00Z",
  "salle": "Amphi A",
  "duree": 60
}
→ { "id": 1, "statut": "PLANIFIEE" }
```

**Affecter le jury** :
```json
POST /api/v1/soutenances/1/affecter-jury/
{ "jury_ids": [<id_jury>] }
→ { "membres_jury": [...] }
```

**Vérification** :
```
GET /api/v1/soutenances/
→ 1 soutenance PLANIFIEE le 25/06/2026 09h00 salle Amphi A
```

**Vérification Dashboard coordinateur** :
- KPI "Sans soutenance planifiée" = 0
- La carte "Soutenances planifiées" affiche le badge J-X

---

### ÉTAPE 9 — Jury : Noter la soutenance

**Connexion** : jury@iscae.mr / Jury@2025  
**Page** : http://localhost:3000/jury

```json
POST /api/v1/soutenances/1/noter/
{ "valeur": 15.5, "commentaire": "Très bonne présentation. Maîtrise technique excellente." }
→ { "valeur": 15.5, "type": "jury" }
```

**Coordinateur calcule la note finale** :
```
POST /api/v1/soutenances/1/calculer-note-finale/
→ { "note_finale": 15.5, "statut": "TERMINEE" }
```

**Vérification notifications étudiant** :
```
GET /api/v1/notifications/     (connecté en étudiant)
→ "La note finale du PFE est de 15.5/20 — Bien."
```

---

### ÉTAPE 10 — Scolarité : Archiver et exporter

**Connexion** : scolarite@iscae.mr  
**Page** : http://localhost:3000/scolarite/archivage

```
POST /api/v1/pfe/1/archiver/
→ { "statut": "ARCHIVE" }
```

**Vérification classement** :
```
GET /api/v1/stats/classement/
→ [{ "rang": 1, "etudiant": "Rachid Alaoui", "note_finale": 15.5, "filiere": "Informatique", ... }]
```

**Tester les exports** :
```
GET /api/v1/stats/export_csv/    → fichier classement.csv
GET /api/v1/stats/export_excel/  → fichier classement.xlsx
GET /api/v1/stats/export_pdf/    → fichier classement.pdf
```

**Page Stats** : http://localhost:3000/stats  
→ Distribution mentions : "Bien" × 1  
→ Taux de réussite : 100%  
→ Filière Informatique : 1 PFE, moy. 15.5/20

---

## 8. Vérifications transversales

### Stats globales attendues après le test complet

```
GET /api/v1/stats/
→ {
    "total_pfe": 1,
    "pfe_en_cours": 0,
    "pfe_archives": 1,
    "total_sujets": 2,
    "sujets_en_attente": 0,
    "total_soutenances": 1,
    "soutenances_terminees": 1,
    "moyenne_notes": 15.5
  }
```

### Dashboard coordinateur attendu

```
GET /api/v1/stats/dashboard/coordinateur/?annee_id=1
→ {
    "sujets_en_attente": 0,
    "pfe_sans_encadrant": 0,
    "livrables_en_attente": 1,        ← code encore REFUSE, pas re-déposé
    "pfe_en_cours": 0,
    "pct_rapport_valide": 0.0,         ← PFE archivé, plus EN_COURS
    "etudiants_sans_soutenance": 0,
    "alertes_deadlines": []
  }
```

### Test des permissions (erreurs attendues)

```
POST /api/v1/annees/creer/   (connecté en coordinateur)
→ 403 Forbidden

POST /api/v1/sujets/1/valider/   (connecté en étudiant)
→ 403 Forbidden

POST /api/v1/pfe/1/livrables/   (connecté en encadrant)
→ 400 Bad Request "Seul l'étudiant du PFE peut déposer des livrables"

POST /api/v1/livrables/<id>/refuser/   (sans remarques)
→ 400 Bad Request "Des remarques sont obligatoires pour refuser un livrable"
```

### Test de la deadline hors_delai

```
1. Définir une deadline passée (ex: hier) pour le rapport
2. Étudiant dépose un nouveau livrable type rapport
3. GET /api/v1/pfe/1/livrables/ → hors_delai: true sur le nouveau livrable
4. GET /api/v1/annees/1/stats-livrables/ → hors_delai: 1
```

### Test notifications "Notifier les étudiants"

```
POST /api/v1/annees/1/notifier-deadlines/   (coordinateur)
→ { "message": "1 étudiant(s) notifié(s)." }

GET /api/v1/notifications/   (étudiant)
→ Notification "Deadlines livrables" avec les 3 dates
```

### Test suppression deadline

```
POST /api/v1/annees/supprimer-deadline/
{ "annee_id": 1, "type_livrable": "rapport" }
→ { "message": "Deadline supprimée." }

GET /api/v1/annees/1/deadlines/
→ 2 objets seulement (code + presentation)
```

---

## 9. Données de test recommandées

### Sujets variés (couvrir toutes les filières)

```
Filière Finance      → "Système de contrôle budgétaire automatisé"
Filière Comptabilité → "Digitalisation de la comptabilité des PME"
Filière Audit        → "Outil d'analyse de risques d'audit avec IA"
Filière Management   → "Plateforme de gestion RH pour coopératives"
Filière Informatique → "Système de gestion des stocks avec ML"
```

### Scénarios de notes pour tester la distribution des mentions

| Étudiant | Note | Mention |
|---|---|---|
| Étudiant A | 17.5 | Très bien |
| Étudiant B | 14.0 | Bien |
| Étudiant C | 12.5 | Assez bien |
| Étudiant D | 10.5 | Passable |
| Étudiant E | 8.0 | Insuffisant |

### Types de fichiers à tester

| Type livrable | Fichier valide | Fichier invalide |
|---|---|---|
| rapport | rapport.pdf | rapport.docx → erreur extension |
| code | code.zip | code.rar → erreur extension |
| presentation | slides.pptx | slides.key → erreur extension |
| n'importe quel | 51 Mo → erreur taille max |

---

## Résumé — Checklist de validation

- [ ] Admin peut créer des comptes pour tous les rôles
- [ ] Première connexion force le changement de mot de passe
- [ ] Scolarité peut créer et ouvrir une année académique
- [ ] Coordinateur peut définir les 3 deadlines livrables
- [ ] Encadrant peut proposer un sujet
- [ ] Étudiant peut proposer un sujet et en choisir un disponible
- [ ] Coordinateur peut valider, refuser, affecter un sujet
- [ ] Signal Django crée automatiquement le PFE après validation
- [ ] Étudiant peut déposer les 3 types de livrables
- [ ] `hors_delai = true` si dépôt après la deadline
- [ ] Encadrant peut valider et refuser des livrables
- [ ] Coordinateur peut planifier une soutenance individuelle
- [ ] Coordinateur peut planifier une session complète par filière
- [ ] Jury peut noter la soutenance assignée
- [ ] Note finale calculée = moyenne pondérée
- [ ] Scolarité peut archiver le PFE
- [ ] PFE archivé apparaît dans le classement
- [ ] Exports CSV / Excel / PDF fonctionnels
- [ ] Notifications envoyées à chaque étape clé
- [ ] Permissions 403 retournées pour les rôles non autorisés
- [ ] Dashboard coordinateur affiche des KPIs temps réel
- [ ] Stats globales cohérentes avec les données en base
- [ ] Interface disponible en français et en arabe
