# Lab 15 — Guards et lazy loading

> **Outcome :** à la fin, tu sais protéger une route avec un `CanActivateFn` qui redirige via un `UrlTree`, empêcher de quitter un formulaire modifié avec un `CanDeactivateFn`, et charger une section à la demande avec `loadComponent` + prefetch — en vérifiant le tout dans le navigateur.
> **Vrai outil :** Angular 19 + Angular CLI (`ng serve`), avec l'onglet **Network** des DevTools comme oracle (voir le chunk lazy se télécharger) et l'URL/redirection comme oracle visuel.
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu sécurises et allèges l'**espace famille** de TribuZen. Cahier des charges **exact** :

1. Une route `/famille/edition` accessible **seulement si connecté**. Un visiteur non connecté est **redirigé** vers `/connexion?retour=/famille/edition` (pas un `false` muet).
2. L'écran d'édition demande **confirmation avant de le quitter** si le formulaire a été modifié (`CanDeactivateFn`).
3. La route `/famille/edition` est **lazy-loadée** avec `loadComponent` (son code ne part **pas** dans le bundle principal).
4. Un `SessionService` **générique** (un simple signal `connecté` on/off + boutons connexion/déconnexion) — **pas** de vrai JWT, c'est le module 25.
5. Le prefetch est activé : `withPreloading(PreloadAllModules)` dans `app.config.ts`.

**Oracle attendu :**
- Non connecté + `/famille/edition` tapée → l'URL bascule sur `/connexion?retour=...`.
- Connecté → l'écran d'édition s'ouvre ; tape du texte puis clique un lien → `confirm()` apparaît.
- Onglet **Network** filtré sur JS → un chunk du type `famille-edition-*.js` se charge à part (pas dans `main-*.js`).

**Pas de gap-fill** — tu écris les guards, le service et la config à partir du starter ci-dessous.

### Starter minimal

Crée un projet (ou réutilise celui du module 14) :

```bash
ng new tribuzen-guards --standalone --routing --style=css
cd tribuzen-guards
ng serve
```

Génère les fichiers de départ avec le CLI, puis complète-les :

```bash
ng generate service session
ng generate guard guards/session --functional
ng generate component pages/connexion
ng generate component famille/famille-edition
```

> `--functional` est **important** : il génère un guard **fonction** (`CanActivateFn`), pas une classe. Si le CLI propose un menu, choisis `CanActivate`.

---

## Étapes (en friction)

1. **`SessionService`** — un `signal(false)` privé `connecte`, plus `estConnecte()`, `connecter()`, `deconnecter()`. `providedIn: 'root'`.
2. **`ConnexionComponent`** — deux boutons : « Se connecter » appelle `session.connecter()` puis `router.navigate(...)` vers le `retour` (lis-le via `ActivatedRoute` ou un `input()`), et « Se déconnecter ».
3. **`sessionGuard` (`CanActivateFn`)** — injecte `SessionService` + `Router`. Connecté → `true`. Sinon → `router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } })`.
4. **`modifsGuard` (`CanDeactivateFn`)** — définis une interface `PeutEtreQuitte { modificationsNonEnregistrees(): boolean }`. Si le composant a des modifs → `return confirm(...)`, sinon `true`.
5. **`FamilleEditionComponent`** — `implements PeutEtreQuitte` : un `signal` `formulaireModifie`, passé à `true` sur `(input)`, remis à `false` sur « Enregistrer ».
6. **`app.routes.ts`** — `/`, `/connexion`, puis `/famille/edition` en `loadComponent`, avec `canActivate: [sessionGuard]` **et** `canDeactivate: [modifsGuard]`.
7. **`app.config.ts`** — `provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules))`.
8. **Vérifie les 3 oracles** ci-dessus (redirection, confirm, chunk séparé dans Network).

---

## Corrigé complet commenté

```typescript
// session.service.ts — service de session GÉNÉRIQUE (le vrai JWT = module 25)
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  // interrupteur en mémoire — remplace le vrai état d'auth pour ce lab
  private connecte = signal(false);

  estConnecte() { return this.connecte(); }
  connecter()   { this.connecte.set(true); }
  deconnecter() { this.connecte.set(false); }
}
```

```typescript
// guards/session.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

// --- Garde d'ENTRÉE : (route, state) => true | UrlTree ---
export const sessionGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService); // inject() dispo dans un guard fonctionnel
  const router = inject(Router);

  if (session.estConnecte()) {
    return true;                           // connecté → on laisse passer
  }

  // pas connecté → on RENVOIE un UrlTree (= ordre de redirection).
  // state.url = l'URL demandée ; on la range dans ?retour pour y revenir après login.
  return router.createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};

// --- Contrat que le composant protégé doit respecter ---
export interface PeutEtreQuitte {
  modificationsNonEnregistrees(): boolean;
}

// --- Garde de SORTIE : générique sur le type du composant quitté ---
export const modifsGuard: CanDeactivateFn<PeutEtreQuitte> = (composant) => {
  if (composant.modificationsNonEnregistrees()) {
    // confirm() renvoie true/false → sert directement de verdict de navigation
    return confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?');
  }
  return true; // rien à sauver → sortie libre
};
```

```typescript
// famille/famille-edition.component.ts — respecte le contrat PeutEtreQuitte
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeutEtreQuitte } from '../guards/session.guard';

@Component({
  selector: 'app-famille-edition',
  imports: [RouterLink],
  template: `
    <h1>Éditer la sortie</h1>
    <!-- toute frappe marque le formulaire comme modifié -->
    <input (input)="formulaireModifie.set(true)" placeholder="Titre de la sortie" />
    <button (click)="enregistrer()">Enregistrer</button>
    <!-- lien de sortie : déclenchera le CanDeactivateFn si formulaire modifié -->
    <a routerLink="/">Retour accueil</a>
  `,
})
export class FamilleEditionComponent implements PeutEtreQuitte {
  formulaireModifie = signal(false);

  // le CanDeactivateFn appelle cette méthode via le contrat PeutEtreQuitte
  modificationsNonEnregistrees(): boolean {
    return this.formulaireModifie();
  }

  enregistrer() {
    // après sauvegarde : plus rien à protéger → la sortie devient libre
    this.formulaireModifie.set(false);
  }
}
```

```typescript
// pages/connexion.component.ts
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-connexion',
  template: `
    <h1>Connexion</h1>
    <button (click)="seConnecter()">Se connecter</button>
    <button (click)="session.deconnecter()">Se déconnecter</button>
  `,
})
export class ConnexionComponent {
  protected session = inject(SessionService);
  private router = inject(Router);

  // ?retour=... arrive comme input() grâce à withComponentInputBinding() (module 14)
  retour = input<string>();

  seConnecter() {
    this.session.connecter();
    // revient à l'URL demandée avant la redirection, sinon à l'accueil
    this.router.navigateByUrl(this.retour() ?? '/');
  }
}
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
    // loadComponent → chunk séparé, téléchargé à la 1re navigation (visible dans Network)
    loadComponent: () =>
      import('./famille/famille-edition.component').then(m => m.FamilleEditionComponent),
    canActivate: [sessionGuard],   // n'entre que connecté (sinon → /connexion)
    canDeactivate: [modifsGuard],  // ne sort pas sans confirmer si modifié
    title: 'Éditer la sortie',
  },
  { path: '**', component: AccueilComponent },
];
```

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),      // ?retour → input() dans ConnexionComponent
      withPreloading(PreloadAllModules), // prefetch des chunks lazy en arrière-plan
    ),
  ],
};
```

**Pourquoi ce corrigé est correct :**
- Le guard renvoie un **`UrlTree`** et non `false` : la redirection est explicite et mémorise l'URL demandée dans `?retour`. C'est le réflexe attendu en review ESN.
- `CanDeactivateFn<PeutEtreQuitte>` s'appuie sur une **interface-contrat**, pas sur un type concret : le guard est réutilisable sur tout composant qui implémente `modificationsNonEnregistrees()`.
- `loadComponent` sort le code de l'édition dans un **chunk séparé** — observable dans l'onglet Network. Aucun `import` statique de `FamilleEditionComponent` ailleurs (sinon le lazy serait annulé).
- `SessionService` reste un simple signal : le lab câble la **mécanique** guard + lazy, pas l'authentification réelle (module 25).

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées, en 25 minutes, sans rouvrir ce corrigé ni le module 15 :**

1. Ajoute une **guard factory** `requiertRole(role: string): CanActivateFn` et une route `/famille/admin` protégée par `canActivate: [sessionGuard, requiertRole('parent')]`. Ajoute `role()` à `SessionService`.
2. Regroupe `/famille/edition` et `/famille/admin` dans un fichier `famille/famille.routes.ts` chargé via **`loadChildren`** (au lieu de deux `loadComponent`), et bloque toute la section avec un **`CanMatchFn`** `membreMatchGuard` — vérifie dans Network que le chunk `famille` **n'est pas** téléchargé quand tu n'es pas membre.

**Critère de réussite :** un non-membre ne voit jamais partir le chunk `famille` (canMatch avant loadChildren) ; un membre sans le rôle `parent` est redirigé vers `/acces-refuse` sur `/famille/admin`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      app.routes.ts
      app.config.ts
      session.service.ts
      guards/
        session.guard.ts        ← CanActivateFn + CanDeactivateFn
      famille/
        famille-edition.component.ts
      pages/
        connexion.component.ts
```

**Différences par rapport au lab :**
- `SessionService` sera remplacé par le vrai `AuthService` connecté au back (token JWT, `inject(HttpClient)`) au **module 25** — l'interface des guards ne change pas, seule la source de `estConnecte()` change.
- Le `confirm()` natif deviendra une **boîte de dialogue Angular Material** (module 21) pour rester cohérent avec le design system.
- Le prefetch `PreloadAllModules` pourra devenir une **stratégie sur mesure** (précharger seulement l'espace famille) une fois RxJS acquis (modules 16-17).

**Commit cible :**
```
feat(famille): guards session + lazy loading de l'espace famille (canActivate/canDeactivate, loadComponent, prefetch)
```
