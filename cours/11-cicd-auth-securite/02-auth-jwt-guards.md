# Cours 43 — Authentification JWT : guards et interceptors

> **Prérequis** : tu connais déjà JWT, OAuth et les principes d'authentification (formation Vue). Ce cours se concentre sur l'implémentation Angular : interceptors fonctionnels, guards `canActivate`, et le pattern AuthService avec Signals.

> **Objectif** : Implementer un flux d'authentification JWT complet : AuthService avec Signals, interceptor HTTP pour le token, guard fonctionnel, et gestion du refresh token.

---

## Rappel du cours precedent

<details>
<summary>1. Quelles sont les etapes d'un pipeline CI Angular ?</summary>

`install → lint → test → build → deploy`. Si une etape echoue, les suivantes ne s'executent pas.
</details>

<details>
<summary>2. Pourquoi utiliser `npm ci` en CI ?</summary>

`npm ci` installe exactement les versions du `package-lock.json` sans le modifier. Deterministe et plus rapide.
</details>

<details>
<summary>3. Comment lancer les tests Angular en CI ?</summary>

`ng test --watch=false --browsers=ChromeHeadless`. Avec Jest/Vitest, pas besoin de navigateur.
</details>

---

## Analogie

Si tu as utilise Vue Router `beforeEach` + Axios interceptors + Pinia store pour l'auth, Angular offre les memes briques :

- **Axios interceptor** → `HttpInterceptorFn`
- **Vue Router beforeEach** → `CanActivateFn` (guard)
- **Pinia store** → `AuthService` avec Signals

---

## Theorie

### Le flux JWT

```
1. POST /auth/login { email, password }  →  { accessToken, refreshToken }
2. Interceptor ajoute "Authorization: Bearer <token>" a chaque requete
3. 401 recu → refresh token → retry la requete originale
4. Logout → supprimer les tokens → rediriger vers /login
```

### AuthService avec Signals

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(localStorage.getItem('accessToken'));

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(res => {
        this._token.set(res.accessToken);
        this._user.set(res.user);
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
      })
    );
  }

  logout() {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }

  refreshToken() {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) { this.logout(); return of(null); }
    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken: rt }).pipe(
      tap(res => {
        this._token.set(res.accessToken);
        localStorage.setItem('accessToken', res.accessToken);
      }),
      catchError(() => { this.logout(); return of(null); })
    );
  }

  getAccessToken() { return this._token(); }
}
```

### Interceptor fonctionnel

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  // Ne pas toucher aux requetes d'auth
  if (req.url.includes('/auth/')) return next(req);

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.getAccessToken()}` }
            });
            return next(newReq);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
```

```typescript
// ❌ Ancien style (classe)
@Injectable()
export class AuthInterceptor implements HttpInterceptor { ... }

// ✅ Nouveau style (fonctionnel)
export const authInterceptor: HttpInterceptorFn = (req, next) => { ... };
```

Enregistrement :

```typescript
// app.config.ts
provideHttpClient(withInterceptors([authInterceptor]))
```

### Guard fonctionnel

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// Guard avec role (RBAC)
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const role = route.data['role'] as string;
  return auth.currentUser()?.role === role
    || inject(Router).createUrlTree(['/unauthorized']);
};
```

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'admin', component: AdminComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' }
  },
];
```

### Composant Login

```typescript
@Component({
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" type="email" placeholder="Email" />
      <input formControlName="password" type="password" placeholder="Mot de passe" />
      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
      <button type="submit" [disabled]="chargement()">
        {{ chargement() ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });
  erreur = signal('');
  chargement = signal(false);

  onSubmit() {
    if (this.form.invalid) return;
    this.chargement.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => {
        const url = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(url);
      },
      error: (err) => {
        this.chargement.set(false);
        this.erreur.set(err.status === 401 ? 'Identifiants incorrects' : 'Erreur de connexion');
      }
    });
  }
}
```

### Stockage des tokens

| Methode | Avantage | Inconvenient |
|---|---|---|
| `localStorage` | Simple, controle cote front | Vulnerable XSS |
| `httpOnly cookie` | Inaccessible au JS | Necessite config serveur, CSRF possible |

> **Recommandation ESN** : `httpOnly cookies` pour la securite. `localStorage` acceptable en prototypage.

---

## Pratique

Implementez un flux d'auth complet : AuthService avec signals, interceptor Bearer + gestion 401, guard `authGuard`, composant Login avec formulaire reactif, routes protegees.

<details>
<summary>Solution</summary>

```typescript
// Fichiers a creer :
// 1. auth.service.ts   → signal _user, _token, login(), logout(), refreshToken()
// 2. auth.interceptor.ts → ajoute Bearer, gere 401 avec refresh
// 3. auth.guard.ts      → verifie isAuthenticated(), redirige /login
// 4. login.component.ts → FormGroup email/password, appel auth.login()
// 5. app.routes.ts      → canActivate: [authGuard] sur les routes protegees
// 6. app.config.ts      → provideHttpClient(withInterceptors([authInterceptor]))

// Le code complet de chaque fichier est dans la section Theorie ci-dessus.
// Assemblez-les dans votre projet et testez avec un backend ou un mock.
```
</details>

---

## Resume

| Point cle | A retenir |
|---|---|
| AuthService | Signals pour l'etat reactif (`isAuthenticated`, `currentUser`) |
| Interceptor | `HttpInterceptorFn` : ajoute Bearer, gere 401 + refresh |
| Guard | `CanActivateFn` : verifie l'auth, redirige vers `/login` |
| RBAC | Guard avec `route.data['role']` pour les permissions |
| Tokens | Preferer `httpOnly cookie`, `localStorage` pour le prototypage |

---

> **Prochain cours** : [Module 12 — Recettes ESN](../12-recettes-esn/01-architecture-conventions.md)
