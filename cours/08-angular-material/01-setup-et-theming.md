# Cours 32 — Installation et theming Angular Material

> **Objectif** : Installer Angular Material dans un projet Angular 19+, configurer un theme personnalise (palette, typographie, dark mode) et comprendre le positionnement de Material face aux autres librairies UI. Faire le parallele avec Vuetify/Quasar en Vue 3.

---

## Rappel du cours precedent

<details>
<summary>1. Quelle est la difference entre un FormGroup et un FormArray dans les Reactive Forms ?</summary>

Un `FormGroup` regroupe des controles sous des cles nommees (`{ nom: ..., email: ... }`), tandis qu'un `FormArray` gere une liste ordonnee de controles (index 0, 1, 2...) utile pour les champs dynamiques.
</details>

<details>
<summary>2. Comment creer un validateur personnalise synchrone ?</summary>

C'est une fonction qui recoit un `AbstractControl` et retourne `null` (valide) ou un objet d'erreurs `{ cleErreur: true }` (invalide).
</details>

<details>
<summary>3. Pourquoi typer strictement ses formulaires en Angular 19+ ?</summary>

Le typage strict (`FormGroup<{ nom: FormControl<string> }>`) permet a TypeScript de detecter les erreurs a la compilation et ameliore l'autocompletion dans l'IDE.
</details>

---

## Analogie

En Vue 3, quand vous voulez un kit UI complet, vous installez **Vuetify** ou **Quasar**. Ces librairies fournissent un systeme de theming (couleurs, typographie), des composants prets a l'emploi et des utilitaires de layout.

**Angular Material** joue exactement le meme role dans l'ecosysteme Angular : c'est la librairie UI officielle, maintenue par l'equipe Angular elle-meme. Elle suit les principes Material Design de Google et s'integre nativement avec la CLI Angular.

| Vue 3 | Angular |
|-------|---------|
| Vuetify / Quasar | Angular Material |
| `vuetify.config.ts` (theme) | `styles.scss` (theme SCSS) |
| `createVuetify({ theme })` | `@use '@angular/material' as mat` |
| Plugin Vue | `ng add @angular/material` |

---

## Theorie

### Installation avec la CLI

```bash
ng add @angular/material
```

Cette commande fait tout automatiquement :
- Installe `@angular/material` et `@angular/cdk`
- Ajoute un theme predefini dans `angular.json`
- Configure les polices (Roboto) et les icones Material
- Met a jour `styles.scss`

> En ESN, c'est souvent la premiere commande apres `ng new` sur un projet client.

### Themes predefinis vs theme personnalise

Angular Material propose des themes predefinis :

```scss
// ❌ Theme predefini — rapide mais peu flexible
@use '@angular/material' as mat;
@include mat.core();

// Utilise un theme predefini (azure-blue, rose-red, etc.)
```

```scss
// ✅ Theme personnalise — recommande en entreprise
@use '@angular/material' as mat;

$mon-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,
    tertiary: mat.$blue-palette,
  ),
  typography: (
    brand-family: 'Roboto',
    plain-family: 'Roboto',
  ),
  density: (
    scale: 0,
  ),
));

html {
  @include mat.all-component-themes($mon-theme);
}
```

### Palette de couleurs personnalisee

En Angular Material 3 (M3), vous pouvez definir vos propres palettes :

```scss
@use '@angular/material' as mat;

// Palette a partir d'une couleur de base
$ma-palette: mat.define-palette(mat.$indigo-palette);

// Ou utiliser les palettes predefinies
$mon-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$violet-palette,
    tertiary: mat.$orange-palette,
  ),
));
```

### Configuration de la typographie

```scss
$mon-theme: mat.define-theme((
  typography: (
    brand-family: 'Inter',        // Titres
    plain-family: 'Roboto',       // Corps de texte
    bold-weight: 700,
    medium-weight: 500,
    regular-weight: 400,
  ),
));
```

> **Bonne pratique ESN** : Utilisez la police du client si elle existe. Sinon, `Inter` ou `Roboto` sont des valeurs sures.

### Dark mode avec Signals

L'idee est de stocker l'etat du theme dans un signal et de basculer une classe CSS :

```typescript
// theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    // Synchroniser avec le DOM a chaque changement
    effect(() => {
      document.body.classList.toggle('dark-theme', this.isDark());
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }
}
```

```scss
// styles.scss
@use '@angular/material' as mat;

$theme-clair: mat.define-theme((
  color: (theme-type: light, primary: mat.$azure-palette),
));

$theme-sombre: mat.define-theme((
  color: (theme-type: dark, primary: mat.$azure-palette),
));

html {
  @include mat.all-component-themes($theme-clair);
}

.dark-theme {
  @include mat.all-component-colors($theme-sombre);
}
```

```typescript
// toggle dans un composant
@Component({
  selector: 'app-header',
  template: `
    <mat-toolbar color="primary">
      <span>Mon App</span>
      <button mat-icon-button (click)="theme.toggle()">
        <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>
  `,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule],
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
}
```

### Material Icons

Les icones Material sont incluses automatiquement par `ng add`. Sinon :

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

```html
<!-- Utilisation dans un template -->
<mat-icon>home</mat-icon>
<mat-icon>delete</mat-icon>
<mat-icon>settings</mat-icon>
```

> Catalogue complet : [fonts.google.com/icons](https://fonts.google.com/icons)

### Angular Material vs autres librairies UI

| Critere | Angular Material | PrimeNG | Ng-Zorro |
|---------|-----------------|---------|----------|
| Mainteneur | Equipe Angular (Google) | PrimeTek | Alibaba |
| Design system | Material Design 3 | Propre | Ant Design |
| Integration Angular | Native | Bonne | Bonne |
| Popularite ESN | Tres forte | Forte | Moyenne |
| CDK inclus | Oui | Non | Non |
| Gratuit | Oui | Oui (+ templates payants) | Oui |

> **En ESN**, Angular Material est le choix par defaut sur ~70% des projets Angular. PrimeNG est l'alternative principale quand le client veut un look non-Google.

### Importer les modules individuellement

```typescript
// ❌ Ne jamais tout importer d'un coup
import { MatButtonModule, MatIconModule, MatToolbarModule,
         MatCardModule, MatTableModule, MatDialogModule } from '@angular/material';
```

```typescript
// ✅ Importer module par module dans chaque composant
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatButtonModule, MatIconModule],
  // ...
})
export class MonComposant {}
```

> Chaque composant standalone n'importe que ce qu'il utilise. Le tree-shaking elimine le reste.

---

## Pratique

Configurez un projet Angular avec Angular Material, un theme personnalise et un bouton de bascule dark/light mode.

**Consignes** :
1. Creez un nouveau projet (`ng new material-demo`) et ajoutez Material
2. Definissez un theme personnalise dans `styles.scss` avec deux variantes (clair/sombre)
3. Creez un `ThemeService` avec un signal `isDark`
4. Creez un composant `HeaderComponent` avec un `mat-toolbar` et un bouton toggle

<details>
<summary>Solution</summary>

```bash
ng new material-demo --style=scss
cd material-demo
ng add @angular/material
ng g s services/theme
ng g c components/header --inline-template
```

```scss
// src/styles.scss
@use '@angular/material' as mat;

$theme-clair: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$cyan-palette,
    tertiary: mat.$orange-palette,
  ),
));

$theme-sombre: mat.define-theme((
  color: (
    theme-type: dark,
    primary: mat.$cyan-palette,
    tertiary: mat.$orange-palette,
  ),
));

html {
  @include mat.all-component-themes($theme-clair);
}

.dark-theme {
  @include mat.all-component-colors($theme-sombre);
}

body {
  margin: 0;
  font-family: Roboto, sans-serif;
}
```

```typescript
// src/app/services/theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle('dark-theme', this.isDark());
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }
}
```

```typescript
// src/app/components/header/header.component.ts
import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary">
      <span>Material Demo</span>
      <span style="flex: 1"></span>
      <button mat-icon-button (click)="theme.toggle()">
        <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>
  `,
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
}
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| Installation | `ng add @angular/material` configure tout automatiquement |
| Theme personnalise | `mat.define-theme()` avec palettes, typographie et densite |
| Dark mode | Signal + `classList.toggle()` + variante CSS `.dark-theme` |
| Icones | `<mat-icon>nom</mat-icon>` avec la police Material Icons |
| Imports | Un module par composant Material, importe individuellement |
| Choix ESN | Angular Material = defaut, PrimeNG = alternative |

---

> **Prochain cours** : [Cours 33 — Composants Material courants : Table, Dialog, Snackbar](./02-composants-courants.md)
