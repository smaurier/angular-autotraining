# Lab 05 — Communication parent-enfant : `input()` + `output()` + `model()`

> **Outcome :** à la fin, tu sais découper un écran Angular 19 en un parent et un enfant réutilisable, câblés par `input()` (données descendantes), `output()` (événement remontant) et `model()` (état bidirectionnel `[(prop)]`) — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Au lab 02, `SortieBudgetComponent` gérait tout d'un bloc. Ici tu **éclates** la partie « compteur de participants » dans un composant enfant réutilisable `CompteurParticipantsComponent`, et tu le recâbles à un parent `PageSortieComponent`.

Cahier des charges **exact**.

**Enfant — `CompteurParticipantsComponent` :**

1. `min` : un `input(0)` (borne basse, valeur par défaut `0`).
2. `max` : un `input.required<number>()` (borne haute, pas de défaut).
3. `valeur` : un `model(0)` — le nombre de participants, **bidirectionnel** avec le parent.
4. `maxAtteint` : un `output<number>()` qui émet `max()` quand on tente de dépasser la borne haute.
5. Un `computed` `pleinOuAuDela` = `valeur() >= max()`.
6. Template : bouton `-1` (désactivé si `valeur() <= min()`), affichage `valeur() / max()`, bouton `+1` (désactivé si `pleinOuAuDela()`).
7. Handler `ajouter()` : si `pleinOuAuDela()`, appelle `maxAtteint.emit(max())` et **ne dépasse pas** ; sinon `valeur.update(n => n + 1)`.
8. Handler `retirer()` : `valeur.update(n => Math.max(min(), n - 1))`.

**Parent — `PageSortieComponent` :**

9. Un `signal` `nbParticipants` (initial `2`) et un `signal` `prixParPersonne` (initial `15`).
10. Un `signal` `alerte` (chaîne, initial `''`).
11. Un `computed` `budget` = `nbParticipants() * prixParPersonne()`.
12. Instancie l'enfant avec `[min]="1"`, `[max]="20"`, `[(valeur)]="nbParticipants"`, `(maxAtteint)="surMax($event)"`.
13. `surMax(plafond)` : `alerte.set(...)` avec un message mentionnant le plafond.
14. Affiche le budget en direct, et l'alerte (via `@if`) quand elle est non vide.

**Contraintes techniques :**
- `input` / `output` / `model` importés de `@angular/core` — **aucun décorateur** `@Input` / `@Output`.
- `budget` et `pleinOuAuDela` sont des `computed` — **aucune** logique de recalcul dans les handlers.
- Two-way : `[(valeur)]="nbParticipants"` lie l'**instance** du signal (sans parenthèses).
- Toute écriture passe par `set()` / `update()` ; jamais de mutation en place.

**Pas de gap-fill** — tu écris les deux composants complets à partir des starters ci-dessous.

### Starter minimal

Dans un projet Angular 19 (`ng new tribuzen-labs`), génère les deux composants :

```bash
ng generate component compteur-participants
ng generate component page-sortie
```

Enfant (`src/app/compteur-participants/compteur-participants.component.ts`) :

```typescript
import { Component, input, output, model, computed } from '@angular/core';

@Component({
  selector: 'app-compteur-participants',
  template: `
    <!-- À construire : boutons -1 / +1 (avec [disabled]) + affichage valeur() / max() -->
  `,
})
export class CompteurParticipantsComponent {
  // À toi : min (input), max (input.required), valeur (model), maxAtteint (output)
  //         pleinOuAuDela (computed)
  //         handlers ajouter() / retirer()
}
```

Parent (`src/app/page-sortie/page-sortie.component.ts`) :

```typescript
import { Component, signal, computed } from '@angular/core';
import { CompteurParticipantsComponent } from '../compteur-participants/compteur-participants.component';

@Component({
  selector: 'app-page-sortie',
  imports: [CompteurParticipantsComponent],
  template: `
    <!-- À construire : <app-compteur-participants ...>, budget en direct, alerte via @if -->
  `,
})
export class PageSortieComponent {
  // À toi : nbParticipants, prixParPersonne, alerte (signal)
  //         budget (computed)
  //         surMax(plafond)
}
```

Branche `PageSortieComponent` dans `AppComponent` (`<app-page-sortie />`), lance `ng serve` et regarde le compteur enfant piloter le budget du parent en direct.

---

## Étapes (en friction)

1. **Enfant — déclare les entrées/sorties** : `min = input(0)`, `max = input.required<number>()`, `valeur = model(0)`, `maxAtteint = output<number>()`. Marque-les `readonly`.
2. **Enfant — le computed `pleinOuAuDela`** : `this.valeur() >= this.max()`. Vérifie mentalement qu'il compose deux signaux (un model + un input).
3. **Enfant — les handlers** : `ajouter()` teste `pleinOuAuDela()` → `emit` ou `update` ; `retirer()` borne avec `Math.max(this.min(), ...)`.
4. **Enfant — le template** : `[disabled]` sur les deux boutons, affichage `valeur() / max()`. Toutes les lectures avec `()`.
5. **Parent — l'état** : trois `signal` (`nbParticipants`, `prixParPersonne`, `alerte`) + le `computed` `budget`.
6. **Parent — le câblage** : `[min]="1"`, `[max]="20"`, `[(valeur)]="nbParticipants"`, `(maxAtteint)="surMax($event)"`. Attention : `nbParticipants` **sans** parenthèses dans le `[(valeur)]`.
7. **Parent — l'affichage** : budget en direct, alerte via `@if (alerte())`.
8. **Teste dans le navigateur** : monte à 20 → le `+1` se désactive ET l'alerte apparaît ; descends à 1 → le `-1` se désactive ; à chaque `+1` / `-1`, le budget du parent bouge **immédiatement** (preuve que le `model` remonte).
9. **Épreuve du two-way** : ajoute temporairement des parenthèses — `[(valeur)]="nbParticipants()"` — et observe l'erreur de compilation. Remets sans parenthèses. Tu viens de voir pourquoi le two-way lie l'instance, pas la valeur.

---

## Corrigé complet commenté

```typescript
// src/app/compteur-participants/compteur-participants.component.ts — corrigé (ENFANT)
import { Component, input, output, model, computed } from '@angular/core';

@Component({
  selector: 'app-compteur-participants',
  template: `
    <!-- [disabled] : property binding sur une expression booléenne (module 04)
         valeur() est un model, min()/max() des inputs — tous lus avec () -->
    <button (click)="retirer()" [disabled]="valeur() <= min()">-1</button>
    <span>{{ valeur() }} / {{ max() }} participants</span>
    <button (click)="ajouter()" [disabled]="pleinOuAuDela()">+1</button>
  `,
})
export class CompteurParticipantsComponent {
  // --- Parent → Enfant : bornes en LECTURE SEULE (InputSignal) ---
  readonly min = input(0);                   // défaut sensé → input simple
  readonly max = input.required<number>();   // pas de défaut raisonnable → requis

  // --- Parent ↔ Enfant : le nombre, MODIFIABLE des deux côtés (ModelSignal) ---
  readonly valeur = model(0);                // possède set()/update(), contrairement à input()

  // --- Enfant → Parent : signal de dépassement (OutputEmitterRef) ---
  readonly maxAtteint = output<number>();

  // input + model composés dans un computed : tout est signal, tout se recalcule
  readonly pleinOuAuDela = computed(() => this.valeur() >= this.max());

  ajouter() {
    if (this.pleinOuAuDela()) {
      // on NE dépasse pas : on prévient le parent avec la valeur du plafond
      this.maxAtteint.emit(this.max());
      return;
    }
    // update() sur le model → la modif REMONTE au parent via [(valeur)]
    this.valeur.update(n => n + 1);
  }

  retirer() {
    // Math.max(min(), ...) : la borne basse vient d'un input, la règle vit dans l'update
    this.valeur.update(n => Math.max(this.min(), n - 1));
  }
}
```

```typescript
// src/app/page-sortie/page-sortie.component.ts — corrigé (PARENT)
import { Component, signal, computed } from '@angular/core';
import { CompteurParticipantsComponent } from '../compteur-participants/compteur-participants.component';

@Component({
  selector: 'app-page-sortie',
  imports: [CompteurParticipantsComponent],
  template: `
    <h2>Sortie famille</h2>

    <!-- [min]/[max] : inputs descendants (bornes fixes ici)
         [(valeur)] : two-way — lie l'INSTANCE nbParticipants (SANS parenthèses)
         (maxAtteint) : event binding — $event porte le plafond émis -->
    <app-compteur-participants
      [min]="1"
      [max]="20"
      [(valeur)]="nbParticipants"
      (maxAtteint)="surMax($event)"
    />

    <!-- budget est un computed qui LIT nbParticipants : bouger l'enfant met à jour cette ligne -->
    <p>Budget estimé : {{ budget() }} EUR</p>

    <!-- @if (control flow, module 03) : l'alerte n'apparaît que si la chaîne est non vide -->
    @if (alerte()) {
      <p class="alerte">{{ alerte() }}</p>
    }
  `,
})
export class PageSortieComponent {
  // État local du parent
  readonly nbParticipants = signal(2);
  readonly prixParPersonne = signal(15);
  readonly alerte = signal('');

  // budget dérive du signal partagé via le model : recalcul auto à chaque changement
  readonly budget = computed(() => this.nbParticipants() * this.prixParPersonne());

  // handler de l'output enfant : $event est typé number (le plafond)
  surMax(plafond: number) {
    this.alerte.set(`Maximum de ${plafond} participants atteint.`);
  }
}
```

**Pourquoi ce corrigé est correct :**
- Chaque donnée emprunte la **bonne** API selon son sens : `min` / `max` descendent (`input`), `valeur` fait des allers-retours (`model`), `maxAtteint` remonte (`output`). Aucun service, aucun Observable.
- `[(valeur)]="nbParticipants"` lie l'**instance** du signal : quand l'enfant fait `valeur.update(...)`, le signal `nbParticipants` du parent se met à jour, et `budget` (qui le lit) se recalcule tout seul. Avec `nbParticipants()`, Angular n'aurait qu'un nombre figé où réécrire → erreur.
- `pleinOuAuDela` et `budget` sont des `computed` : zéro synchronisation manuelle dans les handlers.
- L'enfant ne dépasse jamais `max` : il émet un `output` à la place. Le parent décide quoi en faire (ici, une alerte) — l'enfant reste réutilisable, ignorant de ce que le parent affiche.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis les deux composants **de mémoire, en 25 minutes**, avec ces modifications :

1. Ajoute à l'enfant un `input(1, { transform: numberAttribute })` nommé `pas` : `+1` / `-1` deviennent `+pas()` / `-pas()`.
2. Ajoute à l'enfant un `output<void>()` `reinitDemandee` + un bouton « Réinitialiser » qui l'émet **sans transporter de valeur**. Le parent, en réponse, fait `nbParticipants.set(0)`.
3. Le parent affiche un `computed` `budgetParPersonne` = `budget() / nbParticipants()` (renvoie `0` si `nbParticipants() === 0`).
4. **Sans rouvrir ce corrigé** ni le module 05.

**Critère de réussite :** dans le navigateur, changer le pas modifie l'incrément ; « Réinitialiser » remet le compteur à 0 depuis le parent (preuve que l'`output void` déclenche bien une action parent) ; et budget, budgetParPersonne, alerte réagissent tous sans recalcul manuel.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, les composants vivent ici :

```
tribuzen/
  src/
    app/
      sorties/
        page-sortie.component.ts            ← parent : [(valeur)], (maxAtteint), computed budget
        compteur-participants.component.ts  ← enfant réutilisable : input + model + output
```

**Différences par rapport au lab :**
- `prixParPersonne` et `max` viendront d'un `input()` passé par un parent plus haut (ou d'un service `SortieStore`, module 11) plutôt que de constantes en dur.
- Le `CompteurParticipantsComponent` sera réutilisé tel quel sur la future page « atelier » — c'est tout l'intérêt de l'avoir extrait avec des `input` génériques (`min` / `max` / `pas`) plutôt que des valeurs figées.
- L'alerte passera par le design system (composant `Toast` TribuZen) au lieu d'un `<p>` brut ; la logique `output` → réaction parent reste identique.

**Commit cible :**
```
feat(sorties): CompteurParticipants enfant réutilisable — input min/max, model valeur, output maxAtteint
```
