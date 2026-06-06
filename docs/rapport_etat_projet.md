# Rapport d'état — GestionPFE ISCAE
**Date :** 04 juin 2026  
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

## 4. Fonctionnalités réalisées (session 2 — juin 2026)

| Fonctionnalité | État |
|----------------|------|
| Page sujets étudiant (parcourir + choisir + proposer) | ✅ Fait |
| Page sujets encadrant (proposer + liste des propositions) | ✅ Fait |
| Validation livrables par l'encadrant (valider/refuser avec motif) | ✅ Fait |
| Dashboard Scolarité (stats + classement + exports) | ✅ Fait |
| Page Statistiques (corrigée, filtre filière/année, exports) | ✅ Fait |
| Fix workflow coordinateur (statut PROPOSÉ au lieu de EN_ATTENTE) | ✅ Fait |
| Endpoint `/auth/users/etudiants/` accessible aux encadrants | ✅ Fait |
| Accès stats pour les encadrants | ✅ Fait |
| Logo ISCAE (navbar + login) | ✅ Fait |
| Traductions FR/AR complètes (i18next) + RTL | ✅ Fait |

---

## 5. Fonctionnalités restantes

| Fonctionnalité | Priorité | Détail |
|----------------|----------|--------|
| Génération PDF officiels | Moyenne | PV de soutenance, relevé de notes, attestation |
| Détection plagiat | Basse | Champ `score_plagiat` en base mais calcul simulé |
| Déploiement | Haute | Docker + Nginx + HTTPS + production |

---

## 6. Plan de test — Checklist par rôle

### 🔐 Authentification (tous les rôles)
- [ ] Login avec compte valide → redirige vers le bon dashboard
- [ ] Login avec mauvais mot de passe → "Identifiants invalides"
- [ ] Logout → redirige vers /login
- [ ] Première connexion (`is_first_login=True`) → page changement mot de passe

### 👨‍🎓 Étudiant
- [ ] Dashboard → affiche les infos du PFE
- [ ] Sujets disponibles → liste des sujets VALIDÉ
- [ ] Proposer un sujet → formulaire, sujet créé avec statut PROPOSÉ
- [ ] Choisir un sujet → bouton visible sur les sujets VALIDÉ disponibles
- [ ] Mes Livrables → déposer un fichier
- [ ] Ma Soutenance → affiche les infos

### 👨‍🏫 Encadrant
- [ ] Dashboard → liste des étudiants encadrés
- [ ] Sujets → proposer un sujet avec étudiant cible (dropdown rempli)
- [ ] Livrables → voir les livrables, valider ou refuser avec motif
- [ ] Statistiques → page accessible sans erreur

### 🗂️ Coordinateur
- [ ] Dashboard → stats + sujets en attente (PROPOSÉ)
- [ ] Sujets → boutons Valider/Refuser visibles sur sujets PROPOSÉ
- [ ] Soutenances → planifier une soutenance, affecter jury

### ⚖️ Jury
- [ ] Dashboard → liste des soutenances assignées
- [ ] Soumettre une note → modal fonctionne

### 📋 Scolarité
- [ ] Dashboard → stats globales affichées
- [ ] Classement → tableau visible (si notes finales existent)
- [ ] Export CSV / Excel / PDF → téléchargement déclenché

### 🔧 Admin
- [ ] Utilisateurs → liste + créer un nouveau compte

### 🌐 Bilingue
- [ ] Switcher FR/ع → interface change de langue
- [ ] Direction RTL → sidebar passe à droite en arabe

---

## 7. Points de sécurité à adresser avant production

| Point | Risque | Solution recommandée |
|-------|--------|----------------------|
| Refresh token en localStorage | XSS peut voler le token | Passer en cookie HttpOnly |
| `DEBUG=True` en dev | Pas un risque en prod si bien séparé | Vérifier `DEBUG=False` en prod |
| `SECRET_KEY` de dev | Compromise si committée | Utiliser une clé forte dans `.env` prod |
| Pas de HTTPS | Tokens interceptables | Certificat SSL (Let's Encrypt) |
| CORS ouvert en dev | Normal, à restreindre en prod | `CORS_ALLOWED_ORIGINS` sur le vrai domaine |

---

## 8. Infrastructure manquante pour la production

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

## 9. Résumé — Prêt pour

| Contexte | État |
|----------|------|
| Démo interne / présentation | ✅ Oui |
| Tests fonctionnels par rôle | ✅ Oui (checklist section 6) |
| Démo client complète | ✅ Oui (tous les dashboards opérationnels) |
| Production réelle | ❌ Non (infrastructure, PDF, sécurité) |

---

## 10. Prochaines étapes recommandées

1. **Tester** — Valider la checklist section 6 pour chaque rôle
2. **Génération PDF** — PV de soutenance, relevé de notes, attestation
3. **Déploiement** — Docker + Nginx + HTTPS + variables production
4. **Optionnel** — Détection plagiat réelle (TF-IDF ou API externe)

---

*Rapport généré automatiquement — GestionPFE ISCAE Mauritanie*
