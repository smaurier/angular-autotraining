---
titre: RxJS patterns et interop signals — Subject, toSignal(), toObservable(), error handling
cours: 03-angular
notions:
  - Subject (multicast, à chaud, sans valeur initiale)
  - BehaviorSubject (valeur initiale, getValue(), rejoue la dernière valeur)
  - "next() / asObservable() pour publier un flux"
  - "toSignal() de @angular/core/rxjs-interop (Observable vers Signal)"
  - "toObservable() (Signal vers Observable)"
  - "options toSignal : initialValue et requireSync"
  - contexte d'injection obligatoire pour toSignal/toObservable
  - takeUntilDestroyed() pour le désabonnement automatique
  - catchError (interception, Observable de secours)
  - retry et retry({ count, delay }) avec backoff exponentiel
  - ordre retry avant catchError dans le pipe
  - pattern façade — RxJS en interne, signals exposés aux composants
outcomes:
  - sait publier un flux d'événements applicatif avec Subject et un état partagé avec BehaviorSubject
  - "sait convertir un Observable en signal avec toSignal() (initialValue / requireSync) et un signal en Observable avec toObservable()"
  - sait couper proprement une souscription longue avec takeUntilDestroyed()
  - sait récupérer une erreur de flux avec catchError et réessayer avec retry, dans le bon ordre
  - sait structurer un service en façade — logique RxJS interne, signals exposés au template
prerequis:
  - "modules 00-15 (standalone, signaux, computed, control flow, DI, services, routing)"
  - "module 16 rxjs-observables-et-operators (Observable, subscribe, pipe, map/filter, switchMap, debounceTime)"
next: 18-http-crud-interceptors-cache
libs: [{ name: "@angular/core", version: "19" }, { name: "rxjs", version: "7" }]
tribuzen: front-office TribuZen — flux de recherche d'activités et filtre de catégorie du planificateur, état partagé via service RxJS exposé en signals
last-reviewed: 2026-07
---

# RxJS patterns et interop signals — `Subject`, `toSignal()`, `toObservable()`, error handling

> **Outcomes — tu sauras FAIRE :** publier un flux avec `Subject`/`BehaviorSubject`, faire le pont Observable ↔ signal avec `toSignal()`/`toObservable()`, couper avec `takeUntilDestroyed()`, et récupérer une erreur avec `catchError`/`retry`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **trois briques** : (1) les *Subjects* comme sources de flux que tu contrôles, (2) l'*interop* entre signals et Observables (`@angular/core/rxjs-interop`), (3) l'*error handling* d'un flux (`catchError`, `retry`). Les Observables, `subscribe`, `pipe`, `map`/`filter`, `switchMap`, `debounceTime` sont **acquis au module 16** — on les *utilise* ici sans les réexpliquer. Le vrai `HttpClient`, les intercepteurs et le cache sont le **module 18** (`next`) : ici les sources async sont **simulées** avec `of(...).pipe(delay(...))` pour rester exécutable sans backend. Le marble testing avec `TestScheduler` relève du module tests (23).

## 1. Cas concret d'abord

Deuxième écran interactif de TribuZen : le **planificateur d'activités**. En haut, un filtre par catégorie (`Nature`, `Culture`, `Sport`). Quand la famille choisit une catégorie, la liste d'activités doit se recharger. Deux exigences côté produit :

- **temporiser** : si on clique vite sur trois catégories, on ne veut pas trois chargements — on veut le dernier, et on veut annuler les chargements obsolètes ;
- **partager** : le fil d'Ariane (breadcrumb) et la liste doivent tous les deux réagir au même changement de catégorie, sans se connaître.

Un collègue a démarré avec un simple signal de catégorie :

```typescript
// activites.service.ts — AVANT (signal seul, pas d'orchestration temporelle)
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActivitesService {
  readonly categorie = signal<'nature' | 'culture' | 'sport'>('nature');

  choisir(cat: 'nature' | 'culture' | 'sport') {
    this.categorie.set(cat);   // ← comment déclencher un rechargement debouncé + annulé ?
  }
}
```

Le problème : un signal répond à *« quelle est la valeur maintenant ? »*, pas à *« que s'est-il passé au fil du temps ? »*. Il n'a ni `debounceTime`, ni `switchMap` pour annuler une requête obsolète, ni de notion de « suite d'événements » à diffuser. Ces questions temporelles, c'est le terrain de **RxJS**.

La bonne architecture, celle attendue en ESN : le service pilote un **flux** en interne (un `Subject`/`BehaviorSubject` traversé par des opérateurs) et **expose des signals** au template via `toSignal()`. Les composants restent simples (ils lisent des signals), la logique temporelle reste dans le service. Ce module te donne les trois briques pour ça.

---

## 2. Théorie complète, concise

### 2.1 `Subject` — un Observable que **tu** pilotes

Un `Observable` classique est *froid* : il produit ses valeurs pour chaque abonné, à partir de sa fonction source. Un `Subject` est différent : c'est à la fois un **Observable** (on peut s'y abonner) **et** un **Observer** (on y pousse des valeurs avec `next()`). Il est *multicast* : tous les abonnés reçoivent la **même** émission au même moment.

```typescript
import { Subject } from 'rxjs';

const clics$ = new Subject<string>();

clics$.subscribe(v => console.log('A reçoit', v));
clics$.subscribe(v => console.log('B reçoit', v));

clics$.next('nature');   // A reçoit nature  /  B reçoit nature  (multicast)
```

Trois traits vérifiés d'un `Subject` :

- **pas de valeur initiale** : un abonné ne reçoit que les valeurs émises **après** son abonnement ;
- **à chaud (hot)** : il émet indépendamment des abonnés — une valeur poussée sans abonné est perdue ;
- **méthodes d'émission** : `next(v)`, `error(e)`, `complete()`.

Usage typique : un **bus d'événements** (une action utilisateur, une notification) que plusieurs endroits écoutent.

### 2.2 `BehaviorSubject` — un `Subject` avec **état**

`BehaviorSubject<T>` est un `Subject` qui **exige une valeur initiale** et **rejoue toujours sa dernière valeur** à tout nouvel abonné. C'est le bon choix pour représenter un **état courant** (le filtre actif, le thème, l'utilisateur connecté).

```typescript
import { BehaviorSubject } from 'rxjs';

const categorie$ = new BehaviorSubject<string>('nature');   // valeur initiale obligatoire

categorie$.subscribe(v => console.log('abonné tardif reçoit', v)); // reçoit 'nature' tout de suite

categorie$.next('culture');            // les abonnés reçoivent 'culture'
console.log(categorie$.getValue());    // 'culture' — lecture synchrone de la valeur courante
```

Différence clé avec `Subject` : `BehaviorSubject` a une **valeur à tout instant** (`getValue()`) et **replaye** la dernière au nouvel abonné. C'est exactement ce qui permet de le convertir en signal *synchrone* (voir `requireSync`, §2.4).

| | valeur initiale | rejoue la dernière | `getValue()` |
|---|---|---|---|
| `Subject` | non | non | non |
| `BehaviorSubject` | oui (obligatoire) | oui | oui |

### 2.3 Encapsuler : `next()` en interne, `asObservable()` en lecture seule

On garde le `Subject` **privé** et on n'expose qu'une vue lecture seule avec `asObservable()`, pour empêcher l'extérieur d'appeler `next()` n'importe où.

```typescript
private categorieSubject = new BehaviorSubject<string>('nature');

// lecture seule pour l'extérieur : pas de next() accessible
readonly categorie$ = this.categorieSubject.asObservable();

choisir(cat: string) {
  this.categorieSubject.next(cat);   // seule la façade décide QUAND émettre
}
```

### 2.4 `toSignal()` — Observable → signal

`toSignal()` (importé de `@angular/core/rxjs-interop`) s'abonne à un Observable et renvoie un **signal** qui contient sa dernière valeur. Fini le `subscribe` manuel et le `async` pipe dans le template : on lit `mesData()` comme n'importe quel signal.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

readonly categorie = toSignal(this.categorie$, { initialValue: 'nature' });
// dans le template : {{ categorie() }}
```

Deux options vérifiées pilotent le **type** du signal :

- **`initialValue: v`** → le signal vaut `v` avant la première émission. Type : `Signal<T>`.
- **rien** → le signal vaut `undefined` avant la première émission. Type : `Signal<T | undefined>`.
- **`requireSync: true`** → promet qu'une valeur est émise **synchroniquement** à l'abonnement (vrai pour un `BehaviorSubject` ou `of(...)`). Type : `Signal<T>` sans `undefined`, et **sans** `initialValue`. Si aucune valeur ne vient de façon synchrone, Angular lève une erreur.

```typescript
// BehaviorSubject : valeur dispo immédiatement → requireSync convient
readonly categorie = toSignal(this.categorieSubject, { requireSync: true }); // Signal<string>

// source asynchrone → initialValue pour éviter undefined
readonly activites = toSignal(this.activites$, { initialValue: [] });        // Signal<Activite[]>
```

Deux règles vérifiées à retenir :

1. **`toSignal()` doit être appelé dans un contexte d'injection** (champ de classe, constructeur). Il se **désabonne tout seul** quand le composant/service est détruit — c'est là son gros intérêt vs `subscribe` manuel.
2. **Jamais dans un `computed()`** (ni dans un `effect`) : `toSignal` a un effet de bord (il s'abonne). Angular lève l'erreur **NG0602**. On appelle `toSignal` en **champ de classe**, puis on le lit dans le `computed`.

```typescript
// ❌ NG0602 — toSignal (side-effect) dans un contexte réactif
resultat = computed(() => toSignal(this.data$)());

// ✅ toSignal en champ, lu dans le computed
private data = toSignal(this.data$, { initialValue: [] });
resultat = computed(() => this.data().length);
```

### 2.5 `toObservable()` — signal → Observable

Le pont inverse : `toObservable()` transforme un **signal** en Observable qui émet à chaque changement du signal. Utile quand on a un état en signal mais qu'on a besoin d'opérateurs RxJS (`debounceTime`, `switchMap`…) que les signals n'offrent pas.

```typescript
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';

readonly terme = signal('');   // état de recherche, piloté par le template

// signal → Observable → opérateurs temporels → signal
readonly resultats = toSignal(
  toObservable(this.terme).pipe(
    debounceTime(300),
    switchMap(t => this.rechercher(t)),   // annule la recherche obsolète (vu au module 16)
  ),
  { initialValue: [] },
);
```

Deux points vérifiés : `toObservable()` est adossé à un `ReplaySubject(1)` (le nouvel abonné reçoit la dernière valeur du signal) et s'appuie sur un `effect` interne — il doit donc, lui aussi, être appelé dans un **contexte d'injection**.

### 2.6 `takeUntilDestroyed()` — couper une souscription longue

Quand on `subscribe` soi-même à un flux **infini** (`interval`, un `Subject` applicatif), il faut se désabonner à la destruction, sinon fuite mémoire. `takeUntilDestroyed()` remplace l'ancien trio `destroy$` + `takeUntil` + `ngOnDestroy`.

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// ✅ dans le constructeur (contexte d'injection) : aucun argument
constructor() {
  interval(1000)
    .pipe(takeUntilDestroyed())
    .subscribe(n => this.tick.set(n));
}
```

Hors constructeur (ex. dans `ngOnInit`), on n'est plus dans le contexte d'injection : il faut passer un `DestroyRef` injecté.

```typescript
import { DestroyRef, inject } from '@angular/core';

private destroyRef = inject(DestroyRef);

ngOnInit() {
  interval(1000)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(n => this.tick.set(n));
}
```

> Note : quand tu utilises `toSignal()`, tu n'as **pas** besoin de `takeUntilDestroyed()` — `toSignal` gère déjà le désabonnement. `takeUntilDestroyed()` sert quand tu fais un `subscribe` **manuel**.

### 2.7 `catchError` — intercepter et récupérer

Une erreur dans un flux le **termine** définitivement : plus aucune valeur ne suivra. `catchError` intercepte l'erreur et la **remplace par un Observable de secours**, ce qui permet au flux aval de continuer.

```typescript
import { of } from 'rxjs';
import { catchError } from 'rxjs';

this.rechercher(terme).pipe(
  catchError(err => {
    console.error('Recherche indisponible :', err);
    return of([]);            // valeur de secours — DOIT être un Observable, pas un tableau brut
  }),
).subscribe(res => this.resultats.set(res));
```

Trois points vérifiés :

- `catchError` **doit retourner un Observable** (`of(...)`, `EMPTY`, un autre flux) — pas une valeur nue ;
- il **remplace** le flux en erreur ; le pipeline aval reçoit les valeurs de secours ;
- pour **logguer puis propager** l'erreur, on renvoie `throwError(() => err)`.

### 2.8 `retry` — réessayer, et **l'ordre qui compte**

`retry(n)` se **réabonne** à la source jusqu'à `n` fois en cas d'erreur. En production on l'assortit d'un délai croissant (**backoff exponentiel**) pour ne pas marteler le serveur.

```typescript
import { timer, of, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs';

this.rechercher(terme).pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      if (error.status >= 400 && error.status < 500) {
        return throwError(() => error);   // 4xx : inutile de réessayer, on abandonne
      }
      return timer(Math.pow(2, retryCount - 1) * 1000);  // 1s, 2s, 4s (5xx / réseau)
    },
  }),
  catchError(() => of([])),               // toutes les tentatives ont échoué
).subscribe(res => this.resultats.set(res));
```

**Ordre non négociable : `retry` AVANT `catchError`.** Si `catchError` est placé en premier, il intercepte l'erreur et la remplace par le flux de secours ; `retry` ne voit alors **jamais** d'erreur et ne réessaie pas. Le `pipe()` se lit de haut en bas.

### 2.9 Le pattern façade — RxJS interne, signals exposés

La synthèse du module, et le pattern attendu en ESN : le service orchestre en RxJS (Subject + opérateurs), mais **n'expose que des signals** au template. Les composants ne voient jamais un Observable.

```typescript
@Injectable({ providedIn: 'root' })
export class ActivitesService {
  // --- interne : RxJS ---
  private categorieSubject = new BehaviorSubject<string>('nature');

  private activites$ = this.categorieSubject.pipe(
    switchMap(cat => this.charger(cat).pipe(
      retry({ count: 2, delay: () => timer(1000) }),
      catchError(() => of([])),
    )),
  );

  // --- exposé : signals ---
  readonly categorie = toSignal(this.categorieSubject, { requireSync: true });
  readonly activites = toSignal(this.activites$, { initialValue: [] });
  readonly nombre = computed(() => this.activites().length);

  // --- action ---
  choisir(cat: string) { this.categorieSubject.next(cat); }

  private charger(cat: string) { /* module 18 : vrai HttpClient */ return of([]); }
}
```

---

## 3. Worked examples

### Exemple 1 — filtre de catégorie (façade `Subject` → signals), TribuZen

On reprend le cas concret et on le rend complet. La source `charger()` est **simulée** avec `of(...).pipe(delay())` — au module 18, elle deviendra un vrai `this.http.get(...)`, le reste du service ne bougera pas.

```typescript
// activites.service.ts — façade RxJS interne, signals exposés
import { Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of, timer } from 'rxjs';
import { switchMap, delay, retry, catchError } from 'rxjs';

export interface Activite { id: string; nom: string; categorie: Categorie; }
export type Categorie = 'nature' | 'culture' | 'sport';

// Données en dur — simulent la base ; module 18 = vrai backend
const BASE: Activite[] = [
  { id: 'a1', nom: 'Rando cascade',   categorie: 'nature'  },
  { id: 'a2', nom: 'Musée des sciences', categorie: 'culture' },
  { id: 'a3', nom: 'Accrobranche',    categorie: 'nature'  },
  { id: 'a4', nom: 'Tournoi de foot', categorie: 'sport'   },
];

@Injectable({ providedIn: 'root' })
export class ActivitesService {
  // BehaviorSubject : état "catégorie active", valeur initiale obligatoire
  private categorieSubject = new BehaviorSubject<Categorie>('nature');

  // Flux interne : à chaque catégorie, on (re)charge, avec retry + secours
  private activites$ = this.categorieSubject.pipe(
    switchMap(cat => this.charger(cat).pipe(  // switchMap : annule le chargement obsolète
      retry({ count: 2, delay: () => timer(500) }), // 2 essais avant d'abandonner
      catchError(() => of([] as Activite[])),        // secours : liste vide, l'app ne casse pas
    )),
  );

  // Exposé au template — que des signals
  // requireSync : le BehaviorSubject émet 'nature' de façon synchrone → pas d'undefined
  readonly categorie = toSignal(this.categorieSubject, { requireSync: true });
  // source asynchrone (delay) → initialValue obligatoire
  readonly activites = toSignal(this.activites$, { initialValue: [] });
  readonly nombre = computed(() => this.activites().length);

  // Action publique — seule porte pour changer l'état
  choisir(cat: Categorie) {
    this.categorieSubject.next(cat);
  }

  // Source async SIMULÉE (module 18 : remplacée par this.http.get)
  private charger(cat: Categorie) {
    return of(BASE.filter(a => a.categorie === cat)).pipe(delay(300));
  }
}
```

```typescript
// planificateur.component.ts — le composant ne voit QUE des signals
import { Component, inject } from '@angular/core';
import { ActivitesService, Categorie } from './activites.service';

@Component({
  selector: 'app-planificateur',
  template: `
    <h2>Activités ({{ svc.nombre() }})</h2>

    <div class="filtres">
      @for (c of categories; track c) {
        <button
          [class.actif]="svc.categorie() === c"
          (click)="svc.choisir(c)">
          {{ c }}
        </button>
      }
    </div>

    <ul>
      @for (a of svc.activites(); track a.id) {
        <li>{{ a.nom }}</li>
      } @empty {
        <li>Aucune activité dans cette catégorie.</li>
      }
    </ul>
  `,
})
export class PlanificateurComponent {
  readonly svc = inject(ActivitesService);
  readonly categories: Categorie[] = ['nature', 'culture', 'sport'];
}
```

**Ce qui se passe au clic** : `choisir('sport')` appelle `next('sport')` sur le `BehaviorSubject` → `switchMap` **annule** le chargement précédent et lance `charger('sport')` → au retour, `activites$` émet → `toSignal` met à jour le signal `activites` → le template se re-rend. Le composant n'a écrit **aucun** `subscribe`, aucun `unsubscribe`.

### Exemple 2 — recherche instantanée (`toObservable` + error handling), TribuZen

La barre de recherche du planificateur : l'utilisateur tape, on veut débouncer, annuler les recherches obsolètes, et **ne pas casser** si la source échoue. On croise ici `distinctUntilChanged()` : cet opérateur **ignore deux valeurs successives identiques** — si l'utilisateur retape le même terme (ou revient dessus après un espace supprimé), aucune nouvelle requête n'est déclenchée.

```typescript
// recherche.component.ts
import { Component, signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, retry, catchError, delay } from 'rxjs';
import { ActivitesService, Activite } from './activites.service';

@Component({
  selector: 'app-recherche',
  template: `
    <input
      [value]="terme()"
      (input)="terme.set($any($event.target).value)"
      placeholder="Rechercher une activité (min. 2 car.)" />

    @if (erreur()) {
      <p class="erreur">Recherche indisponible, réessaie plus tard.</p>
    }

    <ul>
      @for (a of resultats(); track a.id) {
        <li>{{ a.nom }}</li>
      } @empty {
        <li>Aucun résultat.</li>
      }
    </ul>
  `,
})
export class RechercheComponent {
  private svc = inject(ActivitesService);

  // État de saisie, piloté par le template : un signal
  readonly terme = signal('');
  readonly erreur = signal(false);

  // signal → Observable pour accéder aux opérateurs temporels, puis retour en signal
  readonly resultats = toSignal(
    toObservable(this.terme).pipe(
      debounceTime(300),                       // attend 300 ms de silence
      distinctUntilChanged(),                  // ignore une saisie identique
      filter(t => t.length >= 2),              // minimum 2 caractères
      switchMap(t =>                           // annule la recherche précédente
        this.rechercher(t).pipe(
          retry({ count: 2, delay: () => timer(500) }),  // retry AVANT catchError
          catchError(() => {                   // toutes les tentatives ont échoué
            this.erreur.set(true);
            return of([] as Activite[]);       // secours : pas de crash du flux
          }),
        ),
      ),
    ),
    { initialValue: [] as Activite[] },
  );

  // Source SIMULÉE (module 18 : this.http.get avec ?q=terme)
  private rechercher(terme: string) {
    this.erreur.set(false);
    return of([{ id: 'r1', nom: `Résultat pour "${terme}"`, categorie: 'nature' as const }])
      .pipe(delay(200));
  }
}
```

**Points clés du corrigé** : `terme` est un **signal** (le template le pilote naturellement) ; `toObservable(terme)` ouvre l'accès à `debounceTime`/`switchMap` ; `switchMap` garantit qu'une frappe rapide n'affiche jamais un résultat périmé ; `retry` est **avant** `catchError` ; et le tout revient en signal via `toSignal` — zéro `subscribe`, zéro fuite.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `Subject` vs `BehaviorSubject` : l'abonné tardif ne reçoit rien

```typescript
const s = new Subject<string>();
s.next('nature');                       // aucun abonné → valeur PERDUE
s.subscribe(v => console.log(v));       // ne recevra 'nature' JAMAIS

const b = new BehaviorSubject<string>('nature');
b.subscribe(v => console.log(v));       // reçoit 'nature' tout de suite (rejeu)
```

Pour un **état** (filtre actif, thème, user), utilise **`BehaviorSubject`** : il a une valeur à tout instant et la rejoue. `Subject` est pour un **événement ponctuel** sans mémoire.

### PIÈGE #2 — `toSignal()` dans un `computed()` (NG0602)

```typescript
// ❌ toSignal est un side-effect (il s'abonne) → interdit dans un contexte réactif
resultat = computed(() => toSignal(this.data$)());   // NG0602

// ✅ toSignal en champ de classe, lu ensuite dans le computed
private data = toSignal(this.data$, { initialValue: [] });
resultat = computed(() => this.data().length);
```

`toSignal`/`toObservable` s'appellent **une fois**, en champ ou dans le constructeur — jamais dans un `computed`/`effect`.

### PIÈGE #3 — `catchError` qui retourne une valeur nue

```typescript
// ❌ catchError doit retourner un OBSERVABLE, pas un tableau
source$.pipe(catchError(() => []));         // type invalide / comportement cassé

// ✅ on emballe la valeur de secours dans of(...)
source$.pipe(catchError(() => of([])));
```

`of(valeur)` transforme une valeur en Observable qui l'émet puis complète.

### PIÈGE #4 — `catchError` avant `retry`

```typescript
// ❌ catchError intercepte l'erreur AVANT retry → retry ne réessaie jamais
source$.pipe(
  catchError(() => of([])),
  retry(3),
);

// ✅ retry d'abord (réessaie), catchError ensuite (secours final)
source$.pipe(
  retry(3),
  catchError(() => of([])),
);
```

Le `pipe()` se lit de haut en bas : `retry` doit voir l'erreur en premier.

### PIÈGE #5 — `requireSync` sur une source asynchrone

```typescript
// ❌ la source a un delay → aucune valeur synchrone → Angular lève une erreur au démarrage
readonly activites = toSignal(this.activites$, { requireSync: true });

// ✅ source async → initialValue ; requireSync réservé aux sources synchrones (BehaviorSubject, of)
readonly activites = toSignal(this.activites$, { initialValue: [] });
```

`requireSync: true` **promet** une émission synchrone. Un `BehaviorSubject` ou `of(x)` la tiennent ; un flux avec `delay`/HTTP, non.

### PIÈGE #6 — `subscribe` manuel sans `takeUntilDestroyed()`

```typescript
// ❌ interval infini, jamais coupé → fuite mémoire après destruction du composant
ngOnInit() { interval(1000).subscribe(n => this.tick.set(n)); }

// ✅ coupe à la destruction (DestroyRef hors constructeur)
private destroyRef = inject(DestroyRef);
ngOnInit() {
  interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(n => this.tick.set(n));
}
```

Rappel : avec `toSignal()` tu n'as pas ce souci (désabonnement géré). Le piège concerne les `subscribe` manuels.

---

## 5. Ancrage TribuZen

Ce module câble la **couche de flux applicatif** du front-office TribuZen : tout ce qui est « au fil du temps » (recherche, filtre, événements partagés) passe par RxJS **en interne**, mais le template ne consomme que des **signals**.

**`ActivitesService`** (Exemple 1) — le cœur du planificateur : un `BehaviorSubject<Categorie>` porte le filtre actif, un pipeline `switchMap` + `retry` + `catchError` charge les activités, et `toSignal()` publie `categorie`, `activites`, `nombre` aux composants. C'est le patron de tous les services de flux TribuZen.

**`RechercheComponent`** (Exemple 2) — la barre de recherche : `signal` de saisie → `toObservable` → `debounceTime`/`switchMap` → `toSignal`, avec `catchError` qui allume un signal `erreur` sans casser le flux.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      activites/
        activites.service.ts        ← Exemple 1 (façade BehaviorSubject → signals)
        planificateur.component.ts  ← consomme les signals du service
        recherche.component.ts      ← Exemple 2 (toObservable + error handling)
```

> Aujourd'hui `charger()`/`rechercher()` sont **simulées** (`of(...).pipe(delay())`). Au **module 18**, elles deviennent de vrais `this.http.get(...)` : la structure du service (Subject, opérateurs, `toSignal`) ne change **pas** — seule la source async est remplacée. C'est tout l'intérêt de la façade.

---

## 6. Points clés

1. `Subject` = Observable **+** Observer, multicast, sans valeur initiale : pour un **événement** ponctuel diffusé.
2. `BehaviorSubject` = `Subject` avec **valeur initiale**, qui **rejoue** sa dernière valeur et expose `getValue()` : pour un **état**.
3. On garde le Subject **privé** et on expose `asObservable()` ; seule la façade appelle `next()`.
4. `toSignal(obs$, opts)` convertit un Observable en signal et **se désabonne seul** ; `initialValue` pour une source async, `requireSync: true` pour une source synchrone (`BehaviorSubject`, `of`).
5. `toSignal`/`toObservable` s'appellent en **contexte d'injection** et **jamais** dans un `computed`/`effect` (NG0602).
6. `toObservable(sig)` transforme un signal en Observable pour accéder aux opérateurs temporels (`debounceTime`, `switchMap`).
7. `takeUntilDestroyed()` coupe un `subscribe` **manuel** à la destruction (`DestroyRef` hors constructeur) ; inutile avec `toSignal`.
8. `catchError` renvoie un **Observable** de secours ; `retry` se réabonne ; **`retry` toujours avant `catchError`** dans le pipe.
9. Pattern façade ESN : RxJS **en interne** (Subject + opérateurs), **signals exposés** au template.

---

## 7. Seeds Anki

```
Quelle différence entre Subject et BehaviorSubject ?|BehaviorSubject exige une valeur initiale, rejoue toujours sa dernière valeur à tout nouvel abonné et expose getValue(). Subject n'a pas de valeur initiale et un abonné tardif ne reçoit que les émissions postérieures à son abonnement. BehaviorSubject = état ; Subject = événement ponctuel.
À quoi sert toSignal() et où doit-il être appelé ?|toSignal() (de @angular/core/rxjs-interop) convertit un Observable en signal et se désabonne automatiquement. Il doit être appelé dans un contexte d'injection (champ de classe ou constructeur) et JAMAIS dans un computed/effect (erreur NG0602).
Quand utiliser initialValue vs requireSync dans toSignal() ?|initialValue: v pour une source ASYNCHRONE (le signal vaut v avant la première émission). requireSync: true quand la source émet de façon SYNCHRONE à l'abonnement (BehaviorSubject, of) — le type n'inclut pas undefined, et on n'utilise pas initialValue.
À quoi sert toObservable() ?|toObservable(signal) transforme un signal en Observable qui émet à chaque changement, pour accéder aux opérateurs RxJS temporels (debounceTime, switchMap) que les signals n'offrent pas. À appeler en contexte d'injection.
Pourquoi retry doit-il être placé avant catchError dans un pipe ?|Le pipe se lit de haut en bas. Si catchError est avant, il intercepte l'erreur et la remplace par le flux de secours : retry ne voit jamais d'erreur et ne réessaie pas. Ordre correct : retry (réessaie) puis catchError (secours final).
Que doit retourner la fonction passée à catchError ?|Un Observable, pas une valeur brute. On emballe la valeur de secours avec of(...) : catchError(() => of([])). Pour logguer puis propager, on renvoie throwError(() => err).
Quand a-t-on besoin de takeUntilDestroyed() ?|Pour un subscribe MANUEL à un flux long/infini (interval, Subject applicatif), afin de couper à la destruction et éviter la fuite mémoire. Dans le constructeur : sans argument ; ailleurs : takeUntilDestroyed(inject(DestroyRef)). Inutile avec toSignal (désabonnement déjà géré).
Décris le pattern façade RxJS/signals attendu en ESN.|Le service orchestre en RxJS en interne (BehaviorSubject + switchMap/retry/catchError) et expose UNIQUEMENT des signals au template via toSignal(). Les composants lisent des signals, sans subscribe ni async pipe ; la logique temporelle reste dans le service.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-17-rxjs-patterns-et-interop-signals/README.md`. Construire la façade `ActivitesService` (BehaviorSubject → signals) et la recherche débouncée (`toObservable` + `catchError`), Angular CLI + `ng serve` en oracle visuel — corrigé commenté intégral, zéro gap-fill.
