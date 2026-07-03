# Lab 01 — Premier projet Angular 19 et composant standalone

> **Outcome :** à la fin, tu sais créer un projet Angular 19 avec le CLI, générer un composant standalone, l'afficher dans `AppComponent` via `imports`, et faire tourner le tout sur `http://localhost:4200`.
> **Vrai outil :** Angular CLI (`ng new`, `ng generate component`, `ng serve`) + le navigateur (hot reload visible en direct). Zéro harnais de test simulé.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu poses la **coquille du front TribuZen**. Cahier des charges **exact** :

1. Créer un projet Angular 19 nommé `tribuzen-front`, en SCSS, avec le router.
2. Générer un composant standalone `family-card`.
3. `FamilyCardComponent` affiche, via des **champs de classe** (pas encore de signal) :
   - le nom d'une famille : `familyName = 'Famille Martin'`
   - le nombre de membres : `memberCount = 4`
   - rendu attendu : un titre `Famille Martin` et une ligne `4 membre(s)`.
4. `AppComponent` affiche un `<h1>TribuZen</h1>` puis le composant `<app-family-card />`.
5. `ng serve` tourne sans erreur, la page affiche les deux composants.

**Contraintes de portée (module 01) :**
- Interdit d'utiliser `signal`, `@if`/`@for`, `input()` — ils viennent aux modules 02, 03, 05. On reste sur des champs de classe et de l'interpolation statique.
- Pas de gap-fill : tu tapes les vraies commandes CLI et le vrai code.

### Point de départ

Rien à copier. Un terminal, Node 18+ et le CLI Angular installé :

```bash
npm install -g @angular/cli   # si pas déjà fait — vérifie : ng version
```

---

## Étapes (en friction)

1. **Crée le projet** avec `ng new` et les bonnes options (SCSS + routing). Laisse le CLI installer les dépendances.
2. **Entre dans le dossier** et lance `ng serve` une première fois pour vérifier que la page par défaut s'affiche sur `http://localhost:4200`.
3. **Génère** le composant `family-card` avec le CLI (`ng g c`). Observe les 4 fichiers créés.
4. **Renseigne les champs de classe** `familyName` et `memberCount` dans `family-card.component.ts`.
5. **Écris le template** de `FamilyCardComponent` : interpolation double-accolade pour afficher les deux champs.
6. **Branche l'enfant dans le parent** : dans `app.component.ts`, importe `FamilyCardComponent`, ajoute-le à `imports`, et place `<app-family-card />` dans le template après le `<h1>`.
7. **Vérifie dans le navigateur** que la carte s'affiche (hot reload). Puis provoque volontairement le PIÈGE #1 : retire `FamilyCardComponent` de `imports` et lis le message d'erreur. Remets-le.

---

## Corrigé complet commenté

```bash
# 1. Créer le projet Angular 19 (SCSS + router)
ng new tribuzen-front --style=scss --routing
cd tribuzen-front

# 3. Générer le composant standalone (défaut en Angular 19)
ng g c family-card
# → crée src/app/family-card/{family-card.component.ts,.html,.scss,.spec.ts}
```

```typescript
// src/app/family-card/family-card.component.ts — corrigé
import { Component } from '@angular/core';

@Component({
  selector: 'app-family-card',
  // Pas de "standalone: true" : c'est le défaut en Angular 19
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  // Champs de classe : lus au rendu, NON réactifs.
  // (signal() viendra au module 02 pour rendre ça réactif.)
  familyName = 'Famille Martin';
  memberCount = 4;
}
```

```html
<!-- src/app/family-card/family-card.component.html — corrigé -->
<!-- Interpolation double-accolade : lit la valeur courante du champ de classe.
     Auto-échappée par Angular (XSS-safe). -->
<article class="card">
  <h2>{{ familyName }}</h2>
  <p>{{ memberCount }} membre(s)</p>
</article>
```

```scss
/* src/app/family-card/family-card.component.scss — styles encapsulés au composant */
.card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 1rem;
  max-width: 240px;
}
```

```typescript
// src/app/app.component.ts — corrigé
import { Component } from '@angular/core';
import { FamilyCardComponent } from './family-card/family-card.component';

@Component({
  selector: 'app-root',
  // ⚠️ étape clé : l'import TS ne suffit pas, il FAUT l'entrée dans imports[]
  imports: [FamilyCardComponent],
  template: `
    <h1>TribuZen</h1>
    <app-family-card />
  `,
})
export class AppComponent {}
```

```bash
# 2 & 7. Lancer et observer dans le navigateur
ng serve --open
```

**Pourquoi ce corrigé est correct :**
- `bootstrapApplication(AppComponent, appConfig)` (dans `main.ts`, généré par le CLI) démarre l'app sur `AppComponent`. On n'y touche pas.
- `FamilyCardComponent` est standalone (défaut Angular 19) : il embarque son propre template et ses styles, aucun `NgModule` requis.
- L'affichage de la balise `<app-family-card />` dans `AppComponent` marche **uniquement** parce que `FamilyCardComponent` figure dans `imports`. C'est la différence structurelle n°1 avec Vue, où l'`import` seul suffirait.
- Les données sont des champs de classe statiques : correct pour ce module. Les rendre réactives (signal) ou reçues du parent (input) est hors-portée ici.

**Le PIÈGE #1 en direct (étape 7) :** si tu retires `FamilyCardComponent` de `imports`, le CLI affiche une erreur de compilation de template du type `'app-family-card' is not a known element`. C'est le symptôme exact de l'oubli le plus fréquent — mémorise le message pour le reconnaître en entreprise.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — de mémoire, en 20 minutes, sans rouvrir ce corrigé ni le module :**

1. Recrée un projet neuf `tribuzen-front-2` (SCSS + routing).
2. Génère **deux** composants : `family-card` **et** `member-badge`.
3. `MemberBadgeComponent` affiche un champ `role = 'Admin'` dans un `<span class="badge">`.
4. `FamilyCardComponent` **importe et affiche** `MemberBadgeComponent` (donc : composant enfant branché dans un enfant — tu dois refaire l'étape `imports` deux fois, à deux niveaux).
5. `AppComponent` affiche `FamilyCardComponent`.

**Critère de réussite :** la page affiche la carte de famille contenant le badge `Admin`, `ng serve` sans erreur, et tu as ajouté `imports: [...]` correctement dans **chaque** parent (App → FamilyCard → MemberBadge). Si une balise reste « unknown element », c'est un `imports` oublié : trouve lequel sans regarder le corrigé.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cette coquille est le **commit d'amorçage** du front Angular :

```
tribuzen-front/
  src/
    app/
      app.component.ts              ← coquille racine, imports FamilyCardComponent
      family-card/
        family-card.component.ts    ← premier composant métier
        family-card.component.html
        family-card.component.scss
```

**Différences par rapport au lab (à venir dans les prochains modules) :**
- `familyName` / `memberCount` deviendront des **inputs** (`input()`) reçus du parent `FamilyPage` — **module 05**.
- Ces données seront chargées depuis l'API TribuZen via un service HTTP — **module 18**.
- La réactivité de l'état local passera par `signal()` — **module 02**.

**Commit cible :**
```
chore(front): bootstrap Angular 19 + FamilyCardComponent standalone dans AppComponent
```
