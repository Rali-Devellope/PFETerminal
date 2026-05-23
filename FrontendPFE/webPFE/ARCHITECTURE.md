# Architecture Frontend — GestionPFE ISCAE

> Ce fichier documente **tout ce qui a ete fait**, fichier par fichier,
> avec le but de chaque decision. Mis a jour apres chaque phase.

---

## Installation — Partir de zero

Cette section explique comment recreer le projet depuis le debut,
commande par commande, avec l'explication de chaque etape.

### Prerequis a installer sur la machine

| Outil | Version minimale | Verifier |
|-------|-----------------|---------|
| Node.js | v18 ou plus | `node --version` |
| npm | v9 ou plus | `npm --version` |

Telecharger Node.js sur https://nodejs.org (npm est inclus).

---

### Etape 1 — Creer la structure des dossiers

```
AppPFETerminal/
├── BackendPFE/     ← Django (deja fait)
└── FrontendPFE/
    ├── webPFE/     ← on cree ici le projet React
    └── mobilePFE/  ← Flutter (plus tard)
```

```bash
# Aller dans le dossier FrontendPFE
cd AppPFETerminal/FrontendPFE

# Creer les dossiers vides
mkdir webPFE
mkdir mobilePFE
```

---

### Etape 2 — Creer le projet React avec Vite

```bash
cd webPFE
npm create vite@latest . -- --template react
```

**Explication :**
- `npm create vite@latest` → telecharge et execute le generateur Vite
- `.` → cree le projet dans le dossier actuel (webPFE) et non dans un sous-dossier
- `--template react` → choisit le template React (JSX, pas TypeScript)

**Ce que Vite cree automatiquement :**
```
webPFE/
├── public/
│   └── vite.svg
├── src/
│   ├── App.css
│   ├── App.jsx        ← composant racine par defaut (on va le remplacer)
│   ├── assets/
│   ├── index.css      ← styles globaux (on va le recrire)
│   └── main.jsx       ← point d'entree (on va le modifier)
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

---

### Etape 3 — Installer les dependances de base (package.json)

```bash
npm install
```

**Pourquoi ?**
Le `package.json` cree par Vite contient deja React et ReactDOM comme
dependances. Cette commande les telecharge dans `node_modules/`.

---

### Etape 4 — Installer les dependances du projet

```bash
npm install tailwindcss @tailwindcss/vite axios react-router-dom zustand @tanstack/react-query
```

**Ce que chaque package apporte :**

**`tailwindcss`**
Framework CSS utilitaire. Au lieu d'ecrire du CSS dans des fichiers `.css`,
on ecrit directement des classes dans le JSX :
```jsx
<button className="bg-green-500 text-white px-4 py-2 rounded">
  Valider
</button>
```

**`@tailwindcss/vite`**
Plugin qui integre Tailwind directement dans Vite. Sans lui, il faudrait
configurer PostCSS manuellement. C'est la nouvelle facon de faire avec Tailwind v4.

**`axios`**
Bibliotheque pour faire des requetes HTTP vers le backend Django.
Alternative au `fetch` natif du navigateur, avec en plus :
- Support des interceptors (pour JWT auto-refresh)
- Conversion automatique JSON
- Gestion des erreurs plus claire

**`react-router-dom`**
Systeme de navigation pour React. Permet de definir des URLs
(`/login`, `/etudiant`, etc.) et d'afficher le bon composant selon l'URL.
Sans ca, l'application n'aurait qu'une seule page.

**`zustand`**
Gestionnaire d'etat global. Quand l'utilisateur se connecte, on sauvegarde
ses informations dans le store Zustand. N'importe quel composant peut
lire ces informations sans les passer via les props.
Plus simple que Redux (pas de actions/reducers/dispatch).

**`@tanstack/react-query`**
Gestion du cache des donnees serveur. Quand on charge la liste des
livrables, React Query la garde en memoire 5 minutes. Si on navigue
vers une autre page et qu'on revient, pas de rechargement inutile.
Gere aussi les etats loading/error automatiquement.

---

### Etape 5 — Verifier que tout fonctionne

```bash
npm run dev
```

Si installation reussie → navigateur sur http://localhost:3000 affiche
la page par defaut Vite (logo Vite + logo React).

```bash
npm run build
```

Compile le projet pour la production. Si 0 erreur → la base est saine.

---

### Etape 6 — Creer la structure des dossiers src/

```bash
# Dans webPFE/src/
mkdir api store hooks router
mkdir components/Layout components/UI
mkdir pages/auth pages/etudiant pages/coordinateur
mkdir pages/encadrant pages/jury pages/admin pages/stats
```

**Pourquoi cette structure ?**

```
src/
├── api/          ← tous les appels HTTP au backend (1 fichier par app Django)
├── store/        ← memoire globale (Zustand)
├── hooks/        ← logique reutilisable (useAuth, useWebSocket)
├── components/   ← composants partages entre plusieurs pages
│   ├── Layout/   ← Navbar, Sidebar (apparaissent sur toutes les pages)
│   └── UI/       ← Button, Badge, Modal (elements visuels de base)
├── pages/        ← une page = une URL = un dossier par role
│   ├── auth/
│   ├── etudiant/
│   ├── coordinateur/
│   └── ...
└── router/       ← definition des routes et guards
```

Chaque dossier correspond a une responsabilite unique.
Si un bug vient de l'API, on cherche dans `api/`.
Si un bug vient de la navigation, on cherche dans `router/`.

---

### Resume des commandes dans l'ordre

```bash
# 1. Aller dans le bon dossier
cd AppPFETerminal/FrontendPFE/webPFE

# 2. Creer le projet React
npm create vite@latest . -- --template react

# 3. Installer dependances de base
npm install

# 4. Installer dependances du projet
npm install tailwindcss @tailwindcss/vite axios react-router-dom zustand @tanstack/react-query

# 5. Verifier
npm run dev       # → http://localhost:3000
npm run build     # → doit afficher "built in Xms" sans erreur
```

---

## Sommaire

- [Installation — Partir de zero](#installation--partir-de-zero)
- [Vue d'ensemble](#vue-densemble)
- [W1 — Setup & Fondation](#w1--setup--fondation)
  - [Projet Vite + React](#1-projet-vite--react)
  - [Dependances installees](#2-dependances-installees)
  - [vite.config.js](#3-viteconfigjs)
  - [index.css — Couleurs ISCAE](#4-indexcss--couleurs-iscae)
- [W3 — Dashboard Etudiant](#w3--dashboard-etudiant)
  - [Couche API](#5-couche-api--srcapi)
  - [Stores Zustand](#6-stores-zustand--srcstore)
  - [Router + Guards](#7-router--guards)
  - [main.jsx — Point d'entree](#8-mainjsx--point-dentree)
- [W2 — Authentification](#w2--authentification)
  - [useAuth.js](#1-useauthjs--srchooks)
  - [Login.jsx](#2-loginjsx)
  - [ChangePassword.jsx](#3-changepasswordjsx)
- [Phases suivantes](#phases-suivantes)
- [Comment tester](#comment-tester)

---

## Vue d'ensemble

Le frontend est construit en **couches empilees**. Chaque couche depend de celle
d'en dessous. On construit du bas vers le haut pour que chaque page repose
sur une fondation solide et testee.

```
┌─────────────────────────────────────┐
│   Pages UI  (W2 → W7)               │  ← ce que l'utilisateur voit
├─────────────────────────────────────┤
│   Router + ProtectedRoute            │  ← qui a le droit d'aller ou
├─────────────────────────────────────┤
│   Stores Zustand (auth, notifs)      │  ← memoire globale de l'appli
├─────────────────────────────────────┤
│   Couche API — Axios + interceptors  │  ← communication avec le backend
├─────────────────────────────────────┤
│   Backend Django — port 8000         │  ← API REST + WebSocket
└─────────────────────────────────────┘
```

**Pourquoi cette approche par couches ?**
Si la couche API est cassee, toutes les pages sont cassees. En construisant
et testant chaque couche independamment, on evite des bugs en cascade.

---

## W1 — Setup & Fondation

### 1. Projet Vite + React

**Commande :** `npm create vite@latest . -- --template react`

**Pourquoi Vite ?**
Vite est un outil de build moderne qui demarre le serveur de developpement
en moins d'une seconde (contrairement a Create React App qui pouvait prendre
30 secondes). Il utilise les modules ES natifs du navigateur en dev,
ce qui rend le rechargement instantane quand on modifie un fichier.

**Structure creee par Vite :**
```
webPFE/
├── public/           ← fichiers statiques (favicon...)
├── src/
│   ├── main.jsx      ← point d'entree de l'application
│   ├── App.jsx       ← composant racine (remplace par router)
│   └── index.css     ← styles globaux
├── index.html        ← page HTML unique (SPA)
├── package.json      ← dependances
└── vite.config.js    ← configuration Vite
```

---

### 2. Dependances installees

```bash
npm install tailwindcss @tailwindcss/vite axios react-router-dom zustand @tanstack/react-query
```

| Package | Version | Role | Pourquoi ce choix |
|---------|---------|------|-------------------|
| `tailwindcss` | v4 | CSS utilitaire | Classes CSS directement dans le JSX, pas de fichiers .css separés |
| `@tailwindcss/vite` | v4 | Plugin Vite pour Tailwind | Integration native Vite sans configuration PostCSS |
| `axios` | latest | Requetes HTTP | Meilleur support des interceptors que fetch natif |
| `react-router-dom` | v6 | Navigation | Standard React, support des loaders et guards |
| `zustand` | latest | State management | Plus simple que Redux, pas de boilerplate |
| `@tanstack/react-query` | v5 | Cache donnees serveur | Gere automatiquement le chargement, erreurs, cache |

---

### 3. `vite.config.js`

**Fichier :** `webPFE/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws':  { target: 'ws://localhost:8000', ws: true },
    },
  },
})
```

**Explication de chaque partie :**

- `plugins: [react()]` → active le support JSX et le Fast Refresh (rechargement
  automatique sans perdre l'etat des composants)

- `plugins: [..., tailwindcss()]` → Tailwind v4 s'integre directement comme
  plugin Vite. Plus besoin de `tailwind.config.js` separé.

- `port: 3000` → le frontend tourne sur http://localhost:3000

- `proxy: { '/api': ... }` → **tres important** : quand le navigateur fait
  une requete vers `/api/v1/auth/login/`, Vite la redirige vers
  `http://localhost:8000/api/v1/auth/login/` cote serveur.
  Cela resout le probleme CORS (Cross-Origin Resource Sharing) en developpement
  sans modifier le backend Django.

- `proxy: { '/ws': ... }` → meme principe pour les WebSockets (notifications
  temps reel). Le `ws: true` active le mode WebSocket du proxy.

---

### 4. `index.css` — Couleurs ISCAE

**Fichier :** `webPFE/src/index.css`

```css
@import "tailwindcss";

@theme {
  --color-iscae-navy:       #1e3a5f;
  --color-iscae-navy-dark:  #152c4a;
  --color-iscae-green:      #2db84b;
  --color-iscae-green-dark: #1e8c36;
  --color-iscae-slate:      #4a5568;
  --color-iscae-dark:       #1a2744;
}
```

**Pourquoi `@theme` en Tailwind v4 ?**
Tailwind v4 remplace le fichier `tailwind.config.js` par des variables CSS
definies directement dans le CSS avec `@theme`. Ces variables deviennent
automatiquement des classes Tailwind utilisables dans le JSX.

**Palette extraite du site officiel https://iscae.mr/ :**

| Variable | Hex | Provenance | Usage dans l'appli |
|----------|-----|------------|-------------------|
| `iscae-navy` | `#1e3a5f` | Barre superieure du site ISCAE | Navbar, sidebar, footer |
| `iscae-navy-dark` | `#152c4a` | Hover sur navy | Hover sidebar items |
| `iscae-green` | `#2db84b` | Logo ISCAE, liens actifs, bouton Support | Boutons primaires, liens actifs |
| `iscae-green-dark` | `#1e8c36` | Hover sur vert | Hover boutons |
| `iscae-slate` | `#4a5568` | Fond du bloc hero "ISCAE" | Sections secondaires |
| `iscae-dark` | `#1a2744` | Couleur des titres du site | Textes, titres |

---

### 5. Couche API — `src/api/`

#### `axios.js` — Instance centrale

**Fichier :** `webPFE/src/api/axios.js`

**But :** Creer une instance Axios unique partagee par toute l'application.
Chaque appel HTTP passe par ce fichier.

**Ce fichier fait 3 choses :**

**① Configuration de base**
```js
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})
```
- Toutes les requetes partent de `/api/v1` (redirige vers le backend via proxy Vite)
- `Content-Type: application/json` par defaut (sauf upload fichier)

**② Interceptor de requete — injection JWT**
```js
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```
- Avant chaque requete, recupere le token JWT du store Zustand
- L'ajoute dans le header `Authorization`
- Aucune page n'a besoin de gerer ca manuellement

**③ Interceptor de reponse — auto-refresh JWT**
```
Probleme : le token JWT expire apres 15 minutes.
Sans gestion, l'utilisateur recevrait une erreur 401 et serait deconnecte.
```
Solution — ce que fait l'interceptor :
```
1. Backend repond 401 (token expire)
2. Interceptor detecte le 401
3. Envoie automatiquement le refreshToken au backend
4. Recoit un nouveau accessToken
5. Relance la requete originale avec le nouveau token
6. L'utilisateur ne voit rien, la page fonctionne normalement
```
Si le refreshToken est aussi expire → deconnexion et redirect vers /login.

La variable `isRefreshing` + la queue `queue[]` servent a eviter que
10 requetes simultanées essaient toutes de refresh en meme temps.
Une seule refresh, les autres attendent.

#### Autres fichiers API

**`auth.js`** — Authentification
```js
login(email, password)    → POST /auth/login/
logout(refresh)           → POST /auth/logout/   (blackliste le token)
changePassword(data)      → POST /auth/change-password/
getProfile()              → GET  /auth/me/
```

**`pfe.js`** — Projets de fin d'etudes
```js
getMonPFE()               → GET  /pfe/mon-pfe/         (etudiant)
getPFEs(params)           → GET  /pfe/                  (coordinateur, encadrant)
getLivrables(pfeId)       → GET  /pfe/:id/livrables/
deposerLivrable(id, form) → POST /pfe/:id/livrables/   (multipart/form-data pour fichiers)
validerLivrable(...)      → POST /pfe/:id/livrables/:id/valider/
refuserLivrable(...)      → POST /pfe/:id/livrables/:id/refuser/
```

**`sujets.js`** — Sujets de PFE
```js
getSujets(params)         → GET  /sujets/
validerSujet(id, data)    → POST /sujets/:id/valider/
refuserSujet(id, data)    → POST /sujets/:id/refuser/
```

**`soutenances.js`** — Soutenances
```js
planifierSoutenance(data) → POST /soutenances/
affecterJury(id, data)    → POST /soutenances/:id/affecter-jury/
soumettreNote(id, data)   → POST /soutenances/:id/soumettre-note/
calculerNoteFinale(id)    → POST /soutenances/:id/calculer-note-finale/
getMaSoutenance()         → GET  /soutenances/ma-soutenance/
```

**`notifications.js`** — Notifications
```js
getNotifications(params)  → GET  /notifications/
marquerLu(id)             → POST /notifications/:id/marquer-lu/
marquerTousLus()          → POST /notifications/marquer-tous-lus/
```

**`stats.js`** — Statistiques & Exports
```js
getStatsGlobales()        → GET /stats/
getClassement(params)     → GET /stats/classement/
exportCSV()               → GET /stats/export_csv/    (responseType: 'blob')
exportExcel()             → GET /stats/export_excel/  (responseType: 'blob')
exportPDF()               → GET /stats/export_pdf/    (responseType: 'blob')
```
`responseType: 'blob'` est necessaire pour les exports car ce sont des fichiers
binaires (pas du JSON). Le navigateur peut ensuite les telecharger.

---

### 6. Stores Zustand — `src/store/`

**Probleme que Zustand resout :**
```
Page Login connecte l'utilisateur
  → comment Navbar sait que l'utilisateur est connecte ?
  → comment Dashboard connait son role ?
```
Sans store global, il faudrait "passer" l'utilisateur de composant en composant
via les props (prop drilling). Avec Zustand, n'importe quel composant lit
directement le store.

#### `authStore.js`

**Fichier :** `webPFE/src/store/authStore.js`

**Ce qu'il stocke :**
```js
{
  user:            { id, email, nom, prenom, role, is_first_login }
  accessToken:     "eyJ..."   // JWT 15 minutes
  refreshToken:    "eyJ..."   // JWT 7 jours
  isAuthenticated: true/false
}
```

**Actions disponibles :**
- `setAuth(user, access, refresh)` → appele apres login reussi
- `setAccessToken(token)` → appele par l'interceptor apres refresh
- `logout()` → vide tout le store

**`persist` (middleware Zustand) :**
Sans `persist`, si l'utilisateur actualise la page, il est deconnecte.
`persist` sauvegarde le store dans `localStorage` sous la cle `gestion-pfe-auth`.
Au rechargement, le store est restaure automatiquement.

#### `notifStore.js`

**Fichier :** `webPFE/src/store/notifStore.js`

**Ce qu'il stocke :**
```js
{
  notifications: [ { id, message, lu, created_at }, ... ]
  unreadCount:   3   // nombre de notifs non lues
}
```

**Actions :**
- `setNotifications(list)` → charge la liste depuis l'API
- `addNotification(notif)` → ajoute une notif recue par WebSocket
- `markAsRead(id)` → marque une notif comme lue, decrement unreadCount
- `markAllRead()` → tout marquer lu, unreadCount = 0

---

### 7. Router + Guards

#### `ProtectedRoute.jsx`

**Fichier :** `webPFE/src/components/ProtectedRoute.jsx`

**But :** Composant wrapper qui protege les pages selon l'etat de connexion et le role.

**Logique de decision (dans l'ordre) :**
```
L'utilisateur tente d'acceder a une URL protegee
    │
    ├─ Pas connecte (isAuthenticated = false)
    │     → redirect /login
    │
    ├─ Connecte mais is_first_login = true
    │     → redirect /change-password
    │     (oblige a changer le mot de passe temporaire)
    │
    ├─ Connecte mais role non autorise pour cette page
    │     → redirect vers son propre dashboard
    │     (ex: etudiant qui tente /coordinateur)
    │
    └─ Tout OK → affiche la page
```

**`ROLE_DASHBOARDS`** — table de correspondance role → URL :
```js
etudiant       → /etudiant
encadrant_acad → /encadrant
encadrant_entr → /encadrant
coordinateur   → /coordinateur
jury           → /jury
scolarite      → /admin
admin          → /admin
```

#### `router/index.jsx`

**Fichier :** `webPFE/src/router/index.jsx`

**But :** Definir toutes les routes de l'application et leurs protections.

Utilise `createBrowserRouter` de React Router v6 (remplace l'ancien `<BrowserRouter>`).
Chaque route protegee est enveloppee dans `<ProtectedRoute roles={[...]}>`.

**Table des routes :**

| URL | Composant | Roles autorises |
|-----|-----------|----------------|
| `/` | redirect → `/login` | — |
| `/login` | `Login` | tous (non connecte) |
| `/change-password` | `ChangePassword` | connecte + is_first_login |
| `/etudiant` | `EtudiantDashboard` | etudiant |
| `/etudiant/livrables` | `EtudiantLivrables` | etudiant |
| `/etudiant/soutenance` | `EtudiantSoutenance` | etudiant |
| `/coordinateur` | `CoordinateurDashboard` | coordinateur |
| `/coordinateur/sujets` | `CoordinateurSujets` | coordinateur |
| `/coordinateur/soutenances` | `CoordinateurSoutenances` | coordinateur |
| `/encadrant` | `EncadrantDashboard` | encadrant_acad, encadrant_entr |
| `/jury` | `JuryDashboard` | jury |
| `/admin` | `AdminUsers` | admin, scolarite |
| `/stats` | `Stats` | coordinateur, admin, scolarite |

---

### 8. `main.jsx` — Point d'entree

**Fichier :** `webPFE/src/main.jsx`

C'est le premier fichier execute par le navigateur. Il monte l'application
React dans la `<div id="root">` de `index.html`.

```jsx
<StrictMode>                          // detecte les problemes en dev
  <QueryClientProvider client={...}>  // fournit le cache React Query
    <RouterProvider router={router} /> // active la navigation
  </QueryClientProvider>
</StrictMode>
```

**`StrictMode`** : en developpement seulement, execute chaque composant deux fois
pour detecter les effets de bord indesirables. N'affecte pas la production.

**`QueryClientProvider`** : fournit le client React Query a toute l'application.
Configuration :
```js
{ retry: 1,  staleTime: 1000 * 60 * 5 }
```
- `retry: 1` → si une requete echoue, reessaye une seule fois
- `staleTime: 5 minutes` → les donnees sont considerees "fraiches" 5 minutes.
  Si un composant demande les memes donnees dans ce delai, pas de nouvel appel HTTP.

---

## W2 — Authentification

### 1. `useAuth.js` — `src/hooks/`

**Fichier :** `webPFE/src/hooks/useAuth.js`

**But :** Hook React qui encapsule toute la logique d'authentification.
Les pages Login et ChangePassword l'utilisent. Ca evite de dupliquer
la logique dans chaque composant.

**Fonction `login(email, password)` — etapes :**
```
1. Appel API → POST /auth/login/
2. Recoit { user, access, refresh }
3. Sauvegarde dans authStore (→ localStorage via persist)
4. Si user.is_first_login = true  → redirect /change-password
   Sinon                          → redirect vers le dashboard du role
```

**Table de redirection par role :**
```js
etudiant       → /etudiant
coordinateur   → /coordinateur
encadrant      → /encadrant
jury           → /jury
admin/scolarite → /admin
```

**Fonction `logout(refresh)` — etapes :**
```
1. Appel API → POST /auth/logout/ avec le refreshToken
   (le backend l'ajoute a la blacklist JWT — invalide definitivement)
2. Vide le authStore
3. Redirect /login
```
Le `try/finally` garantit que meme si l'appel API echoue (ex: reseau coupe),
le store est vide et l'utilisateur est redirige vers /login.

---

### 2. `Login.jsx`

**Fichier :** `webPFE/src/pages/auth/Login.jsx`

**But :** Page de connexion avec le design ISCAE. Permet a l'utilisateur
d'entrer son email et mot de passe, puis le redirige vers son dashboard.

**Layout — deux panneaux :**
```
┌─────────────────┬──────────────────┐
│   Panneau       │   Panneau        │
│   gauche        │   droit          │
│   (navy)        │   (blanc)        │
│                 │                  │
│   Logo ISCAE    │   Formulaire     │
│   Nom complet   │   email          │
│   Description   │   mot de passe   │
│                 │   bouton         │
│   (masque sur   │                  │
│    mobile)      │                  │
└─────────────────┴──────────────────┘
```

**Gestion des erreurs :**
- `err.response?.data?.message` → format standard de l'API Django
- `err.response?.data?.detail` → format DRF pour erreurs generiques
- Fallback → "Email ou mot de passe incorrect"

**Etats du composant :**
```js
email    → valeur du champ email
password → valeur du champ password
error    → message d'erreur a afficher (null si pas d'erreur)
loading  → true pendant l'appel API (bouton desactive)
```

**Comportement du bouton :**
- `loading = false` → bouton vert (#2db84b), clickable
- `loading = true` → bouton vert clair (#86c99a), desactive, texte "Connexion..."
- Hover → vert fonce (#1e8c36)

**Focus des inputs :**
- Clic → bordure verte (#2db84b) via `onFocus`
- Perd focus → retour bordure grise via `onBlur`

---

### 3. `ChangePassword.jsx`

**Fichier :** `webPFE/src/pages/auth/ChangePassword.jsx`

**But :** Page obligatoire pour les utilisateurs en premiere connexion
(`is_first_login = true`). Le backend cree les comptes avec un mot de passe
temporaire. L'utilisateur doit le changer avant d'acceder a l'application.

**3 champs :**
- Mot de passe actuel (le temporaire fourni par l'admin)
- Nouveau mot de passe
- Confirmation du nouveau mot de passe

**Validation cote frontend :**
- Si nouveau != confirmation → erreur immediate sans appel API

**Apres succes :**
```
1. Appel API → POST /auth/change-password/
2. Met a jour le store : user.is_first_login = false
3. Redirect vers le dashboard selon le role
```
La mise a jour du store est necessaire pour que `ProtectedRoute` ne redirige
plus vers /change-password lors de la prochaine navigation.

---

---

## W3 — Dashboard Etudiant

### But de W3
Apres le login, l'etudiant arrive sur son espace personnel.
Il doit pouvoir voir son PFE, deposer ses livrables et consulter sa soutenance.

### Fichiers crees

---

#### `components/Layout/DashboardLayout.jsx`

**But :** Composant wrapper utilise par toutes les pages des dashboards
(etudiant, coordinateur, encadrant...). Il assemble la Navbar et la Sidebar
autour du contenu de la page.

```jsx
<DashboardLayout navItems={NAV_ITEMS}>
  <h1>Mon PFE</h1>
  ...contenu de la page...
</DashboardLayout>
```

- `navItems` → tableau d'objets `{ to, label, icon, end }` pour la sidebar
- `sidebarOpen` → etat local qui gere l'ouverture/fermeture sur mobile
- `pt-14 lg:pl-56` → marge pour ne pas etre cache par la Navbar (hauteur 14 = 56px)
  et la Sidebar (largeur 56 = 224px) sur grand ecran

---

#### `components/Layout/Navbar.jsx`

**But :** Barre de navigation fixe en haut de toutes les pages du dashboard.

**Contenu :**
- Gauche → bouton menu (visible sur mobile) + logo ISCAE avec cercle vert
- Droite → cloche notifications, nom + role de l'utilisateur, bouton deconnexion

**Cloche notifications :**
```jsx
{unreadCount > 0 && (
  <span className="badge rouge">{unreadCount}</span>
)}
```
Lit `unreadCount` depuis le `notifStore`. Le badge rouge apparait
seulement quand il y a des notifications non lues. En W6, le WebSocket
mettra a jour ce compteur en temps reel.

**Bouton deconnexion :**
Appelle `logout()` du hook `useAuth` qui :
1. Blackliste le refreshToken cote backend
2. Vide le store Zustand
3. Redirige vers /login

---

#### `components/Layout/Sidebar.jsx`

**But :** Menu de navigation vertical a gauche, configurable par role.

**Comportement responsive :**
- Mobile → cachee par defaut, s'ouvre par bouton menu (translate-x)
- Desktop (lg:) → toujours visible, fixe a gauche

**Overlay mobile :** Un fond semi-transparent noir (`bg-black/40`) apparait
derriere la sidebar ouverte sur mobile. Cliquer dessus ferme la sidebar.

**Item actif :** Utilise `NavLink` de React Router qui ajoute automatiquement
une classe `isActive` quand l'URL correspond. L'item actif a le fond vert ISCAE.

**`end: true`** → sur la route `/etudiant`, sans `end`, l'item serait actif
aussi sur `/etudiant/livrables` (car l'URL contient `/etudiant`). `end` force
la correspondance exacte avec `/etudiant`.

---

#### `components/UI/Badge.jsx`

**But :** Pastille coloree pour afficher un statut.

Statuts geres :

| Statut | Couleur fond | Couleur texte |
|--------|-------------|--------------|
| EN_COURS | bleu clair | bleu fonce |
| EN_ATTENTE | jaune clair | orange fonce |
| VALIDE | vert clair | vert fonce |
| REFUSE | rouge clair | rouge fonce |
| ARCHIVE | gris | gris |
| PLANIFIEE | violet clair | violet fonce |
| TERMINEE | vert clair | vert fonce |
| PROPOSE | jaune clair | orange fonce |

Ces statuts correspondent exactement aux choix definis dans les modeles Django.

---

#### `components/UI/Card.jsx`

**But :** Conteneur visuel reutilisable pour grouper des informations.

- Fond blanc, bordure legere, ombre douce
- Header optionnel avec barre verte gauche (`border-left: 3px solid #2db84b`)
- Slot `action` → element affiche a droite du titre (ex: lien "Voir tout")

---

#### `pages/etudiant/Dashboard.jsx`

**But :** Page d'accueil de l'etudiant. Vue synthetique de son PFE.

**Donnees chargees :**
```
useQuery(['mon-pfe'])        → GET /api/v1/pfe/mon-pfe/
useQuery(['ma-soutenance'])  → GET /api/v1/soutenances/ma-soutenance/
```

**React Query — pourquoi deux queries ?**
Les deux appels se lancent en parallele (pas de `await` l'un apres l'autre).
React Query gere automatiquement les etats `isLoading` et `isError`.

**Cas d'erreur PFE :**
Si `isError = true` (etudiant sans PFE affecte), un message s'affiche
l'invitant a contacter le coordinateur. Pas de plantage.

**Score plagiat :**
- Vert si <= 30%
- Rouge si > 30%
Le score est calcule par le backend lors de la validation d'un livrable.

**Acces rapide :**
Des liens vers `/etudiant/livrables` et `/etudiant/soutenance` evitent
d'utiliser uniquement la sidebar.

---

#### `pages/etudiant/Livrables.jsx`

**But :** Deposer des livrables (fichiers) et consulter leur historique.

**Depot de fichier — multipart/form-data :**
```
FormData = format special pour envoyer des fichiers avec d'autres champs
```
Le fichier ne peut pas etre envoye en JSON. On utilise `FormData` :
```js
const fd = new FormData()
fd.append('fichier', selectedFile)    // le fichier binaire
fd.append('type_livrable', 'rapport') // champ texte
fd.append('commentaire', '...')       // champ texte optionnel
```
Dans `axios.js`, l'appel `deposerLivrable` surcharge le `Content-Type`
en `multipart/form-data` (sinon le backend Django ne peut pas lire le fichier).

**Zone de depot (drag area) :**
Un `<div>` cliquable qui ouvre un `<input type="file">` cache via `ref`.
Quand un fichier est selectionne, la bordure passe en vert.

**`useMutation` (React Query) :**
```
mutationFn → fonction appelee lors du submit
onSuccess  → invalide le cache ['livrables'] et ['mon-pfe']
             → les deux queries se rechargent automatiquement
onError    → affiche le message d'erreur du backend
```
`invalidateQueries` force React Query a recharger les donnees
apres une mutation reussie.

**Historique :**
Liste des livrables avec statut (Badge), date de depot, lien telechargement,
et motif de refus si `statut = REFUSE`.

---

#### `pages/etudiant/Soutenance.jsx`

**But :** Informations sur la soutenance de l'etudiant.

**`retry: false` :**
Par defaut React Query reessaye 3 fois si la requete echoue.
Pour la soutenance, une 404 (pas encore planifiee) est un cas normal,
pas une erreur reseau. `retry: false` evite 3 tentatives inutiles.

**Cas non planifiee (`isError`) :**
Affiche un message "Soutenance non encore planifiee" avec une icone.

**Jury :**
Liste les membres du jury avec leurs initiales dans un cercle navy.
Si le jury n'est pas encore affecte, affiche "Jury non encore affecte".

**`NoteBar` :**
Composant interne qui affiche la note finale avec :
- La note numerique (ex: "15.5 / 20")
- Une barre de progression proportionnelle
- Une mention (Tres bien / Bien / Assez bien / Passable / Insuffisant)
- Couleur verte si >= 10, rouge si < 10

---

## Phases suivantes

| Phase | Statut | Contenu |
|-------|--------|---------|
| W1 Setup | ✅ FAIT | Vite, dependances, API, stores, router, config ISCAE |
| W2 Auth | ✅ FAIT | Login, ChangePassword, useAuth, JWT complet |
| W3 Etudiant | ✅ FAIT | Layout, Dashboard, Livrables (upload), Soutenance, Badge, Card |
| W4 Coordinateur | ⏳ | Validation sujets, planifier soutenances, affecter jury |
| W5 Autres roles | ⏳ | Encadrant, jury, admin CRUD users |
| W6 Notifications | ⏳ | WebSocket hook, cloche navbar, toasts |
| W7 Stats | ⏳ | Chiffres cles, classement, exports CSV/Excel/PDF |

---

## Comment tester

```bash
# Terminal 1 — Backend Django (dans BackendPFE/)
python manage.py runserver
# → http://localhost:8000

# Terminal 2 — Frontend React (dans webPFE/)
npm run dev
# → http://localhost:3000
```

**Flux de test complet :**
1. Aller sur http://localhost:3000 → redirige vers /login (ProtectedRoute)
2. Entrer email + mot de passe d'un utilisateur cree avec le backend
3. → redirect automatique vers le dashboard du role
4. Ouvrir DevTools → Application → localStorage → voir `gestion-pfe-auth`
5. Actualiser la page → toujours connecte (persist Zustand)
6. Attendre 15 min ou invalider le token → auto-refresh transparent

**Proxy Vite (evite les erreurs CORS) :**
```
Navigateur → localhost:3000/api/v1/auth/login/
Vite proxy  → localhost:8000/api/v1/auth/login/
```
Les deux serveurs sont sur des ports differents. Sans proxy, le navigateur
bloquerait la requete (politique CORS). Le proxy Vite fait la requete
cote serveur, pas cote navigateur, donc pas de restriction CORS.
