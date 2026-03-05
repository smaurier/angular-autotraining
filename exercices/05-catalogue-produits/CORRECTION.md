# Correction — Exercice 05 : Catalogue produits

## Resultat attendu

Un catalogue affichant :
- Une grille de cartes produits (nom, prix, description, disponibilite)
- Un bouton "Ajouter au panier" sur chaque carte (desactive si rupture de stock)
- Un resume du panier en haut : nombre d'articles et prix total
- Chaque clic sur "Ajouter" ajoute le produit au panier

## Code corrige

### Composant enfant : ProductCardComponent

```typescript
// src/app/exercises/ex05/product-card.component.ts

// input : fonction pour declarer un input de composant (remplace @Input())
// output : fonction pour declarer un output de composant (remplace @Output())
// Ces deux fonctions sont la syntaxe moderne Angular 17+
import { Component, input, output } from '@angular/core';

// --- Interface Product ---
// Exportee pour etre reutilisee dans le composant parent
export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [],
  template: `
    <div class="card" [class.out-of-stock]="!product().inStock">
      <!-- En-tete de la carte avec le nom du produit -->
      <h3>{{ product().name }}</h3>

      <!-- Prix formate en euros -->
      <!-- .toFixed(2) assure 2 decimales -->
      <p class="price">{{ product().price.toFixed(2) }} EUR</p>

      <!-- Description du produit -->
      <p class="description">{{ product().description }}</p>

      <!-- Badge de disponibilite -->
      @if (product().inStock) {
        <span class="badge in-stock">En stock</span>
      } @else {
        <span class="badge out">Rupture de stock</span>
      }

      <!-- Bouton ajouter au panier -->
      <!-- .emit() envoie le produit au composant parent -->
      <!-- [disabled] desactive le bouton si le produit n'est pas en stock -->
      <button
        (click)="addToCart.emit(product())"
        [disabled]="!product().inStock"
      >
        Ajouter au panier
      </button>
    </div>
  `,
  styles: [`
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card.out-of-stock {
      opacity: 0.6;
    }
    h3 {
      margin: 0;
      color: #333;
    }
    .price {
      font-size: 1.25rem;
      font-weight: bold;
      color: #1976d2;
      margin: 0;
    }
    .description {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
      flex: 1;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      width: fit-content;
    }
    .badge.in-stock { background: #e8f5e9; color: #2e7d32; }
    .badge.out { background: #ffebee; color: #c62828; }
    button {
      padding: 0.5rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    button:hover:not(:disabled) {
      background: #1565c0;
    }
  `]
})
export class ProductCardComponent {

  // --- Input obligatoire ---
  // input.required<Product>() : le composant DOIT recevoir un produit
  // Si le parent ne le fournit pas, Angular leve une erreur a la compilation
  // Equivalent Vue 3 : defineProps<{ product: Product }>() avec required
  readonly product = input.required<Product>();

  // --- Output ---
  // output<Product>() : declare un evenement que le parent peut ecouter
  // On emet le produit quand l'utilisateur clique sur "Ajouter au panier"
  // Equivalent Vue 3 : defineEmits<{ addToCart: [product: Product] }>()
  readonly addToCart = output<Product>();
}
```

### Composant parent : ProductCatalogComponent

```typescript
// src/app/exercises/ex05/product-catalog.component.ts

import { Component, signal, computed } from '@angular/core';
// On importe le composant enfant et l'interface Product
import { ProductCardComponent, Product } from './product-card.component';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  // On importe le composant enfant pour l'utiliser dans le template
  imports: [ProductCardComponent],
  template: `
    <div class="catalog-container">
      <h1>Catalogue produits</h1>

      <!-- Resume du panier -->
      <div class="cart-summary">
        <span>Panier : {{ cartCount() }} article{{ cartCount() > 1 ? 's' : '' }}</span>
        <span class="total">Total : {{ cartTotal().toFixed(2) }} EUR</span>
      </div>

      <!-- Champ de recherche (bonus) -->
      <input
        type="text"
        class="search"
        [value]="searchTerm()"
        (input)="onSearch($event)"
        placeholder="Rechercher un produit..."
      />

      <!-- Grille de produits -->
      <div class="grid">
        <!-- On itere sur filteredProducts (bonus) ou products -->
        @for (product of filteredProducts(); track product.id) {
          <!-- On passe le produit en input et on ecoute l'output addToCart -->
          <!-- [product]="product" : property binding vers l'input du composant enfant -->
          <!-- (addToCart)="onAddToCart($event)" : ecoute l'output du composant enfant -->
          <app-product-card
            [product]="product"
            (addToCart)="onAddToCart($event)"
          />
        } @empty {
          <p class="empty">Aucun produit ne correspond a votre recherche.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .catalog-container {
      padding: 2rem;
      max-width: 800px;
      font-family: sans-serif;
    }
    .cart-summary {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background: #e3f2fd;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-weight: bold;
    }
    .total { color: #1976d2; }
    .search {
      width: 100%;
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-bottom: 1rem;
      box-sizing: border-box;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .empty {
      grid-column: 1 / -1;
      text-align: center;
      color: #999;
      font-style: italic;
    }
  `]
})
export class ProductCatalogComponent {

  // --- Signal products ---
  // Liste des produits du catalogue, donnees en dur pour l'exercice
  readonly products = signal<Product[]>([
    { id: 1, name: 'Clavier mecanique', price: 89.99, description: 'Clavier RGB avec switches Cherry MX', inStock: true },
    { id: 2, name: 'Souris ergonomique', price: 45.50, description: 'Souris verticale sans fil', inStock: true },
    { id: 3, name: 'Ecran 27 pouces', price: 349.00, description: 'Ecran 4K IPS avec USB-C', inStock: false },
    { id: 4, name: 'Casque audio', price: 129.99, description: 'Casque sans fil avec reduction de bruit', inStock: true },
    { id: 5, name: 'Webcam HD', price: 59.99, description: 'Webcam 1080p avec micro integre', inStock: true },
  ]);

  // --- Signal cart ---
  // Le panier contient les produits ajoutes par l'utilisateur
  readonly cart = signal<Product[]>([]);

  // --- Signal searchTerm (bonus) ---
  // Terme de recherche pour filtrer les produits
  readonly searchTerm = signal<string>('');

  // --- Computed cartCount ---
  // Nombre d'articles dans le panier
  readonly cartCount = computed<number>(() => this.cart().length);

  // --- Computed cartTotal ---
  // Prix total du panier : on additionne les prix avec .reduce()
  readonly cartTotal = computed<number>(
    () => this.cart().reduce((sum, product) => sum + product.price, 0)
  );

  // --- Computed filteredProducts (bonus) ---
  // Filtre les produits selon le terme de recherche
  readonly filteredProducts = computed<Product[]>(() => {
    const term = this.searchTerm().toLowerCase();
    if (term === '') return this.products();
    return this.products().filter((product) =>
      product.name.toLowerCase().includes(term)
    );
  });

  // --- Methode onAddToCart ---
  // Appelee quand le composant enfant emet l'evenement addToCart
  // $event contient le produit emis par le composant enfant
  onAddToCart(product: Product): void {
    // On ajoute le produit au panier avec update() + spread
    this.cart.update((prev) => [...prev, product]);
    console.log(`Ajoute au panier : ${product.name}`);
  }

  // --- Methode onSearch (bonus) ---
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier d'importer le composant enfant
- ❌ Ne pas ajouter `ProductCardComponent` dans `imports` du parent → `<app-product-card>` non reconnu
- ✅ `imports: [ProductCardComponent]` dans le decorateur `@Component` du parent

### 2. Utiliser `@Input()` au lieu de `input()`
- ❌ `@Input() product!: Product` → ancienne syntaxe avec decorateur
- ✅ `product = input.required<Product>()` → nouvelle syntaxe fonctionnelle Angular 17+

### 3. Oublier `.emit()` sur l'output
- ❌ `(click)="addToCart(product())"` → appelle une methode qui n'existe pas
- ✅ `(click)="addToCart.emit(product())"` → emet l'evenement vers le parent

### 4. Ne pas typer `$event` dans le parent
- ❌ `onAddToCart($event: any)` → viole la contrainte zero `any`
- ✅ `onAddToCart(product: Product)` → le type est infere depuis l'output

### 5. Oublier `track` dans le `@for`
- ❌ `@for (product of products())` → erreur, track est obligatoire
- ✅ `@for (product of products(); track product.id)` → identification unique

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `input.required<T>()` | Declare un input obligatoire avec typage generique (remplace `@Input()`) |
| `output<T>()` | Declare un output avec le type de donnee emise (remplace `@Output()`) |
| `output.emit(value)` | Emet une valeur vers le composant parent |
| `[property]="value"` | Passe une valeur au composant enfant (property binding) |
| `(event)="handler($event)"` | Ecoute un evenement du composant enfant |
| Composition de composants | Un parent orchestre plusieurs enfants via inputs/outputs |
| `imports: [ChildComponent]` | Le parent doit importer les composants enfants utilises dans son template |
