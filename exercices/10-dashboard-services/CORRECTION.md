# Correction — Exercice 10 : Dashboard avec services multiples

## Résultat attendu

Un dashboard affichant :
- Un champ de recherche et un filtre par categorie
- Un tableau de produits triable par colonne (clic sur l'en-tete)
- Le nombre de résultats et les filtres actifs
- Tout est réactif : changer un filtre ou un tri met a jour la liste instantanement
- Les trois services sont independants mais composes ensemble dans le composant

## Code corrige

### Types partages

```typescript
// src/app/exercises/ex10/models.ts

// --- Interface Product ---
// Representee un produit du catalogue
export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  date: string;     // Format ISO : '2024-01-15'
  rating: number;   // Note de 1 a 5
}

// --- Types pour le tri ---
// Union literal pour les champs triables
export type SortField = 'name' | 'price' | 'date' | 'rating';

// Direction du tri
export type SortDirection = 'asc' | 'desc';
```

### Service 1 : DataService

```typescript
// src/app/exercises/ex10/data.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { Product } from './models';

// --- DataService ---
// Responsabilite unique : fournir les donnees brutes
// Ne s'occupe ni du filtrage ni du tri
@Injectable({
  providedIn: 'root',
})
export class DataService {

  // --- Signal products ---
  // Donnees fictives simulant un appel API
  // En production, ces donnees viendraient d'un HttpClient
  readonly products = signal<Product[]>([
    { id: 1, name: 'MacBook Pro', price: 2499, category: 'Informatique', date: '2024-11-15', rating: 4.8 },
    { id: 2, name: 'iPhone 16', price: 999, category: 'Telephonie', date: '2024-09-20', rating: 4.5 },
    { id: 3, name: 'AirPods Pro', price: 279, category: 'Audio', date: '2024-09-10', rating: 4.7 },
    { id: 4, name: 'iPad Air', price: 699, category: 'Informatique', date: '2024-03-08', rating: 4.6 },
    { id: 5, name: 'Galaxy S24', price: 899, category: 'Telephonie', date: '2024-01-17', rating: 4.4 },
    { id: 6, name: 'Sony WH-1000XM5', price: 349, category: 'Audio', date: '2023-05-12', rating: 4.9 },
    { id: 7, name: 'Dell XPS 15', price: 1799, category: 'Informatique', date: '2024-06-01', rating: 4.3 },
    { id: 8, name: 'Pixel 9', price: 799, category: 'Telephonie', date: '2024-08-13', rating: 4.2 },
    { id: 9, name: 'HomePod mini', price: 99, category: 'Audio', date: '2023-10-30', rating: 4.0 },
    { id: 10, name: 'Surface Pro', price: 1299, category: 'Informatique', date: '2024-05-20', rating: 4.1 },
  ]);

  // --- Computed categories ---
  // Extrait la liste des categories uniques depuis les produits
  // Set supprime les doublons, Array.from() convertit en tableau
  readonly categories = computed<string[]>(() => {
    const allCategories = this.products().map((p) => p.category);
    return Array.from(new Set(allCategories)).sort();
  });
}
```

### Service 2 : FilterService

```typescript
// src/app/exercises/ex10/filter.service.ts

import { Injectable, signal } from '@angular/core';

// --- FilterService ---
// Responsabilite unique : gerer l'etat des filtres
// Ne connait pas les donnees, ne sait pas trier
@Injectable({
  providedIn: 'root',
})
export class FilterService {

  // --- Signal searchTerm ---
  // Le terme de recherche tape par l'utilisateur
  readonly searchTerm = signal<string>('');

  // --- Signal selectedCategory ---
  // La categorie selectionnee (vide = toutes les categories)
  readonly selectedCategory = signal<string>('');

  // --- Methode setSearch ---
  // Met a jour le terme de recherche
  setSearch(term: string): void {
    this.searchTerm.set(term);
  }

  // --- Methode setCategory ---
  // Met a jour la categorie selectionnee
  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  // --- Methode reset ---
  // Remet tous les filtres a leur valeur initiale
  reset(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
  }
}
```

### Service 3 : SortService

```typescript
// src/app/exercises/ex10/sort.service.ts

import { Injectable, signal } from '@angular/core';
import { SortField, SortDirection } from './models';

// --- SortService ---
// Responsabilite unique : gerer l'etat du tri
// Ne connait pas les donnees, ne sait pas filtrer
@Injectable({
  providedIn: 'root',
})
export class SortService {

  // --- Signal sortField ---
  // Le champ sur lequel on trie (nom, prix, date, note)
  readonly sortField = signal<SortField>('name');

  // --- Signal sortDirection ---
  // La direction du tri (ascendant ou descendant)
  readonly sortDirection = signal<SortDirection>('asc');

  // --- Methode setSort ---
  // Si on clique sur le meme champ, on inverse la direction
  // Si on clique sur un autre champ, on met ce champ avec 'asc'
  setSort(field: SortField): void {
    if (this.sortField() === field) {
      // Meme champ : on inverse la direction
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      // Nouveau champ : on le selectionne avec tri ascendant
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  // --- Methode getSortIndicator ---
  // Retourne un indicateur visuel pour les en-tetes de tableau
  getSortIndicator(field: SortField): string {
    if (this.sortField() !== field) return '';
    return this.sortDirection() === 'asc' ? ' ▲' : ' ▼';
  }
}
```

### DashboardFiltersComponent

```typescript
// src/app/exercises/ex10/dashboard-filters.component.ts

import { Component, inject } from '@angular/core';
import { DataService } from './data.service';
import { FilterService } from './filter.service';

@Component({
  selector: 'app-dashboard-filters',
  standalone: true,
  imports: [],
  template: `
    <div class="filters">
      <!-- Champ de recherche -->
      <input
        type="text"
        [value]="filterService.searchTerm()"
        (input)="onSearchChange($event)"
        placeholder="Rechercher par nom..."
      />

      <!-- Select de categorie -->
      <select
        [value]="filterService.selectedCategory()"
        (change)="onCategoryChange($event)"
      >
        <option value="">Toutes les categories</option>
        @for (cat of dataService.categories(); track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>

      <!-- Bouton reset -->
      <button (click)="filterService.reset()">Reinitialiser</button>
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    input {
      flex: 1;
      min-width: 200px;
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    select {
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      padding: 0.5rem 1rem;
      background: #757575;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class DashboardFiltersComponent {
  // On injecte les services necessaires pour ce composant
  readonly dataService = inject(DataService);
  readonly filterService = inject(FilterService);

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterService.setSearch(input.value);
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterService.setCategory(select.value);
  }
}
```

### DashboardTableComponent

```typescript
// src/app/exercises/ex10/dashboard-table.component.ts

import { Component, input, inject } from '@angular/core';
import { Product, SortField } from './models';
import { SortService } from './sort.service';

@Component({
  selector: 'app-dashboard-table',
  standalone: true,
  imports: [],
  template: `
    <table>
      <thead>
        <tr>
          <!-- Chaque en-tete est cliquable pour trier par cette colonne -->
          <!-- L'indicateur ▲/▼ montre la direction du tri -->
          <th (click)="sortService.setSort('name')">
            Nom{{ sortService.getSortIndicator('name') }}
          </th>
          <th (click)="sortService.setSort('price')">
            Prix{{ sortService.getSortIndicator('price') }}
          </th>
          <th (click)="sortService.setSort('date')">
            Date{{ sortService.getSortIndicator('date') }}
          </th>
          <th (click)="sortService.setSort('rating')">
            Note{{ sortService.getSortIndicator('rating') }}
          </th>
          <th>Categorie</th>
        </tr>
      </thead>
      <tbody>
        @for (product of products(); track product.id) {
          <tr>
            <td>{{ product.name }}</td>
            <td class="price">{{ product.price.toFixed(2) }} EUR</td>
            <td>{{ product.date }}</td>
            <td class="rating">{{ product.rating }}/5</td>
            <td>
              <span class="category-badge">{{ product.category }}</span>
            </td>
          </tr>
        } @empty {
          <tr>
            <td colspan="5" class="empty">Aucun produit trouve.</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #1976d2;
      color: white;
      padding: 0.75rem;
      text-align: left;
      cursor: pointer;
      user-select: none;
    }
    th:hover { background: #1565c0; }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #eee;
    }
    tr:hover { background: #f5f5f5; }
    .price { font-weight: bold; color: #1976d2; }
    .rating { color: #ff9800; }
    .category-badge {
      background: #e3f2fd;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #1976d2;
    }
    .empty {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 2rem;
    }
  `]
})
export class DashboardTableComponent {
  // Le tableau de produits est recu via input du parent
  // Le parent est responsable du filtrage et du tri
  readonly products = input.required<Product[]>();

  // On injecte SortService pour que les en-tetes puissent declencher le tri
  readonly sortService = inject(SortService);
}
```

### DashboardComponent (principal)

```typescript
// src/app/exercises/ex10/dashboard.component.ts

import { Component, inject, computed } from '@angular/core';
import { Product } from './models';
import { DataService } from './data.service';
import { FilterService } from './filter.service';
import { SortService } from './sort.service';
import { DashboardFiltersComponent } from './dashboard-filters.component';
import { DashboardTableComponent } from './dashboard-table.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DashboardFiltersComponent, DashboardTableComponent],
  template: `
    <div class="dashboard">
      <h1>Dashboard produits</h1>

      <!-- Composant de filtres -->
      <app-dashboard-filters />

      <!-- Resume des filtres actifs -->
      <div class="summary">
        <span>{{ filteredAndSortedProducts().length }} produit(s) affiche(s)</span>
        @if (filterService.searchTerm() || filterService.selectedCategory()) {
          <span class="active-filters">
            Filtres actifs :
            @if (filterService.searchTerm()) {
              <span class="filter-tag">
                Recherche : "{{ filterService.searchTerm() }}"
              </span>
            }
            @if (filterService.selectedCategory()) {
              <span class="filter-tag">
                Categorie : {{ filterService.selectedCategory() }}
              </span>
            }
          </span>
        }
      </div>

      <!-- Tableau des produits -->
      <app-dashboard-table [products]="filteredAndSortedProducts()" />

      <!-- Statistiques (bonus) -->
      @if (stats(); as s) {
        <div class="stats">
          <h3>Statistiques</h3>
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-value">{{ s.avgPrice.toFixed(2) }} EUR</span>
              <span class="stat-label">Prix moyen</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ s.avgRating.toFixed(1) }}/5</span>
              <span class="stat-label">Note moyenne</span>
            </div>
            @for (cat of s.byCategory; track cat.name) {
              <div class="stat">
                <span class="stat-value">{{ cat.count }}</span>
                <span class="stat-label">{{ cat.name }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 2rem;
      max-width: 900px;
      font-family: sans-serif;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: #666;
    }
    .active-filters {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .filter-tag {
      background: #fff3e0;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #e65100;
    }
    .stats {
      margin-top: 2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .stats h3 { margin-top: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }
    .stat {
      text-align: center;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
    }
    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: bold;
      color: #1976d2;
    }
    .stat-label {
      font-size: 0.8rem;
      color: #666;
    }
  `]
})
export class DashboardComponent {

  // --- Injection des trois services ---
  // Chaque service est un singleton (providedIn: 'root')
  // Le composant les compose ensemble pour creer la logique metier
  readonly dataService = inject(DataService);
  readonly filterService = inject(FilterService);
  readonly sortService = inject(SortService);

  // --- Computed filteredAndSortedProducts ---
  // C'est ici que la magie de la composition se produit :
  // Ce computed depend de signaux de 3 services differents
  // Angular detecte TOUTES les dependances automatiquement
  // Quand N'IMPORTE lequel change, le computed se recalcule
  readonly filteredAndSortedProducts = computed<Product[]>(() => {
    // 1. Recuperer les donnees brutes
    let products = [...this.dataService.products()];

    // 2. Filtrer par terme de recherche
    const search = this.filterService.searchTerm().toLowerCase();
    if (search) {
      products = products.filter((p) =>
        p.name.toLowerCase().includes(search)
      );
    }

    // 3. Filtrer par categorie
    const category = this.filterService.selectedCategory();
    if (category) {
      products = products.filter((p) => p.category === category);
    }

    // 4. Trier
    const field = this.sortService.sortField();
    const direction = this.sortService.sortDirection();

    products.sort((a, b) => {
      // On compare les valeurs du champ selectionne
      const valA = a[field];
      const valB = b[field];

      let comparison: number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        // Tri alphabetique pour les chaines
        comparison = valA.localeCompare(valB);
      } else {
        // Tri numerique pour les nombres
        comparison = (valA as number) - (valB as number);
      }

      // Inverser si direction descendante
      return direction === 'asc' ? comparison : -comparison;
    });

    return products;
  });

  // --- Computed stats (bonus) ---
  // Calcule des statistiques sur les produits filtres
  readonly stats = computed(() => {
    const products = this.filteredAndSortedProducts();
    if (products.length === 0) return null;

    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
    const avgRating = products.reduce((sum, p) => sum + p.rating, 0) / products.length;

    // Compter par categorie
    const categoryMap = new Map<string, number>();
    for (const p of products) {
      categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + 1);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return { avgPrice, avgRating, byCategory };
  });
}
```

## Ce que tu aurais pu oublier

### 1. Mettre toute la logique dans un seul service
- ❌ Un service "DashboardService" qui géré donnees + filtres + tri → trop de responsabilites
- ✅ Trois services specialises composes ensemble dans le composant → separation des responsabilites

### 2. Filtrer et trier dans le template
- ❌ Boucler sur `products()` et filtrer dans le template → illisible et non performant
- ✅ Un `computed` qui filtre et trie → calcul réactif cache, recalcule seulement quand nécessaire

### 3. Muter le tableau dans le computed
- ❌ `this.dataService.products().sort(...)` → `.sort()` mute le tableau original
- ✅ `[...this.dataService.products()].sort(...)` → on travaille sur une copie

### 4. Ne pas gérer le cas "aucun résultat"
- ❌ Pas de `@empty` dans le `@for` → tableau vide sans indication
- ✅ `@empty` affiche un message quand la liste filtree est vide

### 5. Oublier que getSortIndicator est réactif dans le template
- ❌ Croire qu'il faut un computed pour l'indicateur de tri → la méthode est appelee dans le template
- ✅ Les méthodes appelees dans le template qui lisent des signaux sont réactives grace au template

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| Separation des responsabilites | Chaque service géré un aspect (donnees, filtrage, tri) |
| Composition de services | Le composant compose les trois services pour créer la logique complete |
| `computed` multi-services | Un computed peut dépendre de signaux provenant de plusieurs services |
| `inject()` multiple | Un composant peut injecter autant de services que nécessaire |
| Singleton partage | Les composants enfants (filters, table) partagent les memes instances de service |
| `input.required` pour les donnees | Le tableau recoit les donnees filtrees/triees via input (pas en injectant le service) |
| Tri avec `localeCompare` | Pour trier des chaines de caracteres correctement (accents, etc.) |
| `Map` pour l'agregation | Utilisation de `Map` pour compter les produits par categorie |
