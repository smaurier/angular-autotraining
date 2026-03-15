# Cours 17 — Routing basique

> **Objectif** : Configurer le routeur Angular avec `provideRouter()`, définir des routes vers des composants standalone, naviguer avec `routerLink` et `Router.navigate()`, et comprendre les différences avec Vue Router.

---

## Rappel du cours précédent

<details>
<summary>Qu'est-ce qu'un InjectionToken et quand en a-t-on besoin ?</summary>

Un `InjectionToken<T>` est un identifiant typé pour injecter des valeurs non-class (string, objet de config, interface) dans le système de DI Angular. On en a besoin quand la dépendance n'est pas une classe (car le DI utilise la classe comme token par défaut).
</details>

<details>
<summary>Comment fonctionne inject() avec l'option { optional: true } ?</summary>

Au lieu de lancer une `NullInjectorError` quand le service n'est pas fourni, `inject(Service, { optional: true })` retourne `null`. Utile pour les composants de librairie qui fonctionnent avec ou sans certains services.
</details>

<details>
<summary>Quel est le pattern de configuration injectable ?</summary>

On crée un `InjectionToken<AppConfig>`, on le fournit avec `{ provide: APP_CONFIG, useValue: config }` dans `appConfig`, et on l'injecte avec `inject(APP_CONFIG)` dans les services et composants. Chaque environnement fournit sa propre config.
</details>

---

## Analogie

Si tu connais Vue Router, le routeur Angular te semblera familier. Les concepts fondamentaux sont identiques :

| Vue Router | Angular Router |
|-----------|---------------|
| `createRouter()` | `provideRouter()` |
| `routes: [{ path, component }]` | `Routes: [{ path, component }]` |
| `<RouterLink to="/page">` | `<a routerLink="/page">` |
| `<RouterView />` | `<router-outlet />` |
| `router.push('/page')` | `router.navigate(['/page'])` |
| `createWebHistory()` | Par défaut (HTML5 history) |

La différence principale : en Vue, tu importes `useRouter()` et `useRoute()`. En Angular, tu injectes `Router` et `ActivatedRoute` via `inject()`.

---

## Théorie

### provideRouter() — Configurer le routeur

En Angular 19+ standalone, le routeur se configure dans `app.config.ts` avec `provideRouter()`.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
  ]
};
```

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil.component';
import { AProposComponent } from './pages/a-propos.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent },
  { path: 'a-propos', component: AProposComponent },
  { path: 'contact', component: ContactComponent },
  { path: '**', component: NotFoundComponent },  // 404
];
```

```typescript
// ❌ Ancien style : RouterModule.forRoot() (NgModules)
@NgModule({
  imports: [RouterModule.forRoot(routes)]
})
export class AppModule {}

// ✅ Moderne : provideRouter() (standalone)
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)]
};
```

---

### Route configuration

Chaque route est un objet avec au minimum `path` et `component` (où `redirectTo`).

```typescript
export const routes: Routes = [
  // Route simple
  {
    path: 'tableau-de-bord',
    component: TableauDeBordComponent,
  },

  // Redirection
  {
    path: 'dashboard',
    redirectTo: 'tableau-de-bord',
    pathMatch: 'full',  // Obligatoire pour les redirections de path vide
  },

  // Route racine
  {
    path: '',
    component: AccueilComponent,
    pathMatch: 'full',  // '' match tout — full = match exact
  },

  // Route avec titre (affiché dans l'onglet du navigateur)
  {
    path: 'profil',
    component: ProfilComponent,
    title: 'Mon profil',
  },

  // Route wildcard — 404 (TOUJOURS en dernier)
  {
    path: '**',
    component: NotFoundComponent,
  },
];
```

#### pathMatch: 'full' vs 'prefix'

```typescript
// pathMatch: 'prefix' (défaut) → '' matche TOUT (car toute URL commence par '')
{ path: '', redirectTo: 'accueil', pathMatch: 'prefix' }
// ❌ /profil → redirigé vers /accueil (car '/profil' commence par '')

// pathMatch: 'full' → '' ne matche que l'URL vide exacte
{ path: '', redirectTo: 'accueil', pathMatch: 'full' }
// ✅ /profil → affiche ProfilComponent
// ✅ / → redirigé vers /accueil
```

**Règle** : utilise toujours `pathMatch: 'full'` sur les routes avec `path: ''` ou les `redirectTo`.

---

### routerLink — Navigation dans le template

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        Accueil
      </a>
      <a routerLink="/produits" routerLinkActive="active">
        Produits
      </a>
      <a routerLink="/a-propos" routerLinkActive="active">
        À propos
      </a>
    </nav>
  `,
  styles: [`
    .active { font-weight: bold; color: #1976d2; }
  `]
})
export class NavigationComponent {}
```

**routerLinkActive** ajoute une classe CSS quand la route est active. C'est l'équivalent de la classe `router-link-active` de Vue Router.

```typescript
// routerLink statique
<a routerLink="/produits">Produits</a>

// routerLink dynamique (avec binding)
<a [routerLink]="['/produits', produit.id]">{{ produit.nom }}</a>
// → /produits/42

// Avec query params
<a [routerLink]="['/produits']" [queryParams]="{ categorie: 'tech' }">
  Tech
</a>
// → /produits?categorie=tech
```

---

### router-outlet — Le point de rendu

`<router-outlet>` est l'endroit où Angular affiche le composant de la route active. C'est l'équivalent de `<RouterView />` en Vue.

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent],
  template: `
    <app-navigation />

    <main>
      <router-outlet />
      <!-- Le composant de la route active s'affiche ici -->
    </main>

    <footer>Mon App &copy; 2025</footer>
  `
})
export class AppComponent {}
```

---

### Navigation programmatique avec Router.navigate()

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({ /* ... */ })
export class ConnexionComponent {
  private router = inject(Router);

  async connecter() {
    const succes = await this.authService.connecter(email, motDePasse);

    if (succes) {
      // Navigation simple
      this.router.navigate(['/tableau-de-bord']);

      // Avec paramètres
      this.router.navigate(['/profil', userId]);
      // → /profil/42

      // Avec query params
      this.router.navigate(['/produits'], {
        queryParams: { categorie: 'tech', page: 1 }
      });
      // → /produits?categorie=tech&page=1

      // Remplacer l'historique (pas de retour arrière)
      this.router.navigate(['/accueil'], { replaceUrl: true });
    }
  }
}
```

**Comparaison avec Vue Router** :

```typescript
// Vue
router.push('/tableau-de-bord');
router.push({ name: 'profil', params: { id: 42 } });
router.replace('/accueil');

// Angular
this.router.navigate(['/tableau-de-bord']);
this.router.navigate(['/profil', 42]);
this.router.navigate(['/accueil'], { replaceUrl: true });
```

Différence notable : Angular utilise un **tableau de segments** (`['/produits', id]`) au lieu d'une string ou un objet nommé. Il n'y a pas de routes nommées en Angular (pas d'équivalent `name: 'profil'`).

---

### Configuration complète : un exemple réaliste

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: AccueilComponent,
    pathMatch: 'full',
    title: 'Accueil — MonApp',
  },
  {
    path: 'connexion',
    component: ConnexionComponent,
    title: 'Connexion',
  },
  {
    path: 'produits',
    component: ProduitsComponent,
    title: 'Catalogue',
  },
  {
    path: 'produits/:id',
    component: ProduitDetailComponent,
    title: 'Détail produit',
  },
  {
    path: 'admin',
    children: [
      { path: '', component: AdminDashboardComponent, title: 'Admin' },
      { path: 'utilisateurs', component: AdminUtilisateursComponent },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Page introuvable',
  },
];
```

---

## Pratique

### Exercice : Mise en place du routing pour une app de blog

Crée la configuration de routing pour une application de blog avec :

1. Page d'accueil sur `/`
2. Liste d'articles sur `/articles`
3. Détail d'un article sur `/articles/:id`
4. Page "À propos" sur `/a-propos`
5. Redirection `/blog` vers `/articles`
6. Page 404 pour les routes inconnues
7. Une navigation avec `routerLink` et `routerLinkActive`
8. Un bouton dans la liste d'articles pour naviguer vers le détail (programmatique)

<details>
<summary>Voir la solution</summary>

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full', title: 'Blog' },
  { path: 'articles', component: ArticlesListeComponent, title: 'Articles' },
  { path: 'articles/:id', component: ArticleDetailComponent, title: 'Article' },
  { path: 'a-propos', component: AProposComponent, title: 'À propos' },
  { path: 'blog', redirectTo: 'articles', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent, title: '404' },
];

// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)]
};

// app.component.ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{ exact: true }">
        Accueil
      </a>
      <a routerLink="/articles" routerLinkActive="active">Articles</a>
      <a routerLink="/a-propos" routerLinkActive="active">À propos</a>
    </nav>

    <router-outlet />
  `,
  styles: [`.active { font-weight: bold; border-bottom: 2px solid #1976d2; }`]
})
export class AppComponent {}

// articles-liste.component.ts
@Component({
  selector: 'app-articles-liste',
  imports: [RouterLink],
  template: `
    <h1>Articles</h1>
    <ul>
      @for (article of articles(); track article.id) {
        <li>
          <a [routerLink]="['/articles', article.id]">{{ article.titre }}</a>
          <button (click)="voirDetail(article.id)">Voir</button>
        </li>
      }
    </ul>
  `
})
export class ArticlesListeComponent {
  private router = inject(Router);

  articles = signal([
    { id: 1, titre: 'Introduction à Angular' },
    { id: 2, titre: 'Signals en profondeur' },
    { id: 3, titre: 'Le routing Angular' },
  ]);

  voirDetail(id: number) {
    this.router.navigate(['/articles', id]);
  }
}
```
</details>

---

## Résumé

| Concept | Angular | Vue |
|---------|---------|-----|
| Configuration | `provideRouter(routes)` dans `appConfig` | `createRouter({ routes })` |
| Définition route | `{ path, component, title }` | `{ path, component, name }` |
| Redirection | `{ path, redirectTo, pathMatch }` | `{ path, redirect }` |
| Lien template | `routerLink="/page"` | `<RouterLink to="/page">` |
| Classe active | `routerLinkActive="active"` | `.router-link-active` auto |
| Point de rendu | `<router-outlet />` | `<RouterView />` |
| Navigation JS | `router.navigate(['/page'])` | `router.push('/page')` |
| 404 | `{ path: '**', component }` | `{ path: '/:pathMatch(.*)*' }` |

- Toujours mettre `pathMatch: 'full'` sur les routes avec `path: ''` ou `redirectTo`.
- La route wildcard `**` doit toujours etre **la dernière** du tableau.
- Il n'y a pas de routes nommées en Angular — on navigue par path.
- N'oublie pas d'importer `RouterOutlet`, `RouterLink`, `RouterLinkActive` dans les `imports` du composant.

---

> **Prochain cours** : [Cours 18 — Paramètres de route et data](./02-parametres-et-data.md)
