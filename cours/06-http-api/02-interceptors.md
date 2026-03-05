# Cours 26 — Intercepteurs fonctionnels

> **Objectif** : Comprendre et implementer des intercepteurs HTTP fonctionnels en Angular 19+ : authentification, gestion d'erreurs globale, loading spinner et logging. Maitriser l'ordre d'execution et les patterns de combinaison reels.

---

## Rappel du cours precedent

<details>
<summary>1. Comment configurer HttpClient dans une application standalone Angular 19+ ?</summary>

On utilise `provideHttpClient()` dans le tableau `providers` de `app.config.ts`. Pas besoin d'importer `HttpClientModule`.
</details>

<details>
<summary>2. Pourquoi les Observables HTTP sont-ils qualifies de "cold" ?</summary>

Un Observable HTTP ne lance **aucune** requete reseau tant que personne n'appelle `subscribe()`. Chaque nouveau subscribe cree une nouvelle requete independante.
</details>

<details>
<summary>3. Quelle est la difference entre PUT et PATCH ?</summary>

`PUT` remplace **completement** la ressource (il faut envoyer tous les champs). `PATCH` effectue une mise a jour **partielle** (seuls les champs envoyes sont modifies).
</details>

---

## Analogie

Imaginez un **controle de securite a l'aeroport**. Chaque passager (requete HTTP) passe par une serie de postes :

1. **Verification du billet** (intercepteur auth : ajoute le token)
2. **Scanner a bagages** (intercepteur logging : enregistre la requete)
3. **Controle passeport** (intercepteur erreur : verifie la reponse)
4. **Chronometre** (intercepteur loading : mesure le temps)

Chaque poste peut laisser passer, modifier, ou bloquer le passager. L'ordre des postes compte : on verifie le billet **avant** de scanner les bagages.

---

## Theorie

### Intercepteur fonctionnel : syntaxe de base

En Angular 19+, les intercepteurs sont de simples **fonctions** :

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const monIntercepteur: HttpInterceptorFn = (req, next) => {
  // req : la requete HTTP entrante
  // next : la fonction pour passer au prochain intercepteur (ou au serveur)

  console.log('Requete interceptee :', req.url);
  return next(req); // Passe la requete sans modification
};
```

**Enregistrement dans `app.config.ts`** :

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { monIntercepteur } from './interceptors/mon-intercepteur';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([monIntercepteur])
    ),
  ],
};
```

### Intercepteur d'authentification

Le plus courant en ESN : ajouter un token Bearer a chaque requete.

```typescript
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Ne pas ajouter le token pour les requetes publiques
  if (!token || req.url.includes('/api/public/')) {
    return next(req);
  }

  // Cloner la requete avec le header Authorization
  const reqAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(reqAvecToken);
};
```

```typescript
// ❌ Mauvais : modifier la requete directement
export const mauvaisAuth: HttpInterceptorFn = (req, next) => {
  req.headers.set('Authorization', 'Bearer xxx'); // ❌ req est immutable !
  return next(req);
};

// ✅ Bon : cloner la requete
export const bonAuth: HttpInterceptorFn = (req, next) => {
  const clone = req.clone({
    setHeaders: { Authorization: 'Bearer xxx' },
  });
  return next(clone); // ✅ Passer le clone
};
```

> **Important** : les objets `HttpRequest` sont **immutables**. Utilisez toujours `req.clone()` pour les modifier.

### Intercepteur de gestion d'erreurs

Centraliser la gestion des erreurs HTTP :

```typescript
// error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notif = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          notif.notify('Session expiree. Reconnectez-vous.');
          router.navigate(['/login']);
          break;
        case 403:
          notif.notify('Acces refuse.');
          break;
        case 404:
          notif.notify('Ressource introuvable.');
          break;
        case 500:
          notif.notify('Erreur serveur. Reessayez plus tard.');
          break;
        case 0:
          notif.notify('Connexion impossible. Verifiez votre reseau.');
          break;
        default:
          notif.notify(`Erreur inattendue (${error.status}).`);
      }

      // Re-propager l'erreur pour que le service appelant puisse aussi la gerer
      return throwError(() => error);
    }),
  );
};
```

### Intercepteur de retry

Reessayer automatiquement sur les erreurs serveur (5xx) :

```typescript
// retry.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne pas retry les mutations (POST, PUT, DELETE) pour eviter les doublons
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount) => {
        // Retry uniquement sur les erreurs serveur
        if (error.status >= 500) {
          return timer(retryCount * 1000); // 1s, 2s
        }
        throw error; // Erreur client : ne pas reessayer
      },
    }),
  );
};
```

### Intercepteur de loading

Afficher/masquer un spinner global pendant les requetes :

```typescript
// loading.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private compteur = signal(0);

  readonly isLoading = computed(() => this.compteur() > 0);

  start(): void {
    this.compteur.update(c => c + 1);
  }

  stop(): void {
    this.compteur.update(c => Math.max(0, c - 1));
  }
}
```

```typescript
// loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);

  // Ignorer certaines requetes silencieuses
  if (req.headers.has('X-Skip-Loading')) {
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Loading'),
    });
    return next(cleanReq);
  }

  loading.start();

  return next(req).pipe(
    finalize(() => loading.stop()), // Arrete que ce soit success ou erreur
  );
};
```

```typescript
// spinner.component.ts
@Component({
  selector: 'app-spinner',
  template: `
    @if (loading.isLoading()) {
      <div class="overlay">
        <div class="spinner"></div>
      </div>
    }
  `,
})
export class SpinnerComponent {
  readonly loading = inject(LoadingService);
}
```

### Intercepteur de logging (dev)

Pour debugger les requetes en developpement :

```typescript
// logging.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production) {
    return next(req); // Desactive en production
  }

  const debut = performance.now();

  console.log(`[HTTP] ${req.method} ${req.url}`, {
    body: req.body,
    params: req.params.toString(),
  });

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type !== 0) { // Ignorer l'event initial
          const duree = Math.round(performance.now() - debut);
          console.log(`[HTTP] ✅ ${req.method} ${req.url} (${duree}ms)`);
        }
      },
      error: (err) => {
        const duree = Math.round(performance.now() - debut);
        console.error(`[HTTP] ❌ ${req.method} ${req.url} (${duree}ms)`, err);
      },
    }),
  );
};
```

### Ordre des intercepteurs

Les intercepteurs s'executent dans l'ordre du tableau pour la **requete**, et en ordre **inverse** pour la reponse :

```
Requete → [auth] → [loading] → [logging] → Serveur
Reponse ← [auth] ← [loading] ← [logging] ← Serveur
```

```typescript
// app.config.ts — l'ordre compte !
provideHttpClient(
  withInterceptors([
    authInterceptor,      // 1. Ajoute le token en premier
    retryInterceptor,     // 2. Retry avant la gestion d'erreurs
    errorInterceptor,     // 3. Gestion globale des erreurs
    loadingInterceptor,   // 4. Spinner pendant le chargement
    loggingInterceptor,   // 5. Logging en dernier (voit tout)
  ])
),
```

### Intercepteurs class-based (legacy)

Pour les projets existants utilisant des classes :

```typescript
// ❌ Ancien pattern (class-based) — a connaitre pour le legacy
@Injectable()
export class AuthInterceptorClass implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req.clone({ setHeaders: { Authorization: 'Bearer xxx' } }));
  }
}

// Enregistrement legacy
provideHttpClient(
  withInterceptorsFromDi()  // Active les intercepteurs class-based
)
```

> **En Angular 19+**, privilegiez toujours les intercepteurs **fonctionnels**. Plus simples, plus testables, compatibles avec `inject()`.

---

## Pratique

Creez un intercepteur fonctionnel `cacheInterceptor` qui :
1. Intercepte uniquement les requetes GET
2. Stocke les reponses dans une `Map<string, any>`
3. Retourne la reponse cachee si elle existe (sans appeler le serveur)
4. Sinon, appelle le serveur et stocke la reponse

<details>
<summary>Solution</summary>

```typescript
// cache.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { filter } from 'rxjs/operators';

const cache = new Map<string, HttpResponse<unknown>>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne cacher que les GET
  if (req.method !== 'GET') {
    return next(req);
  }

  const cle = req.urlWithParams;

  // Retourner le cache si disponible
  const cached = cache.get(cle);
  if (cached) {
    console.log(`[Cache] HIT : ${cle}`);
    return of(cached.clone());
  }

  // Sinon, faire la requete et cacher la reponse
  return next(req).pipe(
    filter(event => event instanceof HttpResponse),
    tap(event => {
      if (event instanceof HttpResponse) {
        console.log(`[Cache] MISS → stocke : ${cle}`);
        cache.set(cle, event.clone());
      }
    }),
  );
};
```

```typescript
// app.config.ts
provideHttpClient(
  withInterceptors([
    authInterceptor,
    cacheInterceptor,  // Avant les autres pour court-circuiter
    errorInterceptor,
    loadingInterceptor,
  ])
),
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `HttpInterceptorFn` | Fonction `(req, next) => Observable` |
| `req.clone()` | Les requetes sont immutables, toujours cloner |
| `withInterceptors([...])` | Enregistrement dans `provideHttpClient()` |
| Auth interceptor | Ajoute `Bearer token` via `setHeaders` |
| Error interceptor | `catchError` global avec switch sur `status` |
| Loading interceptor | Compteur + `finalize()` pour gerer le spinner |
| Logging interceptor | `tap` + `performance.now()` pour le debug |
| Ordre | Auth → Retry → Error → Loading → Logging |
| Legacy | `withInterceptorsFromDi()` pour les classes (a eviter) |

---

> **Prochain cours** : [Cours 27 — Gestion d'erreurs et cache](./03-error-handling-et-cache.md)
