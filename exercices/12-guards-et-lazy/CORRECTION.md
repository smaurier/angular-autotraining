# Correction — Exercice 12 : Guards et lazy loading

## Resultat attendu

L'application de l'exercice 11 est enrichie avec un systeme d'authentification simule. Les routes protegees redirigent vers la page de login. La section admin n'est accessible qu'aux administrateurs. Le formulaire d'edition demande confirmation avant de quitter s'il y a des modifications non sauvegardees. La section admin est chargee en lazy loading.

## Code corrige

### `src/app/exercises/ex12/services/auth.service.ts`

```typescript
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signaux pour l'etat d'authentification
  readonly isLoggedIn = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);

  // Computed pour afficher le statut dans le template
  readonly statusLabel = computed(() => {
    if (!this.isLoggedIn()) return 'Deconnecte';
    return this.isAdmin() ? 'Admin' : 'Utilisateur';
  });

  login(): void {
    // Simule une connexion
    this.isLoggedIn.set(true);
  }

  logout(): void {
    // Remet tout a zero
    this.isLoggedIn.set(false);
    this.isAdmin.set(false);
  }

  toggleAdmin(): void {
    // Bascule le role admin
    this.isAdmin.update((current) => !current);
  }
}
```

### `src/app/exercises/ex12/guards/auth.guard.ts`

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard fonctionnel Angular 19+ — pas de classe, juste une fonction
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // L'utilisateur est connecte, on autorise l'acces
    return true;
  }

  // Redirection vers la page de login avec l'URL d'origine
  return router.createUrlTree(['/login']);
};
```

### `src/app/exercises/ex12/guards/admin.guard.ts`

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard fonctionnel qui verifie le role admin
export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // D'abord verifier l'authentification
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // Puis verifier le role admin
  if (!authService.isAdmin()) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
```

### `src/app/exercises/ex12/guards/can-deactivate.guard.ts`

```typescript
import { CanDeactivateFn } from '@angular/router';

// Interface que les composants avec formulaire doivent implementer
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

// Guard fonctionnel canDeactivate
// Verifie si le composant a des modifications non sauvegardees
export const canDeactivateGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component: HasUnsavedChanges
): boolean => {
  if (component.hasUnsavedChanges()) {
    // Demande confirmation a l'utilisateur
    return confirm(
      'Vous avez des modifications non sauvegardees. Voulez-vous vraiment quitter cette page ?'
    );
  }
  // Pas de modifications, on autorise la navigation
  return true;
};
```

### `src/app/exercises/ex12/pages/login.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <section class="login-page">
      <h2>Connexion</h2>
      <p>Simulez une connexion pour acceder aux pages protegees.</p>

      <div class="actions">
        <button (click)="login()" class="btn-primary">
          Se connecter
        </button>
      </div>
    </section>
  `,
  styles: [`
    .login-page { text-align: center; padding: 3rem 0; }
    p { color: #666; margin-bottom: 2rem; }
    .btn-primary {
      background: #1976d2; color: white; border: none;
      padding: 0.75rem 2rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  login(): void {
    this.authService.login();
    // Redirige vers l'accueil apres connexion
    this.router.navigate(['/home']);
  }
}
```

### `src/app/exercises/ex12/pages/unauthorized.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="unauthorized">
      <h1>403</h1>
      <h2>Acces refuse</h2>
      <p>Vous n'avez pas les droits necessaires pour acceder a cette page.</p>
      <a routerLink="/home" class="home-link">Retour a l'accueil</a>
    </section>
  `,
  styles: [`
    .unauthorized { text-align: center; padding: 4rem 0; }
    h1 { font-size: 6rem; color: #f44336; margin: 0; }
    h2 { color: #666; }
    p { color: #999; margin-bottom: 2rem; }
    .home-link {
      background: #1976d2; color: white;
      padding: 0.75rem 1.5rem; border-radius: 4px;
      text-decoration: none;
    }
  `],
})
export class UnauthorizedComponent {}
```

### `src/app/exercises/ex12/pages/edit-product.component.ts`

```typescript
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasUnsavedChanges } from '../guards/can-deactivate.guard';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h2>Modifier un produit</h2>

      <!-- Indicateur de modifications non sauvegardees -->
      @if (isDirty()) {
        <div class="unsaved-badge">Modifications non sauvegardees</div>
      }

      <form class="edit-form">
        <label>
          Nom du produit
          <input
            type="text"
            [value]="productName()"
            (input)="onNameChange($event)"
            placeholder="Nom du produit"
          />
        </label>

        <label>
          Prix
          <input
            type="number"
            [value]="productPrice()"
            (input)="onPriceChange($event)"
            placeholder="Prix"
          />
        </label>

        <div class="actions">
          <button type="button" (click)="save()" class="btn-save">
            Sauvegarder
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .edit-form {
      max-width: 400px;
      display: flex; flex-direction: column; gap: 1rem;
    }
    label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-weight: 600;
    }
    input {
      padding: 0.5rem; border: 1px solid #ccc;
      border-radius: 4px; font-size: 1rem;
    }
    .unsaved-badge {
      background: #fff3e0; color: #e65100;
      padding: 0.5rem 1rem; border-radius: 4px;
      margin-bottom: 1rem; display: inline-block;
    }
    .btn-save {
      background: #4caf50; color: white; border: none;
      padding: 0.75rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
    }
  `],
})
export class EditProductComponent implements HasUnsavedChanges {
  // Signaux pour les champs du formulaire
  readonly productName = signal<string>('Clavier mecanique');
  readonly productPrice = signal<number>(129.99);

  // Signal pour tracker si le formulaire a ete modifie
  readonly isDirty = signal<boolean>(false);

  onNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.productName.set(target.value);
    this.isDirty.set(true);
  }

  onPriceChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.productPrice.set(Number(target.value));
    this.isDirty.set(true);
  }

  save(): void {
    // Simule la sauvegarde
    console.log('Sauvegarde:', this.productName(), this.productPrice());
    this.isDirty.set(false);
  }

  // Implementation de l'interface HasUnsavedChanges
  // Le guard canDeactivate appelle cette methode
  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }
}
```

### `src/app/exercises/ex12/admin/admin-dashboard.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <section class="admin">
      <h2>Administration</h2>
      <nav class="admin-nav">
        <a routerLink="users" class="admin-link">Gestion des utilisateurs</a>
      </nav>
      <hr />
      <!-- Outlet pour les sous-routes admin -->
      <router-outlet />
    </section>
  `,
  styles: [`
    .admin { padding: 1rem 0; }
    .admin-nav { display: flex; gap: 1rem; margin: 1rem 0; }
    .admin-link {
      background: #7b1fa2; color: white;
      padding: 0.5rem 1rem; border-radius: 4px;
      text-decoration: none;
    }
  `],
})
export class AdminDashboardComponent {}
```

### `src/app/exercises/ex12/admin/admin-users.component.ts`

```typescript
import { Component, signal } from '@angular/core';

interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user';
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  template: `
    <h3>Utilisateurs</h3>
    <table class="users-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        @for (user of users(); track user.id) {
          <tr>
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    .users-table {
      width: 100%; border-collapse: collapse; margin-top: 1rem;
    }
    th, td {
      padding: 0.75rem; text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th { background: #f5f5f5; font-weight: 600; }
  `],
})
export class AdminUsersComponent {
  readonly users = signal<User[]>([
    { id: 1, name: 'Alice Dupont', email: 'alice@mail.com', role: 'admin' },
    { id: 2, name: 'Bob Martin', email: 'bob@mail.com', role: 'user' },
    { id: 3, name: 'Clara Petit', email: 'clara@mail.com', role: 'user' },
  ]);
}
```

### `src/app/exercises/ex12/admin/admin.routes.ts`

```typescript
import { Routes } from '@angular/router';

// Routes enfants de la section admin
// Chargees en lazy loading via loadChildren dans ex12.routes.ts
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('./admin-users.component').then(
            (m) => m.AdminUsersComponent
          ),
      },
    ],
  },
];
```

### `src/app/exercises/ex12/ex12.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { canDeactivateGuard } from './guards/can-deactivate.guard';

export const EX12_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('../ex11/pages/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('../ex11/pages/product-list.component').then(
        (m) => m.ProductListComponent
      ),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('../ex11/pages/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
  },
  {
    // Route protegee par authGuard + canDeactivateGuard
    path: 'products/:id/edit',
    loadComponent: () =>
      import('./pages/edit-product.component').then(
        (m) => m.EditProductComponent
      ),
    canActivate: [authGuard],
    canDeactivate: [canDeactivateGuard],
  },
  {
    // Section admin protegee par adminGuard, chargee en lazy loading
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canActivate: [adminGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./pages/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('../ex11/pages/about.component').then((m) => m.AboutComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('../ex11/pages/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
```

## Ce que tu aurais pu oublier

### 1. Utiliser des classes au lieu de fonctions pour les guards

- ❌ Ancienne syntaxe avec classes (obsolete en Angular 19+) :
  ```typescript
  @Injectable()
  export class AuthGuard implements CanActivate {
    canActivate(): boolean { ... }
  }
  ```
- ✅ Syntaxe fonctionnelle recommandee :
  ```typescript
  export const authGuard: CanActivateFn = () => { ... };
  ```

### 2. Oublier `inject()` dans le guard fonctionnel

- ❌ Essayer d'utiliser le constructeur (pas de classe, pas de constructeur) :
  ```typescript
  export const authGuard: CanActivateFn = () => {
    // authService n'est pas accessible ici !
  };
  ```
- ✅ Utiliser `inject()` pour acceder aux services :
  ```typescript
  export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    return authService.isLoggedIn();
  };
  ```

### 3. Confondre `loadComponent` et `loadChildren`

- ❌ Utiliser `loadComponent` pour un ensemble de routes :
  ```typescript
  { path: 'admin', loadComponent: () => import('./admin/admin.routes') }
  ```
- ✅ Utiliser `loadChildren` pour charger un fichier de routes :
  ```typescript
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) }
  ```

### 4. Oublier de typer le guard `canDeactivate` avec le composant

- ❌ Guard sans type generique :
  ```typescript
  export const canDeactivateGuard: CanDeactivateFn<unknown> = (component) => { ... };
  ```
- ✅ Guard type avec l'interface :
  ```typescript
  export const canDeactivateGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
    return component.hasUnsavedChanges() ? confirm('...') : true;
  };
  ```

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `CanActivateFn` | Type pour un guard fonctionnel qui autorise ou refuse l'acces |
| `CanDeactivateFn` | Type pour un guard qui empeche de quitter une page |
| `inject()` | Injection de dependances dans un contexte fonctionnel |
| `Router.createUrlTree()` | Cree un arbre d'URL pour la redirection dans un guard |
| `loadComponent` | Lazy loading d'un composant standalone unique |
| `loadChildren` | Lazy loading d'un ensemble de routes enfants |
| `canActivate` | Tableau de guards appliques avant d'activer une route |
| `canDeactivate` | Tableau de guards appliques avant de quitter une route |
| Signal `isLoggedIn` | Etat reactif d'authentification partage via un service |
