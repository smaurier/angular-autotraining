---
titre: Guards et lazy loading — protéger et charger les routes à la demande
cours: 03-angular
notions: [CanActivateFn, CanMatchFn, CanDeactivateFn, createUrlTree et UrlTree, redirection depuis un guard, guard factory, canActivate vs canMatch, ordre canMatch avant canActivate, loadComponent, loadChildren, code splitting par route, prefetch avec withPreloading, PreloadAllModules, redirectTo statique]
outcomes:
  - sait protéger une route avec un CanActivateFn fonctionnel qui injecte un service et redirige via un UrlTree
  - sait choisir entre canActivate (bloque et redirige) et canMatch (rend la route invisible) et empêcher de quitter une page avec canDeactivate
  - sait charger un composant à la demande avec loadComponent et une section entière avec loadChildren
  - sait précharger les chunks en arrière-plan avec withPreloading(PreloadAllModules) pour une navigation instantanée
prerequis: [modules 00 à 14 du cours 03-angular — jusqu'au routing de base, params et data]
next: 16-rxjs-observables-et-operators
libs: [{ name: "@angular/router", version: "19" }]
tribuzen: front-office TribuZen — protéger l'espace famille (accès membre connecté seulement) et charger les sections lourdes à la demande
last-reviewed: 2026-07
---

# Guards et lazy loading — protéger et charger les routes à la demande

> **Outcomes — tu sauras FAIRE :** protéger une route avec un `CanActivateFn` qui redirige via un `UrlTree`, choisir entre `canActivate` / `canMatch` / `canDeactivate`, et charger le code à la demande avec `loadComponent` / `loadChildren` (+ prefetch).
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre la **protection des routes** (guards fonctionnels `CanActivateFn` / `CanMatchFn` / `CanDeactivateFn`, redirection par `UrlTree`, guard factory) et le **chargement paresseux** (`loadComponent`, `loadChildren`, prefetch avec `withPreloading`). C'est tout. Le guard reste **générique** (un service `SessionService` simulé qui dit « connecté / pas connecté ») : l'**authentification réelle** (JWT, token, intercepteur) est le **module 25**. Les guards renvoient ici du **synchrone** (`boolean` / `UrlTree`) — la version qui attend un `Observable` (RxJS) et les stratégies de preloading sur mesure viennent aux **modules 16-17**. Le `@defer` (lazy dans le template) a été vu au **module 08** ; ici on parle du lazy au niveau **route**.

## 1. Cas concret d'abord

TribuZen a maintenant un **espace famille** : `/famille/edition` permet à un parent de modifier le budget et la liste des participants d'une sortie. Deux problèmes concrets sont remontés en review.

**Problème 1 — tout le monde entre.** Aujourd'hui, n'importe qui qui tape l'URL `/famille/edition` dans la barre d'adresse arrive sur l'écran d'édition, même sans être connecté. Il n'y a **aucun filtre** : la route est ouverte à tous.

```typescript
// app.routes.ts — AVANT (route non protégée)
export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full' },
  // n'importe qui atteint cette route, connecté ou non
  { path: 'famille/edition', component: FamilleEditionComponent },
];
```

**Problème 2 — tout le code se télécharge au démarrage.** L'écran d'édition est lourd (éditeur de budget, sélecteur de participants). Pourtant son code part dans le **bundle principal**, téléchargé dès l'ouverture de l'accueil — même par un visiteur qui n'ira jamais dans l'espace famille. Le premier chargement est lent pour rien.

Ce dont TribuZen a besoin : un **garde** à l'entrée de `/famille/edition` qui vérifie que l'utilisateur est connecté et le **redirige vers `/connexion`** sinon ; et un **chargement à la demande** pour que le code de l'édition ne parte que quand on y va vraiment. Ce sont exactement les **guards** et le **lazy loading** du routeur Angular.

---

## 2. Théorie complète, concise

### 2.1 Un guard = une fonction branchée sur une route

Depuis Angular 15, un guard est une **simple fonction** (plus de classe, plus d'interface à implémenter). On la range dans une propriété de la route (`canActivate`, `canMatch`, `canDeactivate`) qui attend un **tableau** de guards. Comme toute fonction exécutée dans un contexte d'injection Angular, un guard peut appeler `inject()` pour récupérer un service ou le `Router`.

Un guard renvoie l'un de ces verdicts :

- `true` → la navigation continue ;
- `false` → la navigation est **annulée silencieusement** (l'utilisateur reste où il est, sans explication) ;
- un `UrlTree` → la navigation est **redirigée** vers cette URL (le bon réflexe pour envoyer vers `/connexion`).

### 2.2 `CanActivateFn` — autoriser ou bloquer l'entrée

`CanActivateFn` est le type d'un garde d'entrée. Sa signature (vérifiée) reçoit le **snapshot** de la route ciblée et l'**état** du routeur (dont l'URL demandée) :

```typescript
// session.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

// (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => ...
export const sessionGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.estConnecte()) {
    return true;                              // laisse passer
  }

  // sinon : redirige vers /connexion en mémorisant l'URL demandée
  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};
```

```typescript
// app.routes.ts
{ path: 'famille/edition', component: FamilleEditionComponent, canActivate: [sessionGuard] }
```

`state.url` contient l'URL que l'utilisateur voulait atteindre : on la range en query param `retour` pour le renvoyer au bon endroit **après** connexion.

### 2.3 `createUrlTree` et `UrlTree` — rediriger proprement

Un `UrlTree` est la **représentation objet d'une URL** que le routeur sait interpréter. On le construit avec `router.createUrlTree(commands, extras)` — mêmes arguments que `router.navigate(...)` (un tableau de segments + des options comme `queryParams`). Renvoyer un `UrlTree` depuis un guard **est** l'ordre de redirection : pas besoin d'appeler `navigate()` soi-même.

> **Règle :** ne renvoie **jamais** `false` tout court pour un accès refusé. `false` bloque sans rien dire ; un `UrlTree` renvoie vers un écran explicite (`/connexion`, `/acces-refuse`).

### 2.4 `CanMatchFn` — rendre la route carrément invisible

`CanMatchFn` s'exécute **avant** `canActivate`, au moment où le routeur décide si la route **correspond** à l'URL. Sa signature (vérifiée) reçoit la **définition** de route et les **segments** d'URL :

```typescript
import { CanMatchFn, Route, UrlSegment } from '@angular/router';

// (route: Route, segments: UrlSegment[]) => boolean | UrlTree
export const membreMatchGuard: CanMatchFn = (route, segments) => {
  return inject(SessionService).estMembre();
};
```

Si un `canMatch` renvoie `false`, le routeur **passe à la route suivante** dans le tableau, comme si celle-ci n'existait pas. Ça permet de servir **deux composants différents sur le même path** selon le profil :

```typescript
export const routes: Routes = [
  // si membre → tableau de bord complet
  { path: 'famille', canMatch: [membreMatchGuard], component: FamilleTableauComponent },
  // sinon → cette route (même path) prend le relais : page d'invitation
  { path: 'famille', component: FamilleInvitationComponent },
];
```

**Différence à retenir :** `canActivate` = la route existe mais l'accès est **refusé/redirigé** (l'utilisateur voit qu'on l'a bloqué). `canMatch` = la route **n'existe pas** pour cet utilisateur (aucune redirection, on tente la suivante). `canMatch` est aussi le bon endroit pour bloquer avant même de **charger** un chunk lazy (§2.8) : inutile de télécharger le code d'une section interdite.

### 2.5 `CanDeactivateFn` — empêcher de quitter une page

`CanDeactivateFn<T>` protège la **sortie** d'une route : typiquement un formulaire avec des modifications non enregistrées. Il est **générique** sur le type du composant quitté, qu'il reçoit en premier argument.

```typescript
import { CanDeactivateFn } from '@angular/router';

// contrat que le composant protégé doit respecter
export interface PeutEtreQuitte {
  modificationsNonEnregistrees(): boolean;
}

export const modifsNonEnregistreesGuard: CanDeactivateFn<PeutEtreQuitte> = (composant) => {
  if (composant.modificationsNonEnregistrees()) {
    // confirm renvoie true/false → sert directement de verdict
    return confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?');
  }
  return true;
};
```

```typescript
// le composant expose la méthode attendue par le contrat
@Component({ /* ... */ })
export class FamilleEditionComponent implements PeutEtreQuitte {
  formulaireModifie = signal(false);
  modificationsNonEnregistrees(): boolean {
    return this.formulaireModifie();
  }
}

// route
{
  path: 'famille/edition',
  component: FamilleEditionComponent,
  canActivate: [sessionGuard],
  canDeactivate: [modifsNonEnregistreesGuard],
}
```

### 2.6 Guard factory — un guard **configurable**

Quand la logique dépend d'un paramètre (un rôle attendu, une feature), on écrit une **fonction qui retourne un guard**. C'est le pattern *guard factory* : elle capture son argument par closure et renvoie un `CanActivateFn`.

```typescript
export function requiertRole(role: string): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (session.role() === role) return true;
    return router.createUrlTree(['/acces-refuse']);
  };
}

// utilisation : le même guard, deux configs
{ path: 'famille/admin', canActivate: [sessionGuard, requiertRole('parent')], component: AdminComponent }
```

Quand plusieurs guards sont listés, ils s'exécutent **dans l'ordre** ; dès que l'un renvoie `false` ou un `UrlTree`, les suivants **ne s'exécutent pas**.

### 2.7 `loadComponent` — charger UN composant à la demande

Le lazy loading, c'est du **code splitting** au niveau de la route : Angular sort le code de la route dans un **fichier JavaScript séparé** (un *chunk*) qui n'est téléchargé qu'à la première navigation vers cette route. Pour un composant isolé, on remplace `component:` par `loadComponent:` + un **import dynamique** :

```typescript
// ❌ import statique en haut du fichier → part dans le bundle principal
import { FamilleEditionComponent } from './famille/famille-edition.component';
{ path: 'famille/edition', component: FamilleEditionComponent }

// ✅ import dynamique → chunk séparé, chargé à la navigation
{
  path: 'famille/edition',
  loadComponent: () =>
    import('./famille/famille-edition.component').then(m => m.FamilleEditionComponent),
}
```

Le `.then(m => m.FamilleEditionComponent)` est nécessaire car un fichier peut exporter plusieurs symboles : on désigne lequel est le composant de la route.

### 2.8 `loadChildren` — charger UNE SECTION entière

Pour une section cohérente (tout l'espace famille, tout l'admin), on regroupe ses routes dans un **fichier de routes** et on le charge d'un bloc avec `loadChildren`. Tous les composants de la section partent alors dans **le même chunk**.

```typescript
// app.routes.ts
{
  path: 'famille',
  // charge un tableau de Routes, pas un composant
  loadChildren: () => import('./famille/famille.routes').then(m => m.familleRoutes),
  canMatch: [membreMatchGuard],   // vérifié AVANT de télécharger le chunk
}
```

```typescript
// famille/famille.routes.ts
import { Routes } from '@angular/router';

export const familleRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./famille-layout.component').then(m => m.FamilleLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./famille-accueil.component').then(m => m.FamilleAccueilComponent) },
      { path: 'edition', loadComponent: () => import('./famille-edition.component').then(m => m.FamilleEditionComponent) },
    ],
  },
];
```

Les paths des enfants sont **relatifs** au path parent : sous `path: 'famille'`, l'enfant `'edition'` répond à `/famille/edition`. Règle pratique : `loadChildren` pour une **section** (plusieurs écrans liés), `loadComponent` pour une **page isolée**.

### 2.9 Prefetch — précharger les chunks en arrière-plan

Par défaut un chunk lazy n'est téléchargé **qu'au clic**, ce qui ajoute une micro-attente à la première navigation. On peut le **précharger en arrière-plan** dès que l'app est interactive, avec la *feature* `withPreloading`. La stratégie prête à l'emploi `PreloadAllModules` précharge **tous** les chunks lazy après le démarrage :

```typescript
// app.config.ts
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
```

Résultat : le bundle principal se charge → l'accueil devient interactif → Angular télécharge en tâche de fond les chunks `famille`, `admin`… La navigation suivante est **instantanée**, sans alourdir le premier rendu. (Une stratégie **sur mesure** — précharger seulement certaines routes, ou attendre quelques secondes — s'appuie sur RxJS et relève des modules 16-17.)

### 2.10 `redirectTo` statique (rappel utile)

À ne pas confondre avec la redirection **d'un guard** : `redirectTo` dans la config de route redirige un **path** vers un autre, sans condition. Il exige `pathMatch` (vu au module 14).

```typescript
// /espace-famille redirige toujours vers /famille
{ path: 'espace-famille', redirectTo: 'famille', pathMatch: 'full' }
```

Guard vs `redirectTo` : `redirectTo` est **inconditionnel** (toujours), un guard décide **selon une logique** (connecté ou non). *(Angular 18+ accepte aussi un `redirectTo` **fonctionnel** — une fonction qui renvoie une URL/`UrlTree` — mais le cas courant reste le guard ; à vérifier via Context7 si tu l'utilises.)*

---

## 3. Worked examples

### Exemple 1 — Protéger l'espace famille de TribuZen

Objectif : `/famille/edition` accessible **seulement** connecté, sinon redirection vers `/connexion?retour=...` ; et confirmation avant de quitter si le formulaire est modifié.

```typescript
// session.service.ts — service GÉNÉRIQUE (le vrai JWT = module 25)
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  // état simulé : en vrai, alimenté par le login (module 25)
  private connecte = signal(false);

  estConnecte() { return this.connecte(); }
  estMembre()   { return this.connecte(); }
  role()        { return 'parent'; }

  // utilisé par l'écran /connexion du lab
  connecter()   { this.connecte.set(true); }
  deconnecter() { this.connecte.set(false); }
}
```

```typescript
// guards/session.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

// --- Entrée : connecté ou redirection ---
export const sessionGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.estConnecte()) return true;

  // UrlTree = ordre de redirection ; on mémorise l'URL demandée
  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};

// --- Sortie : confirmer si modifications non enregistrées ---
export interface PeutEtreQuitte {
  modificationsNonEnregistrees(): boolean;
}

export const modifsGuard: CanDeactivateFn<PeutEtreQuitte> = (composant) => {
  if (composant.modificationsNonEnregistrees()) {
    return confirm('Modifications non enregistrées. Quitter quand même ?');
  }
  return true;
};
```

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil.component';
import { ConnexionComponent } from './pages/connexion.component';
import { sessionGuard, modifsGuard } from './guards/session.guard';

export const routes: Routes = [
  { path: '', component: AccueilComponent, pathMatch: 'full', title: 'TribuZen' },
  { path: 'connexion', component: ConnexionComponent, title: 'Connexion' },
  {
    path: 'famille/edition',
    loadComponent: () =>
      import('./famille/famille-edition.component').then(m => m.FamilleEditionComponent),
    canActivate: [sessionGuard],   // ne rentre que connecté
    canDeactivate: [modifsGuard],  // ne sort pas sans confirmer
    title: 'Éditer la sortie',
  },
  { path: '**', component: AccueilComponent },
];
```

```typescript
// famille/famille-edition.component.ts — respecte le contrat PeutEtreQuitte
import { Component, signal } from '@angular/core';
import { PeutEtreQuitte } from '../guards/session.guard';

@Component({
  selector: 'app-famille-edition',
  template: `
    <h1>Éditer la sortie</h1>
    <input (input)="formulaireModifie.set(true)" placeholder="Titre de la sortie" />
    <button (click)="enregistrer()">Enregistrer</button>
  `,
})
export class FamilleEditionComponent implements PeutEtreQuitte {
  formulaireModifie = signal(false);

  // le CanDeactivateFn appelle cette méthode via le contrat
  modificationsNonEnregistrees(): boolean {
    return this.formulaireModifie();
  }

  enregistrer() {
    this.formulaireModifie.set(false); // plus rien à sauver → sortie libre
  }
}
```

Déroulé : un visiteur non connecté qui tape `/famille/edition` est renvoyé sur `/connexion?retour=%2Ffamille%2Fedition`. Une fois connecté, il édite ; s'il tente de partir après avoir tapé du texte, `confirm()` s'affiche. Et le code de l'édition n'a été téléchargé qu'à ce moment-là (`loadComponent`).

### Exemple 2 — Lazy loading d'une section + prefetch

Objectif : sortir tout l'espace famille dans son propre chunk via `loadChildren`, le bloquer par `canMatch` **avant** de le télécharger, et précharger en arrière-plan.

```typescript
// famille/famille.routes.ts — les routes de la section (un seul chunk)
import { Routes } from '@angular/router';

export const familleRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./famille-layout.component').then(m => m.FamilleLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./famille-accueil.component').then(m => m.FamilleAccueilComponent),
        title: 'Espace famille',
      },
      {
        path: 'edition',
        loadComponent: () =>
          import('./famille-edition.component').then(m => m.FamilleEditionComponent),
        title: 'Éditer la sortie',
      },
    ],
  },
];
```

```typescript
// guards/membre-match.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { SessionService } from '../session.service';

// canMatch : si false, Angular ne charge MÊME PAS le chunk famille
export const membreMatchGuard: CanMatchFn = (route, segments) => {
  return inject(SessionService).estMembre();
};
```

```typescript
// app.routes.ts (extrait)
{
  path: 'famille',
  loadChildren: () => import('./famille/famille.routes').then(m => m.familleRoutes),
  canMatch: [membreMatchGuard],   // vérifié AVANT le téléchargement du chunk
}
```

```typescript
// app.config.ts — prefetch de tous les chunks en arrière-plan
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
```

Pour un membre, le chunk `famille` est préchargé pendant qu'il lit l'accueil : cliquer sur « Espace famille » ouvre l'écran **sans latence**. Pour un non-membre, `canMatch` renvoie `false` et le chunk n'est **jamais** téléchargé — code économisé **et** protégé.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Renvoyer `false` au lieu d'un `UrlTree`

```typescript
// ❌ bloque sans rien dire : l'utilisateur reste coincé, sans comprendre
export const guard: CanActivateFn = () => inject(SessionService).estConnecte();

// ✅ redirige vers un écran explicite
export const guard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.estConnecte()) return true;
  return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};
```

`false` annule la navigation en silence. Pour un accès refusé, renvoie **toujours** un `UrlTree`.

### PIÈGE #2 — Confondre `canActivate` et `canMatch`

`canActivate` s'exécute **après** que la route a matché : la route existe, l'accès est refusé/redirigé. `canMatch` s'exécute **pendant** le matching : `false` fait passer à la route suivante, comme si celle-ci n'existait pas. Pour bloquer le **téléchargement d'un chunk lazy** interdit, c'est `canMatch` qu'il faut (il s'exécute avant `loadChildren`), pas `canActivate`.

### PIÈGE #3 — Oublier `.then(m => m.NomDuComposant)`

```typescript
// ❌ loadComponent attend une Promise<Type de composant>, pas le module entier
{ path: 'x', loadComponent: () => import('./x.component') }

// ✅ on extrait le symbole exporté
{ path: 'x', loadComponent: () => import('./x.component').then(m => m.XComponent) }
```

Un fichier peut exporter plusieurs choses : il faut **désigner** le composant (ou le tableau de routes pour `loadChildren`).

### PIÈGE #4 — Garder un `import` statique en plus du `loadComponent`

```typescript
// ❌ l'import statique en haut du fichier ANNULE le code splitting :
//    le composant repart dans le bundle principal, même avec loadComponent
import { FamilleEditionComponent } from './famille/famille-edition.component';
{ path: 'famille/edition',
  loadComponent: () => import('./famille/famille-edition.component').then(m => m.FamilleEditionComponent) }
```

Si un composant est lazy, **aucun** autre fichier ne doit l'importer statiquement, sinon il est happé dans le bundle initial et le lazy ne sert plus à rien. Vérifie la taille du chunk avec `ng build`.

### PIÈGE #5 — Muter une classe de guard « à l'ancienne »

```typescript
// ❌ ancien monde : classe + Injectable + canActivate() (déprécié en Angular 19)
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate() { /* ... */ }
}

// ✅ Angular 19 : une simple fonction typée CanActivateFn, qui utilise inject()
export const sessionGuard: CanActivateFn = () => { /* ... */ };
```

En Angular 19, les guards sont **fonctionnels**. Les guards-classes sont dépréciés : on écrit une fonction et on injecte avec `inject()`.

### PIÈGE #6 — Croire que `redirectTo` remplace un guard

```typescript
// redirectTo est INCONDITIONNEL : redirige toujours, quel que soit l'utilisateur
{ path: 'espace-famille', redirectTo: 'famille', pathMatch: 'full' }

// un guard décide SELON une logique (connecté ? membre ?)
{ path: 'famille/edition', component: FamilleEditionComponent, canActivate: [sessionGuard] }
```

`redirectTo` = alias d'URL toujours actif. Un guard = décision conditionnelle. Ce ne sont pas les mêmes outils.

---

## 5. Ancrage TribuZen

Guards et lazy loading forment la **couche de sécurité d'accès et de performance** du front-office TribuZen. Toute route sensible (espace famille, admin) passe par un guard ; toute section lourde est chargée à la demande.

**`sessionGuard`** (Exemple 1) — le garde d'entrée générique de l'espace famille : connecté → passe, sinon redirection `/connexion?retour=...`. Il s'appuie sur un `SessionService` **simulé** ; le vrai branchement JWT est le **module 25**.

**`modifsGuard`** (Exemple 1) — protège la sortie de l'écran d'édition d'une sortie : pas de perte de saisie accidentelle.

**`famille.routes.ts` + `membreMatchGuard`** (Exemple 2) — tout l'espace famille dans un chunk séparé, invisible (et non téléchargé) pour un non-membre grâce à `canMatch`, préchargé en fond pour un membre via `PreloadAllModules`.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      app.routes.ts                       ← routes + canActivate/canMatch + loadChildren
      app.config.ts                       ← provideRouter + withPreloading(PreloadAllModules)
      session.service.ts                  ← service de session GÉNÉRIQUE (JWT réel = module 25)
      guards/
        session.guard.ts                  ← CanActivateFn + CanDeactivateFn
        membre-match.guard.ts             ← CanMatchFn
      famille/
        famille.routes.ts                 ← routes lazy de la section
        famille-layout.component.ts
        famille-accueil.component.ts
        famille-edition.component.ts      ← implements PeutEtreQuitte
```

> Le vrai contrôle d'accès (token JWT, `inject(AuthService)` connecté au back, intercepteur HTTP) est le **module 25**. Ici, `SessionService` est un interrupteur en mémoire : on câble la **mécanique** guard + lazy, pas l'authentification réelle.

---

## 6. Points clés

1. Un guard Angular 19 est une **fonction** (`CanActivateFn` / `CanMatchFn` / `CanDeactivateFn`) rangée dans un tableau sur la route ; elle peut `inject()` services et `Router`.
2. Un guard renvoie `true` (passe), `false` (bloque en silence — à éviter) ou un **`UrlTree`** (redirige). Pour un accès refusé, renvoie un `UrlTree` via `router.createUrlTree(...)`.
3. `canActivate` refuse/redirige une route qui existe ; `canMatch` s'exécute **avant** et rend la route **invisible** (`false` → route suivante), y compris avant de charger un chunk lazy.
4. `CanDeactivateFn<T>` reçoit le composant quitté et empêche de partir (formulaire modifié → `confirm`).
5. Une **guard factory** est une fonction qui retourne un `CanActivateFn` configuré (`requiertRole('parent')`) ; les guards d'une route s'exécutent en série, le premier qui bloque arrête la chaîne.
6. `loadComponent: () => import('...').then(m => m.X)` charge **un composant** à la demande ; `loadChildren: () => import('...').then(m => m.routes)` charge **une section** entière dans un chunk.
7. Un `import` **statique** du composant ailleurs annule le lazy : le composant repart dans le bundle principal.
8. `provideRouter(routes, withPreloading(PreloadAllModules))` précharge les chunks en arrière-plan → navigation instantanée sans alourdir le premier rendu.

---

## 7. Seeds Anki

```
En Angular 19, sous quelle forme écrit-on un guard de route ?|Une simple fonction typée CanActivateFn / CanMatchFn / CanDeactivateFn, rangée dans un tableau sur la route. Plus de classe ni d'interface ; elle peut appeler inject().
Que peut renvoyer un CanActivateFn et que signifie chaque valeur ?|true = la navigation passe ; false = elle est annulée silencieusement (à éviter) ; un UrlTree = redirection vers cette URL (via router.createUrlTree).
Pourquoi renvoyer un UrlTree plutôt que false dans un guard ?|false bloque sans explication, l'utilisateur reste coincé. Un UrlTree (router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } })) redirige vers un écran explicite en mémorisant l'URL demandée.
Quelle est la différence entre canActivate et canMatch ?|canActivate s'exécute après le matching : la route existe mais l'accès est refusé/redirigé. canMatch s'exécute pendant le matching : false fait passer à la route suivante comme si elle n'existait pas — et évite même de télécharger un chunk lazy interdit.
À quoi sert CanDeactivateFn et que reçoit-il ?|À empêcher de quitter une route (ex : formulaire modifié). Il est générique CanDeactivateFn<T> et reçoit le composant quitté en premier argument, dont il interroge une méthode (ex : modificationsNonEnregistrees()).
Comment charge-t-on un composant à la demande dans une route ?|Avec loadComponent : () => import('./x.component').then(m => m.XComponent) au lieu de component:. Angular crée un chunk séparé téléchargé à la première navigation.
Quelle différence entre loadComponent et loadChildren ?|loadComponent charge UN composant (une page isolée) dans un chunk. loadChildren charge un tableau de Routes (une section entière : plusieurs écrans) dans un même chunk. Choisir loadChildren pour une section cohérente.
Qu'est-ce qui annule silencieusement le lazy loading d'un composant ?|Un import statique du même composant ailleurs dans le code : il repart alors dans le bundle principal malgré loadComponent. Un composant lazy ne doit être importé nulle part en statique.
Comment précharger les chunks lazy en arrière-plan ?|provideRouter(routes, withPreloading(PreloadAllModules)) : après le démarrage, Angular télécharge tous les chunks lazy en tâche de fond → navigation suivante instantanée, sans alourdir le premier rendu.
Écrire une guard factory qui exige un rôle.|Une fonction qui retourne un CanActivateFn : function requiertRole(role: string): CanActivateFn { return () => inject(SessionService).role() === role ? true : inject(Router).createUrlTree(['/acces-refuse']); }. Usage : canActivate: [requiertRole('parent')].
```

---

## Pont vers le lab

> Lab associé : `labs/lab-15-guards-et-lazy-loading/README.md`. Protéger l'espace famille TribuZen avec un `CanActivateFn` (redirection `UrlTree`), lazy-loader la section avec `loadComponent`/`loadChildren` et prefetch — dev server Angular CLI + onglet Network comme oracle, corrigé commenté intégral.
