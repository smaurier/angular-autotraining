# Lab 14 — Routing Angular (routes, params, data)

> **Outcome :** à la fin, tu sais câbler une app Angular standalone à trois écrans avec `provideRouter`, naviguer avec `routerLink`/`Router.navigate()`, recevoir un `:id` comme `input()` via `withComponentInputBinding()`, et pré-charger une donnée avec un `ResolveFn` de base.
> **Vrai outil :** Angular CLI (`ng serve`) — dev server réel dans le navigateur, URL qui change, bouton Précédent fonctionnel.
> **Feedback :** le coach valide visuellement en session (navigation + URL + param) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis la **navigation de TribuZen**. L'app a trois écrans et une 404 :

| URL | Écran | Composant |
|-----|-------|-----------|
| `/` | Accueil | `AccueilComponent` |
| `/sorties` | Liste des sorties | `SortiesComponent` |
| `/sorties/:id` | Détail d'une sortie | `SortieDetailComponent` |
| (tout le reste) | 404 | `NotFoundComponent` |

**Cahier des charges exact :**

1. `provideRouter(routes, withComponentInputBinding())` dans `app.config.ts`.
2. Une barre de navigation persistante (Accueil / Sorties) avec `routerLink` + `routerLinkActive` (classe `actif`), plus un `<router-outlet />` dans `AppComponent`.
3. `SortiesComponent` affiche une liste de sorties (données en dur, signal). Chaque ligne a **un lien** `routerLink` vers le détail **et un bouton** qui navigue par code (`Router.navigate`).
4. `SortieDetailComponent` reçoit `:id` comme `input.required<string>()` (aucun `ActivatedRoute`, aucun `subscribe`) et affiche la sortie correspondante, **pré-chargée par un `ResolveFn`** (`sortieResolver`) et reçue comme `input.required<Sortie>()`.
5. Un lien « ← Retour » vers `/sorties` dans le détail.
6. La route `**` affiche `NotFoundComponent`, **en dernier**.

**Données de départ (à copier dans `sortie.service.ts`) :**

```ts
export interface Sortie { id: string; titre: string; budget: number; }

const SORTIES: Sortie[] = [
  { id: '1', titre: 'Pique-nique au parc', budget: 45 },
  { id: '2', titre: 'Musée des sciences',  budget: 80 },
  { id: '3', titre: 'Rando en forêt',      budget: 20 },
];
```

**Pas de gap-fill** — tu écris les fichiers complets à partir du starter ci-dessous.

### Starter minimal

Crée le projet avec l'Angular CLI (zoneless + standalone par défaut en v19) :

```bash
ng new tribuzen-routing --style=css --ssr=false
cd tribuzen-routing
ng generate component pages/accueil
ng generate component pages/sorties
ng generate component pages/sortie-detail
ng generate component pages/not-found
ng generate service sortie
```

Puis crée à la main `src/app/sortie.resolver.ts` et remplis `src/app/app.routes.ts`. Lance `ng serve` et garde le navigateur ouvert sur `http://localhost:4200` : à chaque sauvegarde, l'URL et l'écran doivent réagir.

---

## Étapes (en friction)

1. **Le service** — dans `sortie.service.ts`, expose `getSortie(id: string): Sortie` (retourne la sortie du tableau, ou lève si absente) et `getSorties(): Sortie[]`.
2. **Le resolver** — dans `sortie.resolver.ts`, écris `sortieResolver: ResolveFn<Sortie>` qui lit `route.paramMap.get('id')` et appelle `inject(SortieService).getSortie(id)`.
3. **Les routes** — dans `app.routes.ts` : `''` (accueil, `pathMatch: 'full'`), `'sorties'`, `'sorties/:id'` (avec `resolve: { sortie: sortieResolver }`), `'**'` (404) **en dernier**.
4. **La config** — dans `app.config.ts`, `provideRouter(routes, withComponentInputBinding())`.
5. **La coquille** — dans `app.component.ts` (ou `app.ts`), la nav (`routerLink` + `routerLinkActive` + `routerLinkActiveOptions` `{ exact: true }` sur Accueil) et `<router-outlet />`. Importe les directives.
6. **La liste** — `SortiesComponent` : un `signal` de sorties (via le service), un `@for` avec `track s.id`, un `[routerLink]="['/sorties', s.id]"` et un bouton `(click)="ouvrir(s.id)"` qui fait `router.navigate(['/sorties', s.id])`.
7. **Le détail** — `SortieDetailComponent` : `id = input.required<string>()` et `sortie = input.required<Sortie>()`. Affiche titre + budget + id. Lien retour.
8. **Vérifie les cas limites** dans le navigateur : ouvrir `/sorties/2` directement (recharger la page → toujours le bon écran) ; cliquer le bouton vs le lien (même résultat) ; taper `/nawak` → 404 ; bouton **Précédent** du navigateur revient à l'écran précédent.

---

## Corrigé complet commenté

```ts
// src/app/sortie.service.ts
import { Injectable } from '@angular/core';

export interface Sortie { id: string; titre: string; budget: number; }

@Injectable({ providedIn: 'root' })
export class SortieService {
  // Données en dur — en vrai produit : HttpClient (module 18)
  private readonly sorties: Sortie[] = [
    { id: '1', titre: 'Pique-nique au parc', budget: 45 },
    { id: '2', titre: 'Musée des sciences',  budget: 80 },
    { id: '3', titre: 'Rando en forêt',      budget: 20 },
  ];

  getSorties(): Sortie[] {
    return this.sorties;
  }

  getSortie(id: string): Sortie {
    const s = this.sorties.find(x => x.id === id);
    if (!s) throw new Error(`Sortie ${id} introuvable`);
    return s;
  }
}
```

```ts
// src/app/sortie.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SortieService, Sortie } from './sortie.service';

// ResolveFn = simple fonction. route = snapshot de la route en cours de résolution.
// Le résultat (Sortie | Promise | Observable) atterrit dans data.sortie,
// disponible AVANT l'affichage du composant.
export const sortieResolver: ResolveFn<Sortie> = (route) => {
  const id = route.paramMap.get('id')!;   // '!' : la route 'sorties/:id' garantit le param
  return inject(SortieService).getSortie(id);
};
```

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { SortiesComponent } from './pages/sorties/sorties.component';
import { SortieDetailComponent } from './pages/sortie-detail/sortie-detail.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { sortieResolver } from './sortie.resolver';

export const routes: Routes = [
  // pathMatch: 'full' obligatoire sur '' sinon il capturerait toutes les URL
  { path: '', component: AccueilComponent, pathMatch: 'full', title: 'TribuZen' },
  { path: 'sorties', component: SortiesComponent, title: 'Nos sorties' },
  {
    path: 'sorties/:id',
    component: SortieDetailComponent,
    title: 'Détail sortie',
    // resolve : la sortie est chargée AVANT l'affichage -> arrive dans data.sortie
    resolve: { sortie: sortieResolver },
  },
  // wildcard 404 : TOUJOURS en dernier (première route qui matche gagne)
  { path: '**', component: NotFoundComponent, title: 'Introuvable' },
];
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // withComponentInputBinding : params (:id), query params ET data (sortie résolue)
    // arrivent comme des input() du même nom dans le composant routé.
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

```ts
// src/app/app.component.ts — la coquille (nav + outlet)
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  // les 3 directives standalone doivent être importées
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <!-- exact:true sinon '/' resterait actif sur toutes les URL (elles commencent par /) -->
      <a routerLink="/" routerLinkActive="actif"
         [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
      <a routerLink="/sorties" routerLinkActive="actif">Sorties</a>
    </nav>
    <main>
      <!-- l'écran de la route active s'affiche ici -->
      <router-outlet />
    </main>
  `,
  styles: [`
    nav { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .actif { font-weight: bold; text-decoration: underline; }
  `],
})
export class AppComponent {}
```

```ts
// src/app/pages/sorties/sorties.component.ts — liste + double navigation
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SortieService } from '../../sortie.service';

@Component({
  selector: 'app-sorties',
  imports: [RouterLink],
  template: `
    <h1>Nos sorties</h1>
    <ul>
      @for (s of sorties(); track s.id) {
        <li>
          <!-- navigation déclarative : tableau de segments -> /sorties/1 -->
          <a [routerLink]="['/sorties', s.id]">{{ s.titre }}</a>
          <!-- navigation par code : même résultat, depuis la logique -->
          <button (click)="ouvrir(s.id)">Ouvrir</button>
        </li>
      }
    </ul>
  `,
})
export class SortiesComponent {
  private router = inject(Router);
  private service = inject(SortieService);

  // signal alimenté par le service (état local pour l'instant)
  sorties = signal(this.service.getSorties());

  ouvrir(id: string) {
    this.router.navigate(['/sorties', id]);
  }
}
```

```ts
// src/app/pages/sortie-detail/sortie-detail.component.ts — params + data en input()
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sortie } from '../../sortie.service';

@Component({
  selector: 'app-sortie-detail',
  imports: [RouterLink],
  template: `
    <a routerLink="/sorties">← Retour</a>
    <!-- sortie() est déjà chargée par le resolver : pas d'état "chargement" -->
    <h1>{{ sortie().titre }}</h1>
    <p>Identifiant : {{ id() }}</p>
    <p>Budget : {{ sortie().budget }} EUR</p>
  `,
})
export class SortieDetailComponent {
  // même nom que le param :id — rempli par withComponentInputBinding()
  id = input.required<string>();
  // même nom que la clé du resolve { sortie: ... } — déjà résolue
  sortie = input.required<Sortie>();
}
```

```ts
// src/app/pages/not-found/not-found.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>404 — Page introuvable</h1>
    <a routerLink="/">Retour à l'accueil</a>
  `,
})
export class NotFoundComponent {}
```

**Pourquoi ce corrigé est correct :**
- `SortieDetailComponent` ne connaît **rien** au routeur : `id` et `sortie` sont de simples `input()`. C'est `withComponentInputBinding()` qui les branche (le `:id` du path, la clé `sortie` du `resolve`). Composant découplé donc testable en isolation.
- Le resolver charge la sortie **avant** l'affichage → le template n'a jamais à gérer un état « chargement » ni un `sortie` `undefined`. `input.required<Sortie>()` garantit sa présence.
- Le bouton `ouvrir()` et le `[routerLink]` produisent **exactement** la même navigation — l'un depuis la logique, l'autre déclaratif. On montre les deux voies.
- `pathMatch: 'full'` sur `''` et le `**` **en dernier** évitent que la route racine ou la 404 ne capturent tout.

---

## Variante J+30 (fading)

**Même app, contraintes ajoutées — de mémoire, en 30 minutes, sans rouvrir ce corrigé ni le module 14 :**

1. Ajoute un **query param `tri`** sur `/sorties` (`?tri=budget` ou `?tri=titre`) reçu comme `input<string>()` dans `SortiesComponent`, et trie la liste en conséquence (`computed`).
2. Ajoute **deux boutons** « Trier par budget » / « Trier par titre » qui modifient le query param **sans recharger** la page (`router.navigate([], { queryParams: { tri }, queryParamsHandling: 'merge' })`).
3. Dans le détail, affiche un **badge « Hors budget »** si `sortie().budget > 50` (calcul dans un `computed`).

**Critère de réussite :** l'URL reflète le tri (`/sorties?tri=budget`), le tri survit à un rafraîchissement de la page, et le détail reste pré-chargé par le resolver.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      app.routes.ts
      app.config.ts
      sortie.service.ts
      sortie.resolver.ts
      pages/
        accueil/accueil.component.ts
        sorties/sorties.component.ts
        sortie-detail/sortie-detail.component.ts
        not-found/not-found.component.ts
```

**Différences par rapport au lab :**
- `SortieService.getSortie()` passera à `HttpClient` (retour `Observable<Sortie>` / `Promise`) — le `ResolveFn` supporte déjà ces types, seul le service change (module 18).
- `/sorties/:id` sera **protégé** par un guard (membre connecté) et les pages seront **lazy-loaded** (`loadComponent`) — module 15.
- Les données en dur du service disparaissent au profit de l'API TribuZen.

**Commit cible :**
```
feat(routing): navigation 3 écrans — provideRouter, :id en input(), resolver sortie
```
