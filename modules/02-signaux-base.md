---
titre: Les signaux Angular — signal(), computed(), set/update
cours: 03-angular
notions: [signal(), lecture par appel (), WritableSignal, set(), update(), computed(), Signal lecture seule, computed lazy et mémoïsé, mise à jour immuable, binding signal dans le template]
outcomes:
  - sait créer un état local réactif avec signal() et le lire en l'appelant comme une fonction
  - sait modifier un signal avec set() (valeur absolue) et update() (dérivée de l'ancienne)
  - sait dériver une valeur avec computed() et comprend qu'elle est en lecture seule, lazy et mémoïsée
  - sait mettre à jour un objet ou un tableau de façon immuable pour qu'Angular détecte le changement
  - sait binder un signal dans un template avec les parenthèses d'appel
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone]
next: 03-control-flow
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — état local réactif du planificateur de sortie famille (participants, budget calculé)
last-reviewed: 2026-07
---

# Les signaux Angular — `signal()`, `computed()`, `set` / `update`

> **Outcomes — tu sauras FAIRE :** créer un état réactif avec `signal()`, le lire en l'appelant, le modifier avec `set()`/`update()`, et dériver une valeur avec `computed()`.
> **Difficulté :** :star::star:
>
> **Portée :** ce module couvre **les trois opérations de base des signaux** : créer/lire (`signal()` + appel `()`), écrire (`set` / `update`), dériver (`computed`). C'est tout. Les réactions à effet de bord (`effect`), les signaux liés (`linkedSignal`) et le chargement asynchrone (`resource`) sont les **modules 09-10**. Le control flow `@if` / `@for` dans le template est le **module 03**. L'injection de dépendances et RxJS viennent plus tard.

## 1. Cas concret d'abord

Première story sur TribuZen : le **planificateur de sortie famille**. L'utilisateur choisit un nombre de participants et un prix par personne, et l'écran affiche le budget total en temps réel, plus un avertissement si on dépasse le budget max de la famille.

Un collègue a commencé avec des propriétés de classe « normales » :

```typescript
// sortie-budget.component.ts — AVANT (état non réactif)
import { Component } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  template: `
    <p>Participants : {{ participants }}</p>
    <p>Total : {{ participants * prixParPersonne }} EUR</p>
    <button (click)="ajouterParticipant()">+1 participant</button>
  `,
})
export class SortieBudgetComponent {
  participants = 2;
  prixParPersonne = 15;

  ajouterParticipant() {
    this.participants++;   // ← la valeur change… mais l'écran se met-il à jour ?
  }
}
```

Le problème : rien ne dit à Angular **quand** re-calculer `participants * prixParPersonne`. Dans une application zoneless (le défaut visé en Angular 19+), une simple propriété mutée ne déclenche aucune mise à jour de l'affichage. Il faut un conteneur qui **notifie** Angular à chaque changement, et un moyen de **dériver** le total automatiquement.

C'est exactement le rôle des **signaux**. Ce module te donne les trois briques : `signal()`, `set`/`update`, et `computed()`.

---

## 2. Théorie complète, concise

### 2.1 `signal()` — le conteneur réactif de base

Un signal est un conteneur qui stocke une valeur **et prévient Angular quand elle change**. On le crée avec la fonction `signal()` importée de `@angular/core`, en passant la valeur initiale.

```typescript
import { signal } from '@angular/core';

const participants = signal(2);   // WritableSignal<number>
```

La signature vérifiée est `signal<T>(initialValue: T): WritableSignal<T>`. Le type `T` est inféré depuis la valeur initiale : `signal(2)` donne `WritableSignal<number>`, `signal('')` donne `WritableSignal<string>`.

### 2.2 Lire un signal — on l'**appelle** comme une fonction

C'est le point qui surprend en venant de Vue (`.value`) : en Angular, on lit un signal en **l'appelant** avec des parenthèses.

```typescript
console.log(participants());   // 2  — les parenthèses lisent la valeur
```

Un signal *est* une fonction getter. `participants` sans parenthèses est la fonction elle-même ; `participants()` est sa valeur courante.

### 2.3 Écrire — `set()` et `update()`

`WritableSignal<T>` expose deux méthodes d'écriture (interface vérifiée : `set(value: T): void` et `update(updateFn: (value: T) => T): void`).

```typescript
// set : on impose une valeur absolue, sans regarder l'ancienne
participants.set(4);
console.log(participants());   // 4

// update : on calcule la nouvelle valeur À PARTIR de l'ancienne
participants.update(n => n + 1);
console.log(participants());   // 5
```

Règle simple : **`set` quand la nouvelle valeur ne dépend pas de l'ancienne** (réinitialiser à 0, poser une valeur choisie) ; **`update` quand elle en dépend** (incrémenter, basculer un booléen, ajouter à une liste).

### 2.4 `computed()` — la valeur dérivée

`computed()` crée un signal **en lecture seule** dont la valeur est dérivée d'autres signaux. Angular détecte automatiquement quels signaux sont lus dans la fonction et recalcule quand l'un d'eux change.

```typescript
import { signal, computed } from '@angular/core';

const participants   = signal(2);
const prixParPersonne = signal(15);

// Se recalcule quand participants OU prixParPersonne changent
const total = computed(() => participants() * prixParPersonne());

console.log(total());          // 30
participants.set(4);
console.log(total());          // 60 — recalcul automatique
```

Trois propriétés vérifiées de `computed()` :

- **Lecture seule** : `total.set(...)` est une **erreur de compilation**. Un `computed` n'a ni `set` ni `update`.
- **Lazy (paresseux)** : la fonction de dérivation ne s'exécute **que** lors du premier `total()`, pas à la création.
- **Mémoïsé** : le résultat est mis en cache. Tant qu'aucune dépendance ne change, relire `total()` renvoie la valeur cachée sans recalculer — utile pour les calculs coûteux.

Le suivi des dépendances est **dynamique** : seuls les signaux réellement lus pendant l'exécution comptent. Si une branche `if` ne lit pas un signal cette fois-ci, il n'est pas une dépendance ce tour-là.

### 2.5 Type de retour : `WritableSignal<T>` vs `Signal<T>`

- `signal(...)` renvoie un **`WritableSignal<T>`** : lisible ET modifiable (`set`/`update`).
- `computed(...)` renvoie un **`Signal<T>`** : lisible seulement.

`WritableSignal<T>` étend `Signal<T>`. Un `WritableSignal` peut aussi exposer une version lecture seule via `asReadonly()` — pratique pour publier un signal modifiable en interne mais non modifiable de l'extérieur.

### 2.6 Un signal dans un composant et son template

Dans une classe de composant, un signal est une propriété comme une autre. Dans le template, on le lit **avec les parenthèses**.

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  template: `
    <p>Participants : {{ participants() }}</p>
    <p>Total : {{ total() }} EUR</p>
    <button (click)="ajouterParticipant()">+1 participant</button>
  `,
})
export class SortieBudgetComponent {
  participants   = signal(2);
  prixParPersonne = signal(15);
  total = computed(() => this.participants() * this.prixParPersonne());

  ajouterParticipant() {
    this.participants.update(n => n + 1);
    // total() se met à jour tout seul — pas de code à écrire ici
  }
}
```

Les parenthèses dans le template sont **obligatoires** : <code v-pre>{{ participants() }}</code> s'actualise à chaque changement, alors qu'une propriété non-signal (<code v-pre>{{ welcomeMessage }}</code>) ne garantit pas la mise à jour réactive.

### 2.7 Objets et tableaux : mise à jour **immuable**

Un signal ne détecte un changement que si sa **référence** change (égalité par défaut). Muter l'objet interne ne notifie personne.

```typescript
const membres = signal<string[]>(['Alice', 'Bob']);

// ✅ Immuable : on crée un NOUVEAU tableau → nouvelle référence → Angular notifié
membres.update(liste => [...liste, 'Cara']);

// ❌ Mutation en place : même référence → Angular ne voit rien
membres().push('Cara');   // le signal ignore ce changement
```

Toujours passer par `set`/`update` avec une **nouvelle** valeur (spread, `map`, `filter`) pour les objets et tableaux.

---

## 3. Worked examples

### Exemple 1 — `SortieBudgetComponent` complet (TribuZen)

On reprend le cas concret et on le rend réactif de bout en bout.

```typescript
// sortie-budget.component.ts — version signaux
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  template: `
    <h2>Budget de la sortie</h2>

    <p>Participants : {{ participants() }}</p>
    <p>Prix / personne : {{ prixParPersonne() }} EUR</p>
    <p>Total : {{ total() }} EUR</p>

    <!-- message() est un computed dérivé de total() -->
    <p>{{ message() }}</p>

    <button (click)="retirerParticipant()">-1</button>
    <button (click)="ajouterParticipant()">+1</button>
    <button (click)="reinitialiser()">Réinitialiser</button>
  `,
})
export class SortieBudgetComponent {
  // --- État source : des WritableSignal ---
  participants    = signal(2);
  prixParPersonne = signal(15);
  budgetMax       = signal(100);

  // --- Valeurs dérivées : des computed en lecture seule ---
  // total dépend de participants ET prixParPersonne → recalcul auto si l'un change
  total = computed(() => this.participants() * this.prixParPersonne());

  // message dépend de total() et budgetMax() — Angular chaîne les dépendances
  message = computed(() =>
    this.total() > this.budgetMax()
      ? 'Budget dépassé !'
      : 'Dans le budget'
  );

  // --- Écritures ---
  ajouterParticipant() {
    // update : la nouvelle valeur dépend de l'ancienne
    this.participants.update(n => n + 1);
  }

  retirerParticipant() {
    // Math.max évite de passer sous 0 — logique métier dans l'update
    this.participants.update(n => Math.max(0, n - 1));
  }

  reinitialiser() {
    // set : valeur absolue, indépendante de l'ancienne
    this.participants.set(2);
  }
}
```

**Ce qui se passe au clic sur `+1`** : `update` change `participants` → Angular invalide le cache de `total` (qui lit `participants`) → `total` invalide `message` (qui lit `total`) → le template relit `participants()`, `total()`, `message()` et se met à jour. On n'a écrit **aucune** logique de synchronisation.

### Exemple 2 — liste de participants en immuable

Le planificateur gère aussi la liste nominative des participants. On ajoute et on retire **sans muter**.

```typescript
import { Component, signal, computed } from '@angular/core';

interface Participant {
  id: string;
  nom: string;
}

@Component({
  selector: 'app-liste-participants',
  template: `
    <p>{{ nombre() }} participant(s)</p>
    <button (click)="ajouter()">Ajouter</button>
  `,
})
export class ListeParticipantsComponent {
  participants = signal<Participant[]>([
    { id: 'p1', nom: 'Alice' },
    { id: 'p2', nom: 'Bob' },
  ]);

  // computed dérivé : le nombre se recalcule à chaque changement de la liste
  nombre = computed(() => this.participants().length);

  ajouter() {
    const nouveau: Participant = { id: crypto.randomUUID(), nom: 'Invité' };
    // ✅ nouveau tableau (spread) → nouvelle référence → notifié
    this.participants.update(liste => [...liste, nouveau]);
  }

  retirer(id: string) {
    // ✅ filter renvoie un nouveau tableau
    this.participants.update(liste => liste.filter(p => p.id !== id));
  }
}
```

Si on avait écrit `this.participants().push(nouveau)`, la référence du tableau serait inchangée, `nombre()` ne se recalculerait pas et l'écran resterait figé.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier les parenthèses de lecture

```typescript
const total = computed(() => this.participants() * this.prixParPersonne());

// ❌ Sans (), on manipule la FONCTION, pas la valeur
console.log(total);          // [Function] — pas un nombre
if (this.participants > 5) { /* compare une fonction à 5 : toujours faux */ }

// ✅ Avec (), on lit la valeur
console.log(total());        // 30
if (this.participants() > 5) { /* correct */ }
```

Le même piège dans le template : <code v-pre>{{ total }}</code> affiche la fonction, <code v-pre>{{ total() }}</code> affiche le nombre. **Toujours** appeler un signal pour le lire.

### PIÈGE #2 — Muter un objet/tableau au lieu de créer une nouvelle référence

```typescript
const membres = signal<string[]>(['Alice']);

// ❌ Mutation en place : même référence, Angular ne détecte rien
membres().push('Bob');
membres()[0] = 'Zoé';

// ✅ Nouvelle référence via set/update
membres.update(liste => [...liste, 'Bob']);
membres.update(liste => liste.map((m, i) => (i === 0 ? 'Zoé' : m)));
```

Par défaut un signal compare par référence — muter le contenu ne change pas la référence, donc rien n'est notifié.

### PIÈGE #3 — Vouloir écrire dans un `computed`

```typescript
const total = computed(() => this.participants() * this.prixParPersonne());

// ❌ Erreur de compilation : un computed n'a pas de set/update
total.set(100);

// ✅ On modifie les SOURCES, le computed suit tout seul
this.participants.set(10);   // total() vaut maintenant 10 * prixParPersonne()
```

Un `computed` est **dérivé** : on ne le pilote jamais directement, on change ses entrées.

### PIÈGE #4 — Mettre de la logique dérivée dans un handler au lieu d'un `computed`

```typescript
// ❌ Recalcul manuel et fragile — facile d'oublier un endroit
ajouterParticipant() {
  this.participants.update(n => n + 1);
  this.total.set(this.participants() * this.prixParPersonne()); // total n'est même pas writable !
}

// ✅ total est un computed : il se recalcule tout seul, on ne le touche jamais
total = computed(() => this.participants() * this.prixParPersonne());
ajouterParticipant() {
  this.participants.update(n => n + 1);
}
```

Si une valeur peut être **calculée** à partir d'autres signaux, c'est un `computed`, pas un état recopié à la main.

### PIÈGE #5 — Confondre `set` et `update`

```typescript
// set attend une VALEUR, update attend une FONCTION
participants.set(n => n + 1);      // ❌ pose la fonction elle-même comme valeur (type invalide)
participants.update(5);           // ❌ update veut (value) => value, pas un nombre

// ✅ Le bon usage
participants.set(5);              // valeur absolue
participants.update(n => n + 1);  // dérivée de l'ancienne
```

Moyen mnémotechnique : `set` = « pose ça », `update` = « transforme ce qu'il y a déjà ».

---

## 5. Ancrage TribuZen

Les signaux sont la **couche d'état local réactif** de tous les composants front-office TribuZen. Dès qu'un composant a un état qui évolue à l'écran (compteur, sélection, total calculé), c'est un `signal` + éventuellement un `computed`.

**`SortieBudgetComponent`** (Exemple 1) — le planificateur de sortie famille : `participants`, `prixParPersonne`, `budgetMax` sont des `signal`, `total` et `message` sont des `computed`. C'est le premier écran interactif de TribuZen.

**`ListeParticipantsComponent`** (Exemple 2) — la liste nominative, mise à jour de façon immuable (`[...liste, x]`, `filter`), avec un `computed` `nombre` pour le badge de comptage.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-budget.component.ts       ← Exemple 1 (signal + computed)
        liste-participants.component.ts  ← Exemple 2 (update immuable)
```

> Le chargement des participants depuis l'API (au lieu de données en dur) relèvera de `resource` au **module 10** ; ici on reste sur l'état **local** en mémoire. Le rendu de la liste avec `@for` est le **module 03**.

---

## 6. Points clés

1. `signal(valeurInitiale)` crée un `WritableSignal<T>` : un conteneur réactif qui notifie Angular à chaque changement.
2. On lit un signal en **l'appelant** : `participants()` — les parenthèses sont obligatoires, dans le code comme dans le template.
3. `set(v)` pose une valeur absolue ; `update(fn)` calcule la nouvelle valeur à partir de l'ancienne.
4. `computed(() => ...)` dérive une valeur : **lecture seule**, **lazy**, **mémoïsée**, avec suivi automatique des dépendances.
5. Un `computed` n'a ni `set` ni `update` — pour le faire changer, on modifie ses signaux sources.
6. Pour les objets et tableaux, mettre à jour de façon **immuable** (nouvelle référence via spread/`map`/`filter`) — muter en place n'est pas détecté.
7. Si une valeur se calcule à partir d'autres signaux, c'est un `computed`, jamais un état recopié à la main.

---

## 7. Seeds Anki

```
Comment lit-on la valeur d'un signal Angular ?|En appelant le signal comme une fonction : participants(). Les parenthèses sont obligatoires, dans le code et dans le template ({{ participants() }}).
Quelle est la différence entre set() et update() sur un WritableSignal ?|set(v) pose une valeur absolue, indépendante de l'ancienne. update(fn) calcule la nouvelle valeur à partir de l'ancienne : update(n => n + 1).
Que renvoie signal(2) comme type ?|Un WritableSignal<number> — lisible par appel () et modifiable via set()/update(). Le type est inféré depuis la valeur initiale.
Quelles sont les trois propriétés d'un computed() ?|Lecture seule (pas de set/update), lazy (calculé au premier accès seulement), et mémoïsé (résultat caché tant qu'aucune dépendance ne change).
Pourquoi total.set(100) échoue-t-il sur un computed ?|Un computed renvoie un Signal en lecture seule, sans set ni update — c'est une erreur de compilation. On modifie ses signaux sources et il se recalcule tout seul.
Pourquoi membres().push('Bob') ne met-il pas à jour l'affichage ?|Un signal compare par référence. push mute le tableau en place sans changer la référence, donc Angular n'est pas notifié. Il faut update(liste => [...liste, 'Bob']).
Quand utiliser un computed plutôt qu'un recalcul dans un handler ?|Dès qu'une valeur se déduit d'autres signaux (total = participants * prix). Le computed se recalcule automatiquement et évite les oublis de synchronisation.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-02-signaux-base/README.md`. Construire le planificateur de budget TribuZen avec `signal` + `computed`, dev server Angular en oracle visuel — zéro gap-fill, corrigé commenté intégral.
