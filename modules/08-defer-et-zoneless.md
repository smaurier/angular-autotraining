---
titre: "@defer et zoneless — chargement différé et détection de changement sans zone.js"
cours: 03-angular
notions: [bloc @defer, lazy boundary et chunk séparé, "@placeholder", "@loading", "@error", options minimum et after, triggers on idle/on viewport/on interaction/on hover/on timer/on immediate, when condition, prefetch, mode zoneless, provideExperimentalZonelessChangeDetection, les signaux notifient Angular, ce qui casse sans zone.js]
outcomes:
  - sait différer un composant lourd avec un bloc @defer et ses sous-blocs @placeholder/@loading/@error
  - sait choisir le bon trigger (on idle, on viewport, on interaction, on hover, on timer) et précharger le chunk avec prefetch
  - sait expliquer le mode zoneless et pourquoi les signaux le rendent possible
  - sait activer le zoneless avec provideExperimentalZonelessChangeDetection() et retirer zone.js du build
  - sait diagnostiquer un composant qui ne se met plus à jour en zoneless et le corriger avec un signal
prerequis: [module 02 signaux-base, module 03 control-flow, module 04 binding-et-events, module 07 pipes-et-directives]
next: 09-signaux-avances
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — page détail d'une sortie (carte et galerie différées) et bootstrap zoneless de l'application
last-reviewed: 2026-07
---

# `@defer` et zoneless — chargement différé et détection de changement sans zone.js

> **Outcomes — tu sauras FAIRE :** différer un composant lourd avec `@defer` et ses triggers, précharger avec `prefetch`, activer le mode zoneless et corriger un composant qui ne se met plus à jour.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **deux leviers de performance du template et du bootstrap** : le bloc `@defer` (chargement différé de composants, avec `@placeholder` / `@loading` / `@error` et les triggers) et le **mode zoneless** (détection de changement sans zone.js). C'est le **dernier module du bloc « composants / templates »**. On reste côté template + bootstrap : pas de service ni d'injection de dépendances (module 11+), pas de RxJS ni de `toSignal` (module 16-17), pas de routing (module 14). Les signaux (`signal` / `computed`), le control flow `@if` / `@for` et les events `(click)` sont supposés acquis (modules 02-07).

## 1. Cas concret d'abord

TribuZen a une **page détail d'une sortie** : le titre, la date et la liste des participants s'affichent tout en haut, puis, plus bas, une **carte interactive** du lieu de rendez-vous (librairie de cartographie, ~200 KB) et une **galerie photos** de la sortie.

Un collègue a tout importé et tout affiché d'un coup :

```typescript
// sortie-detail.component.ts — AVANT (tout dans le bundle initial)
import { Component, signal } from '@angular/core';
import { CarteLieuComponent } from './carte-lieu.component';
import { GaleriePhotosComponent } from './galerie-photos.component';

@Component({
  selector: 'app-sortie-detail',
  imports: [CarteLieuComponent, GaleriePhotosComponent],
  template: `
    <h1>{{ titre() }}</h1>
    <p>Rendez-vous le {{ date() }}</p>

    <!-- Ces deux composants sont lourds ET plus bas dans la page. -->
    <!-- Ils sont pourtant chargés immédiatement, même si l'utilisateur ne scrolle jamais. -->
    <app-carte-lieu [lieu]="lieu()" />
    <app-galerie-photos [sortieId]="id()" />
  `,
})
export class SortieDetailComponent {
  titre = signal('Randonnée au lac');
  date = signal('12 juillet');
  lieu = signal('Lac de la Vallée');
  id = signal('s-42');
}
```

Le problème : `CarteLieuComponent` et `GaleriePhotosComponent` sont dans le **bundle initial**. La page met plus de temps à s'afficher alors que ces deux blocs sont sous la ligne de flottaison — souvent jamais vus. On voudrait ne charger leur code JavaScript **qu'au moment utile** (quand ils entrent à l'écran), avec un placeholder en attendant.

C'est exactement le rôle de **`@defer`**. Et pour que TribuZen sache *quand* mettre l'écran à jour sans surveiller tout l'arbre en permanence, on active le mode **zoneless** : la seconde moitié du module.

---

## 2. Théorie complète, concise

### 2.1 `@defer` — un lazy boundary dans le template

`@defer` est un bloc de template (Angular 17+) qui crée une **frontière de chargement paresseux** (*lazy boundary*). Le code des composants placés **à l'intérieur** n'est pas mis dans le bundle initial : Angular le sort dans un **chunk JavaScript séparé**, téléchargé seulement quand un **trigger** se déclenche.

```html
@defer (on viewport) {
  <app-carte-lieu [lieu]="lieu()" />
}
```

Le composant `CarteLieuComponent` reste importé dans `imports: [...]` comme d'habitude ; c'est le fait de l'utiliser **uniquement** dans un bloc `@defer` qui permet à Angular de le déférer.

### 2.2 Les quatre sous-blocs

Un `@defer` peut être accompagné de trois sous-blocs optionnels. La syntaxe complète vérifiée :

```html
@defer (on viewport) {
  <app-carte-lieu [lieu]="lieu()" />
} @placeholder (minimum 500ms) {
  <div class="carte-skeleton">Carte du lieu</div>
} @loading (minimum 300ms; after 100ms) {
  <p aria-busy="true">Chargement de la carte…</p>
} @error {
  <p role="alert">Impossible de charger la carte.</p>
}
```

| Bloc | Rôle | Obligatoire |
|------|------|-------------|
| `@defer` | Contenu à charger en différé | Oui |
| `@placeholder` | Affiché **avant** le déclenchement du chargement | Non |
| `@loading` | Affiché **pendant** le téléchargement du chunk | Non |
| `@error` | Affiché si le chargement **échoue** | Non |

Ordre d'affichage dans le temps : `@placeholder` → `@loading` → contenu du `@defer` (ou `@error` en cas d'échec).

### 2.3 Options `minimum` et `after`

Ces options évitent le clignotement d'un chargement trop rapide :

- `@placeholder (minimum 500ms)` : le placeholder reste visible **au moins** 500 ms, même si le chunk arrive plus tôt.
- `@loading (minimum 300ms; after 100ms)` : `after 100ms` = le bloc `@loading` ne s'affiche **qu'après** 100 ms de chargement (pas de spinner qui flashe pour un chunk quasi instantané) ; `minimum 300ms` = une fois affiché, il reste **au moins** 300 ms.

Les durées s'écrivent en `ms` (millisecondes) ou `s` (secondes) : `500ms`, `2s`.

### 2.4 Les triggers `on …`

Le trigger décide **quand** charger. Les principaux (séparés par `;` pour en combiner plusieurs) :

| Trigger | Se déclenche… | Cas d'usage |
|---------|---------------|-------------|
| `on idle` | quand le navigateur est inactif (`requestIdleCallback`) | contenu secondaire (défaut le plus courant) |
| `on viewport` | quand le placeholder entre dans le viewport | contenu sous la ligne de flottaison |
| `on interaction` | au clic ou au `keydown` sur l'élément | panneau ouvert à la demande |
| `on hover` | au survol de l'élément | preview, aperçu |
| `on timer(2s)` | après un délai | bannière différée |
| `on immediate` | dès que le reste du template non différé est rendu | découpe le bundle sans attendre |

Pour `on viewport`, `on interaction` et `on hover`, l'élément « sentinelle » est par défaut le contenu du `@placeholder` (qui doit alors avoir **un seul élément racine**). On peut aussi désigner un autre élément via une **variable de référence de template** :

```html
<button #btnAdmin>Ouvrir le panneau d'organisation</button>

@defer (on interaction(btnAdmin)) {
  <app-panneau-organisation [sortieId]="id()" />
} @placeholder {
  <p>Cliquez pour organiser la sortie.</p>
}
```

### 2.5 `when` — un trigger conditionnel

`when` déclenche le chargement quand une **expression** (souvent un signal) devient vraie. Contrairement à `@if`, une fois chargé le contenu **reste** même si l'expression redevient fausse :

```html
@defer (when afficherCarte()) {
  <app-carte-lieu [lieu]="lieu()" />
}
```

### 2.6 `prefetch` — télécharger sans afficher

`prefetch` télécharge le chunk **en avance**, sans instancier le composant. Le trigger principal reste maître de l'**affichage** ; le prefetch anticipe juste le **téléchargement** pour que l'affichage soit quasi instantané :

```html
<!-- Affiché au clic, mais le code est déjà téléchargé dès que le navigateur est libre -->
@defer (on interaction(btnAdmin); prefetch on idle) {
  <app-panneau-organisation [sortieId]="id()" />
} @placeholder {
  <p>Cliquez pour organiser la sortie.</p>
}
```

`prefetch` prend les mêmes triggers (`prefetch on idle`, `prefetch on hover`, `prefetch when …`). Chaque `@defer` génère **automatiquement** son propre chunk — aucune configuration de bundle à écrire.

### 2.7 Zoneless — le problème que zone.js résout (et crée)

Par défaut historiquement, Angular s'appuie sur **zone.js** : une librairie qui *monkey-patch* toutes les API asynchrones du navigateur (`setTimeout`, `addEventListener`, `fetch`, `Promise`…). À chaque événement async, zone.js prévient Angular, qui lance alors un cycle de détection de changement sur **tout l'arbre** de composants — même ceux qui n'ont rien changé.

Coûts de zone.js : ~13 KB gzippés dans le bundle, du monkey-patching source de bugs subtils, des stack traces polluées, et une détection qui balaie l'arbre entier à chaque event.

### 2.8 Pourquoi les signaux rendent le zoneless possible

Un signal **notifie Angular lui-même** quand sa valeur change (c'est tout le point du module 02). Angular n'a donc plus besoin de zone.js pour « deviner » qu'un changement a eu lieu : le signal lui dit **exactement** quel composant redessiner.

```
Avec zone.js :   event async → zone.js intercepte → vérifie TOUT l'arbre → met à jour le DOM
En zoneless :    signal.set() → Angular sait EXACTEMENT quel composant → met à jour ce composant
```

C'est pour cela que tout le bloc « signaux » précède ce module : le zoneless n'est viable que si l'état passe par des signaux (ou les API Angular qui déclenchent la détection, comme les events `(click)` du template).

### 2.9 Activer le mode zoneless

Deux étapes. **Étape 1 — le provider** au bootstrap :

```typescript
// src/main.ts (Angular 19)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideExperimentalZonelessChangeDetection(), // ← active le zoneless
  ],
});
```

> **Note de version (vérifiée Context7).** En **Angular 19**, l'API s'appelle **`provideExperimentalZonelessChangeDetection()`** (encore expérimentale). Elle a été **stabilisée en Angular 20** sous le nom **`provideZonelessChangeDetection()`** (même comportement, sans le préfixe `Experimental`). Sur un projet v20+, utilise le nom stable.

**Étape 2 — retirer zone.js du build** dans `angular.json` : vider le tableau `polyfills` (retirer `"zone.js"`) pour la cible `build` **et** `test`. On peut ensuite désinstaller le paquet (`npm uninstall zone.js`).

```jsonc
// angular.json (extrait) — cible build
"polyfills": []   // ← au lieu de ["zone.js"]
```

### 2.10 Ce qui fonctionne, ce qui casse en zoneless

**Fonctionne sans rien changer** : tout ce qui passe par des **signaux** (`signal`, `computed`) et les **events de template** (`(click)`, `(input)`…). C'est le cas de tous les composants du bloc précédent.

**Casse silencieusement** (la vue ne se met plus à jour) : toute mutation d'état **hors signal** déclenchée par du code asynchrone que zone.js interceptait auparavant — une propriété de classe modifiée dans un `setTimeout`, un tableau muté avec `push`, un callback de librairie tierce. Sans zone.js, personne ne prévient Angular. **La correction est toujours la même : passer l'état par un signal.**

---

## 3. Worked examples

### Exemple 1 — `SortieDetailComponent` avec `@defer` (TribuZen)

On reprend le cas concret et on diffère la carte et la galerie, plus un panneau d'organisation ouvert au clic.

```typescript
// sortie-detail.component.ts — version @defer
import { Component, signal } from '@angular/core';
import { CarteLieuComponent } from './carte-lieu.component';
import { GaleriePhotosComponent } from './galerie-photos.component';
import { PanneauOrganisationComponent } from './panneau-organisation.component';

@Component({
  selector: 'app-sortie-detail',
  imports: [
    CarteLieuComponent,
    GaleriePhotosComponent,
    PanneauOrganisationComponent,
  ],
  template: `
    <h1>{{ titre() }}</h1>
    <p>Rendez-vous le {{ date() }}</p>

    <!-- Carte : sous le fold → on la charge quand elle entre à l'écran.
         prefetch on idle télécharge le chunk dès que le navigateur est libre,
         pour que l'affichage soit instantané au scroll. -->
    @defer (on viewport; prefetch on idle) {
      <app-carte-lieu [lieu]="lieu()" />
    } @loading (minimum 300ms; after 100ms) {
      <p aria-busy="true">Chargement de la carte…</p>
    } @error {
      <p role="alert">Impossible de charger la carte du lieu.</p>
    } @placeholder (minimum 500ms) {
      <div class="carte-skeleton">Carte du lieu de rendez-vous</div>
    }

    <!-- Galerie : contenu secondaire → on la charge quand le navigateur est inactif. -->
    @defer (on idle) {
      <app-galerie-photos [sortieId]="id()" />
    } @placeholder {
      <div class="galerie-skeleton">Photos de la sortie</div>
    }

    <!-- Panneau d'organisation : ouvert à la demande → chargé au clic sur le bouton,
         préchargé au survol pour que l'ouverture soit immédiate. -->
    <button #btnOrga>Organiser la sortie</button>

    @defer (on interaction(btnOrga); prefetch on hover(btnOrga)) {
      <app-panneau-organisation [sortieId]="id()" />
    } @placeholder {
      <p>Cliquez pour préparer le covoiturage et le matériel.</p>
    }
  `,
})
export class SortieDetailComponent {
  titre = signal('Randonnée au lac');
  date = signal('12 juillet');
  lieu = signal('Lac de la Vallée');
  id = signal('s-42');
}
```

**Ce qui se passe au chargement** : seuls le titre, la date et les placeholders sont dans le bundle initial. La carte se télécharge en tâche de fond (`prefetch on idle`) et s'affiche au scroll ; la galerie se charge quand le thread est libre ; le panneau d'organisation ne coûte **rien** tant qu'on n'a pas survolé/cliqué le bouton. Trois chunks séparés, générés automatiquement.

### Exemple 2 — de zone.js à zoneless : un composant qui casse puis qu'on répare

TribuZen affiche un petit **compte à rebours** avant le départ de la sortie. Version naïve, qui marchait avec zone.js et **casse** en zoneless :

```typescript
// ❌ CASSE en zoneless : `minutes` n'est pas un signal
@Component({
  selector: 'app-compte-a-rebours',
  template: `<p>Départ dans {{ minutes }} min</p>`,
})
export class CompteAReboursComponent {
  minutes = 60;

  constructor() {
    // setInterval était intercepté par zone.js ; sans zone.js, Angular
    // n'est jamais prévenu et l'affichage reste figé à 60.
    setInterval(() => {
      this.minutes = this.minutes - 1;
    }, 60_000);
  }
}
```

Correction : passer `minutes` par un **signal**. Le `setInterval` reste identique, mais `set()` notifie Angular.

```typescript
// ✅ Fonctionne en zoneless : le signal notifie Angular à chaque tick
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-compte-a-rebours',
  template: `<p>Départ dans {{ minutes() }} min</p>`,
})
export class CompteAReboursComponent {
  minutes = signal(60);

  constructor() {
    setInterval(() => {
      // update : la nouvelle valeur dérive de l'ancienne (module 02)
      this.minutes.update(m => m - 1);
    }, 60_000);
  }
}
```

Le diagnostic type en zoneless — « ça marchait, l'écran ne bouge plus » — se résout presque toujours ainsi : **trouver l'état muté hors signal et le convertir en signal.**

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que `@defer` remplace `@if`

`@defer` gère le **chargement du code** (le chunk JS), pas la logique d'affichage conditionnel. `@if` inclut le code dans le bundle et montre/cache selon une condition ; `@defer` **sort le code du bundle** et le charge à la demande. Et avec `when`, une fois chargé le contenu **reste** même si l'expression redevient fausse — contrairement à `@if` qui le retirerait. Ce ne sont pas des synonymes : `@defer` = performance de chargement, `@if` = présence conditionnelle.

### PIÈGE #2 — `@placeholder` sans élément racine unique pour `on viewport` / `on interaction` / `on hover`

Ces triggers utilisent le contenu du `@placeholder` comme sentinelle et exigent **un seul élément racine**.

```html
<!-- ❌ deux racines dans le placeholder → le trigger viewport ne sait pas quoi observer -->
@defer (on viewport) {
  <app-carte-lieu />
} @placeholder {
  <p>Carte</p>
  <p>du lieu</p>
}

<!-- ✅ un seul élément racine (on emballe dans un conteneur) -->
@defer (on viewport) {
  <app-carte-lieu />
} @placeholder {
  <div>
    <p>Carte</p>
    <p>du lieu</p>
  </div>
}
```

### PIÈGE #3 — Confondre `prefetch` et le trigger d'affichage

`prefetch on idle` **télécharge** le chunk quand le navigateur est libre ; il **n'affiche pas** le composant. C'est le trigger principal (`on interaction`, `on viewport`…) qui décide de l'affichage. Écrire `@defer (prefetch on idle)` **sans** trigger principal ne rendra jamais le contenu : il sera téléchargé mais jamais monté.

### PIÈGE #4 — Passer à zoneless sans convertir l'état en signaux

```typescript
// ❌ En zoneless, la vue ne se met pas à jour : `message` n'est pas un signal
message = 'En attente…';
constructor() {
  setTimeout(() => { this.message = 'Prêt !'; }, 2000); // Angular jamais prévenu
}

// ✅ Un signal notifie Angular
message = signal('En attente…');
constructor() {
  setTimeout(() => { this.message.set('Prêt !'); }, 2000);
}
```

Le mot-clé « expérimental » de `provideExperimentalZonelessChangeDetection()` en Angular 19 rappelle qu'il faut auditer les composants avant d'activer : chercher les propriétés de template non-signal modifiées dans du code async, les mutations `push`/`splice`, et les appels à `ChangeDetectorRef`.

### PIÈGE #5 — Utiliser le mauvais nom de provider selon la version

`provideExperimentalZonelessChangeDetection()` est le nom en Angular **18-19**. En Angular **20+**, c'est `provideZonelessChangeDetection()` (stabilisé, sans `Experimental`). Copier un tutoriel v20 dans un projet v19 (ou l'inverse) donne une erreur d'import « n'existe pas ». Vérifie la version de `@angular/core` avant de choisir le nom.

---

## 5. Ancrage TribuZen

`@defer` et le zoneless sont la **couche performance** du front-office TribuZen.

**`SortieDetailComponent`** (Exemple 1) — la page détail d'une sortie. Le contenu vu d'entrée (titre, date, participants) est dans le bundle initial ; la **carte du lieu** est différée `on viewport` avec `prefetch on idle`, la **galerie photos** `on idle`, et le **panneau d'organisation** `on interaction` avec `prefetch on hover`. La page s'affiche vite, le reste se charge au bon moment.

**`CompteAReboursComponent`** (Exemple 2) — le petit compte à rebours avant départ : exemple type de la conversion en signal exigée par le zoneless.

**Bootstrap zoneless** — l'application TribuZen est bootstrappée avec `provideExperimentalZonelessChangeDetection()` (Angular 19). Comme tout l'état front-office passe déjà par des signaux (depuis le module 02), aucun composant ne casse : le zoneless est « gratuit » sur une base signaux-first.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    main.ts                                  ← provideExperimentalZonelessChangeDetection()
    app/
      sorties/
        sortie-detail.component.ts           ← Exemple 1 (@defer + triggers)
        compte-a-rebours.component.ts        ← Exemple 2 (signal en zoneless)
```

> Le chargement réel des données de la carte et de la galerie depuis l'API relèvera de `resource` (module 10) ; ici les composants différés reçoivent leurs entrées via `input` (module 05). L'injection de services et RxJS viennent après ce bloc.

---

## 6. Points clés

1. `@defer (on <trigger>) { … }` crée un *lazy boundary* : le code à l'intérieur part dans un **chunk séparé**, chargé seulement au déclenchement du trigger.
2. Quatre blocs : `@defer` (obligatoire), puis `@placeholder` (avant), `@loading` (pendant), `@error` (échec) — affichés dans cet ordre.
3. `minimum` et `after` lissent le rendu : `@loading (after 100ms; minimum 300ms)` évite le flash de spinner.
4. Triggers : `on idle`, `on viewport`, `on interaction`, `on hover`, `on timer(2s)`, `on immediate`, ou `when condition` ; combinables avec `;`. Une variable de référence désigne un autre élément sentinelle : `on interaction(btn)`.
5. `prefetch on …` **télécharge** le chunk en avance sans l'afficher ; le trigger principal reste maître de l'affichage.
6. Le mode **zoneless** supprime zone.js : Angular ne balaie plus tout l'arbre, il redessine ce que les **signaux** lui signalent.
7. On l'active avec `provideExperimentalZonelessChangeDetection()` (Angular 19 ; `provideZonelessChangeDetection()` en v20+) et en vidant `polyfills` dans `angular.json`.
8. En zoneless, tout état muté hors signal par du code async **casse** silencieusement l'affichage — la correction est de passer par un `signal`.

---

## 7. Seeds Anki

```
Que crée un bloc @defer pour le code qu'il contient ?|Un lazy boundary : le code des composants à l'intérieur part dans un chunk JavaScript séparé (généré automatiquement), téléchargé seulement quand un trigger se déclenche — pas dans le bundle initial.
Quels sont les quatre blocs de @defer et leur ordre d'affichage ?|@defer (obligatoire), @placeholder (avant le chargement), @loading (pendant le téléchargement), @error (si échec). Ordre : @placeholder → @loading → contenu du @defer (ou @error).
À quoi servent les options minimum et after de @loading ?|after Nms : n'affiche le bloc @loading qu'après N ms de chargement (évite le flash d'un chunk quasi instantané). minimum Nms : une fois affiché, le garde au moins N ms. Ensemble ils évitent le clignotement.
Quelle est la différence entre le trigger principal et prefetch dans @defer ?|Le trigger principal (on viewport, on interaction…) décide de l'AFFICHAGE. prefetch on … TÉLÉCHARGE le chunk en avance sans l'afficher, pour que l'affichage soit ensuite quasi instantané.
Pourquoi les signaux rendent-ils le mode zoneless possible ?|Un signal notifie Angular lui-même quand sa valeur change et indique exactement quel composant redessiner. Angular n'a donc plus besoin de zone.js pour balayer tout l'arbre à chaque event async.
Comment active-t-on le zoneless en Angular 19, et quel est le nom en v20 ?|En Angular 19 : provideExperimentalZonelessChangeDetection() dans les providers du bootstrap, + vider polyfills (retirer zone.js) dans angular.json. En Angular 20 c'est stabilisé sous le nom provideZonelessChangeDetection().
En zoneless, un setInterval qui fait this.minutes = this.minutes - 1 ne met plus à jour l'écran. Pourquoi et comment corriger ?|Sans zone.js, une propriété mutée dans un code async ne prévient pas Angular. Correction : passer minutes par un signal et écrire this.minutes.update(m => m - 1) — le signal notifie Angular.
Pourquoi @defer n'est-il pas un remplaçant de @if ?|@defer gère le chargement du code (chunk séparé, à la demande) ; @if gère la présence conditionnelle (code déjà dans le bundle, montré/caché). Avec when, le contenu chargé reste même si l'expression redevient fausse, contrairement à @if.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-08-defer-et-zoneless/README.md`. Différer la carte et la galerie de la page détail d'une sortie TribuZen avec `@defer` (triggers + placeholder/loading/error), activer le zoneless et réparer un composant qui casse — dev server Angular en oracle visuel, corrigé commenté intégral.
