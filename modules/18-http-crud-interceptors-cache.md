---
titre: HttpClient — CRUD, interceptors fonctionnels et cache
cours: 03-angular
notions: ["provideHttpClient()", "withInterceptors()", "HttpClient injecté", "get/post/put/patch/delete typés", "HttpParams immuable", "HttpInterceptorFn", "HttpHandlerFn next", "req.clone() immuable", "catchError et HttpErrorResponse", "throwError re-propagation", "cache Map plus TTL", "invalidation après mutation"]
outcomes:
  - "sait configurer HttpClient en standalone avec provideHttpClient() et injecter HttpClient dans un service"
  - "sait écrire les cinq opérations CRUD typées qui renvoient des Observable"
  - "sait écrire un interceptor fonctionnel HttpInterceptorFn qui clone la requête et gère les erreurs globalement"
  - "sait mettre en cache les GET avec une Map plus TTL et invalider le cache après une mutation"
prerequis: [module 11 services-et-injectable, module 12 providers-et-scopes, module 16 rxjs-observables-et-operators, module 17 rxjs-patterns-et-interop-signals]
next: 19-formulaires-reactifs-et-signal-forms
libs: [{ name: "@angular/common", version: "19" }]
tribuzen: couche data TribuZen — SortieService qui parle à l'API sorties (liste, création, mise à jour, suppression)
last-reviewed: 2026-07
---

# HttpClient — CRUD, interceptors fonctionnels et cache

> **Outcomes — tu sauras FAIRE :** configurer `provideHttpClient()`, écrire un service CRUD typé, écrire un interceptor fonctionnel `HttpInterceptorFn`, et mettre en cache les GET avec invalidation.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **le dialogue avec une API REST** : configuration (`provideHttpClient`), les cinq verbes CRUD typés, les interceptors **fonctionnels** (`withInterceptors`), la gestion d'erreurs (`catchError` / `HttpErrorResponse`) et un **cache simple** (Map + TTL). L'interceptor d'auth ici est **générique** ; l'**auth JWT complète** (refresh token, redirection login, garde de session) est le **module 25**. La liaison HTTP → Signal via `resource()` / `toSignal()` a été vue au **module 10** et au **module 17** — ici on reste sur les `Observable` renvoyés par le service. Les formulaires qui produisent les payloads POST/PUT sont le **module 19**.

## 1. Cas concret d'abord

Sur TribuZen, les sorties famille ne vivent plus en mémoire : elles sont stockées côté serveur. Ta story : brancher l'écran « Mes sorties » sur l'API REST `/api/sorties`. Un collègue a commencé le service comme ça, en recopiant un pattern `fetch` vu ailleurs :

```typescript
// sortie.service.ts — AVANT (fetch brut, non typé, sans config Angular)
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SortieService {
  async getSorties() {
    const res = await fetch('/api/sorties');   // ← retour : Promise<any>
    return res.json();                          // ← any : aucune vérification de type
  }

  async creerSortie(data: any) {                // ← any en entrée aussi
    const res = await fetch('/api/sorties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
}
```

**Trois problèmes** que ce code laisse passer :

1. **Aucun typage** — `getSorties()` renvoie `Promise<any>`. Le template pourra écrire `sortie.budgetTotel` (faute de frappe) sans que rien ne le signale.
2. **Aucun point central** — le jour où il faut ajouter un token d'authentification, un log, ou un spinner global, il faut modifier **chaque** appel `fetch` à la main.
3. **Pas d'annulation, pas de retry, pas de cache** — `fetch` renvoie une `Promise` : impossible d'annuler une requête obsolète ou de composer proprement avec le reste de l'app réactive.

Angular fournit `HttpClient` : des requêtes **typées**, qui renvoient des **`Observable`** (annulables, composables), plus un système d'**interceptors** pour tout ce qui est transversal (auth, erreurs, cache). Ce module te donne les trois briques : le service CRUD typé, les interceptors fonctionnels, et un cache maison.

---

## 2. Théorie complète, concise

### 2.1 Configurer `HttpClient` en standalone

En Angular 19 (standalone, sans `NgModule`), on n'importe **pas** `HttpClientModule`. On appelle `provideHttpClient()` dans les `providers` de la config d'application.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),   // rend HttpClient injectable partout
  ],
};
```

`provideHttpClient()` accepte des **features** en arguments — dont `withInterceptors([...])` (section 2.4). Sans cet appel, injecter `HttpClient` lève une erreur « NullInjectorError: No provider for HttpClient ».

### 2.2 Injecter `HttpClient` dans un service

Le pattern idiomatique : un **service** `@Injectable` par ressource, qui encapsule tous les appels d'un endpoint. On injecte `HttpClient` avec `inject()`.

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/sorties';
}
```

Le composant n'appelle **jamais** `HttpClient` directement : il passe par le service. C'est la couche « data » de l'app (rappel du **module 11**).

### 2.3 Les cinq verbes CRUD, typés

Chaque méthode de `HttpClient` prend un **générique** `<T>` qui décrit le type de la **réponse**. Angular ne valide pas ce type à l'exécution (il fait confiance au serveur), mais il propage `T` dans tout le reste du code — d'où l'autocomplétion et la détection d'erreurs.

```typescript
export interface Sortie {
  id: string;
  titre: string;
  budgetTotal: number;
  participants: number;
}

// DTO d'entrée : ce qu'on envoie pour créer (pas d'id, généré par le serveur)
export interface CreateSortieDto {
  titre: string;
  budgetTotal: number;
  participants: number;
}

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/sorties';

  // GET liste — Observable<Sortie[]>
  getAll(): Observable<Sortie[]> {
    return this.http.get<Sortie[]>(this.baseUrl);
  }

  // GET par id
  getById(id: string): Observable<Sortie> {
    return this.http.get<Sortie>(`${this.baseUrl}/${id}`);
  }

  // POST — créer (le body est sérialisé en JSON automatiquement)
  create(dto: CreateSortieDto): Observable<Sortie> {
    return this.http.post<Sortie>(this.baseUrl, dto);
  }

  // PUT — remplacer complètement la ressource
  replace(id: string, sortie: Sortie): Observable<Sortie> {
    return this.http.put<Sortie>(`${this.baseUrl}/${id}`, sortie);
  }

  // PATCH — mise à jour partielle (Partial<T>)
  update(id: string, patch: Partial<Sortie>): Observable<Sortie> {
    return this.http.patch<Sortie>(`${this.baseUrl}/${id}`, patch);
  }

  // DELETE — souvent Observable<void>
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

Deux rappels importants (vus au **module 16**) sur ces `Observable` HTTP :

- ils sont **cold** : rien ne part sur le réseau tant qu'on n'a pas `subscribe()` (ou `toSignal` / pipe `async`) ;
- ils sont **single-emission** : ils émettent une valeur puis complètent. Chaque nouveau `subscribe` relance une **nouvelle** requête.

### 2.4 `HttpParams` — les query strings, immuables

Pour les paramètres d'URL (`?q=...&page=...`), on utilise `HttpParams`. Point crucial : **`HttpParams` est immuable**. Chaque `.set()` renvoie une **nouvelle** instance ; il faut chaîner ou réaffecter.

```typescript
import { HttpParams } from '@angular/common/http';

rechercher(terme: string, page: number): Observable<Sortie[]> {
  const params = new HttpParams()
    .set('q', terme)
    .set('page', page.toString());
  return this.http.get<Sortie[]>(this.baseUrl, { params });
  // → GET /api/sorties?q=plage&page=1
}
```

```typescript
// ❌ Faux : chaque .set() est perdu (l'original reste vide)
const params = new HttpParams();
params.set('q', 'plage');   // renvoie une nouvelle instance, jetée ici
params.set('page', '1');    // idem

// ✅ Bon : chaîner (ou réaffecter à chaque étape)
const params = new HttpParams().set('q', 'plage').set('page', '1');
```

### 2.5 Interceptor fonctionnel : `HttpInterceptorFn`

Un interceptor s'intercale entre le service et le serveur : il voit **toutes** les requêtes et peut les transformer. En Angular 19, un interceptor est une **simple fonction** typée `HttpInterceptorFn`, pas une classe.

Signature vérifiée (Context7, `@angular/common/http` 19) :

```typescript
type HttpInterceptorFn =
  (req: HttpRequest<unknown>, next: HttpHandlerFn) => Observable<HttpEvent<unknown>>;
```

- `req` : la requête sortante, **immuable**.
- `next` : la fonction (`HttpHandlerFn`) qui passe la requête à l'interceptor suivant, puis au serveur. On **doit** la renvoyer (ou renvoyer un Observable synthétique, section 2.8).

```typescript
// logging.interceptor.ts — l'interceptor minimal : observer sans modifier
import { HttpInterceptorFn } from '@angular/common/http';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  return next(req);   // on relaie la requête telle quelle
};
```

**Enregistrement** via la feature `withInterceptors` de `provideHttpClient` :

```typescript
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

providers: [
  provideHttpClient(
    withInterceptors([loggingInterceptor]),
  ),
],
```

`withInterceptors(fns: HttpInterceptorFn[])` prend un **tableau** : les interceptors s'exécutent dans l'ordre du tableau pour la requête, et en ordre **inverse** pour la réponse.

### 2.6 Modifier une requête : `req.clone()` (immuable)

Un `HttpRequest` est **immuable** — muter `req.headers` directement ne fait rien. Pour ajouter un header (ex. un token générique), on **clone** la requête.

```typescript
// auth-generic.interceptor.ts — ajout d'un header (version GÉNÉRIQUE)
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStore } from './token-store';

export const authGenericInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() marche dans un interceptor fonctionnel : contexte d'injection
  const token = inject(TokenStore).token();

  if (!token) {
    return next(req);   // pas de token : on ne modifie rien
  }

  // ✅ clone : nouvelle requête avec le header ajouté
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);   // on passe le CLONE, pas l'original
};
```

> **Portée** : cet interceptor se contente d'**attacher un token existant**. Le cycle complet (login, stockage sécurisé, refresh sur 401, redirection) est l'affaire du **module 25 (auth-jwt-guards)**. Ici c'est un exemple d'écriture de header, rien de plus.

### 2.7 Interceptor d'erreurs : `catchError` + `HttpErrorResponse`

Centraliser la gestion d'erreurs évite de répéter un `catchError` dans chaque service. On pipe `next(req)` avec `catchError`, on inspecte `error.status`, puis on **re-propage** avec `throwError` pour que le service appelant puisse réagir aussi.

```typescript
// error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notif = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // status 0 = pas de réponse réseau (offline, CORS, serveur down)
      const message =
        error.status === 0
          ? 'Connexion impossible. Vérifie ton réseau.'
          : `Erreur ${error.status} sur ${req.url}`;
      notif.notify(message);

      // re-propage : le service appelant garde la main (fallback, etc.)
      return throwError(() => error);
    }),
  );
};
```

`HttpErrorResponse` porte `status` (code HTTP, `0` si pas de réponse), `statusText`, `url`, et `error` (le corps de l'erreur renvoyé par le serveur).

### 2.8 Cache : Map + TTL dans un service (invalidation après mutation)

Le cache le plus lisible se met dans un **service dédié** : une `Map` clé → valeur avec un **TTL** (durée de vie). Le service CRUD vérifie le cache avant d'appeler le serveur, et l'**invalide** après chaque mutation (POST/PUT/PATCH/DELETE).

```typescript
// cache.service.ts
import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;   // timestamp d'expiration
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = 5 * 60 * 1000;   // 5 minutes

  get<T>(cle: string): T | null {
    const entry = this.store.get(cle) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // périmé : on purge et on renvoie null (→ nouvel appel réseau)
    if (Date.now() > entry.expiresAt) {
      this.store.delete(cle);
      return null;
    }
    return entry.data;
  }

  set<T>(cle: string, data: T): void {
    this.store.set(cle, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(cle: string): void {
    this.store.delete(cle);
  }
}
```

Branché dans le service (avec `of()` pour renvoyer un Observable à partir du cache, et `tap` pour remplir le cache) :

```typescript
import { Observable, of, tap } from 'rxjs';

getAll(): Observable<Sortie[]> {
  const cle = 'sorties:all';
  const cached = this.cache.get<Sortie[]>(cle);
  if (cached) {
    return of(cached);   // retour instantané, aucun appel réseau
  }
  return this.http.get<Sortie[]>(this.baseUrl).pipe(
    tap(data => this.cache.set(cle, data)),   // remplit le cache au passage
  );
}

create(dto: CreateSortieDto): Observable<Sortie> {
  return this.http.post<Sortie>(this.baseUrl, dto).pipe(
    tap(() => this.cache.invalidate('sorties:all')),   // ← liste périmée après ajout
  );
}
```

> **Alternative interceptor** : on peut aussi cacher au niveau interceptor (renvoyer un `new HttpResponse({ body })` ou `of(cached)` sans appeler `next`). C'est pratique pour un cache **transversal**, mais moins lisible pour l'**invalidation** ciblée après mutation — d'où le choix du cache-service ici. Pour le cache par-requête, Angular fournit `HttpContextToken` (activer/désactiver le cache requête par requête) ; c'est un raffinement, hors périmètre de ce module.

---

## 3. Worked examples

### Exemple 1 — `SortieService` CRUD complet avec cache (TribuZen)

On assemble tout : config, service typé, cache, invalidation. C'est la couche data réelle de l'écran « Mes sorties ».

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/error.interceptor';
import { loggingInterceptor } from './core/logging.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      // ordre : error d'abord (attrape tout), logging en dernier (voit tout)
      withInterceptors([errorInterceptor, loggingInterceptor]),
    ),
  ],
};
```

```typescript
// sortie.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, tap, catchError } from 'rxjs';
import { CacheService } from './cache.service';

export interface Sortie {
  id: string;
  titre: string;
  budgetTotal: number;
  participants: number;
}

export interface CreateSortieDto {
  titre: string;
  budgetTotal: number;
  participants: number;
}

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private readonly baseUrl = '/api/sorties';
  private readonly cleListe = 'sorties:all';

  // READ — sert le cache si présent, sinon appelle et met en cache
  getAll(): Observable<Sortie[]> {
    const cached = this.cache.get<Sortie[]>(this.cleListe);
    if (cached) {
      return of(cached);
    }
    return this.http.get<Sortie[]>(this.baseUrl).pipe(
      tap(data => this.cache.set(this.cleListe, data)),
      // fallback local : si le serveur échoue, on ne casse pas l'écran
      catchError((error: HttpErrorResponse) => {
        console.error(`[Sorties] échec GET (${error.status})`);
        return of([]);
      }),
    );
  }

  getById(id: string): Observable<Sortie> {
    return this.http.get<Sortie>(`${this.baseUrl}/${id}`);
  }

  // CREATE — invalide la liste pour forcer un rechargement au prochain getAll
  create(dto: CreateSortieDto): Observable<Sortie> {
    return this.http.post<Sortie>(this.baseUrl, dto).pipe(
      tap(() => this.cache.invalidate(this.cleListe)),
    );
  }

  // UPDATE partiel — invalide aussi la liste
  update(id: string, patch: Partial<Sortie>): Observable<Sortie> {
    return this.http.patch<Sortie>(`${this.baseUrl}/${id}`, patch).pipe(
      tap(() => this.cache.invalidate(this.cleListe)),
    );
  }

  // DELETE — invalide la liste
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.cache.invalidate(this.cleListe)),
    );
  }
}
```

**Ce qui se passe au premier affichage** : le composant appelle `getAll()`, le cache est vide → appel réseau → `tap` remplit le cache. Deuxième affichage dans les 5 minutes → `of(cached)` renvoie sans réseau. L'utilisateur crée une sortie (`create`) → `invalidate` vide la clé → le prochain `getAll()` refait un appel frais. On n'a jamais de liste périmée après une mutation.

### Exemple 2 — Interceptor d'erreurs + retry sur les GET

Le composant `MesSortiesComponent` consomme le service. On ajoute un interceptor qui retente **uniquement les GET** (les mutations ne se retentent pas — risque de doublon) sur erreur serveur.

```typescript
// retry-get.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer, throwError } from 'rxjs';

export const retryGetInterceptor: HttpInterceptorFn = (req, next) => {
  // ne retenter que les lectures : rejouer un POST créerait un doublon
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, tentative) => {
        // 4xx = erreur client (mauvaise requête) → inutile de réessayer
        if (error.status >= 400 && error.status < 500) {
          return throwError(() => error);
        }
        // 5xx / réseau → backoff : 1s puis 2s
        return timer(tentative * 1000);
      },
    }),
  );
};
```

```typescript
// mes-sorties.component.ts — consommation via toSignal (rappel module 17)
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SortieService } from './sortie.service';

@Component({
  selector: 'app-mes-sorties',
  template: `
    @if (sorties(); as liste) {
      @if (liste.length === 0) {
        <p>Aucune sortie planifiée.</p>
      } @else {
        <ul>
          @for (s of liste; track s.id) {
            <li>{{ s.titre }} — {{ s.budgetTotal }} EUR ({{ s.participants }} pers.)</li>
          }
        </ul>
      }
    } @else {
      <p>Chargement…</p>
    }
  `,
})
export class MesSortiesComponent {
  private service = inject(SortieService);
  // toSignal : Signal<Sortie[] | undefined> — undefined = chargement en cours
  readonly sorties = toSignal(this.service.getAll());
}
```

L'interceptor `retryGetInterceptor` s'enregistre dans le tableau `withInterceptors`, **avant** `errorInterceptor` : on retente d'abord, on notifie l'erreur seulement si les tentatives échouent.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier `provideHttpClient()`

```typescript
// ❌ providers vide : injecter HttpClient lève NullInjector: No provider for HttpClient
providers: []

// ✅ provideHttpClient() rend HttpClient injectable
providers: [provideHttpClient()]
```

En standalone, il n'y a pas de `HttpClientModule` à importer — c'est `provideHttpClient()` dans la config, sinon aucune injection de `HttpClient` ne fonctionne.

### PIÈGE #2 — Muter la requête au lieu de la cloner

```typescript
// ❌ HttpRequest est immuable : cette ligne ne fait RIEN
export const mauvais: HttpInterceptorFn = (req, next) => {
  req.headers.set('Authorization', 'Bearer x');   // ignoré
  return next(req);
};

// ✅ Cloner puis passer le clone
export const bon: HttpInterceptorFn = (req, next) => {
  const authReq = req.clone({ setHeaders: { Authorization: 'Bearer x' } });
  return next(authReq);   // ← le CLONE, pas req
};
```

Deux erreurs jumelles : muter `req`, ou cloner correctement mais **repasser `req`** à `next` au lieu du clone.

### PIÈGE #3 — `HttpParams` traité comme mutable

```typescript
// ❌ set() renvoie une NOUVELLE instance, ici jetée → params reste vide
const params = new HttpParams();
params.set('q', 'plage');
this.http.get('/api/sorties', { params });   // aucune query string

// ✅ chaîner (ou réaffecter : params = params.set(...))
const params = new HttpParams().set('q', 'plage');
```

`HttpParams` et `HttpHeaders` sont immuables comme `HttpRequest` — même piège partout.

### PIÈGE #4 — Oublier que l'Observable HTTP est cold

```typescript
// ❌ Aucune requête ne part : personne ne subscribe
this.service.getAll();

// ✅ Il faut consommer l'Observable
this.service.getAll().subscribe(sorties => { /* ... */ });
// ou toSignal(this.service.getAll()), ou pipe async dans le template
```

Un `http.get(...)` seul ne déclenche rien. Corollaire : chaque `subscribe` relance une requête — d'où l'intérêt du cache (ou de `shareReplay`, module 17) quand plusieurs consommateurs partagent la même donnée.

### PIÈGE #5 — Avaler l'erreur dans l'interceptor sans re-propager

```typescript
// ❌ catchError qui renvoie of(...) : le service appelant croit que tout va bien
return next(req).pipe(
  catchError((error: HttpErrorResponse) => {
    notif.notify('Erreur');
    return of(null);   // masque l'erreur → pas de fallback possible en amont
  }),
);

// ✅ Notifier PUIS re-propager avec throwError
return next(req).pipe(
  catchError((error: HttpErrorResponse) => {
    notif.notify('Erreur');
    return throwError(() => error);   // le service garde la main
  }),
);
```

Un interceptor d'erreurs **globales** notifie, mais **re-propage** : la décision finale (afficher un fallback, retenter, ignorer) appartient à l'appelant.

### PIÈGE #6 — Cacher sans invalider après mutation

```typescript
// ❌ On cache getAll mais create ne vide pas le cache
create(dto: CreateSortieDto) {
  return this.http.post<Sortie>(this.baseUrl, dto);
  // la liste cachée reste périmée → la nouvelle sortie n'apparaît pas
}

// ✅ Invalider la clé concernée après chaque mutation
create(dto: CreateSortieDto) {
  return this.http.post<Sortie>(this.baseUrl, dto).pipe(
    tap(() => this.cache.invalidate('sorties:all')),
  );
}
```

Un cache sans stratégie d'invalidation affiche des données mortes. Règle : **toute mutation invalide les clés de lecture qu'elle affecte.**

---

## 5. Ancrage TribuZen

`HttpClient` est la **couche data** de TribuZen : chaque ressource métier (sorties, familles, participants) a son service `@Injectable` qui parle à l'API REST.

**`SortieService`** (Exemple 1) — le premier service data branché sur le serveur : `getAll`, `getById`, `create`, `update`, `delete` typés `Sortie` / `CreateSortieDto`, avec cache `sorties:all` + invalidation. Il remplace les données en dur des modules précédents.

**`errorInterceptor` + `retryGetInterceptor`** (Exemple 2) — la couche transversale : toutes les requêtes TribuZen passent par la même gestion d'erreurs (notification globale) et le même retry sur GET. Un seul endroit à maintenir.

**`CacheService`** — cache Map + TTL réutilisé par tous les services data (sorties, familles) pour éviter les appels réseau redondants entre navigations.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      core/
        error.interceptor.ts        ← Exemple 2 (gestion erreurs globale)
        retry-get.interceptor.ts    ← Exemple 2 (retry GET only)
        cache.service.ts            ← Map + TTL + invalidate
      sorties/
        sortie.service.ts           ← Exemple 1 (CRUD typé + cache)
        mes-sorties.component.ts    ← consommation via toSignal
    app.config.ts                   ← provideHttpClient(withInterceptors([...]))
```

> L'**auth JWT réelle** (l'interceptor qui attache un vrai token, gère le refresh et redirige sur 401) est le **module 25**. Les **formulaires** qui produisent `CreateSortieDto` (validation, soumission) sont le **module 19**. Ici on s'arrête au dialogue HTTP typé.

---

## 6. Points clés

1. En standalone, `provideHttpClient()` dans la config rend `HttpClient` injectable — pas de `HttpClientModule`.
2. Un **service** `@Injectable` par ressource encapsule les cinq verbes CRUD ; le composant ne touche jamais `HttpClient` directement.
3. Chaque `http.get<T>` / `post<T>` / etc. porte le **type de la réponse** en générique — typage statique, pas de validation runtime.
4. Les `Observable` HTTP sont **cold** (rien sans `subscribe` / `toSignal`) et **single-emission** (une valeur puis complétion).
5. `HttpParams`, `HttpHeaders` et `HttpRequest` sont **immuables** : `.set()` et `req.clone()` renvoient de nouvelles instances.
6. Un interceptor fonctionnel est une `HttpInterceptorFn` `(req, next) => next(req)`, enregistrée via `withInterceptors([...])` ; l'ordre du tableau compte.
7. Pour modifier une requête dans un interceptor : `req.clone({ setHeaders })` puis passer **le clone** à `next`.
8. Interceptor d'erreurs : `catchError` sur `next(req)`, inspecter `HttpErrorResponse.status`, puis **re-propager** avec `throwError`.
9. Cache Map + TTL dans un service dédié ; **toute mutation invalide** les clés de lecture affectées.

---

## 7. Seeds Anki

```
Comment rend-on HttpClient injectable dans une app Angular 19 standalone ?|En appelant provideHttpClient() dans les providers de app.config.ts. Pas de HttpClientModule en standalone. Sans ça : NullInjectorError No provider for HttpClient.
À quoi sert le générique dans http.get<Sortie[]>(url) ?|Il type la réponse (Observable<Sortie[]>) pour l'autocomplétion et la détection d'erreurs. C'est du typage statique : Angular ne valide pas la forme réelle à l'exécution.
Quelle est la signature d'un interceptor fonctionnel HttpInterceptorFn en Angular 19 ?|Une fonction (req: HttpRequest, next: HttpHandlerFn) => Observable<HttpEvent>. Elle renvoie next(req) pour relayer, ou un Observable synthétique. Enregistrée via withInterceptors([...]).
Pourquoi faut-il req.clone() dans un interceptor au lieu de modifier req ?|HttpRequest est immuable : muter req.headers ne fait rien. req.clone({ setHeaders }) crée une nouvelle requête, et il faut passer CE clone à next(), pas req.
Pourquoi HttpParams().set('q','x') sans réaffectation ne marche-t-il pas ?|HttpParams est immuable : set() renvoie une NOUVELLE instance. Sans chaînage ni réaffectation, l'original reste vide. Il faut chaîner : new HttpParams().set('q','x').set('page','1').
Que doit faire un interceptor d'erreurs après avoir notifié l'utilisateur ?|Re-propager l'erreur avec throwError(() => error) dans le catchError. Sinon (return of(null)) l'appelant croit que tout va bien et perd la possibilité de gérer un fallback.
Pourquoi ne retenter (retry) que les requêtes GET ?|Les GET sont idempotentes : les rejouer est sans risque. Rejouer un POST/PUT/DELETE créerait des doublons ou double-suppressions. On teste req.method !== 'GET' pour court-circuiter.
Que faut-il faire du cache après un POST/PUT/DELETE ?|Invalider les clés de lecture affectées (cache.invalidate('sorties:all')) dans un tap. Sinon getAll ressert une liste périmée qui n'inclut pas la mutation.
Pourquoi un http.get(...) seul ne déclenche-t-il aucune requête ?|L'Observable HTTP est cold : rien ne part tant que personne ne subscribe (ou toSignal / pipe async). Chaque subscribe relance d'ailleurs une nouvelle requête.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-18-http-crud-interceptors-cache/README.md`. Construire le `SortieService` CRUD typé + un interceptor d'erreurs fonctionnel + un cache Map/TTL, avec le dev server Angular et l'onglet Network du navigateur comme oracle — zéro gap-fill, corrigé commenté intégral.
