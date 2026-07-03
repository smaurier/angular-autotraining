---
titre: Premier projet Angular 19 et composant standalone
cours: 03-angular
notions: [ng new CLI, structure de projet Angular, main.ts bootstrapApplication, app.config.ts ApplicationConfig, décorateur @Component, standalone par défaut, selector, template vs templateUrl, styles vs styleUrl, imports du composant, ng generate component, interpolation de champ de classe]
outcomes:
  - sait créer un projet Angular 19 avec ng new et ses options
  - sait lire le rôle de chaque fichier généré (main.ts, app.config.ts, app.component.ts)
  - sait décrire l'anatomie d'un composant standalone via le décorateur @Component
  - sait générer un composant avec la CLI et le brancher dans un parent via imports
prerequis: [Module 00 — de Vue à Angular (modèle mental, équivalences Vue/Angular)]
next: 02-signaux-base
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — bootstrap du projet Angular et premier composant de coquille (AppComponent + FamilyCardComponent)
last-reviewed: 2026-07
---

# Premier projet Angular 19 et composant standalone

> **Outcomes — tu sauras FAIRE :** créer un projet Angular 19 avec le CLI, lire le rôle de chaque fichier généré, décrire l'anatomie d'un composant standalone, générer un composant et le brancher dans un parent.
> **Difficulté :** :star::star:
>
> **Portée :** ce module couvre la **création du projet** et l'**anatomie d'un composant standalone** (décorateur, selector, template, imports) avec de l'état affiché via un simple **champ de classe**. La réactivité (`signal`, lecture avec `()`, `.set()`) est le sujet du **module 02**. Le control flow `@if`/`@for` est au **module 03**, les inputs parent→enfant au **module 05**. Ici, on reste sur la coquille et l'affichage statique.

## 1. Cas concret d'abord

Tu démarres le front Angular de **TribuZen**. La toute première tâche du sprint : initialiser le repo et poser la coquille de l'application — un `AppComponent` racine qui affiche une carte de famille (`FamilyCardComponent`). Rien de réactif encore : juste la structure qui compile, tourne sur `localhost:4200`, et un composant enfant branché dans le parent.

Un collègue venu de Vue te tend ce qu'il aurait écrit en Vue 3 :

```vue
<!-- Vue 3 — la coquille équivalente -->
<script setup lang="ts">
import FamilyCard from './FamilyCard.vue'
</script>

<template>
  <h1>TribuZen</h1>
  <FamilyCard />
</template>
```

En Angular, trois questions se posent immédiatement, et c'est là que les débutants se bloquent :

1. **Quelle commande** crée le projet, et que génère-t-elle exactement ? (Vue : `npm create vue@latest`.)
2. **Où** l'application démarre-t-elle ? (Vue : `createApp(App).mount('#app')`.)
3. **Comment** un composant enfant est-il « vu » par son parent ? En Vue, un `import` suffit. En Angular, l'import seul ne suffit pas — il manque une étape, et son oubli est **l'erreur n°1** du débutant.

Ce module répond aux trois. À la fin, tu as un projet Angular 19 qui tourne avec `AppComponent` affichant `FamilyCardComponent`.

---

## 2. Théorie complète, concise

### 2.1 Créer le projet : `ng new`

Le CLI Angular scaffolde tout le projet en une commande :

```bash
ng new tribuzen-front --style=scss --routing
```

| Option | Effet |
|--------|-------|
| `tribuzen-front` | Nom du projet et du dossier créé |
| `--style=scss` | Feuilles de style en SCSS (au lieu de CSS) |
| `--routing` | Génère `app.routes.ts` + configure le router (utilisé au module 14) |

Le CLI crée le dossier, génère la structure, installe les dépendances npm et initialise un dépôt Git. C'est l'équivalent scaffoldé de `npm create vue@latest` avec Vue Router + SCSS.

> En Angular 19, les composants sont **standalone par défaut** : `ng new` ne génère plus de `AppModule`. Le projet démarre directement sur un composant racine autonome.

### 2.2 Le point d'entrée : `main.ts` et `bootstrapApplication`

Le fichier `src/main.ts` démarre l'application. En Angular standalone, on utilise `bootstrapApplication` (importé de `@angular/platform-browser`) :

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

`bootstrapApplication` prend **le composant racine** (`AppComponent`) et **la configuration** (`appConfig`). C'est l'équivalent Angular de `createApp(App).mount('#app')` en Vue. Il n'y a plus de `platformBrowserDynamic().bootstrapModule(AppModule)` (l'ancien monde `NgModule`).

> **Vérifié Context7** : la forme minimale documentée est `bootstrapApplication(App).catch(...)`. Le second argument `appConfig` est optionnel — il porte les providers globaux (voir §2.3).

### 2.3 La configuration : `app.config.ts`

Les **providers globaux** de l'application (router, HTTP client, etc.) vivent dans un objet `ApplicationConfig` :

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
  ],
};
```

C'est l'équivalent de `app.use(router)` / `app.use(pinia)` en Vue, centralisé dans un seul objet. On y reviendra au fil des modules (HTTP au module 18, router au module 14). Pour l'instant, il suffit de savoir que **c'est là que les providers globaux se déclarent**.

### 2.4 Le composant racine : anatomie du décorateur `@Component`

Voici le composant racine généré, cœur du module :

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'tribuzen-front';
}
```

Le décorateur `@Component` transforme une classe TypeScript en composant Angular. Ses propriétés :

| Propriété | Rôle | Obligatoire |
|-----------|------|-------------|
| `selector` | Balise HTML du composant (`app-root` → `<app-root>`) | Oui |
| `template` | Template HTML inline (chaîne) | Oui\* |
| `templateUrl` | Chemin vers un fichier HTML externe | Oui\* |
| `styles` | Tableau de styles inline | Non |
| `styleUrl` | Chemin vers un fichier de styles externe | Non |
| `imports` | Composants / directives / pipes utilisés dans le template | Non |

> \* Il faut **soit** `template`, **soit** `templateUrl` — jamais les deux.

Le `title = 'tribuzen-front'` est un **champ de classe** ordinaire. On l'affiche dans le template par interpolation avec les doubles accolades : `\{\{ title \}\}`. À ce stade, `title` n'est **pas** réactif (ce n'est pas un signal) — il est simplement lu au rendu. La réactivité arrive au module 02.

> En Angular 19, `standalone: true` est le **défaut** : on ne l'écrit plus dans le décorateur. Un composant standalone embarque ses propres dépendances via `imports`, sans passer par un `NgModule` — exactement la philosophie du SFC Vue.

### 2.5 Template inline vs template externe

Deux styles, tous deux valides :

```typescript
// Inline — idéal pour un petit composant (< ~10 lignes de HTML)
@Component({
  selector: 'app-badge',
  template: `<span class="badge">{{ label }}</span>`,
  styles: [`.badge { background: #007bff; color: #fff; padding: 4px 8px; }`],
})
export class BadgeComponent {
  label = 'Nouveau';
}
```

```typescript
// Externe — préférable dès que le HTML grossit
@Component({
  selector: 'app-family-card',
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  familyName = 'Famille Martin';
  memberCount = 4;
}
```

**Règle** : template inline si le HTML fait moins d'une dizaine de lignes, fichier externe au-delà. C'est le seul critère qui compte pour la lisibilité.

### 2.6 Générer un composant avec la CLI

Plutôt que de tout écrire à la main, le CLI génère la structure :

```bash
# Composant standalone (défaut en Angular 19), fichiers séparés
ng generate component family-card
# Raccourci équivalent
ng g c family-card
```

Fichiers créés dans `src/app/family-card/` :

```
family-card/
├── family-card.component.ts       # Classe + décorateur @Component
├── family-card.component.html     # Template
├── family-card.component.scss     # Styles
└── family-card.component.spec.ts  # Test unitaire (squelette)
```

Options utiles :

```bash
ng g c family-card --inline-template --inline-style  # tout dans le .ts
ng g c family-card --skip-tests                      # sans fichier .spec.ts
ng g c family/family-card                            # dans un sous-dossier
```

### 2.7 Brancher un composant enfant : `imports` (l'étape que Vue n'a pas)

C'est **le** point qui piège les développeurs venant de Vue. En Vue, importer le composant suffit à l'utiliser. En Angular standalone, il faut **deux** choses : l'`import` TypeScript **et** l'ajout au tableau `imports` du décorateur.

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { FamilyCardComponent } from './family-card/family-card.component';

@Component({
  selector: 'app-root',
  imports: [FamilyCardComponent], // ← sans ceci, <app-family-card> est inconnu
  template: `
    <h1>TribuZen</h1>
    <app-family-card />
  `,
})
export class AppComponent {}
```

Sans `FamilyCardComponent` dans `imports`, Angular ne reconnaît pas la balise `<app-family-card>` et lève une erreur de template. L'import TypeScript seul ne suffit **jamais** : c'est `imports: [...]` qui déclare la dépendance au compilateur de template.

> Chaque composant standalone déclare **ses propres** dépendances dans son `imports`. Il n'y a pas de « module central » qui les partage — c'est explicite et local, comme les `import` d'un SFC Vue.

### 2.8 Lancer et builder

```bash
ng serve          # dev server sur http://localhost:4200, hot reload
ng serve --open   # + ouvre le navigateur (-o en raccourci)
ng build          # build de production dans dist/
```

`ng serve` est l'équivalent de `npm run dev` (Vite) côté Vue : recompilation et rafraîchissement automatiques à chaque sauvegarde.

---

## 3. Worked examples

### Exemple 1 — Poser la coquille TribuZen de A à Z

Objectif : un projet neuf où `AppComponent` affiche `FamilyCardComponent`. On enchaîne les commandes et on écrit les deux composants.

```bash
# 1. Créer le projet
ng new tribuzen-front --style=scss --routing
cd tribuzen-front

# 2. Générer le composant enfant
ng g c family-card
```

Le composant enfant, avec des champs de classe simples (pas encore de signal) :

```typescript
// src/app/family-card/family-card.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-family-card',
  // Pas de standalone: true → c'est le défaut en Angular 19
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  // Champs de classe : lus au rendu, non réactifs (signals = module 02)
  familyName = 'Famille Martin';
  memberCount = 4;
}
```

```html
<!-- src/app/family-card/family-card.component.html -->
<!-- Interpolation double-accolade : lit la valeur du champ de classe -->
<article class="card">
  <h2>{{ familyName }}</h2>
  <p>{{ memberCount }} membre(s)</p>
</article>
```

Le composant racine importe et affiche l'enfant :

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { FamilyCardComponent } from './family-card/family-card.component';

@Component({
  selector: 'app-root',
  imports: [FamilyCardComponent], // étape obligatoire
  template: `
    <h1>TribuZen</h1>
    <app-family-card />
  `,
})
export class AppComponent {}
```

```bash
# 3. Lancer
ng serve --open
```

Résultat attendu à l'écran :

```
TribuZen
Famille Martin
4 membre(s)
```

**Pourquoi ça marche :** `bootstrapApplication(AppComponent, appConfig)` démarre sur `AppComponent`. Son `imports: [FamilyCardComponent]` autorise la balise `<app-family-card />` dans son template. Le composant enfant lit ses champs de classe par interpolation. Rien de réactif : si on modifiait `memberCount` à la souris, l'affichage ne suivrait pas encore — c'est précisément ce que résolvent les signals au module 02.

### Exemple 2 — Lire la structure générée fichier par fichier

Après `ng new tribuzen-front`, voici l'arborescence et le rôle de chaque fichier clé :

```
tribuzen-front/
├── src/
│   ├── app/
│   │   ├── app.component.ts     # Composant racine (classe + @Component)
│   │   ├── app.component.html   # Template racine
│   │   ├── app.component.scss   # Styles racine (encapsulés)
│   │   ├── app.component.spec.ts# Test unitaire du racine
│   │   ├── app.config.ts        # ApplicationConfig : providers globaux
│   │   └── app.routes.ts        # Routes (vide pour l'instant → module 14)
│   ├── index.html               # HTML hôte, contient <app-root></app-root>
│   ├── main.ts                  # bootstrapApplication — point d'entrée
│   └── styles.scss              # Styles globaux
├── angular.json                 # Config du build (équiv. vite.config.ts)
├── package.json                 # Dépendances npm
└── tsconfig.json                # Config TypeScript (mode strict activé)
```

La chaîne de démarrage se lit ainsi : `index.html` contient `<app-root>` → `main.ts` appelle `bootstrapApplication(AppComponent, appConfig)` → Angular remplace `<app-root>` par le rendu de `AppComponent`. C'est l'exact pendant du couple `<div id="app">` + `createApp(App).mount('#app')` de Vue.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier le composant enfant dans `imports` (le plus courant)

```typescript
// ❌ Import TypeScript présent, mais pas dans imports[]
import { FamilyCardComponent } from './family-card/family-card.component';

@Component({
  selector: 'app-root',
  imports: [], // FamilyCardComponent manquant !
  template: `<app-family-card />`, // ❌ balise inconnue → erreur de template
})
export class AppComponent {}
```

**Pourquoi c'est faux :** l'`import` TypeScript rend la classe disponible dans le fichier, mais c'est `imports: [...]` du décorateur qui déclare la dépendance au **compilateur de template**. Les deux sont nécessaires.

```typescript
// ✅ Correct : import TS + entrée dans imports[]
imports: [FamilyCardComponent],
```

C'est la différence structurelle n°1 avec Vue, où l'`import` seul suffit.

### PIÈGE #2 — Écrire encore `standalone: true`

```typescript
// ⚠️ Redondant en Angular 19 (mais pas une erreur)
@Component({
  selector: 'app-family-card',
  standalone: true, // c'est déjà le défaut → inutile
  templateUrl: './family-card.component.html',
})
```

En Angular 19, standalone est le **défaut**. Le laisser n'est pas faux, mais c'est du bruit. Inversement, `standalone: false` est ce qui bascule un composant vers l'ancien monde `NgModule` — à ne pas mettre par accident.

### PIÈGE #3 — Confondre `bootstrapApplication` et `bootstrapModule`

```typescript
// ❌ Ancien monde NgModule — n'existe plus dans un projet standalone
platformBrowserDynamic().bootstrapModule(AppModule);

// ✅ Angular 19 standalone
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

**Pourquoi c'est faux :** `bootstrapModule` attend un `NgModule`, que `ng new` ne génère plus. Un projet Angular 19 neuf démarre **toujours** avec `bootstrapApplication` sur un composant racine.

### PIÈGE #4 — Mettre `template` **et** `templateUrl`

```typescript
// ❌ Les deux à la fois → erreur de compilation
@Component({
  selector: 'app-badge',
  template: `<span>x</span>`,
  templateUrl: './badge.component.html', // ❌ conflit
})
```

Un composant a **une** source de template : inline (`template`) **ou** externe (`templateUrl`), jamais les deux. Même règle pour `styles` vs `styleUrl`.

### PIÈGE #5 — Attendre de la réactivité d'un champ de classe

```typescript
// Champ de classe simple — PAS réactif
export class FamilyCardComponent {
  memberCount = 4;
}
```

Afficher `\{\{ memberCount \}\}` fonctionne au premier rendu. Mais un champ de classe nu n'est pas un signal : sa modification ne déclenche pas nécessairement de mise à jour fiable de l'UI dans un monde signals/zoneless. **À ce stade du cours, on affiche du statique.** La réactivité explicite (`signal()`, lecture avec `()`, `.set()`) est introduite au **module 02** — ne pas anticiper ici.

---

## 5. Ancrage TribuZen

La coquille montée dans ce module est **littéralement** le point de départ du front TribuZen :

- **Le projet** `tribuzen-front` est créé une seule fois avec `ng new … --style=scss --routing`. C'est le repo Angular réel.
- **`AppComponent`** est la coquille racine : elle orchestrera plus tard le header, le router-outlet et les pages.
- **`FamilyCardComponent`** est le premier composant métier : la carte qui résume une famille (nom + nombre de membres). Dans ce module, ses données sont des champs de classe en dur ; elles deviendront des **inputs** reçus du parent au **module 05**, alimentés par l'API au **module 18**.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen-front/
  src/
    app/
      app.component.ts              ← coquille racine, imports FamilyCardComponent
      family-card/
        family-card.component.ts    ← premier composant métier
        family-card.component.html
        family-card.component.scss
```

> La transformation de `familyName`/`memberCount` en **inputs** (`input()`) reçus du parent relève du **module 05**. Ici, on pose la structure : projet + composant standalone branché.

---

## 6. Points clés

1. `ng new <projet> --style=scss --routing` scaffolde tout le projet ; les composants sont standalone par défaut (plus de `AppModule`).
2. `main.ts` démarre l'app avec `bootstrapApplication(AppComponent, appConfig)` — l'équivalent de `createApp(App).mount('#app')`.
3. `app.config.ts` (`ApplicationConfig`) centralise les **providers globaux** (router, HTTP…) — l'équivalent des `app.use(...)` de Vue.
4. `@Component` transforme une classe en composant : `selector` (obligatoire), `template` **ou** `templateUrl`, `styles`/`styleUrl`, `imports`.
5. En Angular 19, `standalone: true` est le défaut : inutile de l'écrire.
6. `ng g c <nom>` génère un composant standalone complet (`.ts` / `.html` / `.scss` / `.spec.ts`).
7. Pour utiliser un composant enfant : `import` TypeScript **ET** ajout au tableau `imports` du décorateur — l'oubli du second est l'erreur n°1 des débutants venant de Vue.
8. Un champ de classe s'affiche par interpolation double-accolade mais n'est **pas** réactif ; la réactivité (`signal`) arrive au module 02.

---

## 7. Seeds Anki

```
Quelle commande crée un projet Angular 19 avec SCSS et le router ?|ng new <projet> --style=scss --routing. Le CLI scaffolde la structure, installe les deps npm et initialise Git. Les composants sont standalone par défaut (pas d'AppModule).
Comment démarre une application Angular 19 standalone (fichier et fonction) ?|Dans src/main.ts, via bootstrapApplication(AppComponent, appConfig) importé de @angular/platform-browser. Remplace l'ancien platformBrowserDynamic().bootstrapModule(AppModule).
À quoi sert app.config.ts (ApplicationConfig) ?|Il centralise les providers globaux de l'application (provideRouter, provideHttpClient, etc.) dans un objet passé en 2e argument de bootstrapApplication. Équivalent des app.use(...) de Vue.
Quelles sont les propriétés clés du décorateur @Component ?|selector (obligatoire), template OU templateUrl (l'un des deux), styles/styleUrl (optionnel), imports (composants/directives/pipes utilisés dans le template).
En Angular 19, doit-on écrire standalone: true dans @Component ?|Non, c'est le défaut depuis Angular 19. L'écrire est redondant. standalone: false bascule au contraire vers l'ancien monde NgModule.
Pourquoi un composant enfant importé en TypeScript n'apparaît-il pas dans le template ?|Parce que l'import TS ne suffit pas : il faut aussi l'ajouter au tableau imports du décorateur @Component du parent. Sans ça, sa balise (ex: <app-family-card>) est inconnue du compilateur de template.
Quelle est l'erreur : avoir template et templateUrl dans le même @Component ?|C'est une erreur de compilation. Un composant a une seule source de template : inline (template) OU externe (templateUrl), jamais les deux. Idem pour styles vs styleUrl.
Un champ de classe affiché par interpolation est-il réactif ?|Non. Il est lu au rendu mais sa modification ne met pas l'UI à jour de façon fiable. La réactivité passe par signal() (lecture avec (), écriture avec .set()) — vu au module 02.
```

---

## Pont vers le lab

> Lab associé : `03-angular/labs/lab-01-premier-projet-standalone/README.md`. Créer un vrai projet Angular 19 avec le CLI, générer un composant standalone et le brancher dans `AppComponent` — vrai outil (Angular CLI + `ng serve`), corrigé commenté intégral, variante J+30.
