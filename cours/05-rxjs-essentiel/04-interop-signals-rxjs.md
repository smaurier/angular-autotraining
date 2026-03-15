# Cours 24 — Interoperabilite Signals et RxJS

> **Objectif** : Maîtriser le pont entre Signals et RxJS avec `toSignal()`, `toObservable()` et `takeUntilDestroyed()`. Savoir quand utiliser l'un ou l'autre grâce à une matrice de decision. Appliquer le pattern : service RxJS interne, Signals exposes aux composants.

---

## Rappel du cours précédent

<details>
<summary>1. Quel est le trio d'operateurs pour une recherche avec debounce ?</summary>

`debounceTime(300)` + `distinctUntilChanged()` + `switchMap(terme => ...)`. On y ajoute souvent un `filter` pour exiger un nombre minimum de caracteres.
</details>

<details>
<summary>2. Pourquoi switchMap empeche-t-il les race conditions ?</summary>

`switchMap` **annule** automatiquement la souscription a l'Observable interne précédent quand une nouvelle emission arrive. Ainsi, seule la dernière requête aboutit, pas une requête ancienne qui serait plus lente.
</details>

<details>
<summary>3. Quelle est la différence entre forkJoin et combineLatest pour des requêtes paralleles ?</summary>

`forkJoin` attend que **toutes** les sources completent et emet une seule fois les dernières valeurs. `combineLatest` emet a **chaque** nouvelle emission, ce qui est plus adapte pour des flux continus (paramètres de route, filtres).
</details>

---

## Analogie

Imaginez un **traducteur bilingue** dans une reunion internationale :

- **toSignal()** : traduit le flux RxJS (anglais) en Signal (français) pour que vos composants Angular le comprennent directement.
- **toObservable()** : traduit un Signal (français) en flux RxJS (anglais) pour pouvoir le combiner avec d'autres flux, appliquer des operateurs, etc.
- **takeUntilDestroyed()** : le traducteur sait quand la reunion est terminee et arrete automatiquement de traduire.

Les deux langues sont utiles. Le traducteur permet de passer de l'une a l'autre sans friction.

---

## Théorie

### toSignal() : Observable → Signal

`toSignal()` convertit un Observable en Signal, ce qui permet de l'utiliser directement dans les templates sans `subscribe` ni `async` pipe.

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

interface Produit {
  id: number;
  nom: string;
  prix: number;
}

@Component({
  selector: 'app-catalogue',
  template: `
    @if (produits()) {
      <ul>
        @for (p of produits(); track p.id) {
          <li>{{ p.nom }} — {{ p.prix }} EUR</li>
        }
      </ul>
    } @else {
      <p>Chargement...</p>
    }
  `,
})
export class CatalogueComponent {
  private http = inject(HttpClient);

  // ✅ L'Observable HTTP est converti en Signal
  readonly produits = toSignal(
    this.http.get<Produit[]>('/api/produits'),
    { initialValue: undefined }
  );
}
```

**Options de `toSignal()`** :

```typescript
// Avec valeur initiale (le type du signal inclut la valeur initiale)
const users = toSignal(users$, { initialValue: [] });
// Type : Signal<User[]>

// Sans valeur initiale (le signal peut etre undefined)
const users = toSignal(users$);
// Type : Signal<User[] | undefined>

// requireSync : pour les Observables qui emettent de maniere synchrone
const count = toSignal(of(42), { requireSync: true });
// Type : Signal<number> (pas undefined)
```

```typescript
// ❌ Mauvais : subscribe manuel + variable mutable
@Component({ /* ... */ })
export class MauvaisComponent implements OnInit, OnDestroy {
  produits: Produit[] = [];
  private sub!: Subscription;

  ngOnInit() {
    this.sub = this.http.get<Produit[]>('/api/produits')
      .subscribe(p => this.produits = p);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}

// ✅ Bon : toSignal gere tout (subscribe + unsubscribe automatiques)
@Component({ /* ... */ })
export class BonComponent {
  readonly produits = toSignal(
    this.http.get<Produit[]>('/api/produits'),
    { initialValue: [] }
  );
}
```

> **Important** : `toSignal()` doit etre appele dans un **contexte d'injection** (constructeur, champ de classe, ou `inject()`). Il se desabonne automatiquement quand le composant est detruit.

### toObservable() : Signal → Observable

Utile quand vous avez un Signal mais devez appliquer des operateurs RxJS :

```typescript
import { Component, signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-filtre',
  template: `
    <select (change)="categorie.set($any($event.target).value)">
      <option value="all">Toutes</option>
      <option value="tech">Tech</option>
      <option value="mode">Mode</option>
    </select>

    <ul>
      @for (p of produits(); track p.id) {
        <li>{{ p.nom }}</li>
      }
    </ul>
  `,
})
export class FiltreComponent {
  private http = inject(HttpClient);

  // Signal local pour la categorie selectionnee
  readonly categorie = signal('all');

  // Signal → Observable → operateurs RxJS → Signal
  readonly produits = toSignal(
    toObservable(this.categorie).pipe(
      debounceTime(200),
      switchMap(cat =>
        this.http.get<Produit[]>(`/api/produits?cat=${cat}`)
      ),
    ),
    { initialValue: [] }
  );
}
```

### takeUntilDestroyed() : desabonnement automatique

`takeUntilDestroyed()` remplace le pattern manuel `destroy$` + `takeUntil` + `ngOnDestroy` :

```typescript
import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// ❌ Ancien pattern verbeux
@Component({ /* ... */ })
export class AncienComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    interval(5000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(n => console.log(n));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ Nouveau pattern avec takeUntilDestroyed
@Component({ /* ... */ })
export class NouveauComponent {
  constructor() {
    // Dans le constructeur : pas besoin de parametre
    interval(5000).pipe(
      takeUntilDestroyed()
    ).subscribe(n => console.log(n));
  }
}

// ✅ En dehors du constructeur : injecter DestroyRef
@Component({ /* ... */ })
export class NouveauBisComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    interval(5000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(n => console.log(n));
  }
}
```

### Matrice de decision : Signals vs RxJS

| Critere | Signals | RxJS |
|---------|---------|------|
| État UI synchrone | ✅ Ideal | Possible mais verbeux |
| Valeurs derivees simples | ✅ `computed()` | `combineLatest` + `map` |
| Requetes HTTP | `toSignal()` en facade | ✅ `HttpClient` natif |
| Streams temps réel (WebSocket) | Non adapte | ✅ Natif |
| Debounce, throttle | Non natif | ✅ Operateurs dedies |
| Composition de flux complexes | Non adapte | ✅ `pipe()` avec operateurs |
| État local d'un composant | ✅ Leger, réactif | Sur-ingenierie |
| Event bus entre composants | Possible avec `effect` | ✅ `Subject` classique |

**Regle simple** :
- **Signal** quand la question est "quelle est la valeur actuelle ?"
- **RxJS** quand la question est "que se passe-t-il au fil du temps ?"

### Pattern ESN : service RxJS, facade Signals

Le pattern recommande en entreprise : le service utilise RxJS en interne pour la logique async, mais expose des Signals aux composants pour simplifier les templates.

```typescript
// product.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface Produit {
  id: number;
  nom: string;
  prix: number;
  categorieId: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  // --- Interne : RxJS pour la logique async ---
  private categorieSubject = new BehaviorSubject<string>('all');

  private produits$ = this.categorieSubject.pipe(
    switchMap(cat => {
      const url = cat === 'all'
        ? '/api/produits'
        : `/api/produits?cat=${cat}`;
      return this.http.get<Produit[]>(url).pipe(
        catchError(() => of([])),
      );
    }),
  );

  // --- Expose : Signals pour les composants ---
  readonly produits = toSignal(this.produits$, { initialValue: [] });
  readonly categorieActive = toSignal(this.categorieSubject, { requireSync: true });
  readonly nombreProduits = computed(() => this.produits().length);

  // --- Actions ---
  filtrerParCategorie(cat: string): void {
    this.categorieSubject.next(cat);
  }
}
```

```typescript
// catalogue.component.ts
@Component({
  selector: 'app-catalogue',
  template: `
    <h2>Catalogue ({{ productService.nombreProduits() }} produits)</h2>

    <select (change)="productService.filtrerParCategorie($any($event.target).value)">
      <option value="all">Toutes les categories</option>
      <option value="tech">Tech</option>
      <option value="mode">Mode</option>
    </select>

    <ul>
      @for (p of productService.produits(); track p.id) {
        <li>{{ p.nom }} — {{ p.prix }} EUR</li>
      } @empty {
        <li>Aucun produit trouve</li>
      }
    </ul>
  `,
})
export class CatalogueComponent {
  readonly productService = inject(ProductService);
}
```

### Comparaison avec Vue 3

| Concept | Vue 3 | Angular 19+ |
|---------|-------|-------------|
| État réactif | `ref()` | `signal()` |
| Derive | `computed()` | `computed()` |
| Flux async | Pas natif (on utilise libs) | RxJS intégré |
| Conversion | `watch()` pour reagir | `toObservable()` pour reagir avec RxJS |
| Template réactif | Automatique avec `ref` | Automatique avec Signal (`produits()`) |

---

## Pratique

Creez un service `ThemeService` qui :
1. Stocke le theme actif dans un `BehaviorSubject` (valeurs : `'light'` ou `'dark'`)
2. Expose un Signal `theme` via `toSignal()`
3. Expose un Signal `computed` `isDark` qui retourne `true` si le theme est `'dark'`
4. Offre une méthode `toggle()` pour basculer le theme

Puis creez un composant qui affiche le theme actif et un bouton pour le changer.

<details>
<summary>Solution</summary>

```typescript
// theme.service.ts
import { Injectable, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('light');

  readonly theme = toSignal(this.themeSubject, { requireSync: true });
  readonly isDark = computed(() => this.theme() === 'dark');

  toggle(): void {
    const actuel = this.themeSubject.getValue();
    this.themeSubject.next(actuel === 'light' ? 'dark' : 'light');
  }
}
```

```typescript
// theme-toggle.component.ts
import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <div [class]="themeService.theme()">
      <p>Theme actif : {{ themeService.theme() }}</p>
      <p>Mode sombre : {{ themeService.isDark() ? 'Oui' : 'Non' }}</p>
      <button (click)="themeService.toggle()">
        Basculer vers {{ themeService.isDark() ? 'clair' : 'sombre' }}
      </button>
    </div>
  `,
  styles: [`
    .light { background: #fff; color: #333; padding: 16px; }
    .dark { background: #1a1a2e; color: #eee; padding: 16px; }
  `],
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| `toSignal()` | Observable → Signal, desabonnement automatique |
| `toObservable()` | Signal → Observable, pour appliquer des operateurs RxJS |
| `takeUntilDestroyed()` | Remplace `destroy$` + `takeUntil` + `ngOnDestroy` |
| Signal = "quelle valeur ?" | État UI synchrone, valeurs derivees |
| RxJS = "que se passe-t-il ?" | Flux async, composition, debounce, retry |
| Pattern ESN | Service : RxJS interne + Signals exposes |
| `initialValue` | Obligatoire pour éviter `undefined` dans `toSignal()` |
| `requireSync` | Pour les Observables synchrones (`BehaviorSubject`, `of()`) |

---

> **Prochain cours** : [Cours 25 — HttpClient et CRUD](../06-http-api/01-httpclient-crud.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [13-recherche-rxjs](../../exercices/13-recherche-rxjs/ENONCE)
2. **Renforcement** : [13b-rxjs-vs-signals](../../exercices/13b-rxjs-vs-signals/ENONCE)
:::
