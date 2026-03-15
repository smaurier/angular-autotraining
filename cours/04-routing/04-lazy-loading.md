# Cours 20 — Lazy loading et stratégies de chargement

> **Objectif** : Implémenter le lazy loading avec `loadComponent` et `loadChildren`, comprendre le code splitting au niveau des routes, configurer des stratégies de preloading, et utiliser `@defer` pour le chargement paresseux dans les templates.

---

## Rappel du cours précédent

<details>
<summary>Quelle est la différence entre canActivate et canMatch ?</summary>

`canActivate` bloque la navigation et redirige l'utilisateur (la route existe mais l'accès est refusé). `canMatch` fait en sorte que la route n'existe tout simplement pas pour cet utilisateur — Angular passe à la route suivante dans la liste.
</details>

<details>
<summary>Pourquoi retourner un UrlTree plutôt que false dans un guard ?</summary>

Retourner `false` annule silencieusement la navigation — l'utilisateur reste sur la page courante sans comprendre pourquoi. Un `UrlTree` (via `router.createUrlTree(['/connexion'])`) redirige proprement vers une page explicative.
</details>

<details>
<summary>Comment créer un guard configurable (guard factory) ?</summary>

On crée une fonction qui retourne un `CanActivateFn` : `function requiertRole(role: string): CanActivateFn { return () => { ... }; }`. Utilisation : `canActivate: [requiertRole('admin')]`.
</details>

---

## Analogie

En Vue Router, tu utilises `() => import('./pages/Admin.vue')` pour charger une page à la demandé. Angular propose exactement le même concept avec `loadComponent` (pour un composant) et `loadChildren` (pour un groupe de routes). Le résultat est identique : un fichier JavaScript séparé chargé uniquement quand l'utilisateur navigue vers cette route.

`@defer` dans les templates Angular est comparable au composant `<Suspense>` de Vue combiné avec `defineAsyncComponent()` — mais avec une syntaxe déclarative plus puissante et des conditions de déclenchement variées.

---

## Théorie

### Pourquoi le lazy loading ?

Sans lazy loading, **tout le code de l'application** est chargé au démarrage, même les pages que l'utilisateur ne visitera peut-être jamais.

```
Sans lazy loading :
┌───────────────────────────────────────────────┐
│           main.js (tout le code)              │
│  Accueil + Admin + Profil + Facturation +...  │
│                    2.5 MB                      │
└───────────────────────────────────────────────┘
Temps de chargement initial : lent

Avec lazy loading :
┌──────────────────────┐
│     main.js          │ ← Chargé au démarrage
│  Accueil + Nav       │
│       200 KB          │
└──────────────────────┘
       │ Si l'utilisateur va sur /admin :
       ▼
┌──────────────────────┐
│   admin.chunk.js     │ ← Chargé à la demande
│  Admin + Dashboard   │
│       150 KB          │
└──────────────────────┘
Temps de chargement initial : rapide
```

En ESN, le lazy loading est **attendu** sur tout projet Angular professionnel. Les bundles initiaux trop gros sont un red flag en review.

---

### loadComponent — Lazy loading d'un composant

Pour charger un composant à la demandé, on utilise `loadComponent` avec un import dynamique.

```typescript
// app.routes.ts
export const routes: Routes = [
  // Chargé immédiatement (dans le bundle principal)
  { path: '', component: AccueilComponent, pathMatch: 'full' },

  // Chargé à la demande (chunk séparé)
  {
    path: 'profil',
    loadComponent: () =>
      import('./pages/profil/profil.component').then(m => m.ProfilComponent),
  },

  {
    path: 'parametres',
    loadComponent: () =>
      import('./pages/parametres/parametres.component')
        .then(m => m.ParametresComponent),
  },
];
```

Angular crée automatiquement un fichier JavaScript séparé (chunk) pour chaque `loadComponent`. Ce fichier n'est téléchargé que quand l'utilisateur navigue vers la route.

```typescript
// ❌ Import classique — dans le bundle principal
import { AdminComponent } from './pages/admin/admin.component';
{ path: 'admin', component: AdminComponent }

// ✅ Import dynamique — chunk séparé
{
  path: 'admin',
  loadComponent: () =>
    import('./pages/admin/admin.component').then(m => m.AdminComponent),
}
```

**Comparaison avec Vue Router** :

```typescript
// Vue Router — lazy loading
{
  path: '/admin',
  component: () => import('./pages/Admin.vue'),
}

// Angular — lazy loading
{
  path: 'admin',
  loadComponent: () => import('./pages/admin.component').then(m => m.AdminComponent),
}
```

La seule différence : Angular a besoin du `.then(m => m.NomDuComposant)` car un fichier TypeScript peut exporter plusieurs choses.

---

### loadChildren — Lazy loading d'un groupe de routes

Pour les sections entières (admin, espace client), on utilise `loadChildren` pour charger un **fichier de routes** complet.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full' },
  {
    path: 'admin',
    loadChildren: () =>
      import('./pages/admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard, requiertRole('admin')],
  },
  {
    path: 'client',
    loadChildren: () =>
      import('./pages/client/client.routes').then(m => m.clientRoutes),
    canActivate: [authGuard],
  },
];
```

```typescript
// pages/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'utilisateurs', component: AdminUsersComponent },
      { path: 'facturation', component: FacturationComponent },
      {
        path: 'rapports',
        loadComponent: () =>
          import('./rapports/rapports.component').then(m => m.RapportsComponent),
      },
    ],
  },
];
```

Avec `loadChildren`, **tous les composants** référencés dans les sous-routes sont regroupés dans le même chunk. C'est plus efficace que de faire un `loadComponent` par route pour une section cohérente.

```
Chunk principal :
  main.js ← AccueilComponent, NavigationComponent

Chunk admin (loadChildren) :
  admin.chunk.js ← AdminLayout + Dashboard + Users + Facturation

Chunk rapports (loadComponent imbriqué) :
  rapports.chunk.js ← RapportsComponent
```

---

### Route-level code splitting — Structure recommandée

```
src/app/
├── app.component.ts
├── app.config.ts
├── app.routes.ts              ← Routes principales avec loadChildren
├── pages/
│   ├── accueil/
│   │   └── accueil.component.ts  ← Dans le bundle principal
│   ├── admin/
│   │   ├── admin.routes.ts       ← Lazy loaded
│   │   ├── admin-layout.component.ts
│   │   ├── dashboard/
│   │   ├── utilisateurs/
│   │   └── facturation/
│   └── client/
│       ├── client.routes.ts      ← Lazy loaded
│       ├── client-layout.component.ts
│       └── commandes/
```

**Règle** : chaque section majeure de l'application a son propre fichier de routes et est chargée via `loadChildren`.

---

### Stratégies de preloading

Par défaut, les chunks lazy-loaded ne sont chargés que quand l'utilisateur navigue vers la route. Mais on peut les **précharger** en arrière-plan pour que la navigation soit instantanée.

#### PreloadAllModules — Tout précharger après le chargement initial

```typescript
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
    ),
  ]
};
```

Le bundle principal se charge, l'app devient interactive, puis Angular charge tous les chunks restants en arrière-plan.

```
Temps →
[████ main.js ████]──app interactive──[░░ admin.chunk ░░][░░ client.chunk ░░]
                                       Préchargé en fond
```

#### Stratégie personnalisée

```typescript
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Précharge uniquement les routes marquées avec data.preload
    if (route.data?.['preload']) {
      // Attend 2 secondes après le démarrage avant de précharger
      return timer(2000).pipe(mergeMap(() => load()));
    }
    return of(null); // Ne précharge pas
  }
}
```

```typescript
// routes
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
  data: { preload: true },  // ← Sera préchargé
},
{
  path: 'rapports-annuels',
  loadChildren: () => import('./rapports/rapports.routes').then(m => m.routes),
  // Pas de data.preload → chargé uniquement à la navigation
},
```

```typescript
// Configuration
provideRouter(
  routes,
  withPreloading(SelectivePreloadStrategy),
)
```

---

### @defer — Lazy loading dans les templates

`@defer` permet de charger paresseusement un composant **dans le template**, sans rapport avec le routing. C'est une feature puissante d'Angular 17+.

```typescript
@Component({
  selector: 'app-tableau-de-bord',
  template: `
    <h1>Tableau de bord</h1>

    <!-- Chargé immédiatement -->
    <app-metriques-rapides />

    <!-- Chargé paresseusement quand le bloc entre dans le viewport -->
    @defer (on viewport) {
      <app-graphique-complexe />
    } @placeholder {
      <div class="skeleton">Chargement du graphique...</div>
    } @loading (minimum 300ms) {
      <div class="spinner">Chargement en cours...</div>
    } @error {
      <p>Impossible de charger le graphique.</p>
    }
  `
})
export class TableauDeBordComponent {}
```

#### Les déclencheurs de @defer

| Déclencheur | Signification |
|-------------|---------------|
| `on viewport` | Quand le placeholder entre dans le viewport (scroll) |
| `on idle` | Quand le navigateur est inactif (requestIdleCallback) |
| `on interaction` | Quand l'utilisateur clique sur le placeholder |
| `on hover` | Quand l'utilisateur survole le placeholder |
| `on timer(2s)` | Après un délai |
| `on immediate` | Dès que possible après le rendu initial |
| `when condition` | Quand une expression devient true |

```typescript
// Exemples concrets

// Charger un chat widget quand l'utilisateur clique
@defer (on interaction) {
  <app-chat-widget />
} @placeholder {
  <button>Ouvrir le chat</button>
}

// Charger des commentaires quand on scroll jusqu'à eux
@defer (on viewport) {
  <app-commentaires [articleId]="articleId" />
} @placeholder {
  <p>Scroll pour voir les commentaires</p>
}

// Charger un module lourd quand une condition est remplie
@defer (when afficherAnalytics()) {
  <app-analytics-dashboard />
}

// Combinaison : idle avec un minimum de temps de loading
@defer (on idle) {
  <app-suggestions />
} @loading (after 100ms; minimum 500ms) {
  <app-skeleton-suggestions />
}
```

#### @defer vs loadComponent

| Critère | `loadComponent` | `@defer` |
|---------|-----------------|----------|
| Niveau | Route | Template |
| Déclencheur | Navigation | viewport, idle, click, timer, condition |
| Cas d'usage | Pages entières | Sections d'une page |
| Placeholder | Pas natif | `@placeholder`, `@loading`, `@error` intégrés |
| Bundle | Un chunk par route | Un chunk par bloc defer |

---

### Combiner routing lazy et @defer

```typescript
// Route lazy loaded
{
  path: 'tableau-de-bord',
  loadComponent: () =>
    import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
}

// dashboard.component.ts — le composant lui-même utilise @defer
@Component({
  template: `
    <h1>Dashboard</h1>
    <app-kpi-cards />

    @defer (on viewport) {
      <app-chart [data]="chartData()" />
    } @placeholder {
      <div style="height: 400px" class="skeleton"></div>
    }

    @defer (on viewport) {
      <app-recent-activity />
    } @placeholder {
      <div style="height: 300px" class="skeleton"></div>
    }
  `
})
export class DashboardComponent { /* ... */ }
```

Le composant Dashboard est chargé quand l'utilisateur navigue vers `/tableau-de-bord`. Le graphique et l'activité récente sont chargés quand l'utilisateur scroll jusqu'à eux.

---

## Pratique

### Exercice : Application avec lazy loading complet

Crée une configuration de routing avec :

1. Page d'accueil dans le bundle principal
2. Section `/admin` lazy loaded via `loadChildren` avec ses propres sous-routes
3. Section `/client` lazy loaded via `loadChildren`
4. Page `/a-propos` lazy loaded via `loadComponent`
5. Stratégie de preloading sélective (précharger admin, pas client)
6. Un composant dashboard qui utilise `@defer` pour charger des graphiques au scroll

<details>
<summary>Voir la solution</summary>

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil.component';

export const routes: Routes = [
  {
    path: '',
    component: AccueilComponent,
    pathMatch: 'full',
    title: 'Accueil',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./pages/admin/admin.routes').then(m => m.adminRoutes),
    data: { preload: true },
  },
  {
    path: 'client',
    loadChildren: () =>
      import('./pages/client/client.routes').then(m => m.clientRoutes),
    // Pas de preload → chargé à la navigation uniquement
  },
  {
    path: 'a-propos',
    loadComponent: () =>
      import('./pages/a-propos/a-propos.component')
        .then(m => m.AProposComponent),
    title: 'À propos',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
    title: '404',
  },
];

// pages/admin/admin.routes.ts
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent),
        title: 'Admin — Dashboard',
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./utilisateurs/admin-users.component')
            .then(m => m.AdminUsersComponent),
        title: 'Admin — Utilisateurs',
      },
    ],
  },
];

// selective-preload.strategy.ts
import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data?.['preload']) {
      return timer(3000).pipe(mergeMap(() => load()));
    }
    return of(null);
  }
}

// app.config.ts
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { SelectivePreloadStrategy } from './selective-preload.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(SelectivePreloadStrategy),
    ),
  ],
};

// pages/admin/dashboard/admin-dashboard.component.ts
@Component({
  selector: 'app-admin-dashboard',
  template: `
    <h1>Dashboard Admin</h1>

    <div class="kpi-row">
      <app-kpi-card titre="Utilisateurs" [valeur]="stats.utilisateurs()" />
      <app-kpi-card titre="Commandes" [valeur]="stats.commandes()" />
      <app-kpi-card titre="Revenus" [valeur]="stats.revenus()" />
    </div>

    @defer (on viewport) {
      <app-graphique-ventes [donnees]="stats.ventesParMois()" />
    } @placeholder {
      <div class="skeleton-chart" style="height: 400px;">
        Scroll pour voir le graphique des ventes
      </div>
    } @loading (minimum 300ms) {
      <div class="spinner">Chargement du graphique...</div>
    } @error {
      <p class="erreur">Impossible de charger le graphique.</p>
    }

    @defer (on viewport) {
      <app-tableau-commandes-recentes />
    } @placeholder {
      <div class="skeleton-table" style="height: 300px;">
        Scroll pour voir les commandes récentes
      </div>
    }
  `
})
export class AdminDashboardComponent {
  readonly stats = inject(AdminStatsStore);
}
```
</details>

---

## Résumé

| Technique | Usage | Granularité |
|-----------|-------|-------------|
| `loadComponent` | Lazy load d'un composant via le routing | 1 composant = 1 chunk |
| `loadChildren` | Lazy load d'un groupe de routes | 1 section = 1 chunk |
| `@defer` | Lazy load dans le template | 1 bloc = 1 chunk |
| `PreloadAllModules` | Précharge tout en arrière-plan | Global |
| Stratégie personnalisée | Précharge sélective (`data.preload`) | Par route |

- **loadChildren** pour les sections de l'app (admin, client, paramètres).
- **loadComponent** pour les pages individuelles peu visitées.
- **@defer** pour les composants lourds dans une page (graphiques, tableaux, chat).
- Le preloading sélectif est le meilleur compromis : précharger les sections critiques, laisser les autres à la demandé.
- En ESN, le lazy loading est un **minimum attendu** — analyse toujours la taille du bundle initial avec `ng build` et l'onglet Network des DevTools.

---

> **Prochain cours** : [Cours 21 — Introduction à RxJS](../05-rxjs-essentiel/01-introduction-rxjs.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [11-app-multi-pages](../../exercices/11-app-multi-pages/ENONCE)
2. **Exercice** : [12-guards-et-lazy](../../exercices/12-guards-et-lazy/ENONCE)
:::
