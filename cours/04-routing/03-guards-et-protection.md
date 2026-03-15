# Cours 19 — Guards et protection de routes

> **Objectif** : Implémenter des guards fonctionnels (`canActivate`, `canMatch`, `canDeactivate`) pour protéger les routes, rediriger avec un `UrlTree`, composer plusieurs guards, et comparer avec les navigation guards de Vue Router.

---

## Rappel du cours précédent

<details>
<summary>Comment recevoir un paramètre de route :id dans un composant Angular 19 ?</summary>

Deux méthodes : (1) Avec `input()` binding (recommandé) — on déclare `id = input.required<string>()` et on active `withComponentInputBinding()` dans `provideRouter()`. (2) Avec `ActivatedRoute` — on injecte la route et on lit `this.route.params()['id']`.
</details>

<details>
<summary>Comment naviguer en ajoutant un query param sans perdre les existants ?</summary>

`this.router.navigate([], { queryParams: { page: 2 }, queryParamsHandling: 'merge' })`. Le `merge` fusionne les nouveaux params avec les existants au lieu de les remplacer.
</details>

<details>
<summary>Quelle est la différence entre route data et route params ?</summary>

Les **params** sont dynamiques (`:id` dans l'URL, query params). Les **data** sont statiques, définies dans la configuration de route (`data: { role: 'admin' }`). Les data sont utiles pour les métadonnées (breadcrumb, permissions requises).
</details>

---

## Analogie

En Vue Router, tu utilises `beforeEach`, `beforeEnter`, et `beforeRouteLeave` pour protéger les routes. Angular a le même concept mais avec une approche **fonctionnelle** et **injectable** :

| Vue Router | Angular Router |
|-----------|---------------|
| `beforeEach((to, from) => ...)` | `canActivate` (guard global ou par route) |
| `beforeEnter: [guard]` | `canActivate: [authGuard]` |
| `beforeRouteLeave` | `canDeactivate: [unsavedGuard]` |
| Return `false` ou `'/login'` | Return `false` ou `UrlTree` |

La différence fondamentale : les guards Angular sont **injectables** — ils ont accès au système de DI. C'est comme si tes guards Vue pouvaient faire `inject(AuthService)` directement.

---

## Théorie

### Guards fonctionnels (Angular 15+)

En Angular moderne, les guards sont de simples **fonctions**. Plus besoin de classes avec des interfaces.

#### canActivate — Autoriser ou bloquer l'accès

```typescript
// guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) {
    return true;  // Accès autorisé
  }

  // Redirige vers la page de connexion avec l'URL de retour
  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};
```

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'connexion', component: ConnexionComponent },
  {
    path: 'tableau-de-bord',
    component: TableauDeBordComponent,
    canActivate: [authGuard],  // Protégé
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],  // Plusieurs guards
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'utilisateurs', component: AdminUsersComponent },
    ],
  },
];
```

#### canMatch — Contrôler si la route est même considérée

`canMatch` est exécuté **avant** `canActivate`. Si un `canMatch` retourne `false`, Angular passe à la route suivante dans la liste, comme si la route n'existait pas.

```typescript
// guards/admin-match.guard.ts
export const adminMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.estAdmin();
};

// routes
export const routes: Routes = [
  // Si l'utilisateur est admin, cette route matche
  {
    path: 'dashboard',
    canMatch: [adminMatchGuard],
    component: AdminDashboardComponent,
  },
  // Sinon, Angular passe à celle-ci (même path, composant différent)
  {
    path: 'dashboard',
    component: UserDashboardComponent,
  },
];
```

**Différence clé** : `canActivate` bloque la navigation (l'utilisateur voit une redirection). `canMatch` fait en sorte que la route n'existe tout simplement pas pour cet utilisateur.

#### canDeactivate — Empêcher de quitter une page

Utile pour les formulaires avec des modifications non sauvegardées.

```typescript
// guards/unsaved-changes.guard.ts
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component
) => {
  if (component.hasUnsavedChanges()) {
    return window.confirm(
      'Vous avez des modifications non sauvegardées. Quitter quand même ?'
    );
  }
  return true;
};
```

```typescript
// Le composant implémente l'interface
@Component({ /* ... */ })
export class EditionArticleComponent implements HasUnsavedChanges {
  formulaireModifie = signal(false);

  hasUnsavedChanges(): boolean {
    return this.formulaireModifie();
  }
}

// Route
{
  path: 'articles/:id/edition',
  component: EditionArticleComponent,
  canDeactivate: [unsavedChangesGuard],
}
```

---

### inject() dans les guards

Les guards fonctionnels ont accès à `inject()` — c'est un avantage majeur par rapport à Vue Router ou les guards globaux n'ont pas de système d'injection.

```typescript
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const notif = inject(NotificationService);
  const router = inject(Router);

  const roleRequis = route.data['role'] as string;
  const utilisateur = auth.utilisateurCourant();

  if (!utilisateur) {
    return router.createUrlTree(['/connexion']);
  }

  if (utilisateur.role !== roleRequis) {
    notif.afficher(`Accès refusé : rôle ${roleRequis} requis`);
    return router.createUrlTree(['/acces-refuse']);
  }

  return true;
};

// Utilisation avec data
{
  path: 'admin',
  canActivate: [authGuard, roleGuard],
  data: { role: 'admin' },
  component: AdminComponent,
}
```

---

### Redirection depuis un guard : UrlTree

Au lieu de retourner `false` (qui annule silencieusement la navigation), on préfère retourner un `UrlTree` qui redirige l'utilisateur.

```typescript
// ❌ Retourner false — l'utilisateur est bloqué sans explication
export const mauvaisGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estConnecte(); // false → rien ne se passe
};

// ✅ Retourner un UrlTree — redirection explicite
export const bonGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) return true;

  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};
```

---

### Composition de guards

Quand plusieurs guards sont sur une route, ils s'exécutent **séquentiellement**. Si l'un retourne `false` ou un `UrlTree`, les suivants ne s'exécutent pas.

```typescript
// Plusieurs guards sur une route
{
  path: 'admin/facturation',
  canActivate: [
    authGuard,          // 1. Vérifie que l'utilisateur est connecté
    roleGuard,          // 2. Vérifie le rôle (si authGuard passe)
    featureGuard,       // 3. Vérifie que la feature est activée
  ],
  data: {
    role: 'admin',
    feature: 'facturation',
  },
  component: FacturationComponent,
}
```

**Pattern : guard factory** pour créer des guards configurables :

```typescript
// Guard factory — retourne un guard avec la config
export function requiertRole(role: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.utilisateurCourant()?.role === role) return true;
    return router.createUrlTree(['/acces-refuse']);
  };
}

// Utilisation
{
  path: 'admin',
  canActivate: [authGuard, requiertRole('admin')],
  component: AdminComponent,
}
{
  path: 'manager',
  canActivate: [authGuard, requiertRole('manager')],
  component: ManagerComponent,
}
```

---

### Comparaison avec Vue Router guards

```typescript
// Vue Router — guard global
router.beforeEach((to, from) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
});

// Vue Router — guard par route
{
  path: '/admin',
  component: Admin,
  meta: { requiresAuth: true, role: 'admin' },
  beforeEnter: (to) => {
    // ...
  },
}
```

```typescript
// Angular — guard fonctionnel
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estConnecte()) {
    return router.createUrlTree(['/connexion'], {
      queryParams: { retour: state.url },
    });
  }
  return true;
};

// Angular — guard sur la route
{
  path: 'admin',
  canActivate: [authGuard, requiertRole('admin')],
  component: AdminComponent,
}
```

Principale différence : en Angular, les guards ont accès à `inject()` nativement, ce qui les rend plus puissants et mieux intégrés au système de DI.

---

## Pratique

### Exercice : Système d'authentification complet avec guards

Crée un système avec :

1. Un `authGuard` qui redirige vers `/connexion` avec l'URL de retour
2. Un `guestGuard` qui empêche les utilisateurs connectés d'accéder à `/connexion` (redirige vers `/`)
3. Une guard factory `requiertRole()` configurable
4. Un `unsavedChangesGuard` pour protéger un formulaire d'édition
5. Des routes qui utilisent tous ces guards

<details>
<summary>Voir la solution</summary>

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) return true;
  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};

// guards/guest.guard.ts
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estConnecte()) return true;
  return router.createUrlTree(['/']);
};

// guards/role.guard.ts
export function requiertRole(...roles: string[]): CanActivateFn {
  return (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const notif = inject(NotificationService);

    const utilisateur = auth.utilisateurCourant();
    if (utilisateur && roles.includes(utilisateur.role)) {
      return true;
    }

    notif.afficher('Permissions insuffisantes');
    return router.createUrlTree(['/acces-refuse']);
  };
}

// guards/unsaved-changes.guard.ts
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component
) => {
  if (component.hasUnsavedChanges()) {
    return confirm('Modifications non sauvegardées. Quitter ?');
  }
  return true;
};

// app.routes.ts
export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full' },
  {
    path: 'connexion',
    component: ConnexionComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'profil',
    component: ProfilComponent,
    canActivate: [authGuard],
  },
  {
    path: 'articles/:id/edition',
    component: EditionArticleComponent,
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'admin',
    canActivate: [authGuard, requiertRole('admin')],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'utilisateurs', component: AdminUsersComponent },
    ],
  },
  {
    path: 'manager',
    canActivate: [authGuard, requiertRole('admin', 'manager')],
    component: ManagerComponent,
  },
  { path: 'acces-refuse', component: AccesRefuseComponent },
  { path: '**', component: NotFoundComponent },
];
```
</details>

---

## Résumé

| Guard | Rôle | Retour |
|-------|------|--------|
| `canActivate` | Autorise ou bloque l'accès à une route | `true`, `false`, ou `UrlTree` |
| `canMatch` | Décide si la route existe pour l'utilisateur | `true` ou `false` |
| `canDeactivate` | Empêche de quitter une page | `true`, `false`, ou confirmation |
| Guard factory | Crée des guards configurables | `CanActivateFn` |

- Les guards Angular sont des **fonctions** avec accès à `inject()`.
- Toujours retourner un `UrlTree` plutôt que `false` pour rediriger proprement.
- Plusieurs guards sur une route s'exécutent séquentiellement — le premier qui bloque arrête la chaîne.
- Les guard factories (`requiertRole('admin')`) permettent de réutiliser la logique avec différents paramètres.
- `canMatch` est plus discret que `canActivate` : la route n'existe tout simplement pas.

---

> **Prochain cours** : [Cours 20 — Lazy loading et stratégies de chargement](./04-lazy-loading.md)
