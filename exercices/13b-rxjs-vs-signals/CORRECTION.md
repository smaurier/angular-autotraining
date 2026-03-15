# Correction — Exercice 13b : RxJS vs Signals

## Résultat attendu

Deux implementations cote a cote de la même recherche : une version 100% RxJS avec `async` pipe, une version Signals avec `toSignal()`. Les deux ont le même comportement (debounce, annulation, erreurs). Un tableau comparatif aide a choisir la bonne approche selon le contexte.

## Code corrige

### `src/app/exercises/ex13b/search-rxjs.component.ts`

```typescript
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { SearchService } from '../ex13/services/search.service';
import { SearchResult } from '../ex13/models/search-result.model';

@Component({
  selector: 'app-search-rxjs',
  standalone: true,
  // Le pipe async est necessaire pour souscrire aux observables dans le template
  imports: [AsyncPipe],
  template: `
    <div class="search-panel">
      <h3>Version RxJS (async pipe)</h3>

      <input
        type="text"
        placeholder="Rechercher..."
        (input)="onSearch($event)"
        class="search-input"
      />

      <!-- Le pipe async souscrit et se desabonne automatiquement -->
      @if (loading$ | async) {
        <p class="loading">Chargement...</p>
      }

      @if (error$ | async; as errorMsg) {
        <p class="error">{{ errorMsg }}</p>
      }

      <!-- async pipe transforme l'observable en valeur dans le template -->
      @if (results$ | async; as results) {
        @if (results.length > 0) {
          <ul class="results">
            @for (item of results; track item.id) {
              <li>
                <strong>{{ item.title }}</strong>
                <span class="cat">{{ item.category }}</span>
              </li>
            }
          </ul>
        } @else if (hasSearched) {
          <p class="empty">Aucun resultat.</p>
        }
      }
    </div>
  `,
  styles: [`
    .search-panel {
      border: 2px solid #1565c0;
      border-radius: 8px;
      padding: 1rem;
    }
    h3 { color: #1565c0; margin-top: 0; }
    .search-input {
      width: 100%; padding: 0.5rem;
      border: 1px solid #ccc; border-radius: 4px;
      font-size: 1rem; box-sizing: border-box;
    }
    .loading { color: #1565c0; }
    .error { color: #c62828; }
    .results { list-style: none; padding: 0; }
    .results li {
      padding: 0.5rem; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between;
    }
    .cat {
      background: #e3f2fd; color: #1565c0;
      padding: 0.1rem 0.5rem; border-radius: 4px;
      font-size: 0.8rem;
    }
    .empty { color: #999; text-align: center; }
  `],
})
export class SearchRxjsComponent implements OnInit {
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);

  // BehaviorSubject pour pouvoir utiliser le pipe async sur loading et error
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string>('');
  private readonly searchSubject = new BehaviorSubject<string>('');

  // Observables exposes au template — lus via le pipe async
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();
  readonly error$: Observable<string> = this.errorSubject.asObservable();
  results$!: Observable<SearchResult[]>;

  hasSearched = false;

  ngOnInit(): void {
    // Construction de la chaine RxJS
    this.results$ = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((q: string) => q.length >= 2),
      tap(() => {
        this.loadingSubject.next(true);
        this.errorSubject.next('');
      }),
      switchMap((query: string) =>
        this.searchService.search(query).pipe(
          catchError((err: Error) => {
            this.errorSubject.next(err.message);
            return of([] as SearchResult[]);
          })
        )
      ),
      tap(() => {
        this.loadingSubject.next(false);
        this.hasSearched = true;
      }),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value.trim());
  }
}
```

### `src/app/exercises/ex13b/search-signals.component.ts`

```typescript
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { SearchService } from '../ex13/services/search.service';
import { SearchResult } from '../ex13/models/search-result.model';

@Component({
  selector: 'app-search-signals',
  standalone: true,
  template: `
    <div class="search-panel">
      <h3>Version Signals (toSignal)</h3>

      <input
        type="text"
        placeholder="Rechercher..."
        (input)="onSearch($event)"
        class="search-input"
      />

      <!-- Lecture directe des signaux, pas besoin de pipe async -->
      @if (loading()) {
        <p class="loading">Chargement...</p>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (results().length > 0) {
        <ul class="results">
          @for (item of results(); track item.id) {
            <li>
              <strong>{{ item.title }}</strong>
              <span class="cat">{{ item.category }}</span>
            </li>
          }
        </ul>
      } @else if (!loading() && hasSearched()) {
        <p class="empty">Aucun resultat.</p>
      }
    </div>
  `,
  styles: [`
    .search-panel {
      border: 2px solid #2e7d32;
      border-radius: 8px;
      padding: 1rem;
    }
    h3 { color: #2e7d32; margin-top: 0; }
    .search-input {
      width: 100%; padding: 0.5rem;
      border: 1px solid #ccc; border-radius: 4px;
      font-size: 1rem; box-sizing: border-box;
    }
    .loading { color: #2e7d32; }
    .error { color: #c62828; }
    .results { list-style: none; padding: 0; }
    .results li {
      padding: 0.5rem; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between;
    }
    .cat {
      background: #e8f5e9; color: #2e7d32;
      padding: 0.1rem 0.5rem; border-radius: 4px;
      font-size: 0.8rem;
    }
    .empty { color: #999; text-align: center; }
  `],
})
export class SearchSignalsComponent {
  private readonly searchService = inject(SearchService);

  // Signal source : le terme de recherche
  readonly query = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly hasSearched = signal<boolean>(false);

  // 1. Convertir le signal en observable pour appliquer les operateurs RxJS
  // toObservable() emet a chaque changement du signal
  private readonly searchResults$ = toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((q: string) => q.length >= 2),
    tap(() => {
      this.loading.set(true);
      this.error.set('');
    }),
    switchMap((query: string) =>
      this.searchService.search(query).pipe(
        catchError((err: Error) => {
          this.error.set(err.message);
          return of([] as SearchResult[]);
        })
      )
    ),
    tap(() => {
      this.loading.set(false);
      this.hasSearched.set(true);
    }),
  );

  // 2. Convertir l'observable de resultats en signal pour le template
  // toSignal() souscrit automatiquement et se desabonne a la destruction
  // La valeur initiale est un tableau vide (pas de undefined)
  readonly results = toSignal(this.searchResults$, {
    initialValue: [] as SearchResult[],
  });

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    // Mettre a jour le signal source declenche toute la chaine
    this.query.set(target.value.trim());
  }
}
```

### `src/app/exercises/ex13b/comparison.component.ts`

```typescript
import { Component } from '@angular/core';
import { SearchRxjsComponent } from './search-rxjs.component';
import { SearchSignalsComponent } from './search-signals.component';

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [SearchRxjsComponent, SearchSignalsComponent],
  template: `
    <div class="comparison">
      <h2>RxJS vs Signals — Comparaison</h2>

      <!-- Les deux implementations cote a cote -->
      <div class="side-by-side">
        <app-search-rxjs />
        <app-search-signals />
      </div>

      <!-- Tableau comparatif -->
      <h3>Tableau comparatif</h3>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Critere</th>
            <th>RxJS + async pipe</th>
            <th>Signals + toSignal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Verbosity</td>
            <td>Plus de code (BehaviorSubject, pipe async)</td>
            <td>Moins de code (signal direct)</td>
          </tr>
          <tr>
            <td>Lisibilite</td>
            <td>Explicite mais verbeux</td>
            <td>Plus intuitif, lecture directe</td>
          </tr>
          <tr>
            <td>Desabonnement</td>
            <td>takeUntilDestroyed ou async pipe</td>
            <td>Automatique avec toSignal</td>
          </tr>
          <tr>
            <td>Debounce</td>
            <td>Natif RxJS</td>
            <td>Necessite toObservable → RxJS → toSignal</td>
          </tr>
          <tr>
            <td>Performance</td>
            <td>Bonne (change detection OnPush)</td>
            <td>Excellente (updates granulaires)</td>
          </tr>
          <tr>
            <td>Cas d'usage ideal</td>
            <td>Flux complexes, event streams</td>
            <td>Etat UI, donnees synchrones</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .comparison {
      max-width: 900px;
      margin: 0 auto;
      font-family: 'Segoe UI', sans-serif;
    }

    .side-by-side {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    .comparison-table th,
    .comparison-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    .comparison-table th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .comparison-table tr:hover {
      background: #fafafa;
    }
  `],
})
export class ComparisonComponent {}

/*
 * QUAND UTILISER QUOI ?
 *
 * Preferer SIGNALS quand :
 * - L'etat est synchrone (compteur, toggle, formulaire)
 * - On veut une lecture simple dans le template (pas de pipe async)
 * - On gere de l'etat local au composant
 *
 * Preferer RXJS quand :
 * - On a des flux asynchrones complexes (WebSocket, event streams)
 * - On a besoin d'operateurs temporels (debounce, throttle, buffer)
 * - On compose plusieurs sources de donnees asynchrones
 *
 * HYBRIDE (comme ici) :
 * - signal → toObservable → operateurs RxJS → toSignal
 * - Combine le meilleur des deux mondes
 */
```

## Ce que tu aurais pu oublier

### 1. Oublier `initialValue` dans `toSignal()`

- ❌ Sans valeur initiale, le signal est de type `T | undefined` :
  ```typescript
  readonly results = toSignal(this.results$);
  // Type: Signal<SearchResult[] | undefined>
  ```
- ✅ Avec `initialValue`, le type est propre :
  ```typescript
  readonly results = toSignal(this.results$, { initialValue: [] });
  // Type: Signal<SearchResult[]>
  ```

### 2. Confondre `toSignal` et `toObservable`

- ❌ `toSignal` convertit un Observable en Signal
- ❌ `toObservable` convertit un Signal en Observable
- ✅ Pour le debounce : `signal → toObservable → debounceTime → switchMap → toSignal`

### 3. Oublier que `toSignal` se desabonne automatiquement

- ❌ Ajouter `takeUntilDestroyed` en plus de `toSignal` (inutile) :
  ```typescript
  toSignal(obs$.pipe(takeUntilDestroyed(destroyRef)))
  ```
- ✅ `toSignal` géré déjà le desabonnement à la destruction du composant

### 4. Ne pas utiliser `AsyncPipe` dans la version RxJS

- ❌ S'abonner manuellement dans le composant et stocker dans une variable :
  ```typescript
  this.results$.subscribe(r => this.results = r);
  ```
- ✅ Utiliser le pipe `async` dans le template pour un desabonnement automatique :
  ```html
  @if (results$ | async; as results) { ... }
  ```

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `toSignal()` | Convertit un Observable en Signal (desabonnement auto) |
| `toObservable()` | Convertit un Signal en Observable (emet à chaque changement) |
| `AsyncPipe` | Souscrit à un Observable dans le template et se desabonne automatiquement |
| `BehaviorSubject` | Subject avec une valeur courante accessible immediatement |
| `switchMap` | Annule l'observable précédent et en créé un nouveau |
| Interop RxJS/Signals | Pattern `signal → toObservable → operators → toSignal` |
| Desabonnement auto | `toSignal` et `async` gèrent le cycle de vie automatiquement |
