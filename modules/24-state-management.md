---
titre: State management — store service + signals vs NgRx SignalStore
cours: 03-angular
notions: ["store maison service + signal()", "signal() privé + asReadonly()", "computed() sélecteur dérivé", "actions = méthodes du service", "@ngrx/signals", "signalStore()", "withState()", "withComputed()", "withMethods()", "patchState()", "rxMethod() @ngrx/signals/rxjs-interop", "signalStore providedIn root", "matrice de décision service vs SignalStore vs NgRx Store"]
outcomes:
  - "sait construire un store maison avec un service @Injectable, des signal() privés exposés en asReadonly() et des méthodes comme actions"
  - "sait créer un store NgRx avec signalStore(), withState(), withComputed(), withMethods() et le rendre global avec providedIn root"
  - "sait modifier l'état d'un SignalStore de façon partielle et immuable avec patchState()"
  - "sait charger des données asynchrones dans un SignalStore avec rxMethod() ou une méthode async"
  - "sait choisir entre service + signals, NgRx SignalStore et NgRx Store classique selon l'équipe et la complexité"
prerequis: [modules 00-23, module 09 signaux-avances, module 11 services-et-injectable, module 16 rxjs-observables-et-operators]
next: 25-auth-jwt-guards
libs: [{ name: "@ngrx/signals", version: "19" }, { name: "@angular/core", version: "19" }]
tribuzen: store global TribuZen — SortieStore partagé (liste des sorties, filtre, chargement) migré du service maison vers NgRx SignalStore
last-reviewed: 2026-07
---

# State management — store service + signals vs NgRx SignalStore

> **Outcomes — tu sauras FAIRE :** monter un store maison (service + `signal` + `computed`), le réécrire en `signalStore()` avec `withState`/`withComputed`/`withMethods`, muter l'état avec `patchState()`, charger de l'async avec `rxMethod()`, et argumenter le choix service vs SignalStore.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **la gestion d'un état partagé de niveau application** : le pattern « store maison » (service + signals, déjà croisé au module 11) puis **NgRx SignalStore** (`signalStore`, `withState`, `withComputed`, `withMethods`, `patchState`, `rxMethod`), et la **matrice de décision** entre les deux (plus NgRx Store classique, cité pour situer). C'est tout. Les primitives `signal`/`computed`/`asReadonly` sont supposées acquises (**modules 02, 09**), l'injection de service aussi (**module 11**), et les opérateurs RxJS + `rxMethod` s'appuient sur RxJS (**modules 16-17**). Pas de HTTP nouveau ici — les appels réseau réutilisent le `SortieService` du **module 18**. L'auth et les guards sont le **module 25**.

## 1. Cas concret d'abord

TribuZen grandit. La **liste des sorties famille** n'est plus affichée dans un seul écran : le header montre un badge « 3 sorties à venir », la page « Mes sorties » affiche la liste filtrable, et un widget latéral montre la prochaine sortie. Trois composants, **un seul état** : la liste des sorties, le filtre courant, l'indicateur de chargement.

Un collègue a d'abord tout mis dans un service maison — exactement le pattern du module 11 :

```typescript
// sortie.store.ts — store maison (service + signals)
import { Injectable, inject, signal, computed } from '@angular/core';
import { SortieService, Sortie } from './sortie.service';

@Injectable({ providedIn: 'root' })
export class SortieStore {
  private api = inject(SortieService);

  // --- État privé : personne d'autre ne peut le muter ---
  private readonly _sorties = signal<Sortie[]>([]);
  private readonly _filtre = signal<'toutes' | 'a-venir'>('toutes');
  private readonly _chargement = signal(false);

  // --- Lecture publique : lecture seule ---
  readonly sorties = this._sorties.asReadonly();
  readonly filtre = this._filtre.asReadonly();
  readonly chargement = this._chargement.asReadonly();

  // --- Sélecteurs dérivés ---
  readonly sortiesFiltrees = computed(() =>
    this._filtre() === 'a-venir'
      ? this._sorties().filter(s => s.participants > 0)
      : this._sorties(),
  );
  readonly nbSorties = computed(() => this._sorties().length);

  // --- Actions : seul moyen de muter ---
  setFiltre(f: 'toutes' | 'a-venir'): void {
    this._filtre.set(f);
  }

  charger(): void {
    this._chargement.set(true);
    this.api.getAll().subscribe(liste => {
      this._sorties.set(liste);
      this._chargement.set(false);
    });
  }
}
```

Ça marche, c'est testable, et pour 70 % des projets ESN **on s'arrête là**. Mais quand l'équipe grossit, chaque store maison est écrit différemment : untel expose l'état en `readonly`, un autre le laisse public par erreur, un troisième oublie `asReadonly()`. **NgRx SignalStore** apporte la même chose avec une **structure imposée** : `withState` pour l'état, `withComputed` pour les sélecteurs, `withMethods` pour les actions. Ce module te donne les deux approches et le critère de choix.

---

## 2. Théorie complète, concise

### 2.1 Le store maison : un service + signals

Le pattern est celui du module 11, formalisé en « store » (l'équivalent Angular d'un Pinia maison) :

| Rôle | Outil | Convention |
|------|-------|-----------|
| État source | `signal<T>()` **privé** | `private readonly _x = signal(...)` |
| Lecture publique | `.asReadonly()` | `readonly x = this._x.asReadonly()` |
| Sélecteur dérivé | `computed()` | `readonly total = computed(() => ...)` |
| Action (mutation) | méthode publique | `ajouter(): void { this._x.update(...) }` |

Règle d'or : **l'état interne est privé**, les composants **lisent** via `asReadonly()` et **mutent** uniquement via les méthodes. C'est ce qui empêche un composant de casser l'état d'un autre.

### 2.2 NgRx SignalStore : la même chose, structurée

`@ngrx/signals` fournit `signalStore()`, une fonction qui **compose des features** (`withState`, `withComputed`, `withMethods`) et renvoie un **service injectable**. On l'installe :

```bash
npm install @ngrx/signals
```

```typescript
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { SortieService, Sortie } from './sortie.service';

type SortieState = {
  sorties: Sortie[];
  filtre: 'toutes' | 'a-venir';
  chargement: boolean;
};

const initialState: SortieState = {
  sorties: [],
  filtre: 'toutes',
  chargement: false,
};

export const SortieStore = signalStore(
  // Rend le store global — l'équivalent de providedIn: 'root' d'un service
  { providedIn: 'root' },

  // 1. État initial
  withState(initialState),

  // 2. Sélecteurs dérivés
  withComputed((store) => ({
    sortiesFiltrees: computed(() =>
      store.filtre() === 'a-venir'
        ? store.sorties().filter(s => s.participants > 0)
        : store.sorties(),
    ),
    nbSorties: computed(() => store.sorties().length),
  })),

  // 3. Actions — service injecté dans la factory
  withMethods((store, api = inject(SortieService)) => ({
    setFiltre(f: SortieState['filtre']): void {
      patchState(store, { filtre: f });
    },
    charger(): void {
      patchState(store, { chargement: true });
      api.getAll().subscribe(sorties =>
        patchState(store, { sorties, chargement: false }),
      );
    },
  })),
);
```

Chaque clé de `withState` devient **automatiquement un signal en lecture** sur le store : `store.sorties()`, `store.filtre()`, `store.chargement()`. Les `withComputed` ajoutent `store.sortiesFiltrees()`, `store.nbSorties()`. Les `withMethods` ajoutent les actions `store.setFiltre(...)`, `store.charger()`. **Aucun `signal()` ni `asReadonly()` à écrire à la main.**

### 2.3 La correspondance feature ↔ store maison

| Feature SignalStore | Ce qu'elle génère | Équivalent maison |
|---------------------|-------------------|-------------------|
| `signalStore({ providedIn: 'root' }, …)` | un service injectable global | `@Injectable({ providedIn: 'root' })` |
| `withState(initial)` | un signal lecture par clé | `private _x = signal(...)` + `asReadonly()` |
| `withComputed((store) => …)` | des `computed` exposés | `readonly x = computed(...)` |
| `withMethods((store) => …)` | des méthodes publiques | méthodes d'action |
| `patchState(store, partiel)` | MAJ partielle immuable | `_x.set()` / `_x.update()` |

### 2.4 `patchState()` — muter partiellement, immutablement

Dans un SignalStore, on **ne fait pas** `store.sorties.set(...)`. On passe par `patchState`, qui met à jour **seulement les clés fournies**, en laissant le reste intact (comme un `Object.assign` réactif).

```typescript
// Forme 1 — objet partiel : ne touche que `chargement`
patchState(store, { chargement: true });

// Forme 2 — updater : la nouvelle valeur dépend de l'ancien état
patchState(store, (state) => ({
  sorties: [...state.sorties, nouvelleSortie],
}));
```

La forme **updater** est l'équivalent de `signal.update()` : à utiliser dès que la nouvelle valeur se calcule à partir de l'ancienne (ajout à une liste, toggle). L'immuabilité reste obligatoire — on renvoie **un nouveau tableau/objet** (`[...state.sorties, x]`), jamais un `push` en place.

### 2.5 Charger de l'async : `rxMethod()` ou méthode `async`

Deux façons de brancher un appel réseau dans un store.

**Méthode `async`** (simple, sans RxJS) :

```typescript
withMethods((store, api = inject(SortieService)) => ({
  async chargerAsync(): Promise<void> {
    patchState(store, { chargement: true });
    const sorties = await firstValueFrom(api.getAll());
    patchState(store, { sorties, chargement: false });
  },
}))
```

**`rxMethod()`** (réactif, gère les flux entrants) — importé de `@ngrx/signals/rxjs-interop`. Il crée une méthode qui **prend un Observable/valeur en entrée** et applique un pipe RxJS. Idéal pour une recherche debouncée où chaque frappe relance un chargement :

```typescript
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

withMethods((store, api = inject(SortieService)) => ({
  rechercher: rxMethod<string>(
    pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => patchState(store, { chargement: true })),
      switchMap((q) =>
        api.getByQuery(q).pipe(
          tapResponse({
            next: (sorties) => patchState(store, { sorties }),
            error: console.error,
            finalize: () => patchState(store, { chargement: false }),
          }),
        ),
      ),
    ),
  ),
}))
```

`switchMap` annule la requête précédente si l'utilisateur tape encore — exactement le pattern d'annulation vu au module 17. On appelle ensuite `store.rechercher(query)` (valeur) ou `store.rechercher(querySignal)` (signal), et le store réagit.

### 2.6 Consommer un store dans un composant

Identique dans les deux mondes : c'est un service, on l'injecte avec `inject()` et on lit les signaux avec `()`.

```typescript
@Component({
  selector: 'app-mes-sorties',
  template: `
    <button (click)="store.setFiltre('a-venir')">À venir</button>
    <p>{{ store.nbSorties() }} sortie(s)</p>

    @if (store.chargement()) {
      <p>Chargement…</p>
    } @else {
      @for (s of store.sortiesFiltrees(); track s.id) {
        <li>{{ s.titre }} — {{ s.participants }} pers.</li>
      } @empty {
        <li>Aucune sortie.</li>
      }
    }
  `,
})
export class MesSortiesComponent {
  readonly store = inject(SortieStore);
  constructor() { this.store.charger(); }
}
```

Le composant ne sait même pas si `SortieStore` est un service maison ou un SignalStore — c'est la même surface d'API. C'est ce qui rend la **migration** de l'un vers l'autre indolore pour les consommateurs.

### 2.7 Quand choisir quoi — la matrice de décision

| Critère | Service + Signals | NgRx SignalStore | NgRx Store classique |
|---------|:-----------------:|:----------------:|:--------------------:|
| Taille d'équipe | 1-5 | 3-15 | 10+ |
| Complexité de l'état | faible-moyenne | moyenne-élevée | élevée |
| Conventions imposées | non | oui (features) | oui (actions/reducers) |
| Dépendance | aucune | `@ngrx/signals` | `@ngrx/store` |
| DevTools / time-travel | non | via NgRx Toolkit | oui (natif) |
| Boilerplate | minimal | modéré | élevé |
| Base réactive | signals | signals | RxJS |
| Part des projets ESN | ~70 % | ~20 % | ~10 % |

**Règle ESN** : commence **toujours** par le service + signals. Migre vers SignalStore **quand un vrai besoin apparaît** (équipe qui grossit, conventions à imposer, plusieurs stores à harmoniser) — pas pour un besoin hypothétique. Ne migre **jamais** un projet legacy NgRx Store qui fonctionne « pour moderniser » : le coût dépasse le bénéfice.

---

## 3. Worked examples

### Exemple 1 — `SortieStore` en NgRx SignalStore complet (TribuZen)

On reprend le cas concret et on livre le store global partagé par le header, la page et le widget.

```typescript
// sortie.store.ts — NgRx SignalStore
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

type SortieState = {
  sorties: Sortie[];
  filtre: 'toutes' | 'a-venir';
  chargement: boolean;
};

const initialState: SortieState = {
  sorties: [],
  filtre: 'toutes',
  chargement: false,
};

export const SortieStore = signalStore(
  { providedIn: 'root' },              // store global (singleton d'app)
  withState(initialState),

  withComputed((store) => ({
    // sélecteur dérivé : recalculé si sorties() OU filtre() change
    sortiesFiltrees: computed(() =>
      store.filtre() === 'a-venir'
        ? store.sorties().filter(s => s.participants > 0)
        : store.sorties(),
    ),
    nbSorties: computed(() => store.sorties().length),
  })),

  withMethods((store, api = inject(SortieService)) => ({
    setFiltre(f: SortieState['filtre']): void {
      patchState(store, { filtre: f });          // MAJ partielle : filtre seul
    },

    charger(): void {
      patchState(store, { chargement: true });
      api.getAll().subscribe(sorties =>
        patchState(store, { sorties, chargement: false }),
      );
    },

    ajouter(dto: CreateSortieDto): void {
      api.create(dto).subscribe(creee =>
        // updater : la nouvelle liste dérive de l'ancienne, immuablement
        patchState(store, (state) => ({ sorties: [...state.sorties, creee] })),
      );
    },

    supprimer(id: string): void {
      api.delete(id).subscribe(() =>
        patchState(store, (state) => ({
          sorties: state.sorties.filter(s => s.id !== id),
        })),
      );
    },
  })),
);
```

**Ce qu'on obtient sans l'écrire** : `store.sorties()`, `store.filtre()`, `store.chargement()` (générés par `withState`), plus `store.sortiesFiltrees()` et `store.nbSorties()` (générés par `withComputed`). Le header lit `store.nbSorties()`, la page lit `store.sortiesFiltrees()`, tous deux réagissent à la même source. Une seule instance (`providedIn: 'root'`) partagée partout.

### Exemple 2 — la migration service maison → SignalStore

L'intérêt : les composants ne changent quasiment pas. Voici le diff conceptuel côté store et côté consommateur.

```typescript
// AVANT — store maison (module 11)
@Injectable({ providedIn: 'root' })
export class SortieStore {
  private readonly _sorties = signal<Sortie[]>([]);
  readonly sorties = this._sorties.asReadonly();
  readonly nbSorties = computed(() => this._sorties().length);
  ajouter(s: Sortie): void { this._sorties.update(l => [...l, s]); }
}

// APRÈS — SignalStore : mêmes noms publics exposés
export const SortieStore = signalStore(
  { providedIn: 'root' },
  withState<{ sorties: Sortie[] }>({ sorties: [] }),
  withComputed((store) => ({
    nbSorties: computed(() => store.sorties().length),
  })),
  withMethods((store) => ({
    ajouter(s: Sortie): void {
      patchState(store, (state) => ({ sorties: [...state.sorties, s] }));
    },
  })),
);
```

```typescript
// Le composant est IDENTIQUE avant/après :
readonly store = inject(SortieStore);
// store.sorties()   → toujours là
// store.nbSorties() → toujours là
// store.ajouter(s)  → toujours là
```

La surface publique (`sorties`, `nbSorties`, `ajouter`) est conservée : `inject(SortieStore)` + `store.sorties()` fonctionnent à l'identique. Seule l'**implémentation interne** du store change. C'est pourquoi « commencer simple puis migrer » est un pari sûr.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Exposer un `signal` public modifiable dans un store maison

```typescript
// ❌ Signal public writable : n'importe quel composant peut écraser l'état
readonly sorties = signal<Sortie[]>([]);
// … ailleurs :
this.store.sorties.set([]);   // données perdues, aucune garde

// ✅ Signal privé + lecture seule
private readonly _sorties = signal<Sortie[]>([]);
readonly sorties = this._sorties.asReadonly();   // .set() n'existe plus côté public
```

Le point entier d'un store est de **centraliser les mutations**. Un signal public writable ruine cette garantie.

### PIÈGE #2 — Muter les signaux d'un SignalStore à la main

```typescript
// ❌ Les signaux de withState ne sont PAS writables de l'extérieur des méthodes
store.sorties.set([...]);          // erreur : pas de set exposé
store.sorties().push(nouvelle);    // mutation en place : ignorée (même référence)

// ✅ Toujours patchState, avec une NOUVELLE référence
patchState(store, (state) => ({ sorties: [...state.sorties, nouvelle] }));
```

`patchState` est le **seul** point d'écriture d'un SignalStore, et il faut lui passer des valeurs immuables.

### PIÈGE #3 — Croire que `patchState` remplace tout l'état

```typescript
// état courant : { sorties: [...], filtre: 'a-venir', chargement: false }

patchState(store, { chargement: true });
// ✅ résultat : { sorties: [...], filtre: 'a-venir', chargement: true }
//    sorties et filtre sont CONSERVÉS — patchState est partiel, pas un remplacement
```

`patchState` fait un merge de surface : les clés non citées restent intactes. Pas besoin de re-spécifier tout l'état (contrairement à un `set` sur un seul gros signal objet).

### PIÈGE #4 — Créer un store pour un état purement local

```typescript
// ❌ Un SignalStore (ou un service) pour un compteur utilisé dans UN seul composant
// → over-engineering : injection, feature, boilerplate pour rien

// ✅ État local à un composant = signal local, point
export class CompteurComponent {
  compte = signal(0);   // pas de store, pas d'injection
}
```

Un store sert à **partager** un état entre composants. Si l'état ne sort pas d'un composant, un `signal` local suffit.

### PIÈGE #5 — Choisir NgRx Store classique « parce que c'est Angular »

```
❌ « On fait de l'Angular donc on met du NgRx Store (actions/reducers/effects). »
   → Sur une app 2-5 devs, le boilerplate (3 fichiers par feature) coûte cher
     sans bénéfice : ni l'équipe ni la complexité ne le justifient.

✅ Décision par CONTEXTE : service+signals par défaut ; SignalStore si l'équipe
   grossit ou impose des conventions ; Store classique surtout en legacy déjà en place.
```

La bonne réponse en entretien commence toujours par « ça dépend du contexte », jamais par une techno imposée d'office.

### PIÈGE #6 — Confondre l'objet partiel et l'updater de `patchState`

```typescript
// L'objet partiel écrase la clé par une valeur ABSOLUE
patchState(store, { chargement: true });

// ❌ Pour dériver de l'ancien état, un objet partiel ne suffit pas :
patchState(store, { sorties: store.sorties() /* + ? */ });  // lourd et fragile

// ✅ Updater : reçoit l'état courant, renvoie le partiel dérivé
patchState(store, (state) => ({ sorties: [...state.sorties, nouvelle] }));
```

Objet partiel = « pose cette valeur » (comme `set`) ; updater `(state) => ({...})` = « dérive de l'existant » (comme `update`).

---

## 5. Ancrage TribuZen

Le **store global des sorties** est la couche d'état partagé d'application de TribuZen. Plusieurs écrans consomment la même liste, donc l'état ne peut plus vivre dans un composant : c'est un store injecté en `providedIn: 'root'`.

**`SortieStore`** (Exemple 1) — la liste des sorties, le filtre `toutes` / `à venir`, l'indicateur `chargement`, plus les sélecteurs `sortiesFiltrees` et `nbSorties`. Il s'appuie sur le `SortieService` du module 18 pour l'HTTP (le store ne parle jamais à `HttpClient` directement : il délègue au service, testable et remplaçable).

**Parcours de migration TribuZen** : on démarre le store en **service maison** (module 11) pour livrer vite. Quand la couche state se densifie (sorties + participants + budget + notifications = plusieurs stores à tenir cohérents), on migre `SortieStore` vers **NgRx SignalStore** pour uniformiser — sans toucher aux composants consommateurs (Exemple 2).

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie.service.ts   ← HTTP (module 18) — inchangé
        sortie.store.ts      ← store global : service maison, puis SignalStore
        mes-sorties.component.ts   ← inject(SortieStore), lit store.sortiesFiltrees()
      header/
        header.component.ts        ← inject(SortieStore), lit store.nbSorties()
```

> L'auth (attacher le JWT, protéger la route « Mes sorties » par un guard) est le **module 25** : le store ne gère pas l'auth, il consomme un `SortieService` déjà authentifié.

---

## 6. Points clés

1. Un **store** centralise un état **partagé** entre plusieurs composants ; l'état d'un seul composant reste un `signal` local, sans store.
2. **Store maison** = service `@Injectable` + `signal()` privés + `asReadonly()` en lecture + méthodes comme actions. Suffit pour ~70 % des projets ESN.
3. **NgRx SignalStore** = même pattern, **structure imposée** : `signalStore()` compose `withState` (état), `withComputed` (sélecteurs), `withMethods` (actions).
4. `withState` génère automatiquement un signal en lecture par clé (`store.x()`) ; aucun `asReadonly()` à écrire.
5. On mute un SignalStore **uniquement** avec `patchState(store, partiel)` — merge de surface, immuable. Updater `(state) => ({...})` pour dériver de l'ancien état.
6. Async dans un store : méthode `async` (simple) ou `rxMethod()` de `@ngrx/signals/rxjs-interop` (réactif, `switchMap` pour l'annulation).
7. Un store est un **service injectable** : `inject(SortieStore)` + `store.x()` — les composants ne voient pas la différence maison vs SignalStore, d'où une migration indolore.
8. Choix par **contexte** : service+signals par défaut ; SignalStore si équipe/conventions ; Store classique surtout en legacy. Commencer simple, migrer sur un vrai besoin.

---

## 7. Seeds Anki

```
Quels sont les 4 briques d'un store maison Angular (service + signals) ?|signal() privés pour l'état source, .asReadonly() pour la lecture publique, computed() pour les sélecteurs dérivés, et des méthodes publiques comme actions (seul moyen de muter).
Que génère withState(initialState) dans un signalStore() ?|Un signal en lecture pour chaque clé de l'objet : store.sorties(), store.filtre()… accessibles par appel (), sans écrire soi-même de signal() ni d'asReadonly().
À quoi servent withComputed et withMethods dans un SignalStore ?|withComputed((store) => ...) ajoute des sélecteurs dérivés (computed exposés) ; withMethods((store, dep = inject(...)) => ...) ajoute les actions, qui mutent via patchState.
Comment mute-t-on l'état d'un NgRx SignalStore ?|Uniquement avec patchState(store, partiel). Merge de surface immuable : seules les clés fournies changent, le reste est conservé. Jamais store.x.set().
Quelle est la différence entre patchState(store, {x: v}) et patchState(store, (state) => ({...})) ?|L'objet partiel pose une valeur absolue (comme set). L'updater reçoit l'état courant et renvoie le partiel dérivé (comme update) — pour ajouter à une liste immuablement : (state) => ({ sorties: [...state.sorties, x] }).
Comment charger de l'async dans un SignalStore ?|Soit une méthode async (await firstValueFrom(api.getAll()) puis patchState), soit rxMethod() de @ngrx/signals/rxjs-interop avec un pipe RxJS (debounceTime, switchMap, tapResponse) pour les flux réactifs annulables.
Quand choisir NgRx SignalStore plutôt qu'un service + signals ?|Quand l'équipe grossit (>5 devs), qu'on veut des conventions imposées ou plusieurs stores harmonisés. Sinon, service+signals suffit (~70% des projets ESN). Commencer simple, migrer sur un vrai besoin.
Pourquoi la migration service maison → SignalStore est-elle indolore pour les composants ?|Un SignalStore reste un service injectable avec la même surface publique : inject(Store) + store.x() marchent à l'identique. Seule l'implémentation interne change.
Pourquoi ne PAS créer un store pour un état local à un seul composant ?|C'est de l'over-engineering : injection, feature, boilerplate pour rien. Un store sert à partager l'état entre composants ; un état qui ne sort pas d'un composant est un signal local.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-24-state-management/README.md`. Construire le `SortieStore` global de TribuZen d'abord en service maison puis en NgRx SignalStore, `ng serve` + Network tab comme oracle — zéro gap-fill, corrigé commenté intégral et variante J+30 avec `rxMethod`.
