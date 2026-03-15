# Correction — Exercice 14 : CRUD API

## Résultat attendu

Une application complete qui communique avec json-server pour lister, créer, modifier et supprimer des produits. Chaque operation met a jour la liste. Les erreurs réseau sont capturees et affichees. Un indicateur de chargement s'affiche pendant les requêtes.

## Code corrige

### `db.json` (racine du projet)

```json
{
  "products": [
    {
      "id": 1,
      "name": "Clavier mecanique",
      "price": 129.99,
      "description": "Clavier RGB avec switches Cherry MX Blue",
      "category": "Peripheriques"
    },
    {
      "id": 2,
      "name": "Souris ergonomique",
      "price": 79.99,
      "description": "Souris verticale sans fil",
      "category": "Peripheriques"
    },
    {
      "id": 3,
      "name": "Ecran 4K 27 pouces",
      "price": 449.99,
      "description": "Moniteur IPS 4K UHD",
      "category": "Ecrans"
    },
    {
      "id": 4,
      "name": "Casque audio",
      "price": 199.99,
      "description": "Casque sans fil avec ANC",
      "category": "Audio"
    }
  ]
}
```

### `src/app/exercises/ex14/models/product.model.ts`

```typescript
// Interface stricte pour un produit
export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly description: string;
  readonly category: string;
}

// Type pour la creation (pas d'id, genere par le serveur)
export type CreateProduct = Omit<Product, 'id'>;

// Type pour la mise a jour partielle
export type UpdateProduct = Partial<Omit<Product, 'id'>>;
```

### `src/app/exercises/ex14/services/product.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Product, CreateProduct, UpdateProduct } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  // Injection de HttpClient (provideHttpClient() doit etre dans app.config)
  private readonly http = inject(HttpClient);

  // URL de base de l'API json-server
  private readonly apiUrl = 'http://localhost:3000/products';

  /**
   * Recupere tous les produits.
   * GET /products
   */
  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Recupere un produit par son ID.
   * GET /products/:id
   */
  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Cree un nouveau produit.
   * POST /products
   * Le type Omit<Product, 'id'> garantit qu'on n'envoie pas d'id.
   */
  create(product: CreateProduct): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Met a jour un produit existant.
   * PUT /products/:id
   * Partial<Product> permet de n'envoyer que les champs modifies.
   */
  update(id: number, product: UpdateProduct): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Supprime un produit.
   * DELETE /products/:id
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Gestion centralisee des erreurs HTTP.
   * Transforme l'erreur en message lisible.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message: string;

    if (error.status === 0) {
      // Erreur reseau (serveur injoignable)
      message = 'Impossible de contacter le serveur. Verifiez que json-server est lance.';
    } else if (error.status === 404) {
      message = 'Ressource introuvable (404).';
    } else if (error.status >= 500) {
      message = `Erreur serveur (${error.status}).`;
    } else {
      message = `Erreur HTTP ${error.status}: ${error.message}`;
    }

    console.error('[ProductService]', message, error);
    return throwError(() => new Error(message));
  }
}
```

### `src/app/exercises/ex14/product-form.component.ts`

```typescript
import {
  Component,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product, CreateProduct } from './models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-overlay" (click)="cancel()">
      <div class="form-panel" (click)="$event.stopPropagation()">
        <h3>{{ editProduct() ? 'Modifier' : 'Ajouter' }} un produit</h3>

        <form (ngSubmit)="submit()" class="product-form">
          <label>
            Nom *
            <input
              type="text"
              [value]="name()"
              (input)="updateField('name', $event)"
              required
            />
          </label>

          <label>
            Prix *
            <input
              type="number"
              [value]="price()"
              (input)="updateField('price', $event)"
              min="0.01"
              step="0.01"
              required
            />
          </label>

          <label>
            Description
            <textarea
              [value]="description()"
              (input)="updateField('description', $event)"
              rows="3"
            ></textarea>
          </label>

          <label>
            Categorie
            <input
              type="text"
              [value]="category()"
              (input)="updateField('category', $event)"
            />
          </label>

          <!-- Messages de validation -->
          @if (name().trim() === '') {
            <p class="validation-error">Le nom est requis.</p>
          }
          @if (price() <= 0) {
            <p class="validation-error">Le prix doit etre superieur a 0.</p>
          }

          <div class="form-actions">
            <button
              type="submit"
              [disabled]="!isValid()"
              class="btn-save"
            >
              {{ editProduct() ? 'Mettre a jour' : 'Creer' }}
            </button>
            <button type="button" (click)="cancel()" class="btn-cancel">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
    .form-panel {
      background: white; border-radius: 8px;
      padding: 2rem; min-width: 400px;
      max-width: 500px;
    }
    h3 { margin-top: 0; }
    .product-form {
      display: flex; flex-direction: column; gap: 1rem;
    }
    label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-weight: 600; font-size: 0.9rem;
    }
    input, textarea {
      padding: 0.5rem; border: 1px solid #ccc;
      border-radius: 4px; font-size: 1rem;
    }
    .validation-error { color: #c62828; font-size: 0.85rem; margin: 0; }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .btn-save {
      background: #4caf50; color: white; border: none;
      padding: 0.6rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
    }
    .btn-save:disabled { background: #ccc; cursor: not-allowed; }
    .btn-cancel {
      background: #e0e0e0; color: #333; border: none;
      padding: 0.6rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
    }
  `],
})
export class ProductFormComponent {
  // Input optionnel : si fourni, on est en mode edition
  readonly editProduct = input<Product | null>(null);

  // Outputs pour communiquer avec le parent
  readonly saved = output<CreateProduct>();
  readonly cancelled = output<void>();

  // Signaux pour les champs du formulaire
  readonly name = signal<string>('');
  readonly price = signal<number>(0);
  readonly description = signal<string>('');
  readonly category = signal<string>('');

  constructor() {
    // Effect : pre-remplir le formulaire si on est en mode edition
    effect(() => {
      const product = this.editProduct();
      if (product) {
        this.name.set(product.name);
        this.price.set(product.price);
        this.description.set(product.description);
        this.category.set(product.category);
      }
    });
  }

  updateField(field: 'name' | 'price' | 'description' | 'category', event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    switch (field) {
      case 'name':
        this.name.set(target.value);
        break;
      case 'price':
        this.price.set(Number(target.value));
        break;
      case 'description':
        this.description.set(target.value);
        break;
      case 'category':
        this.category.set(target.value);
        break;
    }
  }

  isValid(): boolean {
    return this.name().trim() !== '' && this.price() > 0;
  }

  submit(): void {
    if (!this.isValid()) return;

    const product: CreateProduct = {
      name: this.name().trim(),
      price: this.price(),
      description: this.description().trim(),
      category: this.category().trim(),
    };

    this.saved.emit(product);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
```

### `src/app/exercises/ex14/product-list.component.ts`

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductService } from './services/product.service';
import { ProductFormComponent } from './product-form.component';
import { Product, CreateProduct } from './models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CurrencyPipe, ProductFormComponent],
  template: `
    <div class="crud-container">
      <header class="header">
        <h2>Gestion des Produits</h2>
        <button (click)="openCreateForm()" class="btn-add">
          + Ajouter un produit
        </button>
      </header>

      <!-- Indicateur de chargement -->
      @if (loading()) {
        <div class="loading-bar">Chargement...</div>
      }

      <!-- Message d'erreur -->
      @if (error()) {
        <div class="error-banner">
          {{ error() }}
          <button (click)="error.set('')" class="btn-dismiss">x</button>
        </div>
      }

      <!-- Tableau des produits -->
      @if (products().length > 0) {
        <table class="product-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Prix</th>
              <th>Categorie</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (product of products(); track product.id) {
              <tr>
                <td>{{ product.id }}</td>
                <td>{{ product.name }}</td>
                <td>{{ product.price | currency:'EUR' }}</td>
                <td>{{ product.category }}</td>
                <td class="actions">
                  <button
                    (click)="openEditForm(product)"
                    class="btn-edit"
                  >
                    Modifier
                  </button>
                  <button
                    (click)="confirmDelete(product)"
                    class="btn-delete"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (!loading()) {
        <p class="empty">Aucun produit pour le moment.</p>
      }

      <!-- Modale du formulaire -->
      @if (showForm()) {
        <app-product-form
          [editProduct]="selectedProduct()"
          (saved)="onSave($event)"
          (cancelled)="closeForm()"
        />
      }
    </div>
  `,
  styles: [`
    .crud-container {
      max-width: 900px;
      margin: 0 auto;
      font-family: 'Segoe UI', sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    h2 { margin: 0; }

    .btn-add {
      background: #1976d2; color: white; border: none;
      padding: 0.6rem 1.2rem; border-radius: 4px;
      cursor: pointer; font-size: 0.95rem;
    }

    .loading-bar {
      background: #e3f2fd; color: #1565c0;
      padding: 0.5rem; text-align: center;
      border-radius: 4px; margin-bottom: 1rem;
    }

    .error-banner {
      background: #ffebee; color: #c62828;
      padding: 0.75rem 1rem; border-radius: 4px;
      margin-bottom: 1rem;
      display: flex; justify-content: space-between; align-items: center;
    }
    .btn-dismiss {
      background: none; border: none; color: #c62828;
      cursor: pointer; font-weight: 700; font-size: 1.1rem;
    }

    .product-table {
      width: 100%; border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem; text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th { background: #f5f5f5; font-weight: 600; }
    tr:hover { background: #fafafa; }

    .actions { display: flex; gap: 0.5rem; }
    .btn-edit {
      background: #ff9800; color: white; border: none;
      padding: 0.3rem 0.8rem; border-radius: 4px;
      cursor: pointer; font-size: 0.85rem;
    }
    .btn-delete {
      background: #f44336; color: white; border: none;
      padding: 0.3rem 0.8rem; border-radius: 4px;
      cursor: pointer; font-size: 0.85rem;
    }

    .empty { text-align: center; color: #999; padding: 2rem; }
  `],
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);

  // Signaux pour l'etat du composant
  readonly products = signal<Product[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly showForm = signal<boolean>(false);
  readonly selectedProduct = signal<Product | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Charge tous les produits depuis l'API.
   */
  loadProducts(): void {
    this.loading.set(true);
    this.error.set('');

    this.productService.getAll().subscribe({
      next: (products: Product[]) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.selectedProduct.set(null);
    this.showForm.set(true);
  }

  openEditForm(product: Product): void {
    this.selectedProduct.set(product);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedProduct.set(null);
  }

  /**
   * Sauvegarde un produit (creation ou mise a jour).
   */
  onSave(productData: CreateProduct): void {
    const existing = this.selectedProduct();

    if (existing) {
      // Mode edition : PUT
      this.productService.update(existing.id, productData).subscribe({
        next: () => {
          this.closeForm();
          this.loadProducts(); // Rafraichir la liste
        },
        error: (err: Error) => this.error.set(err.message),
      });
    } else {
      // Mode creation : POST
      this.productService.create(productData).subscribe({
        next: () => {
          this.closeForm();
          this.loadProducts(); // Rafraichir la liste
        },
        error: (err: Error) => this.error.set(err.message),
      });
    }
  }

  /**
   * Demande confirmation avant de supprimer un produit.
   */
  confirmDelete(product: Product): void {
    const confirmed = confirm(
      `Voulez-vous vraiment supprimer "${product.name}" ?`
    );

    if (confirmed) {
      this.productService.delete(product.id).subscribe({
        next: () => this.loadProducts(), // Rafraichir la liste
        error: (err: Error) => this.error.set(err.message),
      });
    }
  }
}
```

### Configuration de l'application

```typescript
// app.config.ts — ajouter provideHttpClient
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    // Fournit HttpClient a toute l'application
    provideHttpClient(),
  ],
};
```

## Ce que tu aurais pu oublier

### 1. Oublier `provideHttpClient()` dans la configuration

- ❌ Sans `provideHttpClient()`, `HttpClient` n'est pas injectable :
  ```
  NullInjectorError: No provider for HttpClient!
  ```
- ✅ Ajouter `provideHttpClient()` dans `app.config.ts`

### 2. Ne pas typer les méthodes HTTP

- ❌ Appels HTTP sans generic (type `Object` par defaut) :
  ```typescript
  this.http.get(this.apiUrl)
  ```
- ✅ Toujours typer les appels HTTP avec un generic :
  ```typescript
  this.http.get<Product[]>(this.apiUrl)
  ```

### 3. Ne pas centraliser la gestion d'erreur

- ❌ Dupliquer `catchError` avec la même logique dans chaque méthode
- ✅ Extraire une méthode `handleError` privee et réutilisable

### 4. Oublier de rafraichir la liste après une operation

- ❌ Créer/modifier/supprimer sans mettre a jour la liste affichee
- ✅ Appeler `loadProducts()` dans le callback `next` de chaque operation

### 5. Utiliser `any` pour le type de création

- ❌ `create(product: any)` — perd tout le benefice du typage
- ✅ `create(product: Omit<Product, 'id'>)` — type strict sans l'id

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `HttpClient` | Service Angular pour les requêtes HTTP |
| `provideHttpClient()` | Fournit HttpClient dans la configuration standalone |
| `Observable<T>` | Flux asynchrone type retourne par HttpClient |
| `catchError` | Operateur RxJS pour intercepter et transformer les erreurs |
| `Omit<T, K>` | Type utilitaire TypeScript qui exclut des propriétés |
| `Partial<T>` | Type utilitaire TypeScript qui rend toutes les propriétés optionnelles |
| `json-server` | Serveur REST mock base sur un fichier JSON |
| `signal()` | État réactif pour l'UI (loading, error, products) |
| `input()` / `output()` | Communication parent-enfant en Angular 19+ |
