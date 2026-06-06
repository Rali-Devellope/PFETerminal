# Analyse et Améliorations — GestionPFE ISCAE
**Date :** 04 juin 2026
**Objectif :** Examen de chaque rôle — ce qui est logique, ce qui manque, ce qui peut être amélioré.

---

## 1. 👨‍🎓 Étudiant

### Pages existantes
- Dashboard (PFE, encadrant, score plagiat, soutenance)
- Sujets disponibles (parcourir + choisir + proposer)
- Livrables (déposer fichiers)
- Ma Soutenance (date, salle, jury, note, téléchargement relevé/attestation)

### Ce qui est logique ✅
- L'étudiant voit son PFE + soutenance en un coup d'œil
- Il peut proposer son propre sujet OU choisir un sujet validé
- Téléchargement du relevé + attestation quand la note est disponible

### Ce qui manque / peut être amélioré ⚠️
- Pas de **statut des livrables** visible depuis le dashboard (doit aller dans Livrables)
- Pas de **notification** quand l'encadrant valide ou refuse un livrable
- Pas de **commentaire de l'encadrant** affiché sur le dashboard
- Pas de possibilité de **redéposer** un livrable refusé

---

## 2. 👨‍🏫 Encadrant

### Pages existantes
- Dashboard (liste étudiants, stats, soutenance prochaine)
- Sujets (proposer + liste propositions)
- Livrables (valider/refuser avec motif)
- Statistiques

### Ce qui est logique ✅
- L'encadrant voit tous ses étudiants encadrés
- Il peut proposer un sujet en désignant un étudiant spécifique
- Il valide/refuse les livrables avec motif obligatoire pour le refus

### Ce qui manque / peut être amélioré ⚠️
- Pas de page **détail étudiant** — cliquer sur un étudiant pour voir tous ses livrables et son avancement
- Pas de **suivi progression** par étudiant (% livrables validés)
- Pas de possibilité de **noter depuis l'interface encadrant** (note encadrant soumise via jury actuellement)

---

## 3. 🗂️ Coordinateur

### Pages existantes
- Dashboard (stats globales, sujets PROPOSÉ, PFE récents, soutenances prochaines)
- Sujets (valider/refuser avec motif, filtre statut/filière)
- Soutenances (planifier, affecter jury, calculer note, télécharger PV/Relevé)

### Ce qui est logique ✅
- Validation des sujets avec motif de refus obligatoire
- Planification complète : date + salle + durée + jury
- Calcul automatique de la note finale (60% jury + 40% encadrant)
- Téléchargement PV et relevé directement depuis la liste

### Ce qui manque / peut être amélioré ⚠️
- Pas d'**affectation d'encadrant** depuis l'interface (l'action `/affecter/` existe en backend mais pas de bouton frontend)
- Pas de **filtre par année** dans la liste des soutenances
- Pas de **planning global** exportable (toutes les soutenances avec dates/salles en PDF)
- Le coordinateur ne peut pas **modifier** une soutenance déjà planifiée

---

## 4. ⚖️ Jury

### Pages existantes
- Dashboard (soutenances à venir, soutenances terminées)
- Modal de notation (note 0–20 + commentaire)

### Ce qui est logique ✅
- Le jury voit uniquement SES soutenances
- Notation simple et directe depuis le dashboard

### Ce qui manque / peut être amélioré ⚠️
- Pas de **téléchargement du rapport** de l'étudiant avant la soutenance
- Pas de **fiche PFE** visible (titre, description, encadrant)
- Pas de **score plagiat** affiché pour le jury avant de noter
- Pas de possibilité de **modifier sa note** après soumission

---

## 5. 🔧 Admin

### Pages existantes
- Liste des utilisateurs (filtre rôle, recherche)
- Créer un compte (email, nom, prénom, rôle, mot de passe)

### Ce qui est logique ✅
- Seul l'admin crée des comptes — pas d'inscription publique
- Email domaine `@iscae.mr` imposé
- Séparation claire des rôles

### Ce qui manque / peut être amélioré ⚠️
- Pas de bouton **désactiver/réactiver** un compte (`is_active`)
- Pas de bouton **modifier** un utilisateur existant (rôle, nom)
- Pas de **réinitialisation de mot de passe** depuis l'interface
- Pas de **compteur par rôle** visible (X étudiants, Y encadrants...)

---

## 6. 📋 Scolarité

### Pages existantes
- Stats globales (total PFE, archivés, soutenances, moyenne)
- Classement filtrable par filière/année
- Export CSV, Excel, PDF du classement
- Boutons PV, Relevé, Attestation par étudiant

### Ce qui est logique ✅
- Accès lecture seule — la scolarité consulte, n'intervient pas dans le workflow
- Exports complets pour usage administratif
- Tous les documents téléchargeables depuis une seule page

### Ce qui manque / peut être amélioré ⚠️
- Pas de **liste des PFE archivés** (seulement le classement des soutenances notées)
- Pas de **recherche par nom d'étudiant**
- Pas de vue **"tous les PFE"** avec leurs statuts complets

---

## 7. 📊 Statistiques (page partagée)

### Pages existantes
- Stat cards : total PFE, en cours, soutenances terminées, moyenne générale
- Barres de répartition (en cours / archivés / sujets en attente)
- Cercle taux de réussite
- Classement filtrable par filière/année
- Exports CSV / Excel / PDF

### Ce qui est logique ✅
- Accessible à coordinateur, admin, scolarité, encadrant
- Données cohérentes avec la base de données

### Ce qui manque / peut être amélioré ⚠️
- Pas de **graphique par filière** (répartition visuelle en barres ou camembert)
- Pas de **évolution par année** (tendance année par année)
- Pas de stats **spécifiques à l'encadrant** connecté (uniquement ses étudiants)

---

## Résumé — Recommandations par priorité

| Priorité | Amélioration | Rôle | Difficulté |
|----------|-------------|------|------------|
| 🔴 Haute | Affectation encadrant depuis l'interface coordinateur | Coordinateur | Facile |
| 🔴 Haute | Désactiver / Modifier utilisateur depuis l'admin | Admin | Facile |
| 🟡 Moyenne | Page détail étudiant pour l'encadrant | Encadrant | Moyenne |
| 🟡 Moyenne | Fiche PFE + rapport + plagiat visible pour le jury | Jury | Facile |
| 🟡 Moyenne | Recherche par nom d'étudiant dans Scolarité | Scolarité | Facile |
| 🟡 Moyenne | Note encadrant soumissible depuis l'interface encadrant | Encadrant | Moyenne |
| 🟢 Faible | Planning soutenances PDF exportable | Coordinateur | Moyenne |
| 🟢 Faible | Graphiques par filière dans Stats | Stats | Facile |
| 🟢 Faible | Redéposer un livrable refusé | Étudiant | Facile |

---

## Flux complet validé

```
Encadrant/Étudiant propose un sujet
        ↓
Coordinateur valide → PFE créé automatiquement (signal)
        ↓
Étudiant dépose livrables → Encadrant valide/refuse
        ↓
Coordinateur planifie soutenance + affecte jury
        ↓
Jury note → Coordinateur calcule note finale
        ↓
Scolarité télécharge PV / Relevé / Attestation
```

---

*Analyse réalisée le 04 juin 2026 — GestionPFE ISCAE Mauritanie*
