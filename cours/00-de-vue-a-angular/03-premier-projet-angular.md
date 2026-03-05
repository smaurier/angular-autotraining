# Cours 3 -- Premier projet Angular

> **Module** : 00 - De Vue a Angular
> **Duree estimee** : 1h00
> **Prerequis** : Cours 1 et 2 (Modele mental + Equivalences)

---

## Objectif

A la fin de ce cours, vous serez capable de :

- Creer un projet Angular 19+ avec le CLI
- Comprendre le role de **chaque fichier** genere
- Creer votre premier composant standalone
- Lancer le serveur de developpement et voir le hot reload en action
- Builder le projet pour la production

---

## 1. Creer le projet

Ouvrez un terminal et lancez :

```bash
ng new devdesk --style=scss --routing
```

### Explication des options

| Option | Effet |
|--------|-------|
| `devdesk` | Nom du projet (et du dossier cree) |
| `--style=scss` | Utilise SCSS au lieu de CSS (comme dans la plupart des projets Vue) |
| `--routing` | Ajoute la configuration du router Angular |

> **Equivalent Vue** : `npm create vue@latest` avec les options Vue Router et SCSS activees.

Le CLI va :
1. Creer le dossier `devdesk/`
2. Generer toute la structure de fichiers
3. Installer les dependances (`npm install`)
4. Initialiser un depot Git

---

## 2. Tour du projet genere

Entrez dans le dossier et ouvrez-le dans votre editeur :

```bash
cd devdesk
code .
```

Voici l'arborescence complete avec le role de chaque fichier :

```
devdesk/
├── src/
│   ├── app/
│   │   ├── app.component.ts        # Composant racine
│   │   ├── app.component.html       # Template du composant racine
│   │   ├── app.component.scss       # Styles du composant racine
│   │   ├── app.component.spec.ts    # Tests du composant racine
│   │   ├── app.config.ts            # Configuration de l'application
│   │   └── app.routes.ts            # Definition des routes
│   ├── assets/                      # Fichiers statiques (images, fonts)
│   ├── index.html                   # Point d'entree HTML
│   ├── main.ts                      # Bootstrap de l'application
│   └── styles.scss                  # Styles globaux
├── angular.json                     # Configuration du build Angular
├── package.json                     # Dependances npm
├── tsconfig.json                    # Config TypeScript de base
├── tsconfig.app.json                # Config TS pour l'application
└── tsconfig.spec.json               # Config TS pour les tests
```

### Fichier par fichier

#### `main.ts` -- Le point d'entree

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

> **Equivalent Vue** :
> ```typescript
> import { createApp } from 'vue'
> import App from './App.vue'
> createApp(App).mount('#app')
> ```

`bootstrapApplication` cree l'application Angular avec le composant racine (`AppComponent`) et la configuration (`appConfig`).

---

#### `app.config.ts` -- La configuration

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ]
};
```

C'est ici que vous enregistrez les **providers globaux** : router, HTTP client, interceptors, etc.

> **Equivalent Vue** :
> ```typescript
> const app = createApp(App)
> app.use(router)
> app.use(pinia)
> ```

---

#### `app.routes.ts` -- Les routes

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [];
```

Le fichier est vide pour l'instant. Nous y ajouterons des routes dans le module 04.

> **Equivalent Vue** : `router/index.ts` avec `createRouter()`.

---

#### `app.component.ts` -- Le composant racine

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'devdesk';
}
```

Remarquez :
- `standalone: true` : pas besoin de NgModule
- `imports: [RouterOutlet]` : declare ses dependances
- `selector: 'app-root'` : correspond au `<app-root>` dans `index.html`
- `templateUrl` et `styleUrl` : fichiers separes (contrairement au SFC Vue)

---

#### `index.html` -- Le HTML hote

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Devdesk</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

Le `<app-root>` est remplace par le composant `AppComponent` au demarrage. Equivalent du `<div id="app">` en Vue.

---

#### `angular.json` -- Le chef d'orchestre

Ce fichier configure tout le build system. Les sections importantes :

```json
{
  "projects": {
    "devdesk": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "dist/devdesk",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "styles": ["src/styles.scss"],
            "scripts": []
          }
        },
        "serve": { /* ... config du dev server ... */ },
        "test": { /* ... config des tests ... */ }
      }
    }
  }
}
```

> **Equivalent Vue** : `vite.config.ts`. Mais `angular.json` est plus verbeux car il gere aussi les tests, les budgets de bundle, et les environnements.

---

#### `tsconfig.json` et variantes

Angular utilise plusieurs fichiers TypeScript :

| Fichier | Role |
|---------|------|
| `tsconfig.json` | Config de base heritee par les autres |
| `tsconfig.app.json` | Config pour le code applicatif |
| `tsconfig.spec.json` | Config pour les tests |

Le mode strict est active par defaut. C'est une bonne chose -- laissez-le.

---

## 3. Creer votre premier composant standalone

### Utiliser le CLI

```bash
ng generate component hello --inline-template --inline-style
# Raccourci : ng g c hello --inline-template --inline-style
```

Cela genere `src/app/hello/hello.component.ts` :

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-hello',
  standalone: true,
  imports: [],
  template: `<p>hello works!</p>`,
  styles: ``
})
export class HelloComponent {}
```

### Enrichir le composant

Modifions-le pour utiliser un Signal et `@if` :

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-hello',
  standalone: true,
  imports: [],
  template: `
    <div class="hello">
      <h1>Bonjour, {{ name() }} !</h1>

      <input
        [value]="name()"
        (input)="name.set($any($event.target).value)"
        placeholder="Votre nom"
      />

      @if (name().length > 0) {
        <p>Votre nom contient {{ name().length }} caracteres.</p>
      } @else {
        <p>Entrez votre nom ci-dessus.</p>
      }
    </div>
  `,
  styles: [`
    .hello {
      padding: 2rem;
      font-family: sans-serif;
    }
    input {
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-top: 1rem;
    }
  `]
})
export class HelloComponent {
  name = signal('Angular');
}
```

### Afficher le composant dans AppComponent

Ouvrez `app.component.ts` et ajoutez l'import :

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HelloComponent } from './hello/hello.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HelloComponent],
  template: `
    <h1>DevDesk</h1>
    <app-hello />
    <router-outlet />
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent {}
```

> **Rappel piege #1** : n'oubliez pas d'ajouter `HelloComponent` dans le tableau `imports` ! Sinon Angular ne reconnaitra pas `<app-hello />`.

---

## 4. Lancer le serveur de developpement

```bash
ng serve
```

Ouvrez `http://localhost:4200` dans votre navigateur. Vous devriez voir :

```
DevDesk
Bonjour, Angular !
[input field]
Votre nom contient 7 caracteres.
```

### Hot reload

Modifiez n'importe quel fichier et sauvegardez. Le navigateur se rafraichit automatiquement en quelques millisecondes.

> **Equivalent Vue** : `npm run dev` avec Vite. Le comportement est quasiment identique, Angular 19+ utilisant egalement Vite sous le capot.

### Options utiles de `ng serve`

| Option | Effet |
|--------|-------|
| `--port 3000` | Change le port (defaut: 4200) |
| `--open` ou `-o` | Ouvre le navigateur automatiquement |
| `--host 0.0.0.0` | Accessible depuis le reseau local |
| `--hmr` | Active le Hot Module Replacement |

---

## 5. Builder pour la production

```bash
ng build
```

Le build produit un dossier `dist/devdesk/` avec :

```
dist/devdesk/
├── browser/
│   ├── index.html
│   ├── main-[hash].js         # Code applicatif
│   ├── polyfills-[hash].js    # Polyfills navigateur
│   └── styles-[hash].css      # Styles compiles
```

### Analyser la taille du bundle

```bash
ng build --stats-json
npx webpack-bundle-analyzer dist/devdesk/browser/stats.json
```

> **Equivalent Vue** : `npm run build` + `npx vite-bundle-visualizer`.

### Budgets de build

Angular a un concept unique : les **budgets** dans `angular.json`. Ils vous alertent si votre bundle depasse une taille limite :

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kB",
    "maximumError": "1MB"
  }
]
```

En entreprise, ces budgets empechent les regressions de performance. C'est un filet de securite que Vue n'offre pas nativement.

---

## 6. Commandes CLI essentielles

Voici les commandes que vous utiliserez quotidiennement :

| Commande | Action |
|----------|--------|
| `ng serve` | Lancer le dev server |
| `ng build` | Builder pour la production |
| `ng test` | Lancer les tests unitaires |
| `ng generate component nom` | Generer un composant |
| `ng generate service nom` | Generer un service |
| `ng lint` | Verifier le code (si ESLint configure) |
| `ng update` | Mettre a jour Angular |
| `ng add @angular/material` | Ajouter une librairie Angular |

---

## Pratique : creez votre HelloComponent

> **Consigne** : avant de regarder la solution, essayez par vous-meme pendant 20 minutes.

1. Creez un nouveau projet : `ng new devdesk --style=scss --routing`
2. Generez un composant `hello` : `ng g c hello --inline-template --inline-style`
3. Ajoutez un `signal` pour stocker un nom
4. Ajoutez un champ `<input>` qui met a jour le signal
5. Utilisez `@if` pour afficher un message conditionnel
6. Importez le composant dans `AppComponent`
7. Lancez avec `ng serve` et verifiez le resultat

**Criteres de reussite** :
- Le composant s'affiche correctement
- Le signal se met a jour en temps reel quand on tape
- Le `@if`/`@else` fonctionne
- Pas d'erreur dans la console

---

## Recapitulatif

| Ce que vous avez appris | Detail |
|-------------------------|--------|
| Creer un projet | `ng new` avec options |
| Structure des fichiers | `main.ts`, `app.config.ts`, `app.routes.ts`, `angular.json` |
| Composant standalone | `@Component` avec `standalone: true` |
| Signal basique | `signal()`, `.set()`, lecture avec `()` |
| Template syntax | `{{ }}`, `@if`, `(event)`, `[value]` |
| Dev server | `ng serve` avec hot reload |
| Build production | `ng build` avec budgets |

---

## Prochain cours

**[Module 01 - Cours 1 -- Anatomie d'un composant standalone](../01-composants-templates/01-anatomie-composant-standalone.md)**
Nous plongerons en detail dans la structure d'un composant Angular : decorateur, metadonnees, cycle de vie et bonnes pratiques.

---

## Lien vers l'exercice

**[Exercice 01 -- HelloComponent](./exercices/01-hello-component.md)**
Mettez en pratique ce que vous venez d'apprendre en creant un composant complet avec signal, input et affichage conditionnel.
