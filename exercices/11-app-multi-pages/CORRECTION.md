# Correction — Exercice 11 : App multi-pages

## Resultat attendu

Une application Angular avec 5 pages navigables via une barre de navigation. Le lien actif est visuellement mis en evidence. La page produits affiche une liste cliquable, chaque clic mene vers la page detail du produit correspondant. Les URLs inconnues redirigent vers une page 404.

## Code corrige

### `src/app/exercises/ex11/models/product.model.ts`

```typescript
// Interface definissant la structure d'un produit
export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly description: string;
  readonly imageUrl?: string;
}
```

### `src/app/exercises/ex11/data/products.data.ts`

```typescript
import { Product } from '../models/product.model';

// Donnees en dur pour simuler une source de donnees
export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Clavier mecanique',
    price: 129.99,
    description: 'Clavier mecanique RGB avec switches Cherry MX Blue.',
  },
  {
    id: 2,
    name: 'Souris ergonomique',
    price: 79.99,
    description: 'Souris verticale pour reduire la fatigue du poignet.',
  },
  {
    id: 3,
    name: 'Ecran 4K 27"',
    price: 449.99,
    description: 'Moniteur IPS 4K UHD avec calibration usine sRGB 100%.',
  },
  {
    id: 4,
    name: 'Casque audio',
    price: 199.99,
    description: 'Casque sans fil avec reduction de bruit active.',
  },
  {
    id: 5,
    name: 'Hub USB-C',
    price: 59.99,
    description: 'Hub 7-en-1 avec HDMI 4K, USB-A, lecteur SD.',
  },
];
```

### `src/app/exercises/ex11/ex11.routes.ts`

```typescript
import { Routes } from '@angular/router';

// Configuration des routes — Angular 19+ standalone
// L'ordre est important : les routes specifiques avant le wildcard
export const EX11_ROUTES: Routes = [
  {
    path: '',
    // Redirection vers home si chemin vide
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home.component').then((m) => m.HomeComponent),
    // data optionnel pour le breadcrumb (bonus)
    data: { breadcrumb: 'Accueil' },
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/product-list.component').then(
        (m) => m.ProductListComponent
      ),
    data: { breadcrumb: 'Produits' },
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./pages/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
    data: { breadcrumb: 'Detail produit' },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component').then((m) => m.AboutComponent),
    data: { breadcrumb: 'A propos' },
  },
  {
    // Wildcard : toute URL non reconnue affiche la page 404
    path: '**',
    loadComponent: () =>
      import('./pages/not-found.component').then((m) => m.NotFoundComponent),
  },
];
```

### `src/app/exercises/ex11/layout.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-ex11-layout',
  standalone: true,
  // On importe les directives de routing necessaires
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Barre de navigation -->
      <nav class="navbar">
        <h1 class="logo">Ma Boutique</h1>
        <ul class="nav-links">
          <li>
            <!-- routerLink pour la navigation sans rechargement de page -->
            <!-- routerLinkActive ajoute la classe 'active' quand la route correspond -->
            <a routerLink="home"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }">
              Accueil
            </a>
          </li>
          <li>
            <a routerLink="products"
               routerLinkActive="active">
              Produits
            </a>
          </li>
          <li>
            <a routerLink="about"
               routerLinkActive="active">
              A propos
            </a>
          </li>
        </ul>
      </nav>

      <!-- Zone d'affichage du composant route -->
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      font-family: 'Segoe UI', sans-serif;
      min-height: 100vh;
    }

    .navbar {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 0 2rem;
      background: #1976d2;
      color: white;
      height: 64px;
    }

    .logo {
      font-size: 1.4rem;
      margin: 0;
    }

    .nav-links {
      display: flex;
      list-style: none;
      gap: 1rem;
      margin: 0;
      padding: 0;
    }

    .nav-links a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .nav-links a:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    /* Classe ajoutee automatiquement par routerLinkActive */
    .nav-links a.active {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      font-weight: 600;
    }

    .content {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  `],
})
export class LayoutComponent {}
```

### `src/app/exercises/ex11/pages/home.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="home">
      <h2>Bienvenue sur Ma Boutique</h2>
      <p>Decouvrez notre selection de produits tech.</p>

      <div class="cta">
        <!-- Navigation programmatique via routerLink -->
        <a routerLink="/products" class="btn-primary">
          Voir les produits
        </a>
        <a routerLink="/about" class="btn-secondary">
          En savoir plus
        </a>
      </div>
    </section>
  `,
  styles: [`
    .home {
      text-align: center;
      padding: 3rem 0;
    }

    h2 { font-size: 2rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; color: #666; margin-bottom: 2rem; }

    .cta { display: flex; gap: 1rem; justify-content: center; }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
    }
    .btn-primary { background: #1976d2; color: white; }
    .btn-secondary { background: #e0e0e0; color: #333; }
  `],
})
export class HomeComponent {}
```

### `src/app/exercises/ex11/pages/product-list.component.ts`

```typescript
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../models/product.model';
import { PRODUCTS } from '../data/products.data';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <h2>Nos Produits</h2>

    <div class="product-grid">
      <!-- Boucle sur les produits avec le nouveau @for -->
      @for (product of products(); track product.id) {
        <div class="product-card">
          <h3>{{ product.name }}</h3>
          <p class="price">{{ product.price | currency:'EUR' }}</p>
          <p class="desc">{{ product.description }}</p>
          <!-- routerLink dynamique avec l'id du produit -->
          <a [routerLink]="['/products', product.id]" class="detail-link">
            Voir le detail
          </a>
        </div>
      } @empty {
        <p>Aucun produit disponible.</p>
      }
    </div>
  `,
  styles: [`
    h2 { margin-bottom: 1.5rem; }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .product-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      transition: box-shadow 0.2s;
    }
    .product-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

    h3 { margin: 0 0 0.5rem; }
    .price { font-size: 1.3rem; font-weight: 700; color: #1976d2; }
    .desc { color: #666; font-size: 0.9rem; }

    .detail-link {
      display: inline-block;
      margin-top: 0.5rem;
      color: #1976d2;
      text-decoration: none;
      font-weight: 600;
    }
    .detail-link:hover { text-decoration: underline; }
  `],
})
export class ProductListComponent {
  // Signal contenant la liste des produits
  readonly products = signal<Product[]>(PRODUCTS);
}
```

### `src/app/exercises/ex11/pages/product-detail.component.ts`

```typescript
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../models/product.model';
import { PRODUCTS } from '../data/products.data';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <!-- Affichage conditionnel avec @if / @else -->
    @if (product()) {
      <div class="product-detail">
        <a routerLink="/products" class="back-link">← Retour aux produits</a>

        <h2>{{ product()!.name }}</h2>
        <p class="price">{{ product()!.price | currency:'EUR' }}</p>
        <p class="description">{{ product()!.description }}</p>
      </div>
    } @else {
      <div class="not-found">
        <h2>Produit introuvable</h2>
        <p>Aucun produit ne correspond a l'identifiant "{{ id() }}".</p>
        <a routerLink="/products" class="back-link">Retour aux produits</a>
      </div>
    }
  `,
  styles: [`
    .back-link {
      color: #1976d2;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .back-link:hover { text-decoration: underline; }

    .price {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1976d2;
    }

    .description {
      font-size: 1.1rem;
      color: #555;
      line-height: 1.6;
    }

    .not-found {
      text-align: center;
      padding: 3rem 0;
      color: #999;
    }
  `],
})
export class ProductDetailComponent {
  // Angular 19+ : les parametres de route sont injectes via input()
  // Le router mappe automatiquement :id vers cet input
  readonly id = input.required<string>();

  // Computed qui recherche le produit correspondant a l'id
  readonly product = computed<Product | undefined>(() => {
    const numericId = Number(this.id());
    return PRODUCTS.find((p) => p.id === numericId);
  });
}
```

### `src/app/exercises/ex11/pages/about.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <section class="about">
      <h2>A propos</h2>
      <p>
        Ma Boutique est une application de demonstration construite avec
        <strong>Angular 19+</strong> en mode standalone.
      </p>
      <p>
        Cet exercice illustre le routing, les parametres de route
        et la navigation entre pages.
      </p>
    </section>
  `,
  styles: [`
    .about { max-width: 600px; }
    p { line-height: 1.8; color: #555; margin-bottom: 1rem; }
  `],
})
export class AboutComponent {}
```

### `src/app/exercises/ex11/pages/not-found.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <h1>404</h1>
      <h2>Page introuvable</h2>
      <p>La page que vous cherchez n'existe pas.</p>
      <a routerLink="/home" class="home-link">Retour a l'accueil</a>
    </section>
  `,
  styles: [`
    .not-found {
      text-align: center;
      padding: 4rem 0;
    }
    h1 { font-size: 6rem; color: #e0e0e0; margin: 0; }
    h2 { color: #666; }
    p { color: #999; margin-bottom: 2rem; }
    .home-link {
      background: #1976d2;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      text-decoration: none;
    }
  `],
})
export class NotFoundComponent {}
```

## Ce que tu aurais pu oublier

### 1. Oublier `withComponentInputBinding()` dans la config

- ❌ Ne pas activer le binding des parametres de route vers les inputs :
  ```typescript
  provideRouter(routes)
  ```
- ✅ Activer le binding pour que `input()` recoive les parametres de route :
  ```typescript
  provideRouter(routes, withComponentInputBinding())
  ```

### 2. Oublier le `pathMatch: 'full'` sur la redirection

- ❌ Sans `pathMatch`, la redirection intercepte toutes les routes :
  ```typescript
  { path: '', redirectTo: 'home' }
  ```
- ✅ Avec `pathMatch: 'full'`, seul le chemin vide exact est redirige :
  ```typescript
  { path: '', redirectTo: 'home', pathMatch: 'full' }
  ```

### 3. Placer le wildcard `**` avant les autres routes

- ❌ Le wildcard en premier intercepte tout :
  ```typescript
  { path: '**', component: NotFoundComponent },
  { path: 'products', component: ProductListComponent },
  ```
- ✅ Le wildcard doit toujours etre en **dernier** :
  ```typescript
  { path: 'products', component: ProductListComponent },
  { path: '**', component: NotFoundComponent },
  ```

### 4. Oublier d'importer `RouterLink` et `RouterOutlet`

- ❌ En standalone, les directives ne sont pas disponibles automatiquement
- ✅ Il faut explicitement importer `RouterLink`, `RouterLinkActive`, `RouterOutlet` dans le tableau `imports`

### 5. Ne pas convertir l'id (string) en number pour la recherche

- ❌ Comparer directement le parametre string avec un id number :
  ```typescript
  PRODUCTS.find(p => p.id === this.id())
  ```
- ✅ Convertir le parametre en number avant la comparaison :
  ```typescript
  PRODUCTS.find(p => p.id === Number(this.id()))
  ```

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `Routes` | Tableau de configuration des routes Angular |
| `routerLink` | Directive pour naviguer sans recharger la page |
| `routerLinkActive` | Directive qui ajoute une classe CSS quand la route est active |
| `router-outlet` | Emplacement ou le composant route est rendu |
| `input()` pour params | Angular 19+ : les parametres de route sont injectes comme inputs |
| `withComponentInputBinding()` | Active le mapping automatique parametres → inputs |
| `loadComponent` | Lazy loading d'un composant standalone |
| `computed()` | Signal derive qui se recalcule quand ses dependances changent |
| Wildcard `**` | Route qui capture toutes les URLs non reconnues |
| `pathMatch: 'full'` | La redirection ne se declenche que si le chemin complet correspond |
