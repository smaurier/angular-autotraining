# Correction — Exercice 15 : Interceptors

## Résultat attendu

Chaque requête HTTP ajoute automatiquement un token d'authentification. Les erreurs 4xx/5xx declenchent un toast de notification. Un spinner global s'affiche tant qu'au moins une requête est en cours. Tout est configure via `withInterceptors()` dans la configuration standalone.

## Code corrige

### `src/app/exercises/ex15/services/token.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  // Signal stockant le token d'authentification
  // En production, le token viendrait d'un service OAuth/OIDC
  readonly token = signal<string | null>('fake-jwt-token-12345');

  setToken(token: string | null): void {
    this.token.set(token);
  }

  clearToken(): void {
    this.token.set(null);
  }
}
```

### `src/app/exercises/ex15/services/notification.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';

// Type strict pour une notification
export interface Notification {
  readonly id: number;
  readonly message: string;
  readonly type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Signal contenant la liste des notifications actives
  readonly notifications = signal<Notification[]>([]);

  // Compteur pour generer des IDs uniques
  private nextId = 0;

  /**
   * Affiche une notification qui disparait apres 4 secondes.
   */
  show(message: string, type: 'success' | 'error' | 'info'): void {
    const id = this.nextId++;

    const notification: Notification = { id, message, type };

    // Ajouter la notification
    this.notifications.update((current) => [...current, notification]);

    // Programmer la suppression apres 4 secondes
    setTimeout(() => {
      this.dismiss(id);
    }, 4000);
  }

  /**
   * Supprime une notification par son ID.
   */
  dismiss(id: number): void {
    this.notifications.update((current) =>
      current.filter((n) => n.id !== id)
    );
  }
}
```

### `src/app/exercises/ex15/services/loading.service.ts`

```typescript
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Compteur de requetes en cours
  // On utilise un compteur (pas un boolean) pour gerer les requetes paralleles
  readonly requestCount = signal<number>(0);

  // Computed : true si au moins une requete est en cours
  readonly isLoading = computed(() => this.requestCount() > 0);

  /**
   * Appele au debut d'une requete HTTP.
   */
  start(): void {
    this.requestCount.update((count) => count + 1);
  }

  /**
   * Appele a la fin d'une requete HTTP (succes ou erreur).
   */
  stop(): void {
    this.requestCount.update((count) => Math.max(0, count - 1));
  }
}
```

### `src/app/exercises/ex15/interceptors/auth.interceptor.ts`

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenService } from '../services/token.service';

/**
 * Intercepteur d'authentification (fonctionnel — Angular 19+).
 * Ajoute le header Authorization a chaque requete si un token est disponible.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.token();

  if (token) {
    // Cloner la requete pour ajouter le header
    // Les requetes HTTP sont immutables, il faut les cloner pour les modifier
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedReq);
  }

  // Pas de token, on passe la requete telle quelle
  return next(req);
};
```

### `src/app/exercises/ex15/interceptors/error.interceptor.ts`

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Intercepteur d'erreurs HTTP (fonctionnel — Angular 19+).
 * Affiche un toast pour chaque erreur 4xx/5xx.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message: string;

      // Message adapte selon le code d'erreur HTTP
      switch (error.status) {
        case 0:
          message = 'Connexion au serveur impossible.';
          break;
        case 401:
          message = 'Session expiree, veuillez vous reconnecter.';
          break;
        case 403:
          message = 'Acces refuse.';
          break;
        case 404:
          message = 'Ressource introuvable.';
          break;
        default:
          if (error.status >= 500) {
            message = 'Erreur serveur, reessayez plus tard.';
          } else {
            message = `Erreur HTTP ${error.status}.`;
          }
      }

      // Afficher le toast d'erreur
      notificationService.show(message, 'error');

      // Re-propager l'erreur pour que les composants puissent aussi la gerer
      return throwError(() => error);
    })
  );
};
```

### `src/app/exercises/ex15/interceptors/loading.interceptor.ts`

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Intercepteur de chargement (fonctionnel — Angular 19+).
 * Gere un compteur global de requetes en cours.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Incrementer le compteur au debut de la requete
  loadingService.start();

  return next(req).pipe(
    // finalize() est appele a la completion ou a l'erreur de l'observable
    // C'est l'equivalent du bloc finally en try/catch
    finalize(() => {
      loadingService.stop();
    })
  );
};
```

### `src/app/exercises/ex15/components/global-spinner.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  template: `
    <!-- Affiche le spinner uniquement quand des requetes sont en cours -->
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <div class="spinner"></div>
        <p>Chargement en cours...</p>
      </div>
    }
  `,
  styles: [`
    .spinner-overlay {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 4px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .spinner {
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%);
      background-size: 200% 100%;
      animation: loading 1.5s ease-in-out infinite;
    }

    p {
      position: fixed;
      top: 8px;
      right: 16px;
      background: #1976d2;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      margin: 0;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class GlobalSpinnerComponent {
  // Service injecte et expose au template
  readonly loadingService = inject(LoadingService);
}
```

### `src/app/exercises/ex15/components/toast-container.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          class="toast"
          [class.toast-error]="notification.type === 'error'"
          [class.toast-success]="notification.type === 'success'"
          [class.toast-info]="notification.type === 'info'"
        >
          <span>{{ notification.message }}</span>
          <button
            (click)="notificationService.dismiss(notification.id)"
            class="toast-close"
          >
            x
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    }

    .toast {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .toast-error { background: #c62828; }
    .toast-success { background: #2e7d32; }
    .toast-info { background: #1565c0; }

    .toast-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 0;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
})
export class ToastContainerComponent {
  readonly notificationService = inject(NotificationService);
}
```

### Configuration dans `app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './exercises/ex15/interceptors/auth.interceptor';
import { errorInterceptor } from './exercises/ex15/interceptors/error.interceptor';
import { loadingInterceptor } from './exercises/ex15/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    // Les intercepteurs sont executes dans l'ordre du tableau
    // 1. Auth (ajoute le token)
    // 2. Loading (demarre le compteur)
    // 3. Error (capture les erreurs)
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        errorInterceptor,
      ])
    ),
  ],
};
```

## Ce que tu aurais pu oublier

### 1. Utiliser des classes au lieu de fonctions pour les intercepteurs

- ❌ Ancienne syntaxe avec `@Injectable` et `HttpInterceptor` (obsolete) :
  ```typescript
  @Injectable()
  export class AuthInterceptor implements HttpInterceptor {
    intercept(req, next) { ... }
  }
  ```
- ✅ Syntaxe fonctionnelle Angular 19+ :
  ```typescript
  export const authInterceptor: HttpInterceptorFn = (req, next) => { ... };
  ```

### 2. Oublier de cloner la requête avant de la modifier

- ❌ Modifier la requête originale (les requêtes HTTP sont immutables) :
  ```typescript
  req.headers.set('Authorization', 'Bearer ...');
  ```
- ✅ Cloner la requête avec les modifications :
  ```typescript
  const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  ```

### 3. Oublier `finalize()` pour decrementer le compteur de chargement

- ❌ Decrementer uniquement dans `tap()` (rate les erreurs) :
  ```typescript
  next(req).pipe(tap(() => loadingService.stop()))
  ```
- ✅ Utiliser `finalize()` qui s'exécuté dans tous les cas :
  ```typescript
  next(req).pipe(finalize(() => loadingService.stop()))
  ```

### 4. Ne pas re-propager l'erreur dans l'intercepteur d'erreurs

- ❌ Avaler l'erreur avec `catchError(() => of(...))` :
  les composants ne recoivent jamais l'erreur
- ✅ Re-propager avec `throwError(() => error)` après le toast :
  les composants peuvent aussi reagir a l'erreur

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `HttpInterceptorFn` | Type pour un intercepteur fonctionnel Angular 19+ |
| `withInterceptors()` | Enregistre les intercepteurs dans `provideHttpClient()` |
| `req.clone()` | Clone immutable d'une requête HTTP pour la modifier |
| `finalize()` | Operateur RxJS exécuté à la fin (succes ou erreur) |
| `catchError()` | Intercepte les erreurs dans le flux Observable |
| `throwError()` | Re-propage une erreur dans le flux |
| Signal `requestCount` | Compteur de requêtes pour le spinner global |
| `computed` `isLoading` | Signal dérivé : `true` si `requestCount > 0` |
