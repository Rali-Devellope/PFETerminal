# Analyse comparative — GestionPFE vs Applications universitaires standard

> Analyse réalisée après lecture complète du code backend (services.py, models.py) et frontend.
> Date : 2026-06-12

---

## Catégorie A — Ce qui fonctionne correctement

| Fonctionnalité | État |
|---|---|
| Authentification 7 rôles, JWT, 1ère connexion forcée | ✅ Complet |
| Workflow sujet PROPOSE → VALIDE → AFFECTE | ✅ Complet |
| Dépôt livrables avec validation des extensions | ✅ Complet |
| Détection `hors_delai` automatique | ✅ Complet |
| Fiche d'inscription PDF avec signature encadrant → coordinateur | ✅ Complet |
| Planification individuelle + session par filière | ✅ Complet |
| Jury minimum 2, flux autorisation soutenance | ✅ Complet |
| Note finale : 60% jury + 40% encadrant | ✅ Complet |
| PV + relevé de notes + attestation (PDF) | ✅ Complet |
| Planning soutenances PDF | ✅ Complet |
| Convocation PDF auto-générée | ✅ Complet |
| Clôture session → mentions + statuts PFE | ✅ Complet |
| Archivage + classement + exports CSV/Excel/PDF | ✅ Complet |
| Notifications in-app + email + WebSocket | ✅ Complet |
| Stats globales + par filière + dashboard KPI | ✅ Complet |
| Bilingual FR/AR | ✅ Complet |

---

## Catégorie B — Présent mais incomplet ou simulé (bugs métier)

### B1 — Score plagiat complètement aléatoire (bug critique)

```python
# apps/pfe/services.py
def _calculer_plagiat(pfe):
    pfe.score_plagiat = round(random.uniform(0.5, 15.0), 2)  # FAKE
```

Le système **bloque une soutenance** si `score_plagiat > 30%`. Mais ce score est généré
aléatoirement entre 0.5% et 15.0% — donc jamais bloquant, et complètement fictif.
C'est une fausse sécurité qui ne fait rien de réel.

**Ce qu'une vraie université attend :** comparaison avec une base de documents existants
(hash de paragraphes, TF-IDF, ou API externe comme Copyleaks).

---

### B2 — `encadrant_entr` existe mais n'est jamais utilisé

Le modèle a `encadrant_entr` (encadrant entreprise) sur PFE. Il n'apparaît :
- ni dans le calcul de la note finale
- ni dans les notifications de soutenance
- ni dans la fiche d'inscription PDF
- ni dans la convocation PDF

Il est stocké mais invisible. Un PFE industriel a toujours deux encadrants et les deux
doivent noter.

---

### B3 — Unique livrable actif non enforced

Quand un rapport est refusé et que l'étudiant redépose, le système crée un nouveau
`Livrable` mais garde l'ancien. L'encadrant voit les 2 lignes sans savoir lequel est
la version actuelle. Aucun champ `version` ni marquage "latest".

---

### B4 — Soutenance sans transition automatique de statut

La soutenance passe de `PLANIFIEE` à `TERMINEE` uniquement via `calculer_note_finale()`.
Il n'existe pas de statut `EN_COURS` automatique le jour J. Si la soutenance a lieu
mais que le coordinateur oublie de calculer la note, elle reste `PLANIFIEE` indéfiniment.

---

### B5 — Signalement PFE confidentiel non protégé

Le sujet a un champ `confidentiel = BooleanField`. Mais dans l'API, tous les sujets
sont retournés à tous les utilisateurs authentifiés — il n'existe aucun filtre qui
masque la description d'un sujet confidentiel aux autres étudiants.

---

## Catégorie C — Manquant (critique pour une vraie université)

### C1 — Quota encadrant (charge pédagogique)

Aucune limite sur le nombre d'étudiants par encadrant. En pratique toutes les universités
fixent une limite (5 à 8 étudiants max par encadrant). Sans ça, un encadrant peut se
retrouver avec 30 étudiants ou aucun.

**Ce qu'il faut :**
- Champ `max_etudiants` sur `CustomUser` (role encadrant)
- Vérification dans `affecter_encadrant()` : si `pfe_acad.count() >= max_etudiants` → refus

---

### C2 — Convention de stage

Pour les PFEs en entreprise (`origine = 'entreprise'`), une **convention tripartite**
(université + entreprise + étudiant) est obligatoire légalement. L'app n'a aucun support
pour ce document.

**Ce qu'il faut :**
- Champs : nom de l'entreprise, adresse, nom du tuteur entreprise, période de stage
- PDF de convention généré automatiquement
- Signature électronique ou statut de réception

---

### C3 — Désignation du président du jury

Dans le modèle actuel, le jury est `ManyToManyField(CustomUser)` sans distinction de rôle.
En réalité il y a toujours un **président du jury** qui préside la délibération et signe
le PV. Sans cette distinction, le PV est incomplet.

---

### C4 — Résumé/abstract et mots-clés sur le PFE

Aucun champ `resume` ou `mots_cles` sur le modèle PFE. La bibliothèque d'archives est
donc impossible à utiliser utilement — on ne peut pas chercher par thème. C'est la lacune
qui rend l'archive inutilisable en pratique.

---

### C5 — Réunions d'avancement

Beaucoup d'universités exigent un minimum de réunions entre l'étudiant et l'encadrant
(généralement 3 à 5 réunions documentées). Il n'y a aucun modèle pour ça :
pas de `CompteRenduReunion`, pas de validation encadrant.

---

## Catégorie D — Manquant (important mais pas bloquant)

| Fonctionnalité | Pourquoi c'est attendu |
|---|---|
| Rappels automatiques avant deadline | Les universités envoient J-7, J-1 automatiquement sans action humaine |
| Historique des versions livrables | Traçabilité des révisions (v1 refusé → v2 validé) |
| Président jury désigné dans PV | Le PV officiel indique qui préside |
| Note encadrant entreprise | Si `encadrant_entr` existe, sa note devrait compter |
| Grille d'évaluation par critères | Plusieurs sous-notes (rapport, présentation, questions) plutôt qu'une seule |
| Calendrier visuel des soutenances | Vue planning semaine/mois plutôt qu'une liste |
| Recherche dans la bibliothèque | Recherche par titre, mots-clés, filière dans les PFEs archivés |
| Auto-publication des résultats | Résultats visibles aux étudiants seulement après clôture officielle |
| Sujet modification avec approbation | Encadrant peut proposer une modification du titre après validation |

---

## Catégorie E — Ce que l'app a de mieux que beaucoup d'équivalents

- **Architecture DDD propre** — services séparés des vues, logique métier testable
- **WebSocket temps réel** — rares dans les apps universitaires
- **Session automatique par filière** — génère toutes les soutenances d'un coup
- **Seuil plagiat bloquant** — le mécanisme est là, il manque juste la vraie détection
- **Clôture de session complète** — mentions + changements de statuts en une action
- **Double PDF** (relevé + attestation) — beaucoup d'apps n'ont que le PV

---

## Résumé — Priorités de correction

| Priorité | Action | Effort estimé |
|---|---|---|
| 🔴 P0 | Corriger le plagiat aléatoire (ou documenter clairement comme simulé) | 2h |
| 🔴 P0 | Protéger les sujets confidentiels dans l'API (filtrage description) | 1h |
| 🟠 P1 | Quota encadrant (`max_etudiants` + vérification dans service) | 3h |
| 🟠 P1 | Versioning des livrables (champ `version`, marquage "latest") | 2h |
| 🟠 P1 | Encadrant entreprise dans calcul note + notifications | 2h |
| 🟡 P2 | Résumé + mots-clés sur le modèle PFE (migration) | 1h |
| 🟡 P2 | Président jury sur le modèle Soutenance (migration) | 1h |
| 🟡 P2 | Convention de stage PDF | 4h |
| 🟢 P3 | Rappels automatiques avant deadline (tâche cron) | 3h |
| 🟢 P3 | Grille d'évaluation par critères | 5h |
