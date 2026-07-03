# Lab 08 — `@defer` et zoneless : différer la page détail d'une sortie

> **Outcome :** à la fin, tu sais différer des composants lourds avec `@defer` (triggers `on viewport` / `on idle` / `on interaction`, `@placeholder` / `@loading` / `@error`, `prefetch`), activer le mode **zoneless** sur une app Angular 19, et diagnostiquer puis réparer un composant qui ne se met plus à jour — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud) + l'onglet **Network** des DevTools pour voir les chunks se charger à la demande.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `SortieDetailComponent`, la **page détail d'une sortie** TribuZen, et tu passes son application en **zoneless**. Cahier des charges **exact** :

1. En haut de page, toujours visible et dans le bundle initial : un titre (`signal`) et une date (`signal`).
2. Une **carte du lieu** (`CarteLieuComponent`) différée `on viewport`, avec `prefetch on idle`. Sous-blocs : `@placeholder`, `@loading (after 100ms; minimum 300ms)`, `@error`.
3. Une **galerie photos** (`GaleriePhotosComponent`) différée `on idle`, avec un `@placeholder`.
4. Un **panneau d'organisation** (`PanneauOrganisationComponent`) différé `on interaction` sur un bouton (variable de référence `#btnOrga`), avec `prefetch on hover(btnOrga)` et un `@placeholder`.
5. Un **compte à rebours** (`CompteAReboursComponent`) : un `signal` `minutes` initialisé à `60`, décrémenté chaque seconde par un `setInterval` (pour le lab, tick d'**1 s** au lieu d'1 min, pour voir l'effet vite).
6. L'application est bootstrappée en **zoneless** : `provideExperimentalZonelessChangeDetection()` dans `main.ts`, et `polyfills` vidé dans `angular.json`.

**Contraintes techniques :**
- Les trois composants différés ne doivent apparaître **que** dans des blocs `@defer` (sinon Angular ne peut pas les déférer).
- Aucun état de template ne doit être une propriété non-signal modifiée dans du code async : tout passe par `signal`.
- Pour observer l'effet : dans l'onglet **Network**, tu dois voir des **chunks séparés** se charger au scroll / au clic, pas au chargement initial.

**Pas de gap-fill** — tu écris les composants complets à partir des starters ci-dessous.

### Starter minimal

Crée le projet et les composants avec l'Angular CLI :

```bash
ng new tribuzen-labs --style=css
cd tribuzen-labs
ng generate component sortie-detail
ng generate component carte-lieu
ng generate component galerie-photos
ng generate component panneau-organisation
ng generate component compte-a-rebours
```

Pour ce lab, les trois composants « lourds » sont simulés par un rendu simple (on n'a pas besoin d'une vraie librairie de carte : ce qu'on observe, c'est le **chunk séparé**, pas le poids réel). Exemple pour `CarteLieuComponent` :

```typescript
// carte-lieu.component.ts — stand-in "lourd"
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-carte-lieu',
  standalone: true,
  template: `<div class="carte">🗺️ Carte de : {{ lieu() }}</div>`,
})
export class CarteLieuComponent {
  lieu = input.required<string>();
}
```

Squelette de la page à compléter (`src/app/sortie-detail/sortie-detail.component.ts`) :

```typescript
import { Component, signal } from '@angular/core';
import { CarteLieuComponent } from '../carte-lieu/carte-lieu.component';
import { GaleriePhotosComponent } from '../galerie-photos/galerie-photos.component';
import { PanneauOrganisationComponent } from '../panneau-organisation/panneau-organisation.component';
import { CompteAReboursComponent } from '../compte-a-rebours/compte-a-rebours.component';

@Component({
  selector: 'app-sortie-detail',
  standalone: true,
  imports: [/* à toi : les 4 composants ci-dessus */],
  template: `
    <!-- À construire :
         - titre() + date() (dans le bundle initial)
         - <app-compte-a-rebours />
         - @defer carte (on viewport; prefetch on idle) + placeholder/loading/error
         - @defer galerie (on idle) + placeholder
         - bouton #btnOrga + @defer panneau (on interaction; prefetch on hover) -->
  `,
})
export class SortieDetailComponent {
  // À toi : titre, date, lieu, id (signal)
}
```

Branche `SortieDetailComponent` dans `AppComponent`, lance `ng serve`, ouvre les DevTools (onglet Network) et regarde les chunks.

---

## Étapes (en friction)

1. **Bootstrap zoneless d'abord** — dans `main.ts`, ajoute `provideExperimentalZonelessChangeDetection()` aux providers. Dans `angular.json`, remplace `"polyfills": ["zone.js"]` par `"polyfills": []` pour les cibles `build` **et** `test`.
2. **Écris `CompteAReboursComponent`** avec un `signal` `minutes` (60) décrémenté par `setInterval(…, 1000)` via `update(m => m - 1)`. Lance `ng serve` : le compteur doit descendre **tout seul**. C'est ta preuve que le zoneless marche avec un signal.
3. **Épreuve anti-zone.js** — remplace temporairement `minutes = signal(60)` par `minutes = 60` (propriété simple) et le `update` par `this.minutes = this.minutes - 1`. Recharge : le compteur **reste figé à 60**. Tu viens de voir de tes yeux ce que zone.js masquait. Remets la version signal.
4. **Diffère la carte** — `@defer (on viewport; prefetch on idle)` avec `@placeholder`, `@loading (after 100ms; minimum 300ms)`, `@error`. Le `@placeholder` doit avoir **un seul élément racine**.
5. **Diffère la galerie** — `@defer (on idle)` avec un `@placeholder`.
6. **Diffère le panneau** — un `<button #btnOrga>`, puis `@defer (on interaction(btnOrga); prefetch on hover(btnOrga))` avec un `@placeholder`.
7. **Observe les chunks** — onglet Network, filtre JS. Au chargement, la carte/galerie/panneau ne sont **pas** là. Scrolle → le chunk carte se charge. Survole le bouton → le chunk panneau se précharge. Clique → il s'affiche.
8. **Cas limite placeholder** — mets temporairement deux éléments racines dans le `@placeholder` de la carte et lis l'erreur de build : ça ancre la contrainte « un seul élément racine » pour les triggers viewport/interaction/hover.

---

## Corrigé complet commenté

### `src/main.ts`

```typescript
// main.ts — bootstrap zoneless (Angular 19)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    // Active la détection de changement sans zone.js.
    // En Angular 20+, ce provider s'appelle provideZonelessChangeDetection().
    provideExperimentalZonelessChangeDetection(),
  ],
}).catch(err => console.error(err));
```

```jsonc
// angular.json (extrait) — vider polyfills pour build ET test
"build":  { "options": { "polyfills": [] } },
"test":   { "options": { "polyfills": [] } }
// (auparavant : "polyfills": ["zone.js"] / ["zone.js", "zone.js/testing"])
```

### `src/app/compte-a-rebours/compte-a-rebours.component.ts`

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-compte-a-rebours',
  standalone: true,
  // Lu avec () — sans les parenthèses, {{ minutes }} afficherait la fonction.
  template: `<p>Départ dans {{ minutes() }}</p>`,
})
export class CompteAReboursComponent {
  // signal, PAS une propriété simple : c'est lui qui notifie Angular en zoneless.
  minutes = signal(60);

  constructor() {
    // setInterval n'est plus intercepté par zone.js. C'est le signal (via update)
    // qui prévient Angular à chaque tick → l'écran se met à jour.
    setInterval(() => {
      this.minutes.update(m => (m > 0 ? m - 1 : 0));
    }, 1000);
  }
}
```

### `src/app/sortie-detail/sortie-detail.component.ts`

```typescript
import { Component, signal } from '@angular/core';
import { CarteLieuComponent } from '../carte-lieu/carte-lieu.component';
import { GaleriePhotosComponent } from '../galerie-photos/galerie-photos.component';
import { PanneauOrganisationComponent } from '../panneau-organisation/panneau-organisation.component';
import { CompteAReboursComponent } from '../compte-a-rebours/compte-a-rebours.component';

@Component({
  selector: 'app-sortie-detail',
  standalone: true,
  // Les composants restent importés normalement ; c'est leur usage EXCLUSIF
  // dans un @defer qui permet à Angular de les sortir dans un chunk séparé.
  imports: [
    CarteLieuComponent,
    GaleriePhotosComponent,
    PanneauOrganisationComponent,
    CompteAReboursComponent,
  ],
  template: `
    <!-- Bundle initial : léger, s'affiche tout de suite -->
    <h1>{{ titre() }}</h1>
    <p>Rendez-vous le {{ date() }}</p>
    <app-compte-a-rebours />

    <!-- CARTE : sous le fold → on viewport. prefetch on idle télécharge le chunk
         dès que le navigateur est libre, pour un affichage instantané au scroll. -->
    @defer (on viewport; prefetch on idle) {
      <app-carte-lieu [lieu]="lieu()" />
    } @loading (after 100ms; minimum 300ms) {
      <!-- after 100ms : pas de flash si le chunk arrive vite.
           minimum 300ms : une fois montré, reste au moins 300ms. -->
      <p aria-busy="true">Chargement de la carte…</p>
    } @error {
      <p role="alert">Impossible de charger la carte du lieu.</p>
    } @placeholder (minimum 500ms) {
      <!-- UN SEUL élément racine : sert de sentinelle au trigger viewport. -->
      <div class="carte-skeleton">Carte du lieu de rendez-vous</div>
    }

    <!-- GALERIE : contenu secondaire → on idle (quand le thread est libre). -->
    @defer (on idle) {
      <app-galerie-photos [sortieId]="id()" />
    } @placeholder {
      <div class="galerie-skeleton">Photos de la sortie</div>
    }

    <!-- PANNEAU : à la demande → on interaction sur #btnOrga.
         prefetch on hover(btnOrga) précharge dès le survol → ouverture immédiate. -->
    <button #btnOrga>Organiser la sortie</button>

    @defer (on interaction(btnOrga); prefetch on hover(btnOrga)) {
      <app-panneau-organisation [sortieId]="id()" />
    } @placeholder {
      <p>Cliquez pour préparer le covoiturage et le matériel.</p>
    }
  `,
})
export class SortieDetailComponent {
  // Tout l'état de la page est en signaux → compatible zoneless d'entrée.
  titre = signal('Randonnée au lac');
  date = signal('12 juillet');
  lieu = signal('Lac de la Vallée');
  id = signal('s-42');
}
```

**Pourquoi ce corrigé est correct :**
- Chaque `@defer` génère **automatiquement** un chunk. Le bundle initial ne contient que le titre, la date et le compte à rebours ; carte, galerie et panneau sont téléchargés à la demande (visible dans Network).
- Les triggers correspondent à l'intention : `on viewport` pour le contenu sous le fold, `on idle` pour le secondaire, `on interaction` pour l'ouverture explicite. `prefetch` anticipe le téléchargement sans avancer l'affichage.
- Le `@placeholder` de la carte a **un seul élément racine** (`<div>`), condition requise par le trigger `on viewport`.
- L'app est zoneless : elle fonctionne parce que **tout l'état passe par des signaux** (`titre`, `date`, `lieu`, `id`, `minutes`). Le `setInterval` du compte à rebours met à jour l'écran uniquement grâce au `signal` + `update`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis la page **de mémoire, en 30 minutes**, avec ces modifications :

1. Ajoute un `signal<boolean>` `afficherCarte` (initial `false`) et un bouton qui le passe à `true`. Diffère la carte avec `@defer (when afficherCarte())` **au lieu de** `on viewport`. Vérifie que, une fois chargée, la carte **reste** même si tu remets `afficherCarte` à `false` (différence clé avec `@if`).
2. Ajoute une **bannière météo** différée `on timer(3s)` (chunk chargé après 3 secondes), avec un `@placeholder`.
3. Refais l'**épreuve anti-zone.js** sur le compte à rebours : sans regarder ce corrigé, retrouve pourquoi une propriété simple resterait figée en zoneless.
4. **Sans rouvrir ce corrigé** ni le module 08.

**Critère de réussite :** dans le navigateur, la carte n'apparaît qu'au clic et persiste ensuite ; la bannière météo apparaît seule après 3 s ; le compte à rebours descend tout seul — le tout sans zone.js (Network ne charge aucun `zone.js`).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, les fichiers vivent ici :

```
tribuzen/
  src/
    main.ts                                     ← provideExperimentalZonelessChangeDetection()
    app/
      sorties/
        sortie-detail.component.ts              ← page @defer
        compte-a-rebours.component.ts           ← signal en zoneless
        carte-lieu.component.ts
        galerie-photos.component.ts
        panneau-organisation.component.ts
```

**Différences par rapport au lab :**
- `CarteLieuComponent` et `GaleriePhotosComponent` seront de vrais composants lourds (librairie de cartographie, chargement d'images) — c'est là que le gain de bundle devient réel. Dans le lab, ce sont des stand-ins.
- Leurs données (coordonnées du lieu, URLs des photos) seront chargées depuis l'API via `resource` (module 10) ; ici elles arrivent par `input` (module 05).
- Le compte à rebours calculera un vrai delta jusqu'à la date de départ ; dans le lab, on part de 60 en dur.
- Les styles passeront par le design system TribuZen (tokens CSS) — dans le lab, template brut.

**Commit cible :**
```
feat(sorties): SortieDetail — @defer carte/galerie/panneau + bootstrap zoneless
```
