# Correction — Exercice 08 : Signaux avances

## Resultat attendu

Une page avec :
- Des boutons de categories ("Tous", "Livres", "Films", "Musique")
- Une pagination qui revient a la page 1 quand on change de categorie
- Un champ de recherche focusable via bouton
- Une liste d'items charges de maniere asynchrone avec indicateur de chargement
- La liste se recharge automatiquement quand la categorie ou la page change

## Code corrige

```typescript
// src/app/exercises/ex08/advanced-signals.component.ts

import {
  Component,
  signal,
  computed,
  resource,
  linkedSignal,
  viewChild,
  ElementRef,
} from '@angular/core';

// --- Interface pour les items charges ---
interface Item {
  id: number;
  title: string;
  category: string;
}

// --- Donnees fictives simulant une base de donnees ---
const MOCK_ITEMS: Item[] = [
  { id: 1, title: 'Le Seigneur des Anneaux', category: 'Livres' },
  { id: 2, title: 'Dune', category: 'Livres' },
  { id: 3, title: '1984', category: 'Livres' },
  { id: 4, title: 'Inception', category: 'Films' },
  { id: 5, title: 'Matrix', category: 'Films' },
  { id: 6, title: 'Interstellar', category: 'Films' },
  { id: 7, title: 'Dark Side of the Moon', category: 'Musique' },
  { id: 8, title: 'OK Computer', category: 'Musique' },
  { id: 9, title: 'Abbey Road', category: 'Musique' },
  { id: 10, title: 'Le Petit Prince', category: 'Livres' },
  { id: 11, title: 'Blade Runner', category: 'Films' },
  { id: 12, title: 'Kind of Blue', category: 'Musique' },
];

// Nombre d'items par page pour la pagination
const PAGE_SIZE = 3;

@Component({
  selector: 'app-advanced-signals',
  standalone: true,
  imports: [],
  template: `
    <div class="container">
      <h1>Signaux avances</h1>

      <!-- Partie 1 : Categories + linkedSignal -->
      <section>
        <h2>Categorie et pagination</h2>
        <div class="categories">
          @for (cat of categories(); track cat) {
            <button
              [class.active]="selectedCategory() === cat"
              (click)="selectedCategory.set(cat)"
            >
              {{ cat }}
            </button>
          }
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <button
            (click)="currentPage.set(currentPage() - 1)"
            [disabled]="currentPage() <= 1"
          >
            Precedent
          </button>
          <span>Page {{ currentPage() }} / {{ totalPages() }}</span>
          <button
            (click)="currentPage.set(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
          >
            Suivant
          </button>
        </div>

        <p class="info">
          Changer de categorie remet la page a 1 automatiquement (linkedSignal).
        </p>
      </section>

      <!-- Partie 2 : viewChild + focus -->
      <section>
        <h2>Recherche (viewChild)</h2>
        <div class="search-row">
          <!-- #searchInput : reference de template pour viewChild -->
          <input
            #searchInput
            type="text"
            placeholder="Rechercher..."
          />
          <button (click)="focusSearch()">Focus recherche</button>
        </div>
      </section>

      <!-- Partie 3 : resource() -->
      <section>
        <h2>Donnees chargees (resource)</h2>

        <!-- Etat de chargement -->
        @if (itemsResource.isLoading()) {
          <div class="loading">Chargement en cours...</div>
        }

        <!-- Etat d'erreur -->
        @if (itemsResource.error()) {
          <div class="error">
            Erreur : {{ itemsResource.error() }}
            <button (click)="itemsResource.reload()">Reessayer</button>
          </div>
        }

        <!-- Etat succes : affichage des items -->
        @if (itemsResource.value(); as items) {
          <ul class="items">
            @for (item of items; track item.id) {
              <li>
                <span class="item-title">{{ item.title }}</span>
                <span class="item-category">{{ item.category }}</span>
              </li>
            } @empty {
              <li class="empty">Aucun item dans cette categorie.</li>
            }
          </ul>
        }

        <!-- Bouton recharger (bonus) -->
        <button class="reload" (click)="itemsResource.reload()">
          Recharger
        </button>
      </section>
    </div>
  `,
  styles: [`
    .container {
      padding: 2rem;
      max-width: 600px;
      font-family: sans-serif;
    }
    section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    h2 { margin-top: 0; color: #1976d2; }
    .categories {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .categories button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }
    .categories button.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
    .pagination {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: center;
    }
    .pagination button {
      padding: 0.4rem 0.8rem;
      border: none;
      background: #1976d2;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    }
    .pagination button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .info {
      font-size: 0.85rem;
      color: #666;
      font-style: italic;
      margin-top: 0.5rem;
    }
    .search-row {
      display: flex;
      gap: 0.5rem;
    }
    .search-row input {
      flex: 1;
      padding: 0.5rem;
      font-size: 1rem;
    }
    .search-row button {
      padding: 0.5rem 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .loading {
      padding: 1rem;
      text-align: center;
      color: #1976d2;
      font-style: italic;
    }
    .error {
      padding: 1rem;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    .items {
      list-style: none;
      padding: 0;
    }
    .items li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    .item-category {
      font-size: 0.8rem;
      background: #e3f2fd;
      padding: 0.1rem 0.5rem;
      border-radius: 4px;
      color: #1976d2;
    }
    .empty {
      color: #999;
      font-style: italic;
      justify-content: center;
    }
    .reload {
      margin-top: 0.5rem;
      padding: 0.4rem 0.8rem;
      background: #757575;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class AdvancedSignalsComponent {

  // =============================================
  // PARTIE 1 : linkedSignal
  // =============================================

  // --- Signal categories ---
  // Liste statique des categories disponibles
  readonly categories = signal<string[]>(['Tous', 'Livres', 'Films', 'Musique']);

  // --- Signal selectedCategory ---
  // La categorie actuellement selectionnee
  readonly selectedCategory = signal<string>('Tous');

  // --- linkedSignal currentPage ---
  // linkedSignal cree un signal "lie" a une source reactive
  // Quand la source (selectedCategory) change, le linkedSignal est reinitialise
  // Mais l'utilisateur peut aussi modifier currentPage manuellement (pagination)
  //
  // C'est l'equivalent de : un computed qui se reset, mais que l'on peut aussi ecrire
  // Avant linkedSignal, il fallait un effect() pour faire ce reset, ce qui etait fragile
  readonly currentPage = linkedSignal<string, number>({
    // source : le signal dont on depend pour le reset
    source: this.selectedCategory,
    // computation : la fonction appelee quand la source change
    // Elle recoit la nouvelle valeur de la source et retourne la valeur initiale
    computation: () => 1,
  });

  // --- Computed totalPages ---
  // Calcule le nombre total de pages selon la categorie selectionnee
  readonly totalPages = computed<number>(() => {
    const category = this.selectedCategory();
    const filtered = category === 'Tous'
      ? MOCK_ITEMS
      : MOCK_ITEMS.filter((item) => item.category === category);
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  });

  // =============================================
  // PARTIE 2 : viewChild
  // =============================================

  // --- viewChild ---
  // viewChild('searchInput') retourne un signal contenant la reference de l'element
  // Le nom 'searchInput' correspond a la reference de template #searchInput
  // Le signal est undefined jusqu'a ce que la vue soit initialisee (afterViewInit)
  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // --- Methode focusSearch ---
  // Utilise viewChild pour acceder a l'element DOM et lui donner le focus
  focusSearch(): void {
    // On lit le signal viewChild — il peut etre undefined si la vue n'est pas prete
    const inputRef = this.searchInputRef();
    if (inputRef) {
      // nativeElement donne acces a l'element DOM brut
      inputRef.nativeElement.focus();
    }
  }

  // =============================================
  // PARTIE 3 : resource()
  // =============================================

  // --- resource() ---
  // resource() cree un signal reactif qui charge des donnees de maniere asynchrone
  // Il re-execute le loader automatiquement quand les signaux lus dans request() changent
  //
  // Proprietes disponibles :
  // - .value()    : les donnees chargees (ou undefined)
  // - .isLoading() : true pendant le chargement
  // - .error()    : l'erreur s'il y en a une
  // - .status()   : 'idle' | 'loading' | 'resolved' | 'error'
  // - .reload()   : force un rechargement
  readonly itemsResource = resource<Item[], { category: string; page: number }>({
    // request : fonction reactive qui definit les parametres de la requete
    // Elle est re-evaluee quand ses dependances changent (comme un computed)
    request: () => ({
      category: this.selectedCategory(),
      page: this.currentPage(),
    }),

    // loader : fonction asynchrone qui charge les donnees
    // Elle recoit les parametres retournes par request() via { request }
    // Elle est re-executee a chaque changement de request()
    loader: async ({ request }) => {
      // Simuler un delai reseau de 500ms
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // Bonus : echec aleatoire 10% du temps pour tester la gestion d'erreur
      // if (Math.random() < 0.1) {
      //   throw new Error('Erreur reseau simulee');
      // }

      // Filtrer par categorie
      const filtered = request.category === 'Tous'
        ? MOCK_ITEMS
        : MOCK_ITEMS.filter((item) => item.category === request.category);

      // Pagination : on decoupe le tableau
      const start = (request.page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      return filtered.slice(start, end);
    },
  });
}
```

## Ce que tu aurais pu oublier

### 1. Confondre linkedSignal et computed
- ❌ `computed(() => 1)` → lecture seule, impossible de changer la page manuellement
- ✅ `linkedSignal({ source, computation })` → se reset automatiquement ET peut etre modifie par l'utilisateur

### 2. Oublier que viewChild retourne un signal
- ❌ `this.searchInputRef.nativeElement` → erreur, c'est un signal
- ✅ `this.searchInputRef()?.nativeElement` → appeler le signal, puis acceder a l'element

### 3. Utiliser un effect au lieu de resource
- ❌ Creer un effect qui appelle une API et stocke le resultat dans un signal → pas de gestion du loading/error
- ✅ `resource({ request, loader })` → gere automatiquement loading, error, valeur, et annulation

### 4. Oublier le `await` dans le loader de resource
- ❌ `loader: ({ request }) => { ... }` sans async/await → le loader doit retourner une Promise
- ✅ `loader: async ({ request }) => { ... }` → le loader est asynchrone

### 5. Ne pas gerer l'etat de chargement dans le template
- ❌ Afficher uniquement `resource.value()` → ecran vide pendant le chargement
- ✅ Verifier `resource.isLoading()` et `resource.error()` pour une UX complete

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `linkedSignal({ source, computation })` | Signal qui se reinitialise quand la source change, mais reste modifiable manuellement |
| `viewChild<T>('ref')` | Signal qui contient la reference d'un element de template (`#ref`) |
| `resource({ request, loader })` | Charge des donnees asynchrones de maniere reactive, avec gestion du loading/error |
| `resource.value()` | Signal contenant les donnees chargees |
| `resource.isLoading()` | Signal booleen indiquant si le chargement est en cours |
| `resource.error()` | Signal contenant l'erreur eventuelle |
| `resource.reload()` | Methode pour forcer un rechargement des donnees |
| `ElementRef<HTMLElement>` | Typage fort pour la reference DOM |
