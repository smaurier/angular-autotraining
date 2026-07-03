<!-- FLAG-REVIEW: SÉCURITÉ auth/JWT — à valider par Sylvain -->

# Lab 25 — Auth JWT, interceptor et guards

> **Outcome :** à la fin, tu sais câbler une auth JWT complète dans Angular — un `AuthService` à base de signals, un `authInterceptor` qui attache le `Bearer` et gère le `401` par un refresh partagé, un `authGuard` qui redirige via `UrlTree`, et un `roleGuard` (RBAC front) — en gardant en tête que **la sécurité réelle est au serveur**.
> **Vrai outil :** Angular CLI 19 (`ng serve`) + un backend de dev jetable (`json-server` avec routes custom pour `/api/auth/*`) + l'onglet **Network** des DevTools comme oracle (voir le `Bearer` partir, voir le refresh se déclencher sur un `401`, voir la redirection).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. L'oracle, c'est le Network tab, l'URL et le rendu à l'écran.
>
> **⚠️ Lab de sécurité.** Ce lab câble la **mécanique** front. Il ne remplace pas une revue de sécurité. Le backend `json-server` ci-dessous est un **mock jetable** (il ne valide pas vraiment les tokens) : il sert à observer le comportement Angular, pas à modéliser un vrai serveur. Ne réutilise **jamais** ce mock en production.

---

## Énoncé

Tu remplaces le `SessionService` bidon du lab 15 par une vraie auth JWT sur l'**espace famille** de TribuZen. Cahier des charges **exact** :

1. **`AuthService`** (`providedIn: 'root'`) :
   - signals privés `_token` et `_utilisateur`, exposés en lecture (`utilisateur` via `asReadonly()`) ;
   - `isAuthenticated = computed(() => _token() !== null)` et `role = computed(...)` ;
   - `login(email, password)` → `POST /api/auth/login`, pose la session ;
   - `logout()` → oublie le token, redirige vers `/connexion` ;
   - `refreshToken()` → `POST /api/auth/refresh`, **partagé** (`shareReplay(1)` + verrou) ;
   - `getToken()` synchrone pour l'interceptor.
   - **Contrainte stockage :** access token **en mémoire (signal)** — **interdit** de le mettre en `localStorage`.
2. **`authInterceptor`** (`HttpInterceptorFn`) :
   - exclut `/api/auth/` ;
   - clone la requête avec `Authorization: Bearer <token>` si token présent ;
   - sur `401` (et seulement 401) → `refreshToken()` puis **rejoue** la requête ; jamais de boucle infinie.
3. **`authGuard`** (`CanActivateFn`) → `true` si connecté, sinon `createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } })`.
4. **`roleGuard`** (`CanActivateFn`) → compare `route.data['role']` à `auth.role()`, sinon redirige `/acces-refuse`.
5. **Routes** : `/connexion` (public), `/famille` (`authGuard`), `/famille/admin` (`authGuard` + `roleGuard`, `data: { role: 'admin' }`).
6. **`ConnexionComponent`** : formulaire réactif email/password, appelle `login()`, revient au `returnUrl`, message d'erreur **générique**.

**Oracle attendu (dans les DevTools) :**
- Non connecté + `/famille` tapée → l'URL bascule sur `/connexion?returnUrl=%2Ffamille`.
- Après login → chaque `GET /api/famille` porte l'en-tête `Authorization: Bearer …` (onglet Network → Headers).
- Token forcé à expirer (voir mock) → un `GET` renvoie `401`, tu vois **un** `POST /api/auth/refresh` puis le `GET` **rejoué** en 200.
- Connecté en rôle `membre` sur `/famille/admin` → redirection vers `/acces-refuse`.

**Pas de gap-fill** — tu écris les fichiers complets à partir du starter.

### Mise en place du vrai outil

Dans un projet Angular 19 standalone (ou ton repo TribuZen) :

```bash
# 1. Backend jetable : json-server + un middleware pour /api/auth/*
npm install --save-dev json-server

# 2. Fichier db.json à la racine :
#    { "famille": [ { "id": "f1", "nom": "Maurier", "membres": 4 } ] }

# 3. auth-mock.js — routes d'auth simulées (login/refresh/logout)
#    (voir bloc ci-dessous, à créer à la racine)

# 4. Lancer l'API mock sur le port 3000 (terminal séparé)
node auth-mock.js

# 5. Proxy Angular : proxy.conf.json
#    { "/api": { "target": "http://localhost:3000", "secure": false } }
#    puis : ng serve --proxy-config proxy.conf.json
```

```js
// auth-mock.js — MOCK JETABLE, ne valide rien pour de vrai. NE PAS réutiliser en prod.
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

// petit compteur pour simuler l'expiration : le 3e appel protégé renvoie 401
let appelsProteges = 0;

server.post('/api/auth/login', (req, res) => {
  const { email } = req.body ?? {};
  if (!email) return res.status(401).jsonp({ message: 'Identifiants invalides' });
  appelsProteges = 0;
  res.jsonp({
    accessToken: 'fake-access-1',
    utilisateur: { id: 'u1', email, role: email.startsWith('admin') ? 'admin' : 'membre' },
  });
});

server.post('/api/auth/refresh', (req, res) => {
  appelsProteges = 0; // "nouveau" token → on remet le compteur
  res.jsonp({ accessToken: 'fake-access-refreshed' });
});

server.post('/api/auth/logout', (req, res) => res.jsonp({ ok: true }));

// endpoint protégé : simule l'expiration au 3e appel pour voir le refresh
server.get('/api/famille', (req, res, next) => {
  appelsProteges++;
  if (appelsProteges === 3) return res.status(401).jsonp({ message: 'token expiré' });
  next();
});

server.use('/api', router);
server.listen(3000, () => console.log('auth-mock sur http://localhost:3000'));
```

### Starter minimal

```ts
// auth.service.ts — starter
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  // À toi : _token, _utilisateur (signals), isAuthenticated/role (computed),
  //         login, logout, refreshToken (partagé), getToken.
  //         RAPPEL : token EN MÉMOIRE, jamais localStorage.
}
```

```ts
// auth.interceptor.ts — starter
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // À toi : exclure /api/auth/, cloner avec Bearer, gérer 401 → refresh → rejouer
  return next(req);
};
```

```ts
// auth.guard.ts — starter
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  // À toi : true si connecté, sinon UrlTree vers /connexion?returnUrl=...
  return true;
};
```

---

## Étapes (en friction)

1. **`AuthService`** — écris les signals `_token`/`_utilisateur`, les `computed` `isAuthenticated`/`role`, puis `login()` (`POST /api/auth/login`, `tap` pour poser la session). Vérifie dans les DevTools → Application → Local Storage qu'**aucun** token n'y apparaît.
2. **`refreshToken()` partagé** — un champ `refresh$: Observable<string> | null`. Si non nul, le renvoyer ; sinon construire le `POST /api/auth/refresh` avec `shareReplay(1)`, `catchError` (→ déconnexion), `finalize` (→ `refresh$ = null`).
3. **`authInterceptor`** — exclure `/api/auth/`, cloner avec `setHeaders`, puis `catchError` : si `err.status === 401 && token` → `refreshToken().pipe(switchMap(t => next(req.clone(... t ...))))` ; sinon `throwError`.
4. **`app.config.ts`** — `provideHttpClient(withInterceptors([authInterceptor]))`.
5. **`authGuard` + `roleGuard`** — `inject(AuthService)` + `inject(Router)`. `authGuard` → `UrlTree` avec `returnUrl`. `roleGuard` → compare `route.data['role']`.
6. **`app.routes.ts`** — `/connexion`, `/famille` (`authGuard`), `/famille/admin` (`authGuard` + `roleGuard`, `data: { role: 'admin' }`), `/acces-refuse`.
7. **`ConnexionComponent`** — formulaire réactif, `login().subscribe(...)`, `navigateByUrl(returnUrl ?? '/famille')`, erreur générique.
8. **Vérifie les 4 oracles** (redirection non connecté, Bearer présent, refresh sur le 3e appel, blocage rôle). Pour tester le rôle admin, connecte-toi avec un email commençant par `admin` (le mock donne `role: 'admin'`).

---

## Corrigé complet commenté

```ts
// auth.service.ts — corrigé
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, switchMap, shareReplay, catchError, finalize, throwError } from 'rxjs';

interface Utilisateur {
  id: string;
  email: string;
  role: 'admin' | 'membre';
}
interface ReponseAuth {
  accessToken: string;
  utilisateur: Utilisateur;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // État source EN MÉMOIRE — perdu au reload (voulu : rien à voler via XSS).
  private readonly _token = signal<string | null>(null);
  private readonly _utilisateur = signal<Utilisateur | null>(null);

  readonly utilisateur = this._utilisateur.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly role = computed(() => this._utilisateur()?.role ?? null);

  // Verrou de refresh partagé entre requêtes 401 concurrentes.
  private refresh$: Observable<string> | null = null;

  login(email: string, password: string) {
    return this.http
      .post<ReponseAuth>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.poserSession(res)));
  }

  logout() {
    this.http.post('/api/auth/logout', {}).subscribe(); // invalide le refresh côté serveur
    this._token.set(null);
    this._utilisateur.set(null);
    this.router.navigate(['/connexion']);
  }

  refreshToken(): Observable<string> {
    // un refresh déjà en vol ? on renvoie le MÊME observable → un seul appel réseau réel
    if (this.refresh$) return this.refresh$;

    this.refresh$ = this.http
      // le refresh token voyagerait en cookie httpOnly (withCredentials) — ici le mock l'ignore
      .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
      .pipe(
        tap((res) => this._token.set(res.accessToken)),
        switchMap((res) => of(res.accessToken)),
        shareReplay(1),                            // partage la réponse entre abonnés concurrents
        catchError((err) => {                      // refresh KO → la session est finie
          this._token.set(null);
          this._utilisateur.set(null);
          this.router.navigate(['/connexion']);
          return throwError(() => err);
        }),
        finalize(() => (this.refresh$ = null)),    // libère le verrou pour le prochain cycle
      );
    return this.refresh$;
  }

  getToken(): string | null {
    return this._token();
  }

  private poserSession(res: ReponseAuth) {
    this._token.set(res.accessToken);
    this._utilisateur.set(res.utilisateur);
  }
}
```

```ts
// auth.interceptor.ts — corrigé
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // login ET refresh sortent du circuit → pas de token à attacher, pas de boucle de refresh
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const token = auth.getToken();
  const reqAuth = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqAuth).pipe(
    catchError((err: HttpErrorResponse) => {
      // Seul un 401 avec un token existant déclenche un refresh.
      // 403 (droits) ou requête sans token → on propage tel quel.
      if (err.status !== 401 || !token) {
        return throwError(() => err);
      }
      return auth.refreshToken().pipe(
        switchMap((nouveauToken) => {
          const rejoue = req.clone({ setHeaders: { Authorization: `Bearer ${nouveauToken}` } });
          return next(rejoue); // rejoue la requête d'origine avec le token frais
        }),
      );
    }),
  );
};
```

```ts
// auth.guard.ts — corrigé
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  // pas connecté → UrlTree (redirection explicite) avec l'URL demandée mémorisée
  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roleRequis = route.data['role'] as string | undefined;
  // RBAC FRONT = UX only. Le serveur revérifie le rôle sur chaque action réelle.
  return auth.role() === roleRequis ? true : router.createUrlTree(['/acces-refuse']);
};
```

```ts
// connexion.component.ts — corrigé
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <input formControlName="email" type="email" placeholder="Email" />
      <input formControlName="password" type="password" placeholder="Mot de passe" />
      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
      <button type="submit" [disabled]="chargement() || form.invalid">
        {{ chargement() ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>
  `,
})
export class ConnexionComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly erreur = signal('');
  readonly chargement = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  soumettre() {
    if (this.form.invalid) return;
    this.chargement.set(true);
    this.erreur.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const cible = this.route.snapshot.queryParams['returnUrl'] ?? '/famille';
        this.router.navigateByUrl(cible);
      },
      error: (err: HttpErrorResponse) => {
        this.chargement.set(false);
        // message GÉNÉRIQUE : ne pas révéler si c'est l'email ou le mot de passe
        this.erreur.set(
          err.status === 401 ? 'Identifiants invalides' : 'Connexion impossible, réessaie',
        );
      },
    });
  }
}
```

```ts
// app.routes.ts — corrigé
import { Routes } from '@angular/router';
import { ConnexionComponent } from './pages/connexion.component';
import { FamilleComponent } from './famille/famille.component';
import { FamilleAdminComponent } from './famille/famille-admin.component';
import { AccesRefuseComponent } from './pages/acces-refuse.component';
import { authGuard, roleGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'connexion', component: ConnexionComponent, title: 'Connexion' },
  { path: 'famille', component: FamilleComponent, canActivate: [authGuard], title: 'Ma famille' },
  {
    path: 'famille/admin',
    component: FamilleAdminComponent,
    canActivate: [authGuard, roleGuard], // d'abord connecté, PUIS rôle admin
    data: { role: 'admin' },
    title: 'Admin famille',
  },
  { path: 'acces-refuse', component: AccesRefuseComponent, title: 'Accès refusé' },
  { path: '', redirectTo: 'famille', pathMatch: 'full' },
];
```

```ts
// app.config.ts — corrigé
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

**Pourquoi ce corrigé est correct :**
- Le token vit **en signal (mémoire)** : rien dans `localStorage`, donc rien qu'un XSS pourrait exfiltrer. Au reload la session est perdue — un vrai produit la réhydraterait via un `refresh()` au démarrage (module 25 §2.7).
- L'interceptor **exclut `/api/auth/`** : le refresh ne se ré-intercepte pas → pas de boucle infinie. Il ne refresh que sur **401 avec token** : un `403` (droits) se propage.
- `refreshToken()` est **partagé** (`shareReplay(1)` + verrou `refresh$` remis à `null` dans `finalize`) : les requêtes 401 concurrentes déclenchent **un seul** `POST /api/auth/refresh` (visible dans Network).
- L'`authGuard` renvoie un **`UrlTree`** (pas `false`) et mémorise `returnUrl` → après login on revient à l'écran demandé.
- Le `roleGuard` est **UX only** : le corrigé le commente explicitement. Le mock ne prouve rien ; en vrai le serveur revérifie le rôle.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis le lab **de mémoire, en 35 minutes**, sans rouvrir ce corrigé ni le module 25, avec :

1. **Réhydratation au démarrage** : un `APP_INITIALIZER` (ou `provideAppInitializer`) qui appelle `refreshToken()` au boot et `catchError(() => of(null))` pour démarrer déconnecté sans planter. Oracle : après un login puis un **F5**, la session repart sans retaper le mot de passe (adapte le mock pour que `/api/auth/refresh` réponde 200 même sans login préalable).
2. **`canMatchGuard`** sur `/famille/admin` **lazy-loadé** (`loadComponent`) : bloque le téléchargement du chunk admin si le rôle n'est pas `admin` (au lieu de le charger puis rediriger). Oracle Network : le chunk `famille-admin-*.js` **ne part pas** pour un membre.

**Critère de réussite :** au reload la session persiste via refresh (aucun token en `localStorage`) ; un membre non-admin ne déclenche **jamais** le téléchargement du chunk admin.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      auth/
        auth.service.ts       ← signals + login/logout/refresh partagé
        auth.interceptor.ts   ← Bearer + 401/refresh
        auth.guard.ts         ← authGuard + roleGuard
      pages/
        connexion.component.ts
        acces-refuse.component.ts
      famille/
        famille.component.ts
        famille-admin.component.ts
    app.routes.ts
    app.config.ts             ← withInterceptors([authInterceptor]) (+ errorInterceptor du module 18)
```

**Différences par rapport au lab :**
- Le mock `json-server` est remplacé par l'**API TribuZen (NestJS)** qui émet et **valide** de vrais JWT, hache les mots de passe et **autorise** chaque action — c'est là qu'est la sécurité.
- Le refresh token vit en **cookie `httpOnly` + `Secure` + `SameSite`** posé par le serveur ; le front n'y touche jamais (le navigateur l'envoie via `withCredentials`).
- `withInterceptors` contiendra aussi l'`errorInterceptor` et le `loadingInterceptor` du module 18 : `[authInterceptor, errorInterceptor, loadingInterceptor]`.
- Le `confirm()`/redirections passeront par le design system (Angular Material, module 21).

**Commit cible :**
```
feat(auth): auth JWT — AuthService signals, authInterceptor Bearer+refresh, authGuard/roleGuard
```
