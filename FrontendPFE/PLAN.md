# GestionPFE — Plan Frontend

## Université de référence

| | |
|---|---|
| **Nom** | ISCAE — Institut Supérieur de Commerce et d'Administration des Entreprises |
| **Pays** | Mauritanie |
| **Site** | https://iscae.mr/ |
| **Email domaine** | `@iscae.mr` |

> Le design du frontend (logo, couleurs, polices) doit s'inspirer du site officiel https://iscae.mr/

---

## Charte graphique ISCAE (extraite de iscae.mr)

### Palette de couleurs

| Nom | Hex | Usage |
|-----|-----|-------|
| Navy (primaire) | `#1e3a5f` | Navbar top, sidebar, footer |
| Vert ISCAE | `#2db84b` | Boutons primaires, liens actifs, accents |
| Vert foncé | `#1e8c36` | Hover boutons verts |
| Slate | `#4a5568` | Backgrounds sections secondaires |
| Blanc | `#ffffff` | Fond principal, cartes |
| Gris clair | `#f8f9fa` | Fond body, sections alternées |
| Texte principal | `#1a2744` | Titres, texte sombre |
| Texte secondaire | `#6b7280` | Sous-titres, labels |

### Tailwind config (couleurs custom)
```js
colors: {
  iscae: {
    navy:  '#1e3a5f',
    green: '#2db84b',
    'green-dark': '#1e8c36',
    slate: '#4a5568',
    dark:  '#1a2744',
  }
}
```

### Style général
- Police : Inter ou sans-serif système (propre, académique)
- Navbar : fond navy `#1e3a5f`, texte blanc, accent vert
- Boutons primaires : fond vert `#2db84b`, texte blanc
- Cartes : fond blanc, ombre légère, bordure gauche verte sur état actif
- Sidebar (dashboard) : fond navy, items actifs en vert

---

## Structure cible

```
FrontendPFE/
├── web/                  ← React Web (Vite + Tailwind)
├── mobile/               ← Flutter (iOS + Android)
├── shared/               ← Constantes communes (URLs API, types)
└── PLAN.md               ← Ce fichier
```

---

## Backend — API de référence

```
Base URL  :  http://localhost:8000/api/v1
WebSocket :  ws://localhost:8000/ws/notifications/?token=<jwt>
Swagger   :  http://localhost:8000/swagger/
```

---

## Phase Web — React

### Stack technique

| Outil | Rôle |
|-------|------|
| Vite + React 18 | Build + UI |
| React Router v6 | Navigation + route guards |
| Axios | Appels API + interceptor JWT refresh |
| Zustand | State management (user, notifications) |
| Tailwind CSS | Styles |
| React Query | Cache des données serveur |

### Structure des dossiers

```
web/
├── public/
├── src/
│   ├── api/              ← axios instance + endpoints
│   │   ├── axios.js      ← baseURL, interceptors JWT refresh
│   │   ├── auth.js
│   │   ├── sujets.js
│   │   ├── pfe.js
│   │   ├── soutenances.js
│   │   ├── notifications.js
│   │   └── stats.js
│   │
│   ├── store/            ← Zustand stores
│   │   ├── authStore.js  ← user, tokens, isAuthenticated
│   │   └── notifStore.js ← notifications, unreadCount
│   │
│   ├── hooks/            ← custom hooks
│   │   ├── useAuth.js
│   │   └── useWebSocket.js
│   │
│   ├── components/       ← composants réutilisables
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── UI/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   └── Modal.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── pages/            ← pages par rôle
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── ChangePassword.jsx
│   │   ├── etudiant/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Livrables.jsx
│   │   │   └── Soutenance.jsx
│   │   ├── coordinateur/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Sujets.jsx
│   │   │   └── Soutenances.jsx
│   │   ├── encadrant/
│   │   │   └── Dashboard.jsx
│   │   ├── jury/
│   │   │   └── Dashboard.jsx
│   │   ├── admin/
│   │   │   └── Users.jsx
│   │   └── stats/
│   │       └── Stats.jsx
│   │
│   ├── router/
│   │   └── index.jsx     ← routes + guards par rôle
│   │
│   └── main.jsx
│
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### Phases d'implémentation Web

#### W1 — Setup (1 jour)
- `npm create vite@latest web -- --template react`
- Installer : `tailwindcss axios react-router-dom zustand @tanstack/react-query`
- Configurer Tailwind
- Créer axios instance avec baseURL

#### W2 — Authentification (1 jour)
- Page Login (email + password)
- Store Zustand : `user`, `accessToken`, `refreshToken`
- Interceptor Axios : auto-refresh quand 401
- Route guard `ProtectedRoute` par rôle
- Page changement mot de passe (is_first_login)
- Redirect dashboard selon rôle après login

#### W3 — Dashboard Étudiant (1 jour)
- Mon PFE (titre, encadrant, statut, score plagiat)
- Liste livrables (statut : EN_ATTENTE / VALIDÉ / REFUSÉ)
- Déposer un livrable (multipart/form-data)
- Ma soutenance (date, salle, jury)
- Note finale

#### W4 — Dashboard Coordinateur (1 jour)
- File de validation sujets (Valider / Refuser + motif)
- Liste PFE en cours
- Planifier une soutenance (formulaire date/salle/durée)
- Affecter jury
- Calculer note finale

#### W5 — Dashboards Encadrant / Jury / Admin (1 jour)
- Encadrant : ses PFE, valider/refuser livrables
- Jury : ses soutenances, soumettre note
- Admin : CRUD utilisateurs

#### W6 — Notifications temps-réel (1 jour)
- Hook `useWebSocket` : connexion WS avec JWT
- Cloche dans Navbar avec badge compteur
- Toast notification à chaque message WS
- Page liste notifications + marquer lu

#### W7 — Stats & Exports (0.5 jour)
- Dashboard stats globales (chiffres clés)
- Classement étudiants (tableau)
- Boutons export CSV / Excel / PDF

---

## Phase Mobile — Flutter

### Stack technique

| Package | Rôle |
|---------|------|
| dio | Appels API + interceptor JWT |
| flutter_secure_storage | Stockage tokens JWT |
| provider ou riverpod | State management |
| go_router | Navigation |
| web_socket_channel | WebSocket notifications |

### Structure des dossiers

```
mobile/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── api/
│   │   │   ├── dio_client.dart       ← baseURL, interceptors
│   │   │   └── endpoints.dart
│   │   ├── storage/
│   │   │   └── token_storage.dart    ← flutter_secure_storage
│   │   └── router/
│   │       └── app_router.dart       ← go_router + guards
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── auth_provider.dart
│   │   ├── etudiant/
│   │   │   ├── dashboard_screen.dart
│   │   │   ├── livrables_screen.dart
│   │   │   └── soutenance_screen.dart
│   │   ├── notifications/
│   │   │   ├── notif_screen.dart
│   │   │   └── ws_service.dart
│   │   └── stats/
│   │       └── stats_screen.dart
│   │
│   └── shared/
│       ├── widgets/
│       │   ├── app_bar.dart
│       │   └── role_badge.dart
│       └── constants.dart            ← API_BASE_URL
│
├── pubspec.yaml
└── android/ ios/
```

### Phases d'implémentation Mobile

#### M1 — Setup (0.5 jour)
- `flutter create mobile`
- Ajouter dépendances pubspec.yaml
- Configurer Dio avec baseURL + interceptor JWT

#### M2 — Authentification (1 jour)
- Écran Login
- Stockage tokens avec `flutter_secure_storage`
- Interceptor auto-refresh
- Navigation par rôle après login

#### M3 — Dashboard Étudiant (1 jour)
- Mon PFE (statut, encadrant, score plagiat)
- Liste livrables
- Upload fichier (file_picker)
- Ma soutenance + note finale

#### M4 — Notifications (0.5 jour)
- Service WebSocket (`web_socket_channel`)
- Cloche avec badge dans AppBar
- Liste notifications + marquer lu

#### M5 — Autres rôles (1 jour)
- Encadrant : valider/refuser livrables
- Jury : soumettre note
- Coordinateur : validation sujets (lecture)

---

## Shared — Constantes communes

```
shared/
└── constants.js (web) / constants.dart (mobile)
    ├── API_BASE_URL
    ├── WS_URL
    └── ROLES
```

---

## Ordre d'exécution recommandé

```
1. Web W1-W2  →  Login fonctionnel + JWT ✓
2. Web W3     →  Dashboard étudiant complet
3. Web W4-W5  →  Tous les rôles
4. Web W6-W7  →  Notifications + Stats
5. Mobile M1-M2 →  Login Flutter
6. Mobile M3-M5 →  Features principales
```

---

## Résumé timeline

| Phase | Durée estimée |
|-------|--------------|
| W1 Setup React | 1 jour |
| W2 Auth | 1 jour |
| W3 Dashboard Étudiant | 1 jour |
| W4 Coordinateur | 1 jour |
| W5 Autres rôles | 1 jour |
| W6 Notifications WS | 1 jour |
| W7 Stats | 0.5 jour |
| M1-M2 Flutter Auth | 1.5 jours |
| M3-M5 Flutter Features | 2.5 jours |
| **TOTAL** | **~10 jours** |
