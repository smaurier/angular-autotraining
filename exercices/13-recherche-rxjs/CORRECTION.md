# Correction — Exercice 13 : Recherche RxJS

## Résultat attendu

Un champ de recherche qui reagit aux frappes clavier avec un delai de 300ms. Les requêtes sont annulees si l'utilisateur tape plus vite que la réponse. Un spinner s'affiche pendant le chargement. Les erreurs sont capturees et affichees. La desabonnement est automatique à la destruction du composant.

## Code corrige

### `src/app/exercises/ex13/models/search-result.model.ts`

```typescript
// Interface definissant la structure d'un resultat de recherche
export interface SearchResult {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly category: string;
}
```

### `src/app/exercises/ex13/services/search.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SearchResult } from '../models/search-result.model';

// Donnees simulees
const MOCK_DATA: SearchResult[] = [
  { id: 1, title: 'Angular Signals', description: 'Reactivite fine avec les signaux Angular', category: 'Framework' },
  { id: 2, title: 'RxJS Observables', description: 'Programmation reactive avec RxJS', category: 'Librairie' },
  { id: 3, title: 'TypeScript Generics', description: 'Typage generique avance en TypeScript', category: 'Langage' },
  { id: 4, title: 'Angular Routing', description: 'Navigation multi-pages avec le router Angular', category: 'Framework' },
  { id: 5, title: 'Angular Forms', description: 'Formulaires reactifs et template-driven', category: 'Framework' },
  { id: 6, title: 'RxJS Operators', description: 'Les operateurs essentiels de RxJS', category: 'Librairie' },
  { id: 7, title: 'Angular Material', description: 'Composants UI Material Design pour Angular', category: 'UI' },
  { id: 8, title: 'NgRx Store', description: 'Gestion d etat avec NgRx', category: 'State' },
  { id: 9, title: 'Angular Testing', description: 'Tests unitaires et integration avec Jasmine', category: 'Testing' },
  { id: 10, title: 'TypeScript Decorators', description: 'Metadonnees et decorateurs TypeScript', category: 'Langage' },
  { id: 11, title: 'Angular Standalone', description: 'Composants standalone sans NgModule', category: 'Framework' },
  { id: 12, title: 'RxJS Subject', description: 'Multicasting avec Subject, BehaviorSubject, ReplaySubject', category: 'Librairie' },
];

@Injectable({ providedIn: 'root' })
export class SearchService {
  /**
   * Simule une recherche API.
   * - Filtre les donnees en dur selon la query (insensible a la casse)
   * - Ajoute un delai de 500ms pour simuler le reseau
   * - 1 chance sur 5 de retourner une erreur pour tester la gestion d'erreur
   */
  search(query: string): Observable<SearchResult[]> {
    // Simulation d'erreur aleatoire (1 chance sur 5)
    if (Math.random() < 0.2) {
      return throwError(() => new Error('Erreur serveur simulee (500)'));
    }

    const lowerQuery = query.toLowerCase();

    // Filtrage sur le titre et la description
    const results = MOCK_DATA.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    );

    // Retourne un observable avec un delai simule
    return of(results).pipe(delay(500));
  }
}
```

### `src/app/exercises/ex13/search.component.ts`

```typescript
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { SearchService } from './services/search.service';
import { SearchResult } from './models/search-result.model';

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <div class="search-container">
      <h2>Recherche RxJS</h2>

      <!-- Champ de recherche -->
      <div class="search-box">
        <input
          type="text"
          placeholder="Rechercher... (min. 2 caracteres)"
          (input)="onSearch($event)"
          class="search-input"
        />
        <!-- Indicateur de chargement -->
        @if (loading()) {
          <span class="spinner">Chargement...</span>
        }
      </div>

      <!-- Message d'erreur -->
      @if (error()) {
        <div class="error-message">
          {{ error() }}
          <button (click)="clearError()" class="btn-dismiss">Fermer</button>
        </div>
      }

      <!-- Resultats -->
      @if (results().length > 0) {
        <p class="result-count">{{ results().length }} resultat(s) trouve(s)</p>
        <ul class="results-list">
          @for (result of results(); track result.id) {
            <li class="result-item">
              <h3>{{ result.title }}</h3>
              <span class="category">{{ result.category }}</span>
              <p>{{ result.description }}</p>
            </li>
          }
        </ul>
      } @else if (!loading() && hasSearched()) {
        <p class="no-results">Aucun resultat pour votre recherche.</p>
      }
    </div>
  `,
  styles: [`
    .search-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: 'Segoe UI', sans-serif;
    }

    .search-box {
      position: relative;
      margin-bottom: 1rem;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1.1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #1976d2; }

    .spinner {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #1976d2;
      font-size: 0.85rem;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-dismiss {
      background: none; border: none;
      color: #c62828; cursor: pointer;
      font-weight: 600;
    }

    .result-count {
      color: #666; font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .results-list {
      list-style: none;
      padding: 0;
    }

    .result-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      transition: box-shadow 0.2s;
    }
    .result-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

    .result-item h3 { margin: 0 0 0.25rem; }

    .category {
      display: inline-block;
      background: #e3f2fd;
      color: #1565c0;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .result-item p { color: #666; margin: 0.5rem 0 0; }

    .no-results {
      text-align: center;
      color: #999;
      padding: 2rem 0;
    }
  `],
})
export class SearchComponent implements OnInit {
  // Injection des dependances
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);

  // Signaux pour l'etat du composant
  readonly results = signal<SearchResult[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly hasSearched = signal<boolean>(false);

  // Subject pour emettre les termes de recherche
  // Un Subject est a la fois un Observable et un Observer
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Configuration de la chaine RxJS
    this.searchSubject
      .pipe(
        // 1. Attendre 300ms apres la derniere frappe
        // Evite de lancer une requete a chaque caractere
        debounceTime(300),

        // 2. Ignorer si la valeur n'a pas change
        // Ex: l'utilisateur tape "abc", efface "c", retape "c" → pas de nouvelle requete
        distinctUntilChanged(),

        // 3. Ignorer les requetes trop courtes
        filter((query: string) => query.length >= 2),

        // 4. Mettre a jour l'etat de chargement
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),

        // 5. Annuler la requete precedente et lancer la nouvelle
        // switchMap se desabonne automatiquement de l'observable precedent
        switchMap((query: string) =>
          this.searchService.search(query).pipe(
            // Gestion d'erreur au niveau de l'observable interne
            // Important : catchError ici pour ne pas casser la chaine principale
            catchError((err: Error) => {
              this.error.set(err.message);
              // Retourner un tableau vide pour continuer la chaine
              return of([] as SearchResult[]);
            })
          )
        ),

        // 6. Se desabonner automatiquement quand le composant est detruit
        // Equivalent moderne de ngOnDestroy + unsubscribe
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results: SearchResult[]) => {
        // Mettre a jour les signaux avec les resultats
        this.results.set(results);
        this.loading.set(false);
        this.hasSearched.set(true);
      });
  }

  /**
   * Appele a chaque frappe dans le champ de recherche.
   * Emet la valeur dans le Subject pour declencher la chaine RxJS.
   */
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value.trim();

    if (query.length < 2) {
      // Reinitialiser si la requete est trop courte
      this.results.set([]);
      this.hasSearched.set(false);
    }

    // Emettre dans le Subject (le pipe se charge du reste)
    this.searchSubject.next(query);
  }

  clearError(): void {
    this.error.set('');
  }
}
```

## Ce que tu aurais pu oublier

### 1. `catchError` au mauvais endroit

- ❌ `catchError` dans le pipe principal casse toute la chaine après la première erreur :
  ```typescript
  searchSubject.pipe(
    switchMap(q => this.service.search(q)),
    catchError(err => of([])) // La chaine est terminee apres une erreur !
  )
  ```
- ✅ `catchError` dans le pipe de l'observable interne (a l'interieur du `switchMap`) :
  ```typescript
  switchMap(q =>
    this.service.search(q).pipe(
      catchError(err => of([])) // La chaine principale reste intacte
    )
  )
  ```

### 2. Oublier `distinctUntilChanged`

- ❌ Sans `distinctUntilChanged`, une même requête est lancee plusieurs fois
- ✅ `distinctUntilChanged()` empeche les requêtes en double consecutives

### 3. Oublier de se desabonner

- ❌ Memory leak si le composant est detruit sans desabonnement :
  ```typescript
  this.searchSubject.pipe(...).subscribe(...);
  ```
- ✅ Utiliser `takeUntilDestroyed` pour un desabonnement automatique :
  ```typescript
  this.searchSubject.pipe(
    ...,
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(...);
  ```

### 4. Utiliser `mergeMap` au lieu de `switchMap`

- ❌ `mergeMap` garde toutes les requêtes en cours, les réponses arrivent dans le desordre
- ✅ `switchMap` annule la requête précédente des qu'une nouvelle est emise

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `Subject` | Observable qui permet d'emettre des valeurs manuellement |
| `debounceTime(300)` | Attend 300ms après la dernière emission avant de propager |
| `distinctUntilChanged()` | Ignore les valeurs identiques consecutives |
| `filter()` | Ne laisse passer que les valeurs satisfaisant une condition |
| `switchMap()` | Se desabonne de l'observable précédent avant d'en créer un nouveau |
| `catchError()` | Intercepte les erreurs et retourne un observable de remplacement |
| `takeUntilDestroyed()` | Se desabonne automatiquement quand le composant est detruit |
| `signal()` | État réactif local pour l'UI (loading, results, error) |
| `of()` | Cree un observable qui emet une valeur puis se complete |
| `delay()` | Retarde l'emission pour simuler la latence réseau |
