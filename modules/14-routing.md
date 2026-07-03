---
titre: Le routing Angular — provideRouter, routes, params et data
cours: 03-angular
notions: [provideRouter(), Routes, path et component, redirectTo et pathMatch, wildcard 404, routerLink, routerLinkActive, RouterOutlet, Router.navigate(), withComponentInputBinding(), param de route via input(), queryParams, route data, ResolveFn resolver de base, ActivatedRoute]
outcomes:
  - sait configurer le routeur en standalone avec provideRouter() dans app.config.ts et un tableau Routes
  - sait naviguer dans le template avec routerLink/routerLinkActive et par code avec Router.navigate()
  - sait recevoir un paramètre de route et un query param comme input() grâce à withComponentInputBinding()
  - sait attacher des données statiques à une route (data) et pré-charger une donnée avec un ResolveFn de base
prerequis: [modules 00 à 13 du cours 03-angular — jusqu'aux injection tokens]
next: 15-guards-et-lazy-loading
libs: [{ name: "@angular/router", version: "19" }]
tribuzen: front-office TribuZen — navigation entre écrans (accueil famille, liste des sorties, détail d'une sortie /sorties/:id)
last-reviewed: 2026-07
---

# Le routing Angular — `provideRouter`, routes, params et data

> **Outcomes — tu sauras FAIRE :** configurer le routeur standalone avec `provideRouter()`, naviguer avec `routerLink` et `Router.navigate()`, recevoir un param de route comme `input()`, et pré-charger une donnée avec un `ResolveFn` de base.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre le **routing de base** (configuration, liens, outlet, navigation programmatique) et la **lecture des paramètres/données** (params de route, query params, `data`, `ResolveFn` simple). C'est tout. La **protection des routes** (`CanActivateFn`, guards) et le **chargement paresseux** (`loadComponent`, `loadChildren`) sont le **module 15**. Les routes enfants imbriquées avancées, le `HttpClient` complet et RxJS en profondeur viennent après (modules 15-18). Ici, dès qu'on charge une donnée, on reste sur du synchrone ou une `Promise` simple.

## 1. Cas concret d'abord

TribuZen n'a plus un seul écran. Il en a maintenant trois : l'**accueil de la famille**, la **liste des sorties** planifiées, et le **détail d'une sortie** (budget, participants). Jusqu'ici, tu affichais un seul composant dans `app.component.ts`. Le collègue qui a démarré la navigation a fait ça :

```typescript
// app.component.ts — AVANT (routing « à la main »)
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="ecran.set('accueil')">Accueil</button>
    <button (click)="ecran.set('sorties')">Sorties</button>

    @switch (ecran()) {
      @case ('accueil') { <app-accueil /> }
      @case ('sorties') { <app-sorties /> }
    }
  `,
})
export class AppComponent {
  ecran = signal('accueil');
}
```

Ça « marche »… mais l'URL ne change jamais. Impossible de partager le lien d'une sortie, le bouton **Précédent** du navigateur ne fait rien, un rafraîchissement ramène toujours à l'accueil, et il n'y a aucun moyen propre de passer l'`id` d'une sortie au composant de détail. Ce dont TribuZen a besoin, c'est d'un vrai **routeur** : une URL par écran, une navigation qui s'intègre à l'historique du navigateur, et des **paramètres d'URL** (`/sorties/42`) transmis automatiquement au composant.

C'est exactement le rôle de `@angular/router`. Ce module te donne les briques : configurer les routes, poser les liens, afficher le composant actif, et lire les paramètres.

---

## 2. Théorie complète, concise

### 2.1 `provideRouter()` — brancher le routeur (standalone)

En Angular 19 standalone, **il n'y a plus de `RouterModule.forRoot()`**. Le routeur est un *provider* fonctionnel qu'on ajoute dans `app.config.ts`.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
  ],
};
```

`provideRouter(routes, ...features)` prend le tableau de routes et, en option, des *features* (on en verra une, `withComponentInputBinding()`, en §2.6).

### 2.2 `Routes` — le tableau de configuration

Une route est un objet. Les clés utiles à ce stade : `path`, `component`, `title`, `redirectTo`, `pathMatch`, `data`.

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil.component';
import { SortiesComponent } from './pages/sorties.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full', title: 'Accueil' },
  { path: 'sorties', component: SortiesComponent, title: 'Nos sorties' },
  { path: 'planning', redirectTo: 'sorties', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent, title: 'Page introuvable' },
];
```

- `path` s'écrit **sans** `/` initial (`'sorties'`, pas `'/sorties'`).
- `title` fixe le titre de l'onglet du navigateur (bon pour le SEO et l'accessibilité).
- `redirectTo` renvoie vers un autre path.
- `**` est le **wildcard** : la route 404, **toujours en dernier** (l'ordre compte, la première route qui matche gagne).

### 2.3 `pathMatch: 'full'` vs `'prefix'`

Par défaut `pathMatch` vaut `'prefix'` : une route matche si l'URL **commence par** son path. Comme toute URL commence par `''`, une route `{ path: '', redirectTo: 'sorties' }` en `'prefix'` capturerait **toutes** les URL. La règle mnémotechnique :

> Sur une route à `path: ''` **ou** avec un `redirectTo`, mets **toujours** `pathMatch: 'full'` (match exact).

### 2.4 `routerLink` et `routerLinkActive` — naviguer dans le template

`RouterLink` remplace le `href` : il navigue **sans recharger la page**. `RouterLinkActive` ajoute une classe CSS quand la route est active. Les deux sont des directives standalone à **importer dans le composant**.

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav>
      <!-- Lien statique + exact:true pour que '/' ne reste pas actif partout -->
      <a routerLink="/" routerLinkActive="actif"
         [routerLinkActiveOptions]="{ exact: true }">Accueil</a>

      <a routerLink="/sorties" routerLinkActive="actif">Sorties</a>

      <!-- Lien dynamique : tableau de segments -> /sorties/42 -->
      <a [routerLink]="['/sorties', sortie.id]">{{ sortie.titre }}</a>

      <!-- Query params -->
      <a [routerLink]="['/sorties']" [queryParams]="{ tri: 'date' }">Trier</a>
    </nav>
  `,
  styles: [`.actif { font-weight: bold; }`],
})
export class NavComponent {
  sortie = { id: 42, titre: 'Pique-nique' };
}
```

Statique : `routerLink="/sorties"`. Dynamique : `[routerLink]="['/sorties', id]"` — un **tableau de segments** d'URL.

### 2.5 `RouterOutlet` — le point de rendu

`<router-outlet />` est l'emplacement où Angular affiche le composant de la route active. À importer aussi.

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent],
  template: `
    <app-nav />
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
```

### 2.6 Lire un param de route comme `input()` — `withComponentInputBinding()`

Un param se déclare avec `:` dans le path : `{ path: 'sorties/:id', component: SortieDetailComponent }`. Pour le récupérer, l'approche **recommandée en Angular 19** est le *component input binding* : le routeur passe le param **directement comme un `input()`** du composant, comme s'il faisait `<app-sortie-detail [id]="…" />`.

On l'active **une seule fois** dans la config :

```typescript
// app.config.ts
import { provideRouter, withComponentInputBinding } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

Puis, dans le composant cible, un `input()` du **même nom** que le param :

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sortie-detail',
  template: `<h1>Sortie {{ id() }}</h1>`,
})
export class SortieDetailComponent {
  // route 'sorties/:id' -> le routeur remplit cet input
  id = input.required<string>();
}
```

Le binding mappe **trois** sources vers des inputs du même nom : les **params de path** (`:id`), les **query params**, et les **`data`** de route.

```typescript
// URL : /sorties/42?tri=date   avec  { path: 'sorties/:id', data: { role: 'membre' } }
export class SortieDetailComponent {
  id   = input.required<string>();   // <- :id  (param de path)
  tri  = input<string>();            // <- ?tri (query param)
  role = input<string>();            // <- data.role
}
```

> Un param d'URL est **toujours une string**. Pour un nombre, convertis (`Number(this.id())`).

### 2.7 Query params et `data`

**Query params** : les paramètres après `?` (`/sorties?tri=date&page=2`). On les pose avec `[queryParams]` (template) ou l'option `queryParams` de `navigate()`, et on les lit comme `input()` (§2.6). Pour en modifier un sans perdre les autres, `queryParamsHandling: 'merge'`.

**`data`** : des valeurs **statiques** attachées à la route dans la config (`data: { role: 'membre' }`), lues elles aussi comme `input()`. Utile pour des métadonnées (rôle attendu, libellé de fil d'Ariane).

### 2.8 `ResolveFn` — pré-charger une donnée (de base)

Un **resolver** exécute une fonction **avant** d'afficher le composant et injecte le résultat dans les `data` de la route. Un `ResolveFn<T>` est une simple fonction ; on la branche via `resolve: { clé: fn }`.

```typescript
// sortie.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SortieService, Sortie } from './sortie.service';

// route.paramMap.get('id') lit le param depuis le snapshot passé au resolver
export const sortieResolver: ResolveFn<Sortie> = (route) => {
  const id = route.paramMap.get('id')!;
  return inject(SortieService).getSortie(id); // Sortie | Promise<Sortie> | Observable<Sortie>
};
```

```typescript
// app.routes.ts
{
  path: 'sorties/:id',
  component: SortieDetailComponent,
  resolve: { sortie: sortieResolver },  // -> data.sortie
}
```

Avec `withComponentInputBinding()`, la donnée résolue arrive comme un `input()` du nom de la clé :

```typescript
export class SortieDetailComponent {
  sortie = input.required<Sortie>();  // <- resolve.sortie, déjà chargée
}
```

L'intérêt : le composant s'affiche **avec sa donnée déjà prête**, pas d'état « chargement » à gérer côté template. (Les resolvers plus poussés — gestion d'erreur, annulation — relèvent du module 15.)

### 2.9 `Router.navigate()` — naviguer par code

Pour naviguer depuis la logique (après une action), injecte `Router` et appelle `navigate()` avec un **tableau de segments**.

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({ /* ... */ })
export class SortiesComponent {
  private router = inject(Router);

  ouvrir(id: string) {
    this.router.navigate(['/sorties', id]);                    // -> /sorties/42
  }

  trier() {
    this.router.navigate(['/sorties'], { queryParams: { tri: 'date' } });
  }

  changerTri(tri: string) {
    // modifie un query param sans écraser les autres
    this.router.navigate([], { queryParams: { tri }, queryParamsHandling: 'merge' });
  }
}
```

Il n'y a **pas de routes nommées** en Angular : on navigue par path, jamais par un `name`.

### 2.10 `ActivatedRoute` — la porte de sortie (cas particuliers)

Quand un composant **n'est pas** la cible directe d'une route (un service, un composant de layout) et a besoin des params, on injecte `ActivatedRoute`. Elle expose les params/query params/data sous forme d'**observables** (`route.paramMap`, `route.queryParams`, `route.data`).

```typescript
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ /* ... */ })
export class FilArianeComponent {
  private route = inject(ActivatedRoute);

  constructor() {
    // observable — on s'abonne (RxJS = module 16)
    this.route.paramMap.subscribe(pm => console.log(pm.get('id')));
  }
}
```

Règle : pour un **composant routé directement**, préfère le `input()` binding (§2.6), plus simple et testable. Garde `ActivatedRoute` pour les cas où le binding ne s'applique pas.

---

## 3. Worked examples

### Exemple 1 — Les trois écrans de TribuZen câblés

Objectif : accueil, liste des sorties, détail d'une sortie par `id`, plus une 404.

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil.component';
import { SortiesComponent } from './pages/sorties.component';
import { SortieDetailComponent } from './pages/sortie-detail.component';
import { NotFoundComponent } from './pages/not-found.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full', title: 'TribuZen' },
  { path: 'sorties', component: SortiesComponent, title: 'Nos sorties' },
  { path: 'sorties/:id', component: SortieDetailComponent, title: 'Détail sortie' },
  { path: '**', component: NotFoundComponent, title: 'Introuvable' },
];
```

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // withComponentInputBinding : les :id arriveront comme input()
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

```typescript
// app.component.ts — la coquille : nav + outlet
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/" routerLinkActive="actif"
         [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
      <a routerLink="/sorties" routerLinkActive="actif">Sorties</a>
    </nav>
    <main><router-outlet /></main>
  `,
  styles: [`.actif { font-weight: bold; }`],
})
export class AppComponent {}
```

```typescript
// pages/sorties.component.ts — liste + navigation
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sorties',
  imports: [RouterLink],
  template: `
    <h1>Nos sorties</h1>
    <ul>
      @for (s of sorties(); track s.id) {
        <li>
          <!-- lien déclaratif -->
          <a [routerLink]="['/sorties', s.id]">{{ s.titre }}</a>
          <!-- navigation par code (ex : après une confirmation) -->
          <button (click)="ouvrir(s.id)">Ouvrir</button>
        </li>
      }
    </ul>
  `,
})
export class SortiesComponent {
  private router = inject(Router);
  sorties = signal([
    { id: '1', titre: 'Pique-nique au parc' },
    { id: '2', titre: 'Musée des sciences' },
  ]);

  ouvrir(id: string) {
    this.router.navigate(['/sorties', id]);
  }
}
```

```typescript
// pages/sortie-detail.component.ts — reçoit :id comme input()
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-detail',
  template: `
    <a routerLink="/sorties">← Retour</a>
    <h1>Sortie #{{ idNum() }}</h1>
  `,
  imports: [RouterLink],
})
export class SortieDetailComponent {
  // même nom que le param :id, grâce à withComponentInputBinding()
  id = input.required<string>();
  // un param est une string -> conversion explicite pour un calcul
  idNum = computed(() => Number(this.id()));
}
```

Quand l'utilisateur ouvre `/sorties/2`, le routeur instancie `SortieDetailComponent` et remplit son input `id` avec `'2'`. Aucun `subscribe`, aucun `ActivatedRoute`.

### Exemple 2 — Un `data` de route + un `ResolveFn` de base

On veut que la page de détail arrive **avec la sortie déjà chargée**, et on attache un rôle statique via `data`.

```typescript
// sortie.service.ts
import { Injectable } from '@angular/core';

export interface Sortie { id: string; titre: string; budget: number; }

@Injectable({ providedIn: 'root' })
export class SortieService {
  // synchrone ici ; en vrai ce sera du HttpClient (module 18)
  getSortie(id: string): Sortie {
    return { id, titre: 'Pique-nique au parc', budget: 45 };
  }
}
```

```typescript
// sortie.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SortieService, Sortie } from './sortie.service';

export const sortieResolver: ResolveFn<Sortie> = (route) => {
  const id = route.paramMap.get('id')!;
  return inject(SortieService).getSortie(id);
};
```

```typescript
// app.routes.ts (extrait)
{
  path: 'sorties/:id',
  component: SortieDetailComponent,
  data: { role: 'membre' },          // statique
  resolve: { sortie: sortieResolver } // pré-chargé -> data.sortie
}
```

```typescript
// pages/sortie-detail.component.ts
import { Component, input } from '@angular/core';
import { Sortie } from '../sortie.service';

@Component({
  selector: 'app-sortie-detail',
  template: `
    <h1>{{ sortie().titre }}</h1>
    <p>Budget : {{ sortie().budget }} EUR</p>
    <p>Accès : {{ role() }}</p>
  `,
})
export class SortieDetailComponent {
  sortie = input.required<Sortie>();  // <- resolve.sortie (déjà chargée)
  role   = input<string>();           // <- data.role
}
```

Le template n'a **aucun** état « chargement » : le routeur a résolu `sortie` avant d'afficher le composant. `role` et `sortie` arrivent tous deux par binding d'input.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Utiliser encore `RouterModule.forRoot()`

```typescript
// ❌ Ancien monde NgModule
@NgModule({ imports: [RouterModule.forRoot(routes)] })
export class AppModule {}

// ✅ Standalone Angular 19
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

En standalone, la config du routeur est un provider (`provideRouter`), pas un import de module.

### PIÈGE #2 — Oublier d'importer `RouterLink` / `RouterOutlet`

```typescript
// ❌ routerLink dans le template mais pas dans imports -> erreur de compilation / lien mort
@Component({ imports: [], template: `<a routerLink="/sorties">…</a>` })

// ✅ chaque directive utilisée doit être importée
@Component({ imports: [RouterLink], template: `<a routerLink="/sorties">…</a>` })
```

`RouterLink`, `RouterLinkActive` et `RouterOutlet` sont standalone : le composant qui les emploie doit les lister dans `imports`.

### PIÈGE #3 — `path: '/sorties'` avec un slash initial

```typescript
// ❌ un path de route ne commence jamais par '/'
{ path: '/sorties', component: SortiesComponent }

// ✅
{ path: 'sorties', component: SortiesComponent }
```

Le `/` initial ne s'utilise que dans `routerLink="/sorties"` et `navigate(['/sorties'])`, **pas** dans la config `Routes`.

### PIÈGE #4 — Attendre un `input()` de param sans `withComponentInputBinding()`

```typescript
// route 'sorties/:id' + composant avec id = input.required<string>()
// ❌ sans la feature, l'input reste vide -> NG erreur "required input id must be provided"
provideRouter(routes)

// ✅ la feature branche params/query/data sur les inputs
provideRouter(routes, withComponentInputBinding())
```

Le binding param→input **n'est pas automatique** : il faut activer `withComponentInputBinding()` une fois dans la config.

### PIÈGE #5 — Traiter un param d'URL comme un nombre

```typescript
id = input.required<string>();

// ❌ '2' + 1 === '21' (concaténation de string)
prochainId = this.id() + 1;

// ✅ convertir d'abord
prochainId = Number(this.id()) + 1;
```

Tout param d'URL (path ou query) est une **string**. Convertis explicitement avant tout calcul.

### PIÈGE #6 — Placer le wildcard `**` avant les autres routes

```typescript
// ❌ '**' matche tout -> /sorties n'est jamais atteint
export const routes: Routes = [
  { path: '**', component: NotFoundComponent },
  { path: 'sorties', component: SortiesComponent },
];

// ✅ le wildcard en dernier
export const routes: Routes = [
  { path: 'sorties', component: SortiesComponent },
  { path: '**', component: NotFoundComponent },
];
```

Le routeur prend la **première** route qui matche : `**` doit toujours fermer le tableau.

---

## 5. Ancrage TribuZen

Le routeur est la **couche navigation** de tout le front-office TribuZen. Chaque écran devient une URL partageable, l'historique du navigateur fonctionne, et l'`id` d'une sortie circule proprement jusqu'au composant de détail.

**`app.routes.ts`** (Exemple 1) — la carte des écrans : `''` (accueil), `sorties` (liste), `sorties/:id` (détail), `**` (404). C'est le squelette de navigation de TribuZen.

**`SortieDetailComponent`** (Exemples 1 & 2) — reçoit `:id` en `input()` grâce à `withComponentInputBinding()`, et sa `Sortie` pré-chargée par `sortieResolver`. C'est le premier écran TribuZen qui dépend d'un paramètre d'URL.

**`NavComponent` / `app.component.ts`** — la barre de navigation (`routerLink` + `routerLinkActive`) et le `<router-outlet />` qui rend l'écran actif.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      app.routes.ts                      ← la carte des routes
      app.config.ts                      ← provideRouter + withComponentInputBinding
      pages/
        accueil.component.ts
        sorties.component.ts             ← liste + navigate()
        sortie-detail.component.ts       ← :id en input(), sortie résolue
      sortie.service.ts
      sortie.resolver.ts                 ← ResolveFn de base
```

> La **protection** de `/sorties/:id` (membre connecté seulement) et le **lazy-loading** des pages sont le **module 15**. Le chargement réel de la sortie via `HttpClient` (au lieu du service synchrone) est le **module 18**. Ici on câble la navigation et le passage de paramètres.

---

## 6. Points clés

1. En standalone, le routeur se branche avec `provideRouter(routes)` dans `app.config.ts` — plus de `RouterModule.forRoot()`.
2. Une route est `{ path, component, title?, redirectTo?, pathMatch?, data? }` ; le `path` s'écrit **sans** `/` initial et le wildcard `**` (404) reste **en dernier**.
3. Mets `pathMatch: 'full'` sur toute route à `path: ''` ou avec `redirectTo`.
4. `routerLink` (+ `routerLinkActive`) navigue dans le template ; `<router-outlet />` rend l'écran actif ; les trois directives sont à **importer** dans le composant.
5. `withComponentInputBinding()` fait arriver params de path, query params et `data` comme des `input()` du même nom — l'approche recommandée en Angular 19.
6. Un param d'URL est **toujours une string** : convertis (`Number(...)`) avant tout calcul.
7. `Router.navigate(['/sorties', id])` navigue par code avec un tableau de segments ; pas de routes nommées en Angular.
8. Un `ResolveFn<T>` pré-charge une donnée avant l'affichage et l'injecte via `resolve: { clé }` — récupérable comme `input()` ; `ActivatedRoute` reste pour les composants non routés directement.

---

## 7. Seeds Anki

```
Comment brancher le routeur en Angular 19 standalone ?|Avec provideRouter(routes) dans les providers de appConfig (app.config.ts). Plus de RouterModule.forRoot() : le routeur est un provider fonctionnel.
Pourquoi mettre pathMatch: 'full' sur une route à path vide ou avec redirectTo ?|Par défaut pathMatch vaut 'prefix' et '' est le préfixe de toute URL, donc la route capturerait tout. 'full' impose un match exact de l'URL.
Où doit se trouver la route wildcard '**' et pourquoi ?|Toujours en dernier dans le tableau Routes : le routeur prend la première route qui matche, et '**' matche tout. Placée avant, elle masquerait les autres routes.
Quelles directives faut-il importer pour naviguer dans un template Angular standalone ?|RouterLink (liens), RouterLinkActive (classe active) et RouterOutlet (point de rendu), à lister dans les imports du composant.
À quoi sert withComponentInputBinding() dans provideRouter ?|À faire arriver les params de path (:id), les query params et les data de route directement comme des input() du même nom dans le composant routé.
Comment récupère-t-on le param :id d'une route en Angular 19 ?|On active withComponentInputBinding() puis on déclare id = input.required<string>() dans le composant. Le routeur remplit l'input. (Sinon : ActivatedRoute.)
Un param d'URL récupéré via input() est de quel type ?|Toujours une string, même pour /sorties/42. Il faut convertir explicitement (Number(this.id())) avant tout calcul numérique.
Que fait un ResolveFn et comment le brancher ?|C'est une fonction exécutée avant d'afficher le composant ; on la branche via resolve: { cle: fn } sur la route. Le résultat va dans data.cle, récupérable comme input(). Le composant s'affiche avec sa donnée déjà prête.
Comment naviguer par code vers /sorties/42 ?|inject(Router) puis this.router.navigate(['/sorties', 42]) — un tableau de segments. Il n'existe pas de routes nommées en Angular.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-14-routing/README.md`. Câbler la navigation des trois écrans TribuZen avec `provideRouter` + `withComponentInputBinding`, passer un `:id` en `input()` et pré-charger une sortie avec un `ResolveFn` — dev server Angular CLI en oracle visuel, corrigé commenté intégral.
