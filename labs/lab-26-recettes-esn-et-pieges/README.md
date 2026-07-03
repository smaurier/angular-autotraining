# Lab 26 — Projet final : la feature « famille » de bout en bout

> **Outcome :** à la fin, tu sais livrer une feature Angular complète de niveau mission — architecture `core/shared/features`, smart/dumb components, facade signal-based, routing + guard, HttpClient, formulaire réactif validé — dans un vrai projet Angular CLI.
> **Vrai outil :** Angular CLI 19 (`ng new`, `ng generate`, `ng serve`) + le dev server comme oracle visuel. JAMAIS un harnais de test simulé.
> **Feedback :** le coach valide en session — revue de code comme en mission (architecture, typage, pièges), pas de test-runner auto-correcteur.

---

## Énoncé

C'est le **projet final** du parcours Angular. Tu assembles, dans un seul projet, tout ce que tu as appris : composants standalone, signals, injection de dépendances, routing, HttpClient et formulaires réactifs.

Tu construis la **feature « famille »** de TribuZen. Cahier des charges **exact** :

1. **Architecture** : dossiers `core/`, `shared/`, `features/famille/`. La dépendance ne va que dans le sens `features → shared → core`.
2. **Route protégée** : `/famille` est lazy-loadée (`loadComponent`) et gardée par un `authGuard` fonctionnel qui redirige vers `/login` si non connecté.
3. **Facade** : un `FamilleService` (`providedIn: 'root'`) expose l'état en **lecture seule** (`asReadonly()`) — `membres`, `chargement`, `erreur`, et un `computed` `nombre`. Il parle à l'API via `HttpClient`.
4. **Smart component** `FamilleComponent` : injecte la facade, déclenche le chargement, gère les trois états (chargement / succès / erreur).
5. **Dumb component** `MembreListComponent` : reçoit `membres` par `input.required()`, émet `retirer` par `output()`, n'injecte **aucun** service.
6. **Formulaire réactif** `InvitationFormComponent` : un `FormGroup` typé avec un champ `email` (`Validators.required` + `Validators.email`), bouton désactivé tant que le formulaire est invalide, `output()` `invite` à la soumission.
7. **Pièges à éviter** (revue) : aucun `any`, aucun `fetch`/HttpClient dans un composant, `takeUntilDestroyed` sur les souscriptions, états chargement/erreur présents.

> Un backend n'est pas requis : mocke l'API avec un `json-server` local (`npx json-server db.json`) **ou** un intercepteur qui renvoie des données. L'important est que `HttpClient` soit réellement utilisé (requête cold consommée), pas remplacé par un tableau en dur dans le composant.

### Starter minimal

```bash
# Vrai outil : Angular CLI. Crée le projet (zoneless + routing).
ng new tribuzen-final --standalone --routing --style=css
cd tribuzen-final

# Génère la structure de mission
ng generate component features/famille/famille --skip-tests
ng generate component features/famille/components/membre-list --skip-tests
ng generate component features/famille/components/invitation-form --skip-tests
ng generate service features/famille/services/famille --skip-tests
ng generate guard core/guards/auth --functional --skip-tests
ng generate interface core/models/membre

# Mock API (optionnel mais recommandé)
npm i -D json-server
```

`core/models/membre.ts` (le typage d'abord — pas de `any`) :

```typescript
export interface Membre {
  id: string;
  nom: string;
  role: 'parent' | 'enfant';
}
```

`db.json` pour json-server :

```json
{ "membres": [
  { "id": "m1", "nom": "Alice", "role": "parent" },
  { "id": "m2", "nom": "Bob",   "role": "enfant" }
] }
```

**Pas de gap-fill** — tu écris chaque fichier à partir de cette structure. Lance `ng serve` et vérifie dans le navigateur.

---

## Étapes (en friction)

1. **Configure `app.config.ts`** — ajoute `provideHttpClient(withInterceptors([]))` aux providers existants (`provideRouter`).
2. **Écris `auth.guard.ts`** — `CanActivateFn` qui injecte un `AuthService` (crée-le : un signal `estConnecte` à `true` pour tester le happy path) et retourne `true` ou `router.createUrlTree(['/login'])`.
3. **Branche la route** — dans `app.routes.ts`, ajoute `{ path: 'famille', canActivate: [authGuard], loadComponent: () => import(...) }`.
4. **Écris la facade `FamilleService`** — signals privés + `asReadonly()`, `computed` `nombre`, méthode `charger()` qui fait `http.get<Membre[]>('http://localhost:3000/membres')`, `pipe(takeUntilDestroyed())`, gère `chargement` et `erreur`.
5. **Écris le smart `FamilleComponent`** — injecte la facade, `charger()` au constructeur, template avec `@if (service.chargement())` / erreur / `<app-membre-list>`.
6. **Écris le dumb `MembreListComponent`** — `input.required<Membre[]>()`, `output<string>()`, `@for … track m.id` + `@empty`.
7. **Écris `InvitationFormComponent`** — `FormGroup` avec `email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })`, bouton `[disabled]="form.invalid"`, `output` `invite` sur `submit`.
8. **Vérifie les pièges** — cherche dans ton code : un `any` ? un `fetch` dans un composant ? un `subscribe` sans `takeUntilDestroyed` ? un état sans loading/erreur ? Corrige.

---

## Corrigé complet commenté

```typescript
// ── core/models/membre.ts ──────────────────────────────────────────────
export interface Membre {
  id: string;
  nom: string;
  role: 'parent' | 'enfant';
}

// ── core/services/auth.service.ts ──────────────────────────────────────
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Pour le lab : connecté par défaut afin de tester le happy path.
  // En vrai (module 25), ce signal dépend du token JWT en mémoire.
  private readonly _estConnecte = signal(true);
  readonly estConnecte = this._estConnecte.asReadonly();
}

// ── core/guards/auth.guard.ts ──────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// CanActivateFn : fonction exécutée dans un contexte d'injection → inject() est licite.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // true = accès autorisé ; UrlTree = redirection (jamais un simple false ici,
  // pour envoyer l'utilisateur vers /login au lieu de le bloquer sur une page vide).
  return auth.estConnecte() ? true : router.createUrlTree(['/login']);
};

// ── features/famille/services/famille.service.ts ── LA FACADE ───────────
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Membre } from '../../../core/models/membre';

@Injectable({ providedIn: 'root' })
export class FamilleService {
  private http = inject(HttpClient);

  // État PRIVÉ, modifiable en interne uniquement.
  private readonly _membres = signal<Membre[]>([]);
  private readonly _chargement = signal(false);
  private readonly _erreur = signal<string | null>(null);

  // Exposition PUBLIQUE en lecture seule : le composant ne peut pas écrire l'état.
  readonly membres = this._membres.asReadonly();
  readonly chargement = this._chargement.asReadonly();
  readonly erreur = this._erreur.asReadonly();
  readonly nombre = computed(() => this._membres().length); // dérivé, jamais recopié

  charger() {
    this._chargement.set(true);
    this._erreur.set(null);
    // HttpClient est COLD : la requête ne part qu'au subscribe.
    // takeUntilDestroyed (appelé en contexte d'injection = champ/constructeur) évite la fuite.
    this.http.get<Membre[]>('http://localhost:3000/membres')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: m => { this._membres.set(m); this._chargement.set(false); },
        error: () => { this._erreur.set('Impossible de charger la famille'); this._chargement.set(false); },
      });
  }

  retirer(id: string) {
    // Mise à jour IMMUABLE : filter renvoie un nouveau tableau → nouvelle référence → notifié.
    this._membres.update(list => list.filter(m => m.id !== id));
  }

  inviter(email: string) {
    // Retourne l'Observable : le composant décide quand consommer (ici via subscribe au submit).
    return this.http.post<Membre>('http://localhost:3000/membres', { nom: email, role: 'enfant' });
  }
}

// ── features/famille/components/membre-list.component.ts ── DUMB ────────
import { Component, input, output } from '@angular/core';
import { Membre } from '../../../core/models/membre';

@Component({
  selector: 'app-membre-list',
  standalone: true,
  template: `
    <ul>
      <!-- track m.id : obligatoire en @for, id métier stable -->
      @for (m of membres(); track m.id) {
        <li>
          {{ m.nom }} <em>({{ m.role }})</em>
          <button type="button" (click)="retirer.emit(m.id)">×</button>
        </li>
      } @empty {
        <li>Aucun membre pour l'instant.</li>
      }
    </ul>
  `,
})
export class MembreListComponent {
  // input.required : le parent DOIT fournir la liste ; renvoie un Signal lu par membres().
  membres = input.required<Membre[]>();
  // output : le dumb ne supprime rien lui-même, il REMONTE l'intention au smart.
  retirer = output<string>();
}

// ── features/famille/components/invitation-form.component.ts ── FORM ────
import { Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <input type="email" formControlName="email" placeholder="email du membre" />
      <!-- Feedback de validation : message tant que le champ est touché ET invalide -->
      @if (form.controls.email.touched && form.controls.email.invalid) {
        <small>Email invalide</small>
      }
      <!-- Bouton bloqué tant que le formulaire est invalide : garde-fou UX -->
      <button type="submit" [disabled]="form.invalid">Inviter</button>
    </form>
  `,
})
export class InvitationFormComponent {
  invite = output<string>();

  // FormGroup TYPÉ : nonNullable → email est string (pas string | null).
  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  soumettre() {
    if (this.form.invalid) return;              // double garde (le bouton peut être contourné)
    this.invite.emit(this.form.controls.email.value);
    this.form.reset();                          // revient à la valeur par défaut ('')
  }
}

// ── features/famille/famille.component.ts ── SMART ─────────────────────
import { Component, inject } from '@angular/core';
import { FamilleService } from './services/famille.service';
import { MembreListComponent } from './components/membre-list.component';
import { InvitationFormComponent } from './components/invitation-form.component';

@Component({
  selector: 'app-famille',
  standalone: true,
  imports: [MembreListComponent, InvitationFormComponent],
  template: `
    <h1>Ma famille ({{ service.nombre() }})</h1>

    <app-invitation-form (invite)="onInvite($event)" />

    <!-- Les TROIS états d'un écran de mission : chargement / erreur / succès -->
    @if (service.chargement()) {
      <p>Chargement…</p>
    } @else if (service.erreur()) {
      <p role="alert">{{ service.erreur() }}</p>
    } @else {
      <app-membre-list [membres]="service.membres()" (retirer)="service.retirer($event)" />
    }
  `,
})
export class FamilleComponent {
  protected service = inject(FamilleService);

  constructor() {
    this.service.charger();   // déclenche le chargement à l'entrée sur la route
  }

  onInvite(email: string) {
    this.service.inviter(email).subscribe(() => this.service.charger()); // recharge après ajout
  }
}

// ── app.routes.ts ──────────────────────────────────────────────────────
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'famille', pathMatch: 'full' },
  {
    path: 'famille',
    canActivate: [authGuard],                    // route protégée
    loadComponent: () =>                         // lazy loading : bundle chargé à la visite
      import('./features/famille/famille.component').then(m => m.FamilleComponent),
  },
  { path: 'login', loadComponent: () => import('./features/famille/famille.component').then(m => m.FamilleComponent) },
];

// ── app.config.ts ──────────────────────────────────────────────────────
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([])),   // prêt à recevoir auth/error interceptors
  ],
};
```

**Pourquoi ce corrigé passe une revue de mission :**
- **Aucun `any`** : `Membre` type tout, `FormGroup` est typé, `HttpClient` reçoit `<Membre[]>`.
- **Aucun `fetch`/HTTP dans un composant** : seule la facade parle à l'API ; les composants expriment des intentions.
- **Smart/dumb strict** : `MembreListComponent` et `InvitationFormComponent` n'injectent aucun service, tout passe par `input`/`output`.
- **État exposé en lecture seule** (`asReadonly`) : impossible d'écrire l'état hors de la facade.
- **Trois états gérés** : chargement, erreur, succès — pas d'écran figé.
- **Pas de fuite** : `takeUntilDestroyed()` sur la souscription de chargement.
- **`track` obligatoire** dans `@for`, mise à jour immuable dans `retirer`.

---

## Variante J+30 (fading)

**Même feature, contraintes ajoutées, en 45 minutes, sans rouvrir ce corrigé ni le module 26 :**

1. Ajoute un **filtre par rôle** (`parent` / `enfant` / tous) : un signal `filtreRole` dans le smart, un `computed` `membresVisibles` dérivé de `service.membres()` et du filtre, passé au dumb à la place de la liste brute.
2. Ajoute un **interceptor d'erreur fonctionnel** (`HttpInterceptorFn`) enregistré dans `withInterceptors([...])` qui log toute réponse ≥ 500 dans la console, et branche-le réellement.
3. Extrais un **spinner réutilisable** dans `shared/components/spinner/` et utilise-le pour l'état de chargement (au lieu du `<p>Chargement…</p>`).

**Critère de réussite :** l'app tourne sous `ng serve`, le filtre est réactif, l'interceptor s'exécute (visible en coupant json-server → erreur loggée), et le spinner vit dans `shared/` sans dépendre de la feature.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cette feature est la colonne vertébrale du produit :

```
tribuzen/src/app/
├── core/
│   ├── guards/auth.guard.ts
│   ├── interceptors/{auth,error}.interceptor.ts
│   ├── services/auth.service.ts
│   └── models/membre.ts
├── shared/components/spinner/spinner.component.ts
├── features/famille/
│   ├── famille.component.ts              ← smart
│   ├── components/membre-list.component.ts     ← dumb
│   ├── components/invitation-form.component.ts ← formulaire réactif
│   ├── services/famille.service.ts       ← facade
│   └── famille.routes.ts
├── app.config.ts
└── app.routes.ts
```

**Différences avec le lab :**
- L'`apiUrl` (`http://localhost:3000`) sera chargée par `APP_INITIALIZER` depuis `config.json`, pas écrite en dur.
- Le `familleId` viendra du token JWT / d'un paramètre de route (`withComponentInputBinding`), pas figé.
- Les interceptors `auth` (ajoute le Bearer) et `error` (401 → login, 500 → snackbar) seront réellement branchés.
- Le spinner et les messages d'erreur passeront par le design system (tokens), pas du HTML brut.

**Commit cible :**
```
feat(famille): feature complète — facade signals, smart/dumb, guard, formulaire réactif
```
