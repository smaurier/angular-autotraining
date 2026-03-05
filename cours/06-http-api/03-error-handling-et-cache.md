# Cours 27 — Gestion d'erreurs et cache HTTP

> **Objectif** : Mettre en place des strategies robustes de gestion d'erreurs HTTP (retry, backoff, detection offline), un cache simple avec Map + TTL, le pattern `shareReplay`, et decouvrir `resource()` comme alternative moderne au cache manuel.

---

## Rappel du cours precedent

<details>
<summary>1. Pourquoi faut-il utiliser req.clone() dans un intercepteur ?</summary>

Les objets `HttpRequest` sont **immutables** en Angular. Toute tentative de modification directe est ignoree ou leve une erreur. `req.clone({ setHeaders: {...} })` cree une nouvelle instance avec les modifications souhaitees.
</details>

<details>
<summary>2. Dans quel ordre s'executent les intercepteurs ?</summary>

Dans l'ordre du tableau pour les **requetes** (premier enregistre = premier execute) et en ordre **inverse** pour les **reponses**. L'intercepteur auth doit etre en premier pour que le token soit present avant les autres traitements.
</details>

<details>
<summary>3. Quel operateur RxJS permet d'executer du code quand un Observable complete OU echoue ?</summary>

`finalize()`. Il s'execute dans les deux cas, ce qui le rend ideal pour arreter un spinner de chargement quel que soit le resultat de la requete.
</details>

---

## Analogie

Imaginez un **livreur de colis** :

- **Retry simple** : le livreur sonne. Personne ne repond. Il sonne encore 3 fois.
- **Backoff exponentiel** : il sonne, attend 2 min, re-sonne, attend 4 min, re-sonne, attend 8 min.
- **Detection offline** : il arrive devant l'immeuble, la porte est muree (pas de reseau). Inutile de sonner.
- **Cache** : il a deja livre un colis identique hier. Au lieu de retourner a l'entrepot, il utilise sa copie locale.
- **TTL (Time To Live)** : la copie locale expire apres 5 minutes. Apres, il doit retourner a l'entrepot.

---

## Theorie

### Strategies de gestion d'erreurs HTTP

#### Erreur unique : catchError

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of, Observable, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  // ❌ Mauvais : pas de gestion d'erreur
  getProduits(): Observable<Produit[]> {
    return this.http.get<Produit[]>('/api/produits');
    // Si le serveur repond 500, l'erreur remonte dans le composant non geree
  }

  // ✅ Bon : catchError avec valeur par defaut
  getProduitsAvecFallback(): Observable<Produit[]> {
    return this.http.get<Produit[]>('/api/produits').pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur API produits :', error.message);
        return of([]); // Retourne un tableau vide en cas d'erreur
      }),
    );
  }

  // ✅ Mieux : retourner un objet avec l'etat d'erreur
  getProduitsAvecEtat(): Observable<{ data: Produit[]; erreur: boolean }> {
    return this.http.get<Produit[]>('/api/produits').pipe(
      map(data => ({ data, erreur: false })),
      catchError(() => of({ data: [] as Produit[], erreur: true })),
    );
  }
}
```

#### Retry avec backoff exponentiel

```typescript
import { retry, timer, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

getProduits(): Observable<Produit[]> {
  return this.http.get<Produit[]>('/api/produits').pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Ne pas reessayer les erreurs client (4xx)
        if (error.status >= 400 && error.status < 500) {
          return throwError(() => error);
        }

        // Backoff exponentiel : 1s, 2s, 4s
        const delai = Math.pow(2, retryCount - 1) * 1000;
        console.warn(`Retry ${retryCount}/3 dans ${delai}ms...`);
        return timer(delai);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('Echec definitif apres 3 tentatives');
      return of([]);
    }),
  );
}
```

**Flux detaille du backoff :**

```
Requete initiale → 500 Error
  ├── Retry 1 (apres 1s) → 500 Error
  ├── Retry 2 (apres 2s) → 500 Error
  ├── Retry 3 (apres 4s) → 500 Error
  └── catchError → retourne []
```

#### Detection offline

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private online$ = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
  ).pipe(
    startWith(navigator.onLine),
  );

  readonly isOnline = toSignal(this.online$, { initialValue: navigator.onLine });

  readonly statusMessage = computed(() =>
    this.isOnline()
      ? 'Connecte'
      : 'Hors ligne — les donnees affichees peuvent etre obsoletes'
  );
}
```

```typescript
// Utilisation dans un service HTTP
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private connectivity = inject(ConnectivityService);

  get<T>(url: string): Observable<T> {
    if (!this.connectivity.isOnline()) {
      return throwError(() => new Error('Pas de connexion reseau'));
    }
    return this.http.get<T>(url);
  }
}
```

### Cache simple avec Map + TTL

```typescript
// cache.service.ts
import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  get<T>(cle: string): T | null {
    const entry = this.cache.get(cle) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Verifier l'expiration
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(cle);
      return null;
    }

    return entry.data;
  }

  set<T>(cle: string, data: T): void {
    this.cache.set(cle, { data, timestamp: Date.now() });
  }

  invalidate(cle: string): void {
    this.cache.delete(cle);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
```

```typescript
// Utilisation dans un service API
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);

  getProduits(): Observable<Produit[]> {
    const cle = 'produits:all';
    const cached = this.cache.get<Produit[]>(cle);

    if (cached) {
      return of(cached); // ✅ Retour instantane depuis le cache
    }

    return this.http.get<Produit[]>('/api/produits').pipe(
      tap(data => this.cache.set(cle, data)),
      catchError(() => of([])),
    );
  }

  creerProduit(dto: CreateProduitDto): Observable<Produit> {
    return this.http.post<Produit>('/api/produits', dto).pipe(
      tap(() => this.cache.invalidate('produits:all')), // ✅ Invalider le cache
    );
  }
}
```

### shareReplay : cache d'Observables

`shareReplay` partage une seule souscription entre plusieurs abonnes et rejoue les derniers resultats :

```typescript
import { shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);

  // Sans shareReplay : chaque subscribe = une nouvelle requete HTTP
  // ❌ 3 composants qui subscribent = 3 requetes identiques
  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>('/api/config');
  }

  // Avec shareReplay : une seule requete, partagee entre tous les abonnes
  // ✅ 3 composants qui subscribent = 1 seule requete
  readonly config$ = this.http.get<AppConfig>('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
```

**`shareReplay` options** :

| Option | Description |
|--------|------------|
| `bufferSize: 1` | Garde la derniere valeur pour les nouveaux abonnes |
| `refCount: true` | Se desabonne de la source quand plus personne n'ecoute |

```typescript
// ❌ Mauvais : shareReplay sans refCount → fuite memoire potentielle
const data$ = source$.pipe(shareReplay(1));

// ✅ Bon : toujours utiliser refCount: true
const data$ = source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

### resource() : alternative moderne (Angular 19+)

`resource()` est une API Signal-based pour charger des donnees asynchrones avec gestion de cache et etats integres :

```typescript
import { Component, inject, signal, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-catalogue',
  template: `
    @if (produitsResource.isLoading()) {
      <p>Chargement...</p>
    }

    @if (produitsResource.error()) {
      <p class="erreur">Erreur : {{ produitsResource.error() }}</p>
      <button (click)="produitsResource.reload()">Reessayer</button>
    }

    @if (produitsResource.value()) {
      <ul>
        @for (p of produitsResource.value(); track p.id) {
          <li>{{ p.nom }}</li>
        }
      </ul>
    }
  `,
})
export class CatalogueComponent {
  private http = inject(HttpClient);
  readonly categorie = signal('all');

  // resource() reagit au changement du signal categorie
  readonly produitsResource = resource({
    request: () => ({ cat: this.categorie() }),
    loader: async ({ request }) => {
      const url = `/api/produits?cat=${request.cat}`;
      return firstValueFrom(this.http.get<Produit[]>(url));
    },
  });
}
```

**Avantages de `resource()`** :

| Fonctionnalite | Cache manuel | `resource()` |
|---------------|-------------|-------------|
| Etats (loading, error, value) | A gerer soi-meme | ✅ Integres |
| Reactivite aux parametres | Manuelle | ✅ Automatique via Signals |
| Reload | A implementer | ✅ `.reload()` |
| Annulation requete obsolete | `switchMap` | ✅ Automatique |
| Cache | A gerer soi-meme | Basique (par defaut) |

### Pattern complet : service API avec erreurs + cache

```typescript
// api-product.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, retry, shareReplay, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class ApiProductService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);

  private readonly baseUrl = '/api/produits';

  getProduits(): Observable<Produit[]> {
    const cle = 'products:all';
    const cached = this.cache.get<Produit[]>(cle);
    if (cached) return of(cached);

    return this.http.get<Produit[]>(this.baseUrl).pipe(
      retry({
        count: 2,
        delay: (err: HttpErrorResponse, n) =>
          err.status >= 500 ? timer(n * 1000) : throwError(() => err),
      }),
      tap(data => this.cache.set(cle, data)),
      catchError(this.handleError<Produit[]>([])),
    );
  }

  creerProduit(dto: CreateProduitDto): Observable<Produit> {
    return this.http.post<Produit>(this.baseUrl, dto).pipe(
      tap(() => this.cache.invalidate('products:all')),
      catchError(this.handleError<Produit>(null as any)),
    );
  }

  // Methode utilitaire reutilisable
  private handleError<T>(fallback: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      const message = error.error?.message || error.message;
      console.error(`[API] Erreur ${error.status} : ${message}`);
      return of(fallback);
    };
  }
}
```

---

## Pratique

Creez un service `UserApiService` qui :
1. Charge la liste des utilisateurs avec retry (2 tentatives, backoff 1s/2s)
2. Cache le resultat 3 minutes avec `CacheService`
3. Invalide le cache quand on cree un nouvel utilisateur
4. Expose un Signal `users` via `toSignal()`
5. Expose un Signal `isError` pour afficher un message d'erreur

<details>
<summary>Solution</summary>

```typescript
// user-api.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, retry, tap, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { CacheService } from './cache.service';

interface User {
  id: number;
  nom: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private readonly url = '/api/users';

  readonly hasError = signal(false);

  private getUsers$(): Observable<User[]> {
    const cle = 'users:all';
    const cached = this.cache.get<User[]>(cle);
    if (cached) return of(cached);

    return this.http.get<User[]>(this.url).pipe(
      retry({
        count: 2,
        delay: (err: HttpErrorResponse, n) =>
          err.status >= 500 ? timer(n * 1000) : throwError(() => err),
      }),
      tap(data => {
        this.cache.set(cle, data);
        this.hasError.set(false);
      }),
      catchError(() => {
        this.hasError.set(true);
        return of([]);
      }),
    );
  }

  readonly users = toSignal(this.getUsers$(), { initialValue: [] });

  creerUser(nom: string, email: string): Observable<User> {
    return this.http.post<User>(this.url, { nom, email }).pipe(
      tap(() => this.cache.invalidate('users:all')),
    );
  }
}
```

```typescript
// user-list.component.ts
@Component({
  selector: 'app-user-list',
  template: `
    @if (userApi.hasError()) {
      <p class="erreur">Impossible de charger les utilisateurs.</p>
    }
    <ul>
      @for (user of userApi.users(); track user.id) {
        <li>{{ user.nom }} — {{ user.email }}</li>
      }
    </ul>
  `,
})
export class UserListComponent {
  readonly userApi = inject(UserApiService);
}
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `catchError` | Intercepte l'erreur, retourne un Observable de secours |
| Backoff exponentiel | `retry({ delay: (err, n) => timer(2^n * 1000) })` |
| Ne pas retry les 4xx | Erreurs client = inutile de reessayer |
| Detection offline | `fromEvent(window, 'online'/'offline')` |
| Cache Map + TTL | Simple, efficace, invalider apres mutation |
| `shareReplay` | Partage une seule souscription, `refCount: true` obligatoire |
| `resource()` | API moderne Signal-based avec loading/error/reload integres |
| Pattern ESN | Service = retry + cache + error handling + Signals exposes |

---

> **Prochain cours** : [Cours 28 — Formulaires template-driven](../07-formulaires/01-template-driven-forms.md)
