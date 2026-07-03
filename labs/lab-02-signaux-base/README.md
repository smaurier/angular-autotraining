# Lab 02 — Signaux de base : `signal()` + `computed()`

> **Outcome :** à la fin, tu sais construire un composant Angular 19 dont l'état réactif repose sur `signal()`, avec des valeurs dérivées en `computed()`, des écritures en `set()`/`update()`, et une mise à jour de tableau immuable — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `SortieBudgetComponent`, le premier écran interactif de TribuZen : le **planificateur de budget d'une sortie famille**. Cahier des charges **exact** :

1. Un `signal` `participants` (nombre, initial `2`) et un `signal` `prixParPersonne` (nombre, initial `15`).
2. Un `signal` `budgetMax` (nombre, initial `100`).
3. Un `computed` `total` = `participants() * prixParPersonne()`.
4. Un `computed` `message` : « Budget dépassé ! » si `total() > budgetMax()`, sinon « Dans le budget ».
5. Trois boutons : **+1** et **-1** participant (le `-1` ne descend jamais sous 0), et **Réinitialiser** (participants → 2).
6. Le template affiche `participants()`, `prixParPersonne()`, `total()` et `message()`, tous mis à jour en temps réel.
7. **Bonus obligatoire** : un `signal<string[]>` `invites` (liste de prénoms) + un bouton **Ajouter un invité** qui l'agrandit **de façon immuable** (spread), et un `computed` `nombreInvites` affiché à l'écran.

**Contraintes techniques :**
- `total`, `message` et `nombreInvites` sont des `computed` — **aucune** logique de recalcul dans les handlers.
- Toute écriture passe par `set()` ou `update()` ; **jamais** de mutation en place (`participants++`, `invites().push(...)` interdits).
- Lecture des signaux avec les parenthèses `()` partout, template compris.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Starter minimal

Dans un projet Angular 19 (`ng new tribuzen-labs`), génère le composant :

```bash
ng generate component sortie-budget
```

Puis pars de ce squelette (`src/app/sortie-budget/sortie-budget.component.ts`) :

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  standalone: true,
  template: `
    <!-- À construire : affichage participants(), prix, total(), message()
         + boutons +1 / -1 / Réinitialiser
         + section invités (liste + bouton + compteur) -->
  `,
})
export class SortieBudgetComponent {
  // À toi : participants, prixParPersonne, budgetMax (signal)
  //         total, message, nombreInvites (computed)
  //         invites (signal<string[]>)
  //         handlers : ajouterParticipant, retirerParticipant, reinitialiser, ajouterInvite
}
```

Branche `SortieBudgetComponent` dans `AppComponent` (import + balise `<app-sortie-budget />`), lance `ng serve` et regarde l'écran réagir en direct.

---

## Étapes (en friction)

1. **Déclare l'état source** — trois `signal` : `participants` (2), `prixParPersonne` (15), `budgetMax` (100).
2. **Écris le computed `total`** — `participants() * prixParPersonne()`. Vérifie qu'il n'a pas de `set`.
3. **Écris le computed `message`** — ternaire sur `total() > budgetMax()`.
4. **Écris les handlers** — `ajouterParticipant` (`update(n => n + 1)`), `retirerParticipant` (`update(n => Math.max(0, n - 1))`), `reinitialiser` (`set(2)`). Note bien : `set` pour la valeur absolue, `update` pour le relatif.
5. **Construis le template** — interpolations avec `()`, boutons avec `(click)`.
6. **Ajoute la section invités** — `signal<string[]>`, `computed` `nombreInvites` (`.length`), handler `ajouterInvite` avec spread `[...liste, 'Invité']`.
7. **Teste les cas limites dans le navigateur** : monte les participants jusqu'à dépasser `budgetMax` → le message bascule ; descends à 0 → le `-1` ne passe pas en négatif ; clique plusieurs fois « Ajouter un invité » → le compteur suit.
8. **Épreuve anti-mutation** : remplace temporairement `ajouterInvite` par `this.invites().push('Invité')` et observe que le compteur **ne bouge pas** — puis remets la version immuable. Tu viens de voir le piège de tes propres yeux.

---

## Corrigé complet commenté

```typescript
// src/app/sortie-budget/sortie-budget.component.ts — corrigé
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  standalone: true,
  template: `
    <h2>Budget de la sortie</h2>

    <!-- Chaque signal est lu avec () — obligatoire pour la réactivité du template -->
    <p>Participants : {{ participants() }}</p>
    <p>Prix / personne : {{ prixParPersonne() }} EUR</p>
    <p>Budget max : {{ budgetMax() }} EUR</p>
    <p><strong>Total : {{ total() }} EUR</strong></p>

    <!-- message() est un computed dérivé de total() et budgetMax() -->
    <p>{{ message() }}</p>

    <button (click)="retirerParticipant()">-1</button>
    <button (click)="ajouterParticipant()">+1</button>
    <button (click)="reinitialiser()">Réinitialiser</button>

    <hr />

    <h3>Invités ({{ nombreInvites() }})</h3>
    <button (click)="ajouterInvite()">Ajouter un invité</button>
  `,
})
export class SortieBudgetComponent {
  // --- État source : des WritableSignal, modifiables via set/update ---
  participants    = signal(2);
  prixParPersonne = signal(15);
  budgetMax       = signal(100);

  // Liste d'invités — signal de tableau, mis à jour de façon immuable
  invites = signal<string[]>([]);

  // --- Valeurs dérivées : des computed en lecture seule ---
  // total dépend de participants ET prixParPersonne : recalcul auto si l'un change
  total = computed(() => this.participants() * this.prixParPersonne());

  // message chaîne sur total() : Angular suit la dépendance transitive
  message = computed(() =>
    this.total() > this.budgetMax()
      ? 'Budget dépassé !'
      : 'Dans le budget'
  );

  // nombreInvites dérive de la longueur du tableau — se recalcule à chaque nouvelle référence
  nombreInvites = computed(() => this.invites().length);

  // --- Écritures ---
  ajouterParticipant() {
    // update : la nouvelle valeur dépend de l'ancienne
    this.participants.update(n => n + 1);
  }

  retirerParticipant() {
    // Math.max garde le compteur >= 0 — la règle métier vit dans l'update
    this.participants.update(n => Math.max(0, n - 1));
  }

  reinitialiser() {
    // set : valeur absolue, on ne regarde pas l'ancienne
    this.participants.set(2);
  }

  ajouterInvite() {
    // ✅ Immuable : [...liste, x] crée un NOUVEAU tableau → nouvelle référence → notifié
    // Un push() muterait en place et nombreInvites() ne bougerait pas.
    this.invites.update(liste => [...liste, `Invité ${liste.length + 1}`]);
  }
}
```

**Pourquoi ce corrigé est correct :**
- `total`, `message` et `nombreInvites` sont des `computed` — Angular les recalcule automatiquement quand une dépendance change. Aucune ligne de synchronisation dans les handlers.
- `set` sert quand la valeur ne dépend pas de l'ancienne (`reinitialiser` → 2) ; `update` quand elle en dépend (`+1`, `-1`, ajout d'invité).
- `ajouterInvite` construit un **nouveau** tableau avec le spread : la référence change, donc `nombreInvites()` se recalcule. Un `push()` laisserait la même référence et l'écran resterait figé.
- Chaque signal est lu avec `()` dans le template — sans les parenthèses, `{{ total }}` afficherait la fonction, pas le nombre.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis `SortieBudgetComponent` **de mémoire, en 25 minutes**, avec ces modifications :

1. Ajoute un `signal` `reduction` (pourcentage, initial `0`) et deux boutons pour l'ajuster de ±10 (borné entre 0 et 50 via `update` + `Math.min`/`Math.max`).
2. Transforme `total` pour appliquer la réduction : `participants() * prixParPersonne() * (1 - reduction() / 100)`, arrondi avec `Math.round`.
3. Ajoute un `computed` `totalParPersonne` = `total() / participants()` (attention au cas `participants() === 0` : renvoie `0`).
4. **Sans rouvrir ce corrigé** ni le module 02.

**Critère de réussite :** dans le navigateur, changer la réduction ou le nombre de participants met à jour `total`, `totalParPersonne` **et** `message` simultanément, sans aucun recalcul manuel dans un handler.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le composant vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-budget.component.ts
```

**Différences par rapport au lab :**
- `prixParPersonne` et `budgetMax` viendront d'`input()` passés par le parent (module 05) — ici on les garde en `signal` local.
- La liste d'invités sera chargée depuis l'API via `resource` (module 10) plutôt qu'un tableau vide en dur.
- Le rendu de la liste d'invités utilisera `@for` (module 03) ; ici on affiche seulement le compteur.
- Les styles passeront par le design system TribuZen (tokens CSS) — dans le lab, template brut sans style.

**Commit cible :**
```
feat(sorties): SortieBudget — signal participants/prix, computed total + message, invités immuables
```
