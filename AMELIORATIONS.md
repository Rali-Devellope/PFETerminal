# Améliorations — GestionPFE ISCAE
## Rendre l'application conforme à un vrai système universitaire

---

## Priorité 1 — Fondations manquantes (essentielles)

Ces fonctionnalités existent dans toutes les universités. Sans elles, le système n'est pas crédible.

---

### A1 — Année académique
**Problème :** Aucune notion d'année universitaire. Impossible de séparer les PFE 2024-2025 des 2025-2026.

**Ce qu'il faut :**
- Modèle `AnneeAcademique` (libelle, date_debut, date_fin, active)
- Tous les `Sujet`, `PFE`, `Soutenance` sont liés à une année
- Seule une année est active à la fois (le coordinateur l'ouvre/ferme)
- Les filtres et stats respectent l'année courante

**Impact :** `sujets`, `pfe`, `soutenances`, `statistiques` + frontend

---

### A2 — Deadlines et calendrier des dépôts
**Problème :** Aucune date limite pour déposer le rapport, le code, la présentation. Dans une vraie université, ces dates sont fixées et imposées.

**Ce qu'il faut :**
- Modèle `Deadline` (type_livrable, date_limite, annee_academique)
- Le coordinateur fixe les deadlines en début d'année
- Si un étudiant dépose après la deadline → warning visible (ou blocage selon règle)
- Dashboard étudiant : compteur de jours restants pour chaque livrable

**Impact :** `pfe` (livrables), `soutenances`, frontend dashboard étudiant

---

### A3 — Convocation officielle à la soutenance
**Problème :** Quand une soutenance est planifiée, aucune convocation officielle n'est générée. Dans une vraie université, l'étudiant, le jury et l'encadrant reçoivent un document officiel.

**Ce qu'il faut :**
- PDF généré automatiquement à l'autorisation de la soutenance
- Contenu : nom étudiant, titre PFE, date/heure/salle, composition du jury, encadrant
- Envoi par email à : étudiant + tous membres jury + encadrant
- Disponible en téléchargement dans l'app

**Impact :** `soutenances/services.py` (nouvelle fonction `generer_convocation_pdf`), notifications

---

### A4 — Résultats officiels et délibération
**Problème :** Après les soutenances, il n'y a pas de session de délibération formelle. Dans une vraie université, le coordinateur clôture une session et publie les résultats officiels.

**Ce qu'il faut :**
- Action `cloturer_session` pour le coordinateur (quand toutes les soutenances d'une année sont terminées)
- Attribution automatique d'une mention selon la note finale :
  - ≥ 16 : Très Bien
  - ≥ 14 : Bien
  - ≥ 12 : Assez Bien
  - ≥ 10 : Passable
  - < 10 : Ajourné
- Publication officielle des résultats (statut PFE → `VALIDE` ou `REFUSE`)
- Notification à chaque étudiant à la publication

**Impact :** `soutenances`, `pfe`, notifications

---

### A5 — Limite de charge par encadrant
**Problème :** Un encadrant peut encadrer un nombre illimité d'étudiants. Dans la réalité, les universités fixent un quota (souvent 4-5 étudiants max par encadrant).

**Ce qu'il faut :**
- Champ `max_etudiants` sur le modèle `CustomUser` (role=encadrant, défaut=5)
- Vérification dans `affecter_encadrant()` avant affectation
- Affichage de la charge actuelle dans l'interface coordinateur : "Mohamed Benali (3/5)"

**Impact :** `authentication/models.py`, `sujets/services.py`, frontend coordinateur

---

## Priorité 2 — Processus universitaire complet

Ces fonctionnalités rendent le flux PFE complet de bout en bout.

---

### B1 — Fiche d'inscription PFE officielle
**Problème :** Quand un sujet est validé et un PFE créé, il n'y a pas de document officiel d'inscription. Dans une vraie université, une fiche est signée par l'étudiant, l'encadrant et le coordinateur.

**Ce qu'il faut :**
- PDF généré quand un PFE est créé (signal ou action coordinateur)
- Contenu : étudiant, encadrant, titre sujet, filière, année, date
- Statut de signature : `en_attente_encadrant` → `en_attente_coordinateur` → `signee`
- (Signature numérique simple : case à cocher dans l'app)

**Impact :** `pfe/services.py`, nouveau modèle `FicheInscription`

---

### B2 — Bibliothèque des PFE archivés
**Problème :** Les anciens PFE ne sont pas consultables. Dans une vraie université, les PFE archivés sont accessibles à tous (étudiants, encadrants) comme référence.

**Ce qu'il faut :**
- Page publique (visible à tous les rôles) : liste des PFE archivés
- Filtres : filière, année, note, encadrant
- Fiche PFE : titre, étudiant, encadrant, résumé, note finale, mention
- Téléchargement du rapport (si non confidentiel)
- Champ `confidentiel` sur Sujet (déjà ajouté ✅) → cache le fichier si confidentiel

**Impact :** `pfe` (nouvelle vue `BibliothequeView`), frontend (nouvelle page)

---

### B3 — Tableau de bord coordinateur enrichi
**Problème :** Le dashboard coordinateur ne montre pas les indicateurs clés de gestion.

**Ce qu'il faut :**
- Indicateurs en temps réel :
  - Sujets en attente de validation
  - PFE sans encadrant affecté
  - Livrables en attente de validation (par encadrant)
  - Soutenances en attente d'autorisation
  - % de PFE avec rapport validé
  - Étudiants sans soutenance planifiée (à J-30 de la date limite)
- Alertes si une deadline approche (7 jours)

**Impact :** `statistiques/services.py` (nouvelles métriques), frontend

---

### B4 — Tableau de bord encadrant enrichi
**Problème :** L'encadrant ne voit pas facilement l'avancement de ses étudiants.

**Ce qu'il faut :**
- Liste de ses étudiants avec progression :
  - Rapport : déposé / validé / refusé / non déposé
  - Code : idem
  - Soutenance : planifiée / date
  - Note soumise : oui / non
- Alertes : "3 livrables en attente de validation"

**Impact :** frontend encadrant, API existante suffisante

---

## Priorité 3 — Qualité et conformité

Ces améliorations rendent l'app plus fiable et professionnelle.

---

### C1 — Emails réels (SMTP)
**Problème :** Les emails s'affichent dans la console en dev mais ne partent jamais en production.

**Ce qu'il faut :**
- Configuration SMTP réelle dans `.env` (Gmail ou autre)
- Template HTML pour les emails (pas juste du texte)
- File d'attente pour les emails (éviter les timeouts dans les vues)

**Impact :** `notifications/services.py`, settings

---

### C2 — Historique des actions (Audit log)
**Problème :** Impossible de savoir qui a fait quoi et quand. Dans une vraie université, c'est important pour les litiges.

**Ce qu'il faut :**
- Log automatique des actions critiques : validation sujet, affectation jury, soumission note, autorisation soutenance
- Format : `{user, action, objet, timestamp}`
- Vue admin pour consulter l'historique

**Impact :** `core/` (nouveau mixin `AuditMixin`), ou `django-simple-history`

---

### C3 — Seuils de plagiat configurables
**Problème :** Le seuil de plagiat est hardcodé à 30% dans `soutenances/services.py`.

**Ce qu'il faut :**
- Champ `seuil_plagiat` dans `AnneeAcademique` (par défaut 30%)
- Le coordinateur peut le modifier par année
- La vérification dans `planifier_soutenance` utilise ce seuil dynamique

**Impact :** `soutenances/services.py`, modèle `AnneeAcademique` (A1)

---

### C4 — Refus de soutenance avec motif
**Problème :** Si le coordinateur refuse d'autoriser une soutenance (conditions non remplies), il n'y a pas de service `refuser_soutenance()` ni de notification à l'étudiant.

**Ce qu'il faut :**
- Endpoint `POST /soutenances/{id}/refuser/` avec motif obligatoire
- Statut `ANNULEE` ou retour à `EN_ATTENTE_AUTORISATION` avec commentaire
- Notification email + WebSocket à l'étudiant avec le motif

**Impact :** `soutenances/services.py`, `soutenances/views.py`, notifications

---

## Résumé — Ordre d'implémentation recommandé

| # | Amélioration | Effort | Impact |
|---|---|---|---|
| A1 | Année académique | Moyen | ⭐⭐⭐⭐⭐ |
| A2 | Deadlines et calendrier | Petit | ⭐⭐⭐⭐ |
| A3 | Convocation soutenance PDF | Petit | ⭐⭐⭐⭐ |
| A4 | Délibération et mentions | Moyen | ⭐⭐⭐⭐⭐ |
| A5 | Limite charge encadrant | Petit | ⭐⭐⭐ |
| B1 | Fiche inscription PDF | Moyen | ⭐⭐⭐ |
| B2 | Bibliothèque PFE archivés | Petit | ⭐⭐⭐⭐ |
| B3 | Dashboard coordinateur KPIs | Moyen | ⭐⭐⭐⭐ |
| B4 | Dashboard encadrant progression | Petit | ⭐⭐⭐ |
| C1 | Emails SMTP réels | Petit | ⭐⭐⭐ |
| C2 | Audit log | Moyen | ⭐⭐ |
| C3 | Seuils plagiat configurables | Petit | ⭐⭐ |
| C4 | Refus soutenance + motif | Petit | ⭐⭐⭐ |

---

## Dépendances entre améliorations

```
A1 (Année académique)
  └── A2 (Deadlines)
  └── A4 (Délibération)
  └── C3 (Seuils plagiat)

A3 (Convocation PDF)
  └── C4 (Refus soutenance)  ← à faire en même temps

B2 (Bibliothèque)
  └── dépend du champ confidentiel déjà ajouté ✅
```

---

*Document créé le 2026-06-09 — à mettre à jour au fur et à mesure des implémentations*
