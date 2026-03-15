# Correction — Exercice 25 : Auth complete

## Résultat attendu

Un système d'authentification complet : un service AuthService avec des signaux, un intercepteur HTTP qui injecte le token Bearer, des guards fonctionnels qui protegent les routes, et des composants qui affichent du contenu en fonction du role de l'utilisateur.

## Code corrige

### Modeles

```typescript
// src/app/exercises/ex25/models/auth.model.ts

// --- Interface User ---
// Represente un utilisateur authentifie
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'admin' | 'user' | 'guest';
}

// --- Requete de connexion ---
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

// --- Requete d'inscription ---
export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

// --- Reponse du serveur d'auth ---
export interface AuthResponse {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

// --- Etat de l'authentification ---
// Gere par le service AuthService via un signal
export interface AuthState {
  readonly user: User | null;
  readonly token: string | null;
  readonly isAuthenticated: boolean;
  readonly loading: boolean;
}
```

### AuthService

```typescript
// src/app/exercises/ex25/services/auth.service.ts

import {
  Injectable,
  signal,
  computed,
  effect,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

import {
  type User,
  type LoginRequest,
  type RegisterRequest,
  type AuthState,
  type AuthResponse,
} from '../models/auth.model';

// --- Cle localStorage ---
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// --- Etat initial ---
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  // =========================================
  // ETAT INTERNE
  // =========================================

  // Signal prive contenant tout l'etat auth
  // Un seul signal pour tout l'etat : plus simple a gerer que des signaux separes
  private readonly _state: WritableSignal<AuthState> = signal<AuthState>(initialState);

  // =========================================
  // SIGNAUX PUBLICS (lecture seule)
  // =========================================

  // Chaque computed extrait une partie de l'etat
  // Le consommateur lit user(), isAuthenticated(), etc. sans connaitre la structure interne
  readonly user: Signal<User | null> = computed(() => this._state().user);
  readonly isAuthenticated: Signal<boolean> = computed(() => this._state().isAuthenticated);
  readonly loading: Signal<boolean> = computed(() => this._state().loading);
  readonly token: Signal<string | null> = computed(() => this._state().token);

  // --- Computed derive : role admin ---
  // Verifie que l'utilisateur est connecte ET a le role 'admin'
  readonly isAdmin: Signal<boolean> = computed(
    () => this._state().user?.role === 'admin'
  );

  constructor() {
    // --- Effect de synchronisation localStorage ---
    // A chaque changement de l'etat, on persiste le token et le user
    // effect() se declenche automatiquement quand _state() change
    effect(() => {
      const state = this._state();

      if (state.token) {
        localStorage.setItem(TOKEN_KEY, state.token);
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    });
  }

  // =========================================
  // METHODES PUBLIQUES
  // =========================================

  // --- Connexion ---
  // Simule un appel API de login
  // En production : remplacer par un vrai HttpClient.post()
  login(credentials: LoginRequest): void {
    // Passe en mode loading
    this._state.update((state) => ({ ...state, loading: true }));

    // Simulation d'un appel API avec setTimeout
    setTimeout(() => {
      // Simulation : si l'email contient "admin", c'est un admin
      const isAdmin = credentials.email.includes('admin');

      const fakeResponse: AuthResponse = {
        user: {
          id: crypto.randomUUID(),
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: isAdmin ? 'admin' : 'user',
        },
        accessToken: `fake-jwt-token-${Date.now()}`,
        refreshToken: `fake-refresh-token-${Date.now()}`,
      };

      // Met a jour l'etat avec les donnees du serveur
      this._state.set({
        user: fakeResponse.user,
        token: fakeResponse.accessToken,
        isAuthenticated: true,
        loading: false,
      });

      // Redirige vers le dashboard apres connexion
      this.router.navigate(['/dashboard']);
    }, 800); // Simule un delai reseau
  }

  // --- Inscription ---
  // Simule un appel API d'inscription
  register(data: RegisterRequest): void {
    this._state.update((state) => ({ ...state, loading: true }));

    setTimeout(() => {
      const fakeResponse: AuthResponse = {
        user: {
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name,
          role: 'user',
        },
        accessToken: `fake-jwt-token-${Date.now()}`,
        refreshToken: `fake-refresh-token-${Date.now()}`,
      };

      this._state.set({
        user: fakeResponse.user,
        token: fakeResponse.accessToken,
        isAuthenticated: true,
        loading: false,
      });

      this.router.navigate(['/dashboard']);
    }, 800);
  }

  // --- Deconnexion ---
  // Reinitialise l'etat et redirige vers la page de login
  logout(): void {
    this._state.set(initialState);
    this.router.navigate(['/login']);
  }

  // --- Verification de session au demarrage ---
  // Appele dans APP_INITIALIZER ou le constructeur de AppComponent
  // Restaure la session depuis localStorage si un token existe
  checkAuth(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this._state.set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
        });
      } catch {
        // JSON invalide → nettoyer
        this.logout();
      }
    }
  }
}
```

### Intercepteur HTTP

```typescript
// src/app/exercises/ex25/interceptors/auth.interceptor.ts

// --- Imports Angular HTTP ---
// HttpInterceptorFn : type d'un intercepteur fonctionnel (Angular 19+)
// HttpRequest : represente une requete HTTP sortante
// HttpHandlerFn : fonction pour passer la requete au prochain intercepteur
// HttpErrorResponse : represente une erreur HTTP
import {
  type HttpInterceptorFn,
  type HttpRequest,
  type HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';

import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// --- Liste des URLs publiques ---
// Ces routes ne necessitent pas de token Bearer
const PUBLIC_URLS: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
];

// --- Intercepteur fonctionnel ---
// Une simple fonction (pas une classe) — c'est le style moderne Angular 19+
// Elle recoit la requete et le "next" handler, et retourne un Observable
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // inject() fonctionne dans un intercepteur fonctionnel
  // car il est execute dans un contexte d'injection Angular
  const authService = inject(AuthService);

  // --- Verifier si la route est publique ---
  const isPublicUrl = PUBLIC_URLS.some((url) => req.url.includes(url));

  // Si la route est publique, on passe la requete sans modification
  if (isPublicUrl) {
    return next(req);
  }

  // --- Ajouter le token Bearer ---
  const token = authService.token();

  // Si un token existe, on clone la requete en ajoutant le header Authorization
  // Les requetes HTTP sont immutables dans Angular : on doit clone() pour les modifier
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // --- Gestion des erreurs 401 ---
  // Si le serveur repond 401 (Unauthorized), on deconnecte l'utilisateur
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expire ou invalide → deconnexion automatique
        authService.logout();
      }
      // On re-lance l'erreur pour que le composant puisse la gerer
      return throwError(() => error);
    })
  );
};
```

### Guard d'authentification

```typescript
// src/app/exercises/ex25/guards/auth.guard.ts

// --- Guard fonctionnel Angular 19+ ---
// Une simple fonction qui retourne true/false ou une UrlTree pour rediriger
import { type CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// canActivate est une fonction, pas une classe
// Elle est appelee par le routeur a chaque navigation vers une route protegee
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si l'utilisateur est authentifie, on autorise l'acces
  if (authService.isAuthenticated()) {
    return true;
  }

  // Sinon, on redirige vers la page de login
  // router.createUrlTree() cree une UrlTree que le routeur utilisera pour la redirection
  return router.createUrlTree(['/login']);
};
```

### Guard admin

```typescript
// src/app/exercises/ex25/guards/admin.guard.ts

import { type CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard compose : verifie a la fois l'authentification ET le role admin
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifie d'abord que l'utilisateur est authentifie
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Verifie ensuite que l'utilisateur est admin
  if (!authService.isAdmin()) {
    // Redirige vers le dashboard si pas admin (pas vers login)
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
```

### Configuration des routes

```typescript
// src/app/exercises/ex25/ex25.routes.ts

import { type Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // --- Redirection racine ---
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // --- Routes publiques ---
  // Pas de guard : accessibles a tous
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register.component').then((m) => m.RegisterComponent),
  },

  // --- Routes privees ---
  // Protegees par authGuard : redirige vers /login si non authentifie
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./components/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },

  // --- Route admin ---
  // Double guard : authGuard verifie l'authentification, adminGuard verifie le role
  // Les guards s'executent dans l'ordre du tableau
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin.component').then((m) => m.AdminComponent),
    canActivate: [authGuard, adminGuard],
  },
];
```

### Composant Login

```typescript
// src/app/exercises/ex25/components/login.component.ts

import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <h2>Connexion</h2>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <!-- Champ email -->
        <div class="form-field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="votre@email.com"
          />
          @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
            <span class="error">Email invalide</span>
          }
        </div>

        <!-- Champ password -->
        <div class="form-field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Votre mot de passe"
          />
          @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
            <span class="error">Le mot de passe doit faire au moins 6 caracteres</span>
          }
        </div>

        <!-- Bouton de soumission -->
        <button
          type="submit"
          [disabled]="loginForm.invalid || authService.loading()"
        >
          @if (authService.loading()) {
            Connexion en cours...
          } @else {
            Se connecter
          }
        </button>
      </form>

      <p class="register-link">
        Pas encore de compte ?
        <a routerLink="/register">Creer un compte</a>
      </p>
    </div>
  `,
  styles: [`
    .login-container { max-width: 400px; margin: 2rem auto; padding: 2rem; }
    h2 { margin-bottom: 1.5rem; }
    .form-field { margin-bottom: 1rem; }
    .form-field label { display: block; margin-bottom: 0.25rem; font-weight: bold; }
    .form-field input { width: 100%; padding: 0.5rem; font-size: 1rem; box-sizing: border-box; }
    .error { color: #e74c3c; font-size: 0.85rem; }
    button {
      width: 100%; padding: 0.75rem; font-size: 1rem;
      background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;
    }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .register-link { text-align: center; margin-top: 1rem; }
    .register-link a { color: #1976d2; }
  `],
})
export class LoginComponent {
  // --- Injection des services ---
  protected readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // --- Formulaire reactif ---
  // FormBuilder.group() cree un FormGroup avec les controles et validateurs
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    // .getRawValue() retourne les valeurs typees du formulaire
    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ email, password });
  }
}
```

### Composant Dashboard

```typescript
// src/app/exercises/ex25/components/dashboard.component.ts

import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <h2>Tableau de bord</h2>

      @if (authService.user(); as user) {
        <div class="welcome">
          <p>Bienvenue, <strong>{{ user.name }}</strong> !</p>
          <p>Email : {{ user.email }}</p>
          <p>Role : {{ user.role }}</p>
        </div>
      }

      @if (authService.isAdmin()) {
        <div class="admin-section">
          <h3>Section administrateur</h3>
          <p>Vous avez acces aux fonctionnalites d'administration.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 600px; margin: 2rem auto; padding: 2rem; }
    .welcome { background: #e3f2fd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .admin-section { background: #fff3e0; padding: 1rem; border-radius: 8px; }
  `],
})
export class DashboardComponent {
  protected readonly authService = inject(AuthService);
}
```

### Composant Navbar

```typescript
// src/app/exercises/ex25/components/navbar.component.ts

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="brand">MonApp</div>

      <div class="nav-links">
        @if (authService.isAuthenticated()) {
          <!-- Utilisateur connecte -->
          <a routerLink="/dashboard" routerLinkActive="active">Tableau de bord</a>
          <a routerLink="/profile" routerLinkActive="active">Profil</a>

          @if (authService.isAdmin()) {
            <!-- Lien admin visible uniquement pour les admins -->
            <a routerLink="/admin" routerLinkActive="active">Administration</a>
          }

          <span class="user-name">{{ authService.user()?.name }}</span>
          <button (click)="authService.logout()" class="logout-btn">
            Deconnexion
          </button>
        } @else {
          <!-- Utilisateur non connecte -->
          <a routerLink="/login" routerLinkActive="active">Connexion</a>
          <a routerLink="/register" routerLinkActive="active">Inscription</a>
        }
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1.5rem; background: #1976d2; color: white;
    }
    .brand { font-size: 1.25rem; font-weight: bold; }
    .nav-links { display: flex; align-items: center; gap: 1rem; }
    .nav-links a { color: white; text-decoration: none; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .nav-links a.active { background: rgba(255, 255, 255, 0.2); }
    .user-name { font-weight: bold; }
    .logout-btn {
      background: rgba(255, 255, 255, 0.2); color: white;
      border: 1px solid rgba(255, 255, 255, 0.5); padding: 0.25rem 0.75rem;
      border-radius: 4px; cursor: pointer;
    }
  `],
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);
}
```

## Ce que tu aurais pu oublier

### 1. Oublier `inject()` dans l'intercepteur fonctionnel
- ❌ Declarer `authService` en paramètre → les intercepteurs fonctionnels ne recoivent que `req` et `next`
- ✅ Utiliser `inject(AuthService)` a l'interieur de la fonction — ça fonctionne car Angular créé un contexte d'injection

### 2. Ne pas cloner la requête HTTP avant de la modifier
- ❌ `req.headers.set('Authorization', ...)` → les requêtes HTTP sont immutables
- ✅ `req.clone({ setHeaders: { Authorization: ... } })` → créé une copie avec les modifications

### 3. Rediriger avec `router.navigate()` au lieu de `createUrlTree()` dans le guard
- ❌ `router.navigate(['/login']); return false;` → fonctionne mais n'est pas recommande
- ✅ `return router.createUrlTree(['/login'])` → le routeur géré la redirection proprement

### 4. Oublier `catchError` pour intercepter les 401
- ❌ Ne pas gérer les erreurs dans l'intercepteur → les tokens expires ne sont pas detectes
- ✅ `catchError` dans le pipe pour intercepter les 401 et deconnecter automatiquement

### 5. Exposer le `WritableSignal` `_state` directement
- ❌ `readonly state = this._state` → n'importe quel composant peut appeler `state.set()`
- ✅ Exposer des `computed()` en lecture seule (`user`, `isAuthenticated`, etc.)

### 6. Oublier `checkAuth()` au démarrage
- ❌ Pas d'appel a `checkAuth()` → l'utilisateur doit se reconnecter à chaque rechargement de page
- ✅ Appeler `checkAuth()` dans `APP_INITIALIZER` ou le constructeur de `AppComponent`

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `HttpInterceptorFn` | Intercepteur fonctionnel (Angular 19+) — fonction qui intercepte chaque requête HTTP |
| `CanActivateFn` | Guard fonctionnel (Angular 19+) — fonction qui autorise ou bloque l'acces à une route |
| `req.clone()` | Cree une copie immutable de la requête HTTP avec des modifications |
| `router.createUrlTree()` | Cree un arbre d'URL pour la redirection dans un guard |
| `effect()` | Side-effect réactif pour synchroniser l'état avec localStorage |
| `computed()` | Signaux dérivés pour exposer des parties de l'état en lecture seule |
| `inject()` | Injection de dépendance dans les fonctions (intercepteurs, guards) |
| `FormBuilder.nonNullable.group()` | Cree un formulaire réactif avec des controles non-nullables |
| `loadComponent` | Lazy loading de composants dans les routes |
| `canActivate` | Propriété de route qui référence un ou plusieurs guards |
| `@if` / `@else` | Control flow Angular 19+ pour l'affichage conditionnel |
| `routerLinkActive` | Directive qui ajoute une classe CSS quand le lien est actif |
