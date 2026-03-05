# Cours 18 — Paramètres de route et data

> **Objectif** : Récupérer les paramètres de route (`:id`), les query parameters, et les données de route. Utiliser le binding `input()` depuis les params (Angular 16+) et les signaux `ActivatedRoute` pour réagir aux changements.

---

## Rappel du cours précédent

<details>
<summary>Comment configurer le routeur en Angular 19 standalone ?</summary>

On appelle `provideRouter(routes)` dans les providers de `appConfig` (`app.config.ts`). Les routes sont définies dans un fichier séparé `app.routes.ts` comme un tableau de type `Routes`.
</details>

<details>
<summary>Quelle est la différence entre pathMatch: 'full' et 'prefix' ?</summary>

`pathMatch: 'prefix'` (défaut) matche si l'URL **commence par** le path. `pathMatch: 'full'` matche uniquement si l'URL correspond **exactement** au path. On utilise `full` pour les routes `''` et les `redirectTo`.
</details>

<details>
<summary>Comment naviguer programmatiquement vers /produits/42 ?</summary>

`this.router.navigate(['/produits', 42])` — Angular utilise un tableau de segments de path. On injecte le `Router` avec `inject(Router)`.
</details>

---

## Analogie

En Vue Router, tu accèdes aux params avec `useRoute().params.id` et aux query params avec `useRoute().query.page`. Angular propose deux approches :

1. **Le binding `input()`** (nouveau, recommandé) : le paramètre de route est automatiquement passé comme un input du composant — comme si le router faisait `<MonComponent [id]="routeParam" />`.
2. **ActivatedRoute** (classique) : on injecte la route et on lit les params via des signaux ou des observables.

La première approche est plus simple et plus idiomatique en Angular 19.

---

## Théorie

### Route parameters avec :id

Les paramètres de route sont définis avec `:nomParam` dans le path.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'articles/:id', component: ArticleDetailComponent },
  { path: 'utilisateurs/:userId/posts/:postId', component: PostComponent },
];
```

---

### Approche 1 : input() binding (recommandée en Angular 19+)

Depuis Angular 16, on peut recevoir les paramètres de route directement comme des `input()` du composant. C'est la manière la plus simple et la plus propre.

**Activation** (une seule fois dans `app.config.ts`) :

```typescript
// app.config.ts
import { provideRouter, withComponentInputBinding } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    //                     ^^^^^^^^^^^^^^^^^^^^^^^^
    // Active le binding automatique des params vers les inputs
  ]
};
```

**Utilisation dans le composant** :

```typescript
import { Component, input, signal, resource } from '@angular/core';

@Component({
  selector: 'app-article-detail',
  template: `
    @switch (article.status()) {
      @case ('loading') { <p>Chargement...</p> }
      @case ('resolved') {
        <h1>{{ article.value()?.titre }}</h1>
        <p>{{ article.value()?.contenu }}</p>
      }
      @case ('error') { <p>Article introuvable</p> }
    }
  `
})
export class ArticleDetailComponent {
  // Le router fournit automatiquement la valeur de :id
  id = input.required<string>();

  article = resource({
    request: () => this.id(),
    loader: async ({ request: id, abortSignal }) => {
      const res = await fetch(`/api/articles/${id}`, { signal: abortSignal });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });
}
```

Le router mappe automatiquement :
- `:id` dans le path vers `input('id')`
- Les query params vers des inputs du même nom
- Les `data` de route vers des inputs du même nom

```typescript
// Route : /utilisateurs/:userId/posts/:postId?page=2
// Route config : { path: 'utilisateurs/:userId/posts/:postId', data: { role: 'admin' } }

@Component({ /* ... */ })
export class PostComponent {
  userId = input.required<string>();   // ← :userId
  postId = input.required<string>();   // ← :postId
  page = input<string>();              // ← ?page=2 (query param)
  role = input<string>();              // ← data.role = 'admin'
}
```

```typescript
// ❌ Ancien style : injecter ActivatedRoute + subscribe
export class ArticleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  id = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') ?? '';
      this.chargerArticle(this.id);
    });
  }
}

// ✅ Moderne : input binding — simple, réactif, testable
export class ArticleDetailComponent {
  id = input.required<string>();
  // Le resource réagit automatiquement au changement de id
  article = resource({
    request: () => this.id(),
    loader: /* ... */
  });
}
```

---

### Approche 2 : ActivatedRoute (pour les cas avancés)

Parfois tu as besoin d'un contrôle plus fin. `ActivatedRoute` expose des signaux (Angular 19+) pour les paramètres.

```typescript
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ /* ... */ })
export class RechercheComponent {
  private route = inject(ActivatedRoute);

  // Signals (Angular 19+)
  readonly params = this.route.params;         // Signal<Params>
  readonly queryParams = this.route.queryParams; // Signal<Params>

  // Lecture d'un paramètre spécifique via computed
  readonly termeRecherche = computed(() =>
    this.route.queryParams()['q'] ?? ''
  );

  readonly page = computed(() => {
    const p = this.route.queryParams()['page'];
    return p ? parseInt(p, 10) : 1;
  });
}
```

**Quand utiliser ActivatedRoute plutôt que input() binding** :
- Quand tu as besoin de l'URL complète ou de fragments
- Quand tu travailles avec un composant qui n'est pas directement la cible d'une route
- Dans les services qui ont besoin d'accéder aux params de la route courante

---

### Query parameters

Les query params sont les paramètres après `?` dans l'URL : `/recherche?q=angular&page=2`.

**Naviguer avec des query params** :

```typescript
// Dans le template
<a [routerLink]="['/recherche']"
   [queryParams]="{ q: 'angular', page: 1 }">
  Chercher Angular
</a>

// Programmatiquement
this.router.navigate(['/recherche'], {
  queryParams: { q: 'angular', page: 1 },
});

// Ajouter/modifier un query param sans perdre les autres
this.router.navigate([], {
  queryParams: { page: 2 },
  queryParamsHandling: 'merge',  // Conserve les params existants
});
```

**Lire les query params** :

```typescript
// Avec input binding
@Component({ /* ... */ })
export class RechercheComponent {
  q = input<string>('');       // ?q=angular → 'angular'
  page = input<string>('1');   // ?page=2 → '2'
}

// Avec ActivatedRoute
@Component({ /* ... */ })
export class RechercheComponent {
  private route = inject(ActivatedRoute);

  readonly termeRecherche = computed(() =>
    this.route.queryParams()['q'] ?? ''
  );
}
```

---

### Route data — Données statiques et titre

Les routes peuvent porter des données statiques accessibles par le composant.

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    title: 'Administration',
    data: {
      role: 'admin',
      breadcrumb: 'Administration',
      animation: 'adminPage',
    },
  },
  {
    path: 'profil',
    component: ProfilComponent,
    title: 'Mon profil',
    data: {
      role: 'user',
      breadcrumb: 'Profil',
    },
  },
];
```

**Accéder aux data** :

```typescript
// Avec input binding
@Component({ /* ... */ })
export class AdminComponent {
  role = input<string>();       // ← data.role
  breadcrumb = input<string>(); // ← data.breadcrumb
}

// Avec ActivatedRoute
@Component({ /* ... */ })
export class BreadcrumbComponent {
  private route = inject(ActivatedRoute);

  readonly breadcrumb = computed(() =>
    this.route.data()['breadcrumb'] ?? ''
  );
}
```

---

### Titre dynamique de la page

```typescript
// Titre statique
{ path: 'a-propos', component: AProposComponent, title: 'À propos' }

// Titre dynamique avec une fonction resolve
{
  path: 'articles/:id',
  component: ArticleDetailComponent,
  title: (route: ActivatedRouteSnapshot) => {
    return `Article ${route.paramMap.get('id')}`;
  },
}

// Titre dynamique avec un resolver injectable
{
  path: 'articles/:id',
  component: ArticleDetailComponent,
  title: articleTitleResolver,
}

// Le resolver
export const articleTitleResolver: ResolveFn<string> = (route) => {
  const id = route.paramMap.get('id');
  const http = inject(HttpClient);
  return http.get<Article>(`/api/articles/${id}`).pipe(
    map(article => article.titre)
  );
};
```

---

### Comparaison avec Vue Router

```typescript
// Vue Router — accéder aux paramètres
const route = useRoute();
const id = route.params.id;          // réactif via Proxy
const page = route.query.page;

// Angular — input binding
id = input.required<string>();        // réactif via Signal

// Angular — ActivatedRoute
private route = inject(ActivatedRoute);
readonly id = computed(() => this.route.params()['id']);
```

---

## Pratique

### Exercice : Page de détail avec paramètres et query params

Crée un composant `ProduitDetailComponent` qui :

1. Reçoit l'`id` du produit via le path (`/produits/:id`)
2. Reçoit un query param optionnel `vue` (`?vue=compact` ou `?vue=complet`)
3. Charge les données du produit via `resource()` en utilisant l'id
4. Affiche le produit en mode compact ou complet selon le query param
5. A des boutons pour basculer entre les modes (en changeant le query param)

<details>
<summary>Voir la solution</summary>

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'produits/:id', component: ProduitDetailComponent, title: 'Produit' },
];

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ]
};

// produit-detail.component.ts
import { Component, input, computed, inject, resource } from '@angular/core';
import { Router } from '@angular/router';

interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  specifications: string[];
}

@Component({
  selector: 'app-produit-detail',
  template: `
    @switch (produit.status()) {
      @case ('loading') {
        <p>Chargement du produit...</p>
      }
      @case ('resolved') {
        @if (produit.value(); as p) {
          <h1>{{ p.nom }}</h1>
          <p class="prix">{{ p.prix }} €</p>

          @if (modeComplet()) {
            <div class="detail-complet">
              <p>{{ p.description }}</p>
              <h3>Spécifications</h3>
              <ul>
                @for (spec of p.specifications; track spec) {
                  <li>{{ spec }}</li>
                }
              </ul>
            </div>
          } @else {
            <p class="compact">{{ p.description | slice:0:100 }}...</p>
          }

          <div class="actions">
            <button (click)="changerMode('compact')"
                    [disabled]="!modeComplet()">
              Vue compacte
            </button>
            <button (click)="changerMode('complet')"
                    [disabled]="modeComplet()">
              Vue complète
            </button>
          </div>
        }
      }
      @case ('error') {
        <p>Produit introuvable.</p>
      }
    }
  `
})
export class ProduitDetailComponent {
  private router = inject(Router);

  // Depuis le path :id
  id = input.required<string>();

  // Depuis le query param ?vue=compact|complet
  vue = input<string>('compact');

  modeComplet = computed(() => this.vue() === 'complet');

  produit = resource({
    request: () => this.id(),
    loader: async ({ request: id, abortSignal }) => {
      const res = await fetch(`/api/produits/${id}`, { signal: abortSignal });
      if (!res.ok) throw new Error('Produit non trouvé');
      return res.json() as Promise<Produit>;
    },
  });

  changerMode(mode: 'compact' | 'complet') {
    this.router.navigate([], {
      queryParams: { vue: mode },
      queryParamsHandling: 'merge',
    });
  }
}
```
</details>

---

## Résumé

| Méthode | Usage | Avantage |
|---------|-------|----------|
| `input()` binding | Recevoir `:id`, query params, data | Simple, typé, testable |
| `ActivatedRoute.params` | Signal des paramètres de route | Contrôle fin, composants non-routés |
| `ActivatedRoute.queryParams` | Signal des query parameters | Accès dans les services |
| Route `data` | Données statiques sur la route | Métadonnées (rôle, breadcrumb) |
| Route `title` | Titre de la page | SEO, accessibilité |

- Active `withComponentInputBinding()` dans `provideRouter()` pour utiliser le binding `input()`.
- Les params de route sont toujours des **strings** — pense à les convertir (`parseInt()`, etc.).
- Utilise `queryParamsHandling: 'merge'` pour modifier un query param sans perdre les autres.
- Préfère `input()` binding à `ActivatedRoute` pour les composants routés directement.

---

> **Prochain cours** : [Cours 19 — Guards et protection de routes](./03-guards-et-protection.md)
