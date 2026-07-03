# Lab 18 — HttpClient CRUD, interceptor et cache

> **Outcome :** à la fin, tu sais brancher un composant Angular sur une API REST via un `SortieService` CRUD typé, ajouter un interceptor d'erreurs fonctionnel, et cacher les GET avec invalidation après mutation.
> **Vrai outil :** Angular CLI 19 (`ng serve`) + un backend de dev jetable (`json-server`) + l'onglet **Network** du navigateur comme oracle (tu vois les vraies requêtes partir, ou pas quand le cache répond).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. L'oracle, c'est le Network tab et le rendu à l'écran.

---

## Énoncé

Tu branches l'écran « Mes sorties » de TribuZen sur une vraie API REST. Cahier des charges **exact** :

1. **Config** — `provideHttpClient()` avec `withInterceptors([...])` dans `app.config.ts`.
2. **`SortieService`** typé, injectant `HttpClient` :
   - `getAll(): Observable<Sortie[]>` — GET liste, **caché** (Map + TTL 30 s pour voir l'effet vite).
   - `create(dto: CreateSortieDto): Observable<Sortie>` — POST, **invalide** le cache liste.
   - `delete(id: string): Observable<void>` — DELETE, **invalide** le cache liste.
3. **`CacheService`** — Map + TTL avec `get`, `set`, `invalidate`.
4. **`errorInterceptor`** fonctionnel — `catchError` global, log l'erreur avec son `status`, puis **re-propage** avec `throwError`.
5. **`MesSortiesComponent`** — consomme `getAll()` via `toSignal`, affiche la liste avec `@for`, un empty state, un bouton **Ajouter** (POST) et **Supprimer** par ligne (DELETE).

**Interface (à copier dans ton `sortie.service.ts`) :**

```ts
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
```

**Pas de gap-fill** — tu écris les fichiers complets à partir du starter ci-dessous.

### Mise en place du vrai outil

Dans un projet Angular 19 standalone (ou ton repo TribuZen) :

```bash
# 1. Backend de dev jetable — json-server sert un CRUD REST complet sur /sorties
npm install --save-dev json-server

# 2. Fichier de données db.json à la racine
#    { "sorties": [ { "id": "s1", "titre": "Plage", "budgetTotal": 120, "participants": 4 } ] }

# 3. Lancer l'API sur le port 3000 (dans un terminal séparé)
npx json-server --watch db.json --port 3000

# 4. Proxy Angular : proxy.conf.json  { "/api": { "target": "http://localhost:3000", "pathRewrite": { "^/api": "" } } }
#    puis : ng serve --proxy-config proxy.conf.json
```

`/api/sorties` est alors un vrai endpoint REST (GET/POST/DELETE fonctionnels). Ouvre l'onglet **Network** : c'est ton oracle.

### Starter minimal

```ts
// sortie.service.ts — starter
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Colle ici les interfaces Sortie et CreateSortieDto

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/sorties';
  // À toi : injecter CacheService, écrire getAll (caché), create + delete (invalident)
}
```

```ts
// cache.service.ts — starter
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CacheService {
  // À toi : Map<string, { data; expiresAt }>, get<T>, set<T>, invalidate
}
```

```ts
// error.interceptor.ts — starter
import { HttpInterceptorFn } from '@angular/common/http';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // À toi : pipe(catchError(...)) qui log status puis re-propage
  return next(req);
};
```

---

## Étapes (en friction)

1. **Configure** — `provideHttpClient(withInterceptors([errorInterceptor]))` dans `app.config.ts`. Vérifie qu'injecter `HttpClient` ne lève plus d'erreur.
2. **Écris `CacheService`** — `Map<string, { data: unknown; expiresAt: number }>`. `get<T>` renvoie `null` si absent **ou** périmé (et purge dans ce cas). TTL 30 s.
3. **Écris `getAll()`** — lis le cache ; si présent, `return of(cached)` ; sinon `http.get`, `tap` pour cacher.
4. **Écris `create()` et `delete()`** — après la réponse, `tap(() => this.cache.invalidate('sorties:all'))`.
5. **Écris `errorInterceptor`** — `next(req).pipe(catchError((e: HttpErrorResponse) => { console.error(e.status); return throwError(() => e); }))`.
6. **Écris `MesSortiesComponent`** — `toSignal(this.service.getAll())`, `@for` + `track s.id`, empty state, boutons Ajouter/Supprimer.
7. **Vérifie au Network tab** :
   - premier chargement → une requête GET `/api/sorties` ;
   - re-navigue vers l'écran dans les 30 s → **aucune** nouvelle requête (cache HIT) ;
   - clique Ajouter → POST **puis** au prochain `getAll` un nouveau GET (cache invalidé) ;
   - coupe `json-server` et recharge → l'`errorInterceptor` log un `status` (0 ou 500), l'écran ne plante pas.

---

## Corrigé complet commenté

```ts
// cache.service.ts — corrigé
import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // timestamp (ms) au-delà duquel l'entrée est périmée
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = 30_000; // 30 s — court pour voir l'expiration en lab

  get<T>(cle: string): T | null {
    const entry = this.store.get(cle) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // périmé → purge et renvoie null pour forcer un appel réseau frais
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

```ts
// error.interceptor.ts — corrigé
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // next(req) lance la requête ; on greffe catchError sur son flux de réponse
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // status 0 = pas de réponse (serveur down, offline, CORS)
      const detail = error.status === 0 ? 'réseau/serveur injoignable' : error.statusText;
      console.error(`[HTTP] ${req.method} ${req.url} → ${error.status} (${detail})`);

      // RE-PROPAGE : le service appelant garde la main (fallback of([]) possible)
      return throwError(() => error);
    }),
  );
};
```

```ts
// sortie.service.ts — corrigé
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

  getAll(): Observable<Sortie[]> {
    // 1. cache d'abord : si présent et non périmé, aucun appel réseau
    const cached = this.cache.get<Sortie[]>(this.cleListe);
    if (cached) {
      return of(cached);
    }
    // 2. sinon on appelle, on cache au passage (tap), et on prévoit un fallback
    return this.http.get<Sortie[]>(this.baseUrl).pipe(
      tap(data => this.cache.set(this.cleListe, data)),
      catchError((error: HttpErrorResponse) => {
        // l'interceptor a déjà loggé ; ici on protège l'écran avec une liste vide
        console.warn(`[Sorties] fallback liste vide (status ${error.status})`);
        return of([]);
      }),
    );
  }

  create(dto: CreateSortieDto): Observable<Sortie> {
    return this.http.post<Sortie>(this.baseUrl, dto).pipe(
      // la liste cachée n'inclut pas le nouvel élément → on l'invalide
      tap(() => this.cache.invalidate(this.cleListe)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.cache.invalidate(this.cleListe)),
    );
  }
}
```

```ts
// mes-sorties.component.ts — corrigé
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SortieService, Sortie } from './sortie.service';

@Component({
  selector: 'app-mes-sorties',
  template: `
    <h2>Mes sorties</h2>
    <button (click)="ajouter()">Ajouter une sortie</button>

    <!-- @for + empty state via @empty (control flow module 03) -->
    @if (sorties(); as liste) {
      <ul>
        @for (s of liste; track s.id) {
          <li>
            {{ s.titre }} — {{ s.budgetTotal }} EUR ({{ s.participants }} pers.)
            <button (click)="supprimer(s.id)">Supprimer</button>
          </li>
        } @empty {
          <li>Aucune sortie planifiée.</li>
        }
      </ul>
    } @else {
      <p>Chargement…</p>
    }
  `,
})
export class MesSortiesComponent {
  private service = inject(SortieService);

  // Signal local rechargé à la main après chaque mutation.
  // toSignal(getAll()) est cold : il s'exécute une fois à la création.
  readonly sorties = signal<Sortie[] | undefined>(undefined);

  constructor() {
    this.recharger();
  }

  private recharger(): void {
    // getAll() sert le cache si dispo, sinon appelle le serveur
    this.service.getAll().subscribe(liste => this.sorties.set(liste));
  }

  ajouter(): void {
    this.service
      .create({ titre: 'Nouvelle sortie', budgetTotal: 0, participants: 1 })
      .subscribe(() => this.recharger()); // cache déjà invalidé par le service
  }

  supprimer(id: string): void {
    this.service.delete(id).subscribe(() => this.recharger());
  }
}
```

```ts
// app.config.ts — corrigé
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([errorInterceptor])),
  ],
};
```

**Pourquoi ce corrigé est correct :**
- `getAll()` sert le cache avec `of(cached)` — au Network tab, aucune requête ne part pendant les 30 s de TTL. C'est la preuve visible que le cache fonctionne.
- `create` et `delete` invalident `sorties:all` **dans le service** (via `tap`), donc le `recharger()` du composant refait bien un GET frais — la mutation apparaît à l'écran.
- L'`errorInterceptor` **re-propage** (`throwError`), ce qui laisse le `catchError` de `getAll()` fournir un fallback `[]`. Couper `json-server` ne plante pas l'écran : la liste devient vide et l'erreur est loggée.
- Le composant recharge à la main après mutation plutôt que via un `toSignal` figé : un `toSignal(getAll())` ne se ré-exécute pas tout seul après un POST. (Le pattern réactif complet — signal source + `resource`/`switchMap` — est le terrain des modules 10 et 17.)

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis le lab **de mémoire, en 30 minutes**, sans rouvrir ce corrigé ni le module 18, avec :

1. Un **interceptor `loadingInterceptor`** supplémentaire : un `LoadingService` avec un compteur `signal`, `isLoading = computed(() => compteur() > 0)`, incrémenté au départ de la requête et décrémenté dans `finalize()`. Affiche « Chargement… » global tant que `isLoading()` est vrai.
2. Le cache **par clé paramétrée** : `getAll(filtre?: string)` cache sous `sorties:${filtre ?? 'all'}` (deux filtres = deux entrées de cache indépendantes).

**Critère de réussite :** au Network tab, changer de filtre déclenche un GET la première fois puis sert le cache ; le spinner global apparaît sur chaque vrai appel réseau et disparaît en cas d'erreur comme de succès (grâce à `finalize`).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      core/
        error.interceptor.ts
        cache.service.ts
      sorties/
        sortie.service.ts
        mes-sorties.component.ts
    app.config.ts
```

**Différences par rapport au lab :**

- L'`errorInterceptor` notifiera un vrai `NotificationService` (toast) au lieu d'un `console.error`.
- Le `CreateSortieDto` viendra d'un **formulaire réactif** (module 19), pas d'un objet en dur.
- L'interceptor d'**auth JWT** (attacher le token, refresh sur 401) s'ajoutera au module 25 — le tableau `withInterceptors` grandira : `[authInterceptor, errorInterceptor, loadingInterceptor]`.
- Le backend `json-server` sera remplacé par l'API TribuZen réelle ; le service ne change pas (même contrat REST).

**Commit cible :**
```
feat(sorties): SortieService CRUD typé + errorInterceptor + cache Map/TTL
```
