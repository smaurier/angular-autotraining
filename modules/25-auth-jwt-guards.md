---
titre: Auth JWT — AuthService, interceptor d'auth, refresh et guards RBAC
cours: 03-angular
notions: ["flux JWT (access token + refresh token)", "AuthService avec signals", "stockage du token (in-memory vs localStorage vs cookie httpOnly)", "authInterceptor HttpInterceptorFn", "req.clone setHeaders Authorization Bearer", "gestion du 401 et refresh token", "guard d'authentification CanActivateFn", "createUrlTree redirection returnUrl", "RBAC front avec roleGuard et route.data", "le front ne remplace jamais l'autorisation serveur"]
outcomes:
  - sait modéliser l'état d'auth dans un AuthService à base de signals (token, utilisateur, isAuthenticated)
  - sait attacher le token aux requêtes via un authInterceptor fonctionnel et exclure les endpoints d'auth
  - sait gérer un 401 avec un refresh token puis rejouer la requête, sans boucle infinie
  - sait protéger une route avec un CanActivateFn qui redirige via un UrlTree en mémorisant l'URL demandée
  - sait poser un contrôle de rôle (RBAC) côté front tout en sachant qu'il ne remplace pas l'autorisation serveur
  - sait arbitrer le stockage du token entre in-memory, localStorage et cookie httpOnly selon le risque XSS/CSRF
prerequis: [modules 00-24, module 15 guards-et-lazy-loading, module 18 http-crud-interceptors-cache]
next: 26-recettes-esn-et-pieges
libs: [{ name: "@angular/common", version: "19" }]
tribuzen: back-office et front-office TribuZen — session parent connecté, espace famille protégé et actions réservées au rôle admin
last-reviewed: 2026-07
---

<!-- FLAG-REVIEW: SÉCURITÉ auth/JWT — à valider par Sylvain -->

# Auth JWT — `AuthService`, interceptor d'auth, refresh et guards RBAC

> **Outcomes — tu sauras FAIRE :** modéliser l'état d'auth avec des signals, attacher le token via un `authInterceptor`, gérer le refresh sur un `401`, protéger des routes avec un `CanActivateFn` et poser un contrôle de rôle front.
> **Difficulté :** :star::star::star::star:
>
> **⚠️ Sujet sensible — sécurité.** Ce module câble la **mécanique** Angular de l'auth. Il ne fait pas de toi un expert sécurité. Deux règles tiennent tout le module : (1) **le front ne fait jamais autorité** — toute protection front est une commodité d'UX, l'autorisation réelle se décide et se vérifie **sur le serveur, à chaque requête** ; (2) **un JWT n'est pas chiffré** — c'est du Base64URL lisible par n'importe qui, donc **jamais** de secret dans le payload. Chaque choix de stockage a un compromis explicité en §2 et §4.
>
> **Portée :** on s'appuie sur les **interceptors** (module 18) et les **guards** (module 15) déjà connus, on les spécialise pour l'auth. On reste côté client Angular : la génération/validation du token, le hachage des mots de passe et la logique OAuth serveur sont **hors périmètre** (couche NestJS). On ne traite pas non plus le SSR/hydration de la session.

## 1. Cas concret d'abord

Sur TribuZen, un parent se connecte pour gérer sa famille. Une fois connecté :

- l'**espace famille** (`/famille`) ne doit s'ouvrir que s'il est authentifié ;
- chaque appel à l'API (`GET /api/famille`, `POST /api/sorties`…) doit porter son **token** ;
- si le token a expiré en cours de session, l'app doit **le renouveler silencieusement** et rejouer la requête, sans le déconnecter brutalement ;
- certaines actions (supprimer un membre, inviter) sont réservées au rôle **admin** de la tribu.

Au module 15, on avait un `SessionService` bidon : un simple `signal(false)` on/off, sans vrai token. C'était volontaire — on câblait la mécanique des guards. Voici ce que ça donnait :

```typescript
// session.service.ts — le PLACEHOLDER du module 15 (à remplacer maintenant)
@Injectable({ providedIn: 'root' })
export class SessionService {
  private connecte = signal(false);
  estConnecte() { return this.connecte(); }
  connecter()   { this.connecte.set(true); }   // ← aucun serveur, aucun token
}
```

Le problème : ce service ne prouve rien au serveur. Le back TribuZen exige un **JWT** dans l'en-tête `Authorization`. Il faut donc : un vrai `AuthService` qui obtient et détient le token, un **interceptor** qui l'attache à chaque requête, une stratégie de **refresh** quand il expire, et des **guards** qui s'appuient sur l'état d'auth réel. C'est tout ce module — et on le fait en gardant en tête que **le back reste seul juge** de ce que le parent a le droit de faire.

---

## 2. Théorie complète, concise

### 2.1 Le flux JWT, vu du front

```
1. POST /api/auth/login { email, password }
      → réponse { accessToken, user }   (+ un refresh token, voir 2.6)
2. Le front garde l'accessToken et l'attache à chaque requête suivante :
      Authorization: Bearer <accessToken>
3. L'accessToken est COURT (ex. 15 min). À son expiration, le serveur répond 401.
4. Sur 401 → on demande un nouvel accessToken (refresh) → on rejoue la requête.
5. Logout → on oublie le token côté front → le serveur invalide le refresh.
```

Ce que le front **ne fait pas** : il ne valide pas la signature du token, ne décide pas des permissions, ne fait pas confiance à son propre contenu pour autoriser une action serveur. Il **transporte** un jeton et **s'adapte** aux réponses du serveur.

### 2.2 Un JWT est lisible, pas chiffré

Un JWT a trois parties `header.payload.signature` encodées en **Base64URL**. Le payload est **décodable par quiconque** (colle un token sur un décodeur, tu lis les claims). La signature garantit seulement que le serveur l'a émis et qu'il n'a pas été altéré — elle **n'apporte aucune confidentialité**.

Conséquences directes :

- **Jamais de secret** (mot de passe, clé API, données sensibles) dans le payload.
- Le `role: 'admin'` lu dans le token côté front sert à **afficher/masquer** de l'UI, pas à autoriser : un utilisateur peut forger un faux token ou appeler l'API directement. Le serveur **revérifie** le rôle sur son exemplaire signé.

### 2.3 `AuthService` — l'état d'auth en signals

L'auth est un état **partagé** de l'application : on le met dans un service `providedIn: 'root'` (singleton), avec des signals pour la réactivité et un `computed` pour l'état dérivé `isAuthenticated`.

```typescript
// auth.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

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

  // --- État source (privé, écriture contrôlée) ---
  private readonly _token = signal<string | null>(null);
  private readonly _utilisateur = signal<Utilisateur | null>(null);

  // --- Lecture publique seulement ---
  readonly utilisateur = this._utilisateur.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly role = computed(() => this._utilisateur()?.role ?? null);

  login(email: string, password: string) {
    return this.http
      .post<ReponseAuth>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.poserSession(res)));
  }

  logout() {
    // on prévient le serveur d'invalider le refresh (cookie httpOnly côté serveur)
    this.http.post('/api/auth/logout', {}).subscribe();
    this._token.set(null);
    this._utilisateur.set(null);
    this.router.navigate(['/connexion']);
  }

  // getter synchrone lu par l'interceptor
  getToken(): string | null {
    return this._token();
  }

  private poserSession(res: ReponseAuth) {
    this._token.set(res.accessToken);
    this._utilisateur.set(res.utilisateur);
  }
}
```

Points vérifiés : `signal<T | null>(null)` typé explicitement, `asReadonly()` pour publier un signal non modifiable de l'extérieur, `computed(() => …)` en lecture seule pour `isAuthenticated`. Le token vit ici **en mémoire** — voir 2.7 pour l'arbitrage du stockage.

### 2.4 `authInterceptor` — attacher le token

Un `HttpInterceptorFn` fonctionnel (module 18) qui injecte l'`AuthService`, lit le token et **clone** la requête pour ajouter l'en-tête. Signature vérifiée : `(req: HttpRequest<unknown>, next: HttpHandlerFn) => Observable<HttpEvent<unknown>>`.

```typescript
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Ne PAS ajouter le token aux appels d'auth eux-mêmes
  // (login/refresh n'ont pas de token ou en ont un autre).
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  if (!token) {
    return next(req); // requêtes publiques : on laisse passer sans en-tête
  }

  // req est IMMUABLE → on clone en posant l'en-tête Authorization
  const reqAuth = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(reqAuth);
};
```

`req.clone({ setHeaders: … })` est la forme confirmée par la doc (équivalente à `req.clone({ headers: req.headers.set('Authorization', …) })`). On n'attache **jamais** un token à un domaine tiers : ici on filtre implicitement car toutes nos URLs sont relatives (`/api/...`) ; en présence d'URLs absolues, vérifier explicitement le domaine avant d'ajouter l'en-tête (sinon on fuite le token vers un tiers).

### 2.5 Gérer le `401` — refresh puis rejouer

Quand l'access token expire, le serveur répond `401`. On intercepte cette réponse, on demande un nouveau token, puis on **rejoue** la requête d'origine avec le nouveau token. Piège central : éviter la **boucle infinie** (un refresh qui échoue en 401 ne doit pas relancer un refresh) et les **refresh concurrents** (dix requêtes qui tombent en 401 en même temps ne doivent pas déclencher dix refresh).

```typescript
// auth.interceptor.ts (suite) — version avec refresh
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/api/auth/')) {
    return next(req); // login ET refresh sortent du circuit → pas de boucle
  }

  const token = auth.getToken();
  const reqAuth = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqAuth).pipe(
    catchError((err: HttpErrorResponse) => {
      // Seul un 401 déclenche un refresh. 403 = interdit (droits) → on NE refresh PAS.
      if (err.status !== 401 || !token) {
        return throwError(() => err);
      }
      // refresh$ est partagé (shareReplay dans le service) → un seul appel réel
      return auth.refreshToken().pipe(
        switchMap((nouveauToken) => {
          const rejoue = req.clone({
            setHeaders: { Authorization: `Bearer ${nouveauToken}` },
          });
          return next(rejoue);
        }),
      );
    }),
  );
};
```

Côté service, le refresh doit être **partagé** entre appels concurrents :

```typescript
// auth.service.ts (ajouts)
import { Observable, of, shareReplay, tap, throwError, catchError, finalize } from 'rxjs';

private refresh$: Observable<string> | null = null;

refreshToken(): Observable<string> {
  // Un refresh déjà en vol ? on renvoie le MÊME observable partagé.
  if (this.refresh$) return this.refresh$;

  this.refresh$ = this.http
    // le refresh token n'est PAS dans le corps : il est envoyé automatiquement
    // par le navigateur via un cookie httpOnly (withCredentials).
    .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
    .pipe(
      tap((res) => this._token.set(res.accessToken)),
      switchMap((res) => of(res.accessToken)),
      shareReplay(1),                          // partage entre requêtes concurrentes
      catchError((err) => {                    // refresh KO → session finie
        this.forcerDeconnexion();
        return throwError(() => err);
      }),
      finalize(() => (this.refresh$ = null)),  // libère le verrou pour le prochain cycle
    );
  return this.refresh$;
}

private forcerDeconnexion() {
  this._token.set(null);
  this._utilisateur.set(null);
  this.router.navigate(['/connexion']);
}
```

**`401` vs `403`** : un `403 Forbidden` signifie « authentifié mais pas le droit » — le rejouer après refresh ne changera rien. Seul le `401 Unauthorized` (token absent/expiré) justifie un refresh.

### 2.6 Les deux tokens : access court, refresh long

- **Access token** : courte durée (minutes). Envoyé à chaque requête. S'il fuit, la fenêtre de nuisance est petite.
- **Refresh token** : longue durée (jours). Sert **uniquement** à obtenir un nouvel access token. Il doit être le mieux protégé — idéalement en **cookie `httpOnly` + `Secure` + `SameSite`**, jamais lisible par le JS (donc invisible pour l'interceptor : le navigateur l'envoie tout seul via `withCredentials: true`). Le serveur peut le **révoquer** (rotation, liste de refresh valides) — c'est ce qui permet un vrai logout.

### 2.7 Stockage du token — le compromis à assumer

Il **n'existe pas** de stockage « sûr » universel côté front. On choisit selon la menace.

| Stockage | Résiste au XSS ? | Résiste au CSRF ? | Survit au reload ? | Verdict |
|---|---|---|---|---|
| **Variable / signal (in-memory)** | Oui (rien de persistant à voler) | Oui (rien à envoyer auto) | **Non** (perdu au refresh de page) | Le plus sûr pour l'**access token**. Reload → refresh via cookie httpOnly. |
| **`localStorage`** | **Non** — tout script injecté fait `localStorage.getItem` | Oui | Oui | Pratique mais **exposé au XSS**. Acceptable en **prototype** seulement, jamais sans en connaître le risque. |
| **Cookie `httpOnly`** | Oui (inaccessible au JS) | **Non** par défaut → besoin de `SameSite`/anti-CSRF | Oui | Le meilleur pour le **refresh token**. Gestion serveur requise. |

Pratique recommandée et retenue pour TribuZen : **access token en mémoire (signal)** + **refresh token en cookie `httpOnly`**. Au rechargement de la page, le signal est vide → l'app tente un `refresh()` au démarrage ; si le cookie est valide, la session repart. On évite ainsi de persister un jeton exploitable par un XSS.

> **Le rappel qui prime sur tout :** même parfaitement stocké, un token front ne **remplace jamais** l'autorisation serveur. Les guards et le RBAC front qui suivent améliorent l'expérience (pas de page cassée, pas de bouton inutile) ; ils ne **sécurisent** rien. La sécurité est au back.

### 2.8 Guard d'authentification — `CanActivateFn`

On remplace le guard bidon du module 15 par un vrai, adossé à `AuthService`. Il renvoie `true` ou un **`UrlTree`** de redirection (jamais un `false` muet), en mémorisant l'URL demandée.

```typescript
// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  // pas connecté → UrlTree vers /connexion, avec l'URL cible en returnUrl
  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};
```

`inject()` fonctionne dans un guard fonctionnel (contexte d'injection garanti par le Router — confirmé doc). `state.url` donne l'URL demandée ; on la range dans `returnUrl` pour y revenir après login.

### 2.9 RBAC front — `roleGuard` via `route.data`

Un guard paramétré par le rôle attendu, lu dans `route.data`. **Rappel** : c'est de l'UX (empêcher d'atterrir sur un écran inutile), **pas** de la sécurité.

```typescript
// role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roleRequis = route.data['role'] as string | undefined;
  if (auth.role() === roleRequis) {
    return true;
  }
  return router.createUrlTree(['/acces-refuse']);
};
```

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'connexion', component: ConnexionComponent },
  { path: 'famille', component: FamilleComponent, canActivate: [authGuard] },
  {
    path: 'famille/admin',
    component: FamilleAdminComponent,
    canActivate: [authGuard, roleGuard], // ordre : d'abord connecté, puis rôle
    data: { role: 'admin' },
  },
];
```

Les guards s'exécutent **dans l'ordre** du tableau : `authGuard` d'abord (redirige vers login si non connecté), `roleGuard` ensuite (redirige vers `/acces-refuse` si mauvais rôle). Le serveur, lui, revérifiera le rôle sur `POST /api/famille/membres` — le guard n'est qu'un filtre d'affichage.

### 2.10 Enregistrement

```typescript
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // ordre des interceptors = ordre d'exécution sur la requête sortante
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
```

---

## 3. Worked examples

### Exemple 1 — Login qui revient à l'URL demandée

Le `ConnexionComponent` consomme `AuthService.login()`, puis renvoie l'utilisateur là où il voulait aller (`returnUrl` posé par le guard).

```typescript
// connexion.component.ts
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

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
        // returnUrl posé par authGuard, sinon /famille par défaut
        const cible = this.route.snapshot.queryParams['returnUrl'] ?? '/famille';
        this.router.navigateByUrl(cible);
      },
      error: (err: HttpErrorResponse) => {
        this.chargement.set(false);
        // message générique : ne pas révéler si c'est l'email OU le mot de passe qui est faux
        this.erreur.set(
          err.status === 401 ? 'Identifiants invalides' : 'Connexion impossible, réessaie',
        );
      },
    });
  }
}
```

**Détail sécurité** : le message d'erreur est **générique** (`Identifiants invalides`). Distinguer « email inconnu » de « mot de passe faux » aide un attaquant à énumérer les comptes valides. On reste vague côté UI.

### Exemple 2 — Démarrage de l'app : réhydrater la session sans persister le token

Access token en mémoire → au reload il est perdu. On tente un refresh silencieux au boot ; si le cookie `httpOnly` est valide, la session repart, sinon on reste déconnecté (sans erreur bloquante).

```typescript
// app.config.ts — hook de démarrage
import { inject } from '@angular/core';
import { provideAppInitializer } from '@angular/core';
import { firstValueFrom, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // provideAppInitializer : fonction moderne (v19) qui remplace le token déprécié APP_INITIALIZER.
    // Le callback s'exécute dans un contexte d'injection → inject() y est disponible.
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(
        auth.refreshToken().pipe(
          // pas de session valide → on démarre déconnecté, sans planter le boot
          catchError(() => of(null)),
        ),
      );
    }),
  ],
};
```

Au chargement, `refreshToken()` envoie le cookie `httpOnly` (`withCredentials: true`). Réponse 200 → nouvel access token en signal → l'utilisateur est reconnecté sans avoir retapé son mot de passe. Réponse 401 → `catchError` renvoie `null`, l'app démarre en anonyme. **Aucun token n'a été lu depuis `localStorage`** : rien d'exploitable par un XSS n'y a jamais été écrit.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que le guard ou le RBAC front « sécurisent »

```typescript
// ❌ Raisonnement faux : "le roleGuard bloque les non-admins, donc l'action est protégée"
{ path: 'admin', canActivate: [roleGuard], data: { role: 'admin' } }
```

Un guard ne s'exécute que dans **le navigateur de l'utilisateur**, qu'il contrôle. Il peut appeler `POST /api/famille/membres` directement (curl, Postman) en sautant tout Angular. **Le serveur doit revérifier le rôle sur chaque endpoint.** Le guard empêche juste d'afficher un écran inutile. Sécurité = back, UX = front.

### PIÈGE #2 — Stocker le token en `localStorage` « parce que c'est simple »

```typescript
// ❌ Exposé au XSS : n'importe quel script injecté lit le token
localStorage.setItem('accessToken', res.accessToken);
const t = localStorage.getItem('accessToken');
```

`localStorage` est lisible par **tout** JavaScript de la page, y compris un script malveillant injecté (dépendance compromise, faille XSS). Le token part alors chez l'attaquant. Préférer **in-memory (signal)** pour l'access token + **cookie `httpOnly`** pour le refresh. Si `localStorage` est utilisé en prototype, le **documenter comme dette de sécurité** à corriger.

### PIÈGE #3 — Boucle infinie de refresh

```typescript
// ❌ Le refresh lui-même passe par l'interceptor → s'il renvoie 401, on re-refresh → ∞
return next(reqAuth).pipe(
  catchError((err) => err.status === 401
    ? auth.refreshToken().pipe(switchMap(() => next(reqAuth)))  // /api/auth/refresh non exclu !
    : throwError(() => err)),
);
```

Il faut **exclure** les endpoints d'auth (`/api/auth/`) du refresh **et** forcer la déconnexion si le refresh échoue. Sans l'un des deux, un refresh expiré déclenche une cascade infinie de requêtes.

### PIÈGE #4 — Refresh concurrents

```typescript
// ❌ 8 requêtes tombent en 401 en même temps → 8 appels à /api/auth/refresh
//    → 8 nouveaux tokens, rotation cassée, requêtes rejouées avec des tokens périmés
refreshToken() {
  return this.http.post('/api/auth/refresh', {}); // pas de partage
}
```

Partager l'observable de refresh (`shareReplay(1)` + verrou `refresh$`) pour qu'un **seul** appel réel serve toutes les requêtes en attente (voir 2.5). Sinon la rotation du refresh token côté serveur invalide les tokens des autres requêtes.

### PIÈGE #5 — Confondre `401` et `403`

```typescript
// ❌ Refresh sur 403 : inutile et masque un vrai problème de droits
if (err.status === 401 || err.status === 403) { return auth.refreshToken()... }
```

- `401 Unauthorized` = **pas (ou plus) authentifié** → token absent/expiré → **refresh** légitime.
- `403 Forbidden` = **authentifié mais pas le droit** → un nouveau token n'y changera rien → **propager** l'erreur (afficher « accès refusé »). Refresher sur 403 masque un bug de permissions.

### PIÈGE #6 — Mettre le token dans le corps ou l'URL

```typescript
// ❌ Token en query param : loggé par les proxys, l'historique, les analytics
this.http.get(`/api/famille?token=${token}`);
```

Le token va **toujours** dans l'en-tête `Authorization: Bearer …` (via l'interceptor), jamais dans l'URL (fuite dans les logs/referer) ni recopié dans le corps.

---

## 5. Ancrage TribuZen

L'auth est la **couche de session** de TribuZen, à la frontière front/back.

**`AuthService`** (§2.3) — singleton `providedIn: 'root'` : `isAuthenticated`, `utilisateur`, `role` sont des signals/`computed` lus partout (barre de nav, guards, affichage conditionnel des boutons admin).

**`authInterceptor`** (§2.4-2.5) — attaché dans `withInterceptors([authInterceptor, errorInterceptor])`. Il rejoint le tableau d'interceptors commencé au module 18 (`errorInterceptor`, `loadingInterceptor`) — l'auth s'exécute en premier pour poser le token avant le reste.

**`authGuard` / `roleGuard`** (§2.8-2.9) — remplacent le `SessionService` bidon du module 15 sur `/famille` et `/famille/admin`. L'interface des guards ne change pas ; seule la **source** de `isAuthenticated()` devient le vrai token.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      auth/
        auth.service.ts       ← état d'auth (signals) + login/logout/refresh
        auth.interceptor.ts   ← Bearer + gestion 401/refresh
        auth.guard.ts         ← authGuard (CanActivateFn)
        role.guard.ts         ← roleGuard (RBAC front, UX only)
      pages/
        connexion.component.ts
    app.config.ts             ← withInterceptors + provideAppInitializer (réhydratation)
```

> Le back TribuZen (NestJS) émet et **valide** les tokens, hache les mots de passe et **autorise** chaque action — c'est la vraie ligne de défense. Le front décrit ici transporte le jeton et adapte l'UI. Le refresh token vit en cookie `httpOnly` posé par le serveur, jamais manipulé par ce code Angular.

---

## 6. Points clés

1. Le front **ne fait jamais autorité** : guards et RBAC front = UX ; l'autorisation réelle est revérifiée par le serveur à chaque requête.
2. Un JWT est **Base64URL lisible, pas chiffré** — jamais de secret dans le payload.
3. `AuthService` (`providedIn: 'root'`) détient l'état d'auth en signals ; `isAuthenticated`/`role` sont des `computed` en lecture seule.
4. L'`authInterceptor` clone la requête (`req.clone({ setHeaders: { Authorization: 'Bearer …' } })`), exclut `/api/auth/`, et n'attache jamais le token à un domaine tiers.
5. Sur `401`, refresher puis rejouer ; exclure les endpoints d'auth (anti-boucle) et partager le refresh (`shareReplay`, anti-concurrence). `403` ≠ `401` : on ne refresh pas un `403`.
6. Stockage : **access token en mémoire (signal)**, **refresh token en cookie `httpOnly`** ; `localStorage` = exposé au XSS, prototype seulement et documenté.
7. `authGuard` renvoie `true` ou un `UrlTree` (`createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } })`), jamais un `false` muet.
8. Messages de login **génériques** (« Identifiants invalides ») pour ne pas aider à énumérer les comptes.

---

## 7. Seeds Anki

```
Pourquoi un guard Angular ne "sécurise" pas une route ?|Il s'exécute dans le navigateur de l'utilisateur, qu'il contrôle. Il peut appeler l'API directement (curl/Postman) en sautant Angular. Le serveur doit revérifier l'auth et le rôle sur chaque endpoint. Le guard = UX (éviter un écran inutile), pas sécurité.
Un JWT est-il chiffré ?|Non. header.payload.signature sont en Base64URL, le payload est décodable par quiconque. La signature garantit l'origine/intégrité, pas la confidentialité. Donc jamais de secret dans le payload.
Où stocker l'access token et le refresh token, et pourquoi ?|Access token en mémoire (signal) : rien de persistant à voler via XSS. Refresh token en cookie httpOnly + Secure + SameSite : inaccessible au JS. localStorage est lisible par tout script → exposé au XSS, prototype seulement.
Comment un authInterceptor attache-t-il le token ?|HttpRequest est immuable : on clone. req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }), en excluant /api/auth/ et sans l'ajouter à un domaine tiers. Enregistré via provideHttpClient(withInterceptors([authInterceptor])).
Comment éviter la boucle infinie de refresh sur 401 ?|Exclure les endpoints d'auth (/api/auth/) du circuit de refresh ET forcer la déconnexion si le refresh échoue. Sans ça, un refresh qui renvoie 401 relance un refresh à l'infini.
Comment éviter plusieurs refresh concurrents ?|Partager l'observable de refresh : shareReplay(1) + un verrou refresh$ remis à null dans finalize(). Un seul appel réel à /api/auth/refresh sert toutes les requêtes en 401 simultanées.
Différence entre 401 et 403 pour le refresh ?|401 Unauthorized = pas/plus authentifié (token absent/expiré) → refresh légitime. 403 Forbidden = authentifié mais pas le droit → un nouveau token n'y change rien → propager l'erreur, ne pas refresher.
Que renvoie un authGuard non authentifié ?|Un UrlTree, pas un false muet : router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } }) pour rediriger vers le login en mémorisant l'URL demandée.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-25-auth-jwt-guards/README.md`. Câbler l'auth JWT de TribuZen avec Angular CLI et un backend de dev jetable : `AuthService` (signals), `authInterceptor` (Bearer + 401/refresh), `authGuard`/`roleGuard`, DevTools Network comme oracle — zéro harnais simulé.
