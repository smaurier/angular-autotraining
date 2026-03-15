# Correction — Exercice 26 : Entretien Angular

## Résultat attendu

20 réponses correctes au QCM et 3 exercices de live coding fonctionnels, demontrant la maîtrise des concepts fondamentaux d'Angular 19+ avec les signaux.

---

## Partie 1 — Reponses QCM

| Question | Reponse | Explication |
|----------|---------|-------------|
| Q1 | **B** `@Component` | `@Component` est le decorateur spécifique aux composants. `@Directive` est pour les directives, `@Injectable` pour les services. |
| Q2 | **B** signal mutable, computed lecture seule | `signal()` créé un WritableSignal avec `.set()` et `.update()`. `computed()` créé un signal dérivé qui se recalcule automatiquement. |
| Q3 | **A** `standalone: true` (defaut Angular 19+) | Depuis Angular 19, `standalone: true` est le comportement par defaut. On peut l'omettre. |
| Q4 | **B** `@if` | La nouvelle syntaxe de control flow Angular 17+ utilise `@if`, `@else`, `@for`, `@switch`. |
| Q5 | **B** Identifier chaque élément pour le rendu DOM | `track` fonctionne comme `trackBy` de l'ancien `*ngFor` — il aide Angular à savoir quels éléments ont change. |
| Q6 | **B** `inject(MyService)` | `inject()` est la nouvelle API recommandee. Le constructeur fonctionne encore mais est moins idiomatique. |
| Q7 | **B** `update()` | `set()` prend une valeur directe. `update()` prend une fonction `(ancien) => nouveau`. |
| Q8 | **B** `HttpInterceptorFn` | Les intercepteurs fonctionnels sont le style recommande en Angular 19+ (pas de classe). |
| Q9 | **B** `canActivate` + guard fonctionnel | Les guards fonctionnels (simples fonctions) protegent les routes via `canActivate`. |
| Q10 | **C** `switchMap` | `switchMap` annule la requête précédente quand une nouvelle valeur arrive — ideal pour la recherche. |
| Q11 | **B** Singleton dans toute l'application | Le service est instancie une seule fois et partage par tous les composants. |
| Q12 | **B** `.asReadonly()` | `asReadonly()` retourne un `Signal<T>` (pas de `.set()` ni `.update()`) — l'appelant ne peut que lire. |
| Q13 | **A** `import()` dynamique | `loadComponent: () => import('./...').then(m => m.XComponent)` charge le composant à la demandé. |
| Q14 | **B** Controles non-null après `reset()` | `nonNullable` garantit que `reset()` remet les valeurs par defaut (pas `null`). |
| Q15 | **B** Erreur de compilation | `track` est **obligatoire** dans `@for` depuis Angular 17+. Le compilateur refuse de compiler sans. |
| Q16 | **B** `HttpTestingController` | On utilise `provideHttpClientTesting()` et `HttpTestingController` pour intercepter les requêtes en test. |
| Q17 | **B** Mise a jour partielle immutable | `patchState()` merge partiellement l'état sans muter l'original (comme un spread partiel). |
| Q18 | **A** Differer le chargement | `@defer` retarde le chargement d'un bloc de template selon des conditions (viewport, interaction, idle, etc.). |
| Q19 | **B** `OnPush` | `OnPush` ne declenche la detection de changement que quand les inputs changent ou un signal est lu — plus performant. |
| Q20 | **C** Les deux, mais `takeUntilDestroyed()` est plus idiomatique | `takeUntilDestroyed()` est la méthode recommandee en Angular 19+ — pas besoin de `ngOnDestroy` ni de `Subject`. |

### Bareme indicatif
- 18-20 bonnes réponses : Excellent — pret pour l'entretien
- 14-17 bonnes réponses : Bien — revoir les points faibles
- 10-13 bonnes réponses : A approfondir — relire les cours concernes
- Moins de 10 : Reprendre les modules depuis le debut

---

## Partie 2 — Corrections Live Coding

### LC1 — Composant compteur avec signaux (objectif : 5 min)

```typescript
// src/app/exercises/ex26/live-coding/counter.component.ts

import { Component, signal, computed } from '@angular/core';

// --- Composant Counter ---
// Demontre les bases des signaux : signal mutable, computed derives
// Points d'evaluation en entretien :
//   - Utilisation correcte de signal() et computed()
//   - Typage explicite
//   - Template propre avec interpolation de signaux
@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <div class="counter">
      <h2>Compteur : {{ count() }}</h2>
      <p>Double : {{ doubleCount() }}</p>
      <p>{{ isEven() }}</p>

      <div class="buttons">
        <!-- set() remplace la valeur, update() la transforme -->
        <button (click)="count.update(c => c - 1)">-1</button>
        <button (click)="count.set(0)">Reset</button>
        <button (click)="count.update(c => c + 1)">+1</button>
      </div>
    </div>
  `,
  styles: [`
    .counter { text-align: center; padding: 2rem; }
    .buttons { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
    button {
      padding: 0.5rem 1.5rem; font-size: 1.2rem;
      border: none; border-radius: 4px; cursor: pointer;
      background: #1976d2; color: white;
    }
  `],
})
export class CounterComponent {
  // Signal mutable — l'etat central du composant
  readonly count = signal<number>(0);

  // Computed — recalcule automatiquement quand count() change
  // Pas besoin de watcher, d'abonnement ou de ngOnChanges
  readonly doubleCount = computed<number>(() => this.count() * 2);

  // Computed — retourne une string selon la parite
  readonly isEven = computed<string>(() =>
    this.count() % 2 === 0 ? 'Pair' : 'Impair'
  );
}
```

**Criteres d'évaluation :**
- signal() et computed() correctement utilises
- Typage explicite des signaux (`signal<number>`, `computed<number>`)
- Méthodes `set()` et `update()` utilisees a bon escient
- Template propre avec `{{ signal() }}` (parentheses presentes)
- Temps : moins de 5 minutes

---

### LC2 — Recherche avec debounce (objectif : 10 min)

```typescript
// src/app/exercises/ex26/live-coding/search.component.ts

import { Component, signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

// --- Donnees de demonstration ---
const PRODUCTS: string[] = [
  'iPhone 15 Pro',
  'Samsung Galaxy S24',
  'MacBook Pro M3',
  'iPad Air',
  'Google Pixel 8',
  'Sony WH-1000XM5',
  'Nintendo Switch OLED',
  'Steam Deck',
  'AirPods Pro 2',
  'Dell XPS 15',
];

// --- Composant Search ---
// Demontre : signaux + RxJS interop + debounce
// Points d'evaluation en entretien :
//   - Capacite a combiner Signals et RxJS
//   - Connaissance de toObservable() et toSignal()
//   - Utilisation de debounceTime pour la performance
@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <div class="search-container">
      <h2>Recherche de produits</h2>

      <!-- Champ de recherche lie au signal searchTerm -->
      <input
        type="text"
        [value]="searchTerm()"
        (input)="onSearch($event)"
        placeholder="Rechercher un produit..."
        class="search-input"
      />

      <p class="info">
        Recherche : "{{ debouncedTerm() ?? '' }}"
        ({{ filteredProducts().length }} resultats)
      </p>

      <!-- Resultats filtres -->
      <ul>
        @for (product of filteredProducts(); track product) {
          <li>{{ product }}</li>
        } @empty {
          <li class="no-result">Aucun produit trouve</li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .search-container { max-width: 500px; margin: 2rem auto; padding: 1rem; }
    .search-input { width: 100%; padding: 0.75rem; font-size: 1rem; box-sizing: border-box; }
    .info { color: #666; font-size: 0.9rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.5rem; border-bottom: 1px solid #eee; }
    .no-result { color: #999; text-align: center; }
  `],
})
export class SearchComponent {
  // --- Signal de saisie ---
  // Mis a jour a chaque frappe de l'utilisateur
  readonly searchTerm = signal<string>('');

  // --- Pipeline RxJS : debounce ---
  // 1. toObservable() convertit le signal en Observable
  // 2. debounceTime(300) attend 300ms sans nouvelle valeur avant d'emettre
  // 3. distinctUntilChanged() evite les emissions si la valeur n'a pas change
  // 4. toSignal() reconvertit l'Observable en Signal pour le template
  readonly debouncedTerm = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // --- Resultats filtres ---
  // Se base sur le terme debouncé (pas le terme brut)
  // Recalcule uniquement quand debouncedTerm change (pas a chaque frappe)
  readonly filteredProducts = computed<string[]>(() => {
    const term = this.debouncedTerm().toLowerCase();

    if (term.length === 0) {
      return PRODUCTS;
    }

    return PRODUCTS.filter((product) =>
      product.toLowerCase().includes(term)
    );
  });

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
```

**Criteres d'évaluation :**
- `toObservable()` et `toSignal()` utilises correctement (bridge signal/RxJS)
- Pipeline RxJS avec `debounceTime` et `distinctUntilChanged`
- Filtrage dans un `computed` (pas dans le template)
- Typage correct (pas de `any`)
- Temps : moins de 10 minutes

---

### LC3 — Service CRUD simple (objectif : 10 min)

```typescript
// src/app/exercises/ex26/live-coding/product.service.ts

import {
  Injectable,
  signal,
  computed,
  type Signal,
  type WritableSignal,
} from '@angular/core';

// --- Interface Product ---
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
}

// --- Type pour les mises a jour partielles ---
// Omit enleve 'id' — on ne peut pas modifier l'identifiant
// Partial rend toutes les proprietes optionnelles
type ProductUpdate = Partial<Omit<Product, 'id'>>;

// --- Service CRUD ---
// Demontre : service avec signal, mutations immutables, computed dynamique
// Points d'evaluation en entretien :
//   - Immutabilite (spread operator, map, filter)
//   - Exposition en lecture seule (.asReadonly())
//   - Computed dynamique pour getById()
@Injectable({ providedIn: 'root' })
export class ProductService {
  // --- Etat interne ---
  private readonly _products: WritableSignal<Product[]> = signal<Product[]>([]);

  // --- Exposition en lecture seule ---
  readonly products: Signal<Product[]> = this._products.asReadonly();

  // --- Computed : nombre de produits ---
  readonly count: Signal<number> = computed(() => this._products().length);

  // --- CREATE ---
  // Ajoute un produit au tableau (immutable : nouveau tableau)
  add(product: Omit<Product, 'id'>): void {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
    };

    this._products.update((products) => [...products, newProduct]);
  }

  // --- UPDATE ---
  // Met a jour un produit par son id (immutable : map + spread)
  update(id: string, changes: ProductUpdate): void {
    this._products.update((products) =>
      products.map((product) =>
        product.id === id
          ? { ...product, ...changes }
          : product
      )
    );
  }

  // --- DELETE ---
  // Supprime un produit par son id (immutable : filter)
  delete(id: string): void {
    this._products.update((products) =>
      products.filter((product) => product.id !== id)
    );
  }

  // --- READ (par id) ---
  // Retourne un computed qui se met a jour automatiquement
  // quand la liste de produits change
  // Ceci est un pattern puissant : le signal retourne est "vivant"
  getById(id: string): Signal<Product | undefined> {
    return computed(() =>
      this._products().find((product) => product.id === id)
    );
  }
}
```

**Criteres d'évaluation :**
- Toutes les mutations sont immutables (spread, map, filter — pas de push/splice)
- Le signal est expose en lecture seule via `.asReadonly()`
- `getById` retourne un `computed` (pas une valeur statique)
- Types utilitaires TypeScript utilises (`Omit`, `Partial`)
- Zero `any`
- Temps : moins de 10 minutes

---

## Ce que tu aurais pu oublier

### QCM
- Confondre `signal()` et `computed()` (Q2) — erreur la plus frequente en entretien
- Oublier que `track` est obligatoire dans `@for` (Q15) — piege classique
- Ne pas connaître `takeUntilDestroyed()` (Q20) — montre qu'on est a jour sur Angular 19+

### Live Coding
- Oublier les parentheses `()` pour lire un signal dans le template
- Écrire `this._products().push(...)` au lieu de `this._products.update(p => [...p, newItem])` (mutation)
- Oublier `toObservable` / `toSignal` pour le bridge entre signals et RxJS
- Ne pas typer les génériques (`signal()` au lieu de `signal<number>()`)
- Oublier `{ initialValue: '' }` dans `toSignal()` — sans initialValue, le type est `T | undefined`

## Concepts clés evalues en entretien

| Concept | Frequence en entretien | Ce qu'on attend |
|---------|----------------------|-----------------|
| Signals (signal, computed, effect) | Très haute | Savoir créer, lire, modifier un signal + créer des computed |
| Composants standalone | Haute | Savoir que c'est le defaut Angular 19+, pas besoin de NgModule |
| RxJS (switchMap, debounceTime) | Haute | Connaître les operateurs clés et quand les utiliser |
| Routing et guards | Haute | Savoir proteger une route avec un guard fonctionnel |
| HttpClient et intercepteurs | Moyenne | Savoir ajouter un header Authorization automatiquement |
| Reactive Forms | Moyenne | Savoir créer un formulaire avec validation |
| Tests (TestBed, HttpTestingController) | Moyenne | Savoir configurer un test de composant ou de service |
| NgRx SignalStore | Basse (projets avances) | Connaître le concept, savoir quand l'utiliser vs un service simple |
| Performance (OnPush, lazy loading) | Basse | Connaître les stratégies et savoir les expliquer |
