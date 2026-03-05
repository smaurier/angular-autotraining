# Cours 4 — Les composants standalone

> **Objectif** : Comprendre ce qu'est un composant standalone Angular, son anatomie via le décorateur `@Component`, et savoir en créer un depuis zéro ou via la CLI. Faire le parallèle avec les Single File Components (SFC) de Vue 3.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle commande permet de créer un nouveau projet Angular avec la CLI ?</summary>

```bash
ng new mon-projet
```

La CLI pose ensuite des questions sur le routage et le format de styles.
</details>

<details>
<summary>2. Quel fichier est le point d'entrée de l'application Angular ?</summary>

`src/main.ts` — il appelle `bootstrapApplication(AppComponent)` pour démarrer l'application.
</details>

<details>
<summary>3. Où se trouve la configuration TypeScript du projet ?</summary>

Dans `tsconfig.json` (config globale) et `tsconfig.app.json` (config spécifique à l'application).
</details>

---

## Analogie

Imaginez une **boîte LEGO**. Chaque brique est autonome : elle contient sa forme, sa couleur et ses connecteurs. Vous n'avez pas besoin d'un « catalogue central » pour savoir comment assembler les briques entre elles — chacune porte ses propres informations.

Un **composant standalone** Angular fonctionne de la même manière : il embarque tout ce dont il a besoin (template, styles, dépendances) sans passer par un module centralisé (`NgModule`). C'est exactement l'approche que vous connaissez déjà avec les SFC de Vue 3.

---

## Théorie

### Qu'est-ce qu'un composant standalone ?

Depuis Angular 14, et **par défaut depuis Angular 17+**, les composants sont **standalone**. Cela signifie qu'ils n'ont plus besoin d'être déclarés dans un `NgModule`.

```typescript
// Angular < 14 : il fallait un NgModule
@NgModule({
  declarations: [MonComposant],  // ❌ Plus nécessaire
  imports: [CommonModule],
})
export class MonModule {}
```

```typescript
// Angular 19+ : composant standalone (par défaut)
@Component({
  selector: 'app-mon-composant',
  template: `<h1>Bonjour !</h1>`,
})
export class MonComposant {}  // ✅ Autonome, pas de NgModule
```

> Depuis Angular 19, `standalone: true` est la valeur par défaut. Vous n'avez même plus besoin de l'écrire explicitement.

### Le décorateur @Component

Le décorateur `@Component` est le coeur de tout composant Angular. Voici ses propriétés principales :

```typescript
import { Component } from '@angular/core';

@Component({
  // Nom de la balise HTML personnalisée
  selector: 'app-carte-utilisateur',

  // Template inline (directement dans le fichier)
  template: `
    <div class="carte">
      <h2>{{ nom }}</h2>
    </div>
  `,

  // Styles scopés au composant
  styles: [`
    .carte {
      border: 1px solid #ccc;
      padding: 16px;
      border-radius: 8px;
    }
  `],

  // Dépendances d'autres composants/directives/pipes
  imports: [],
})
export class CarteUtilisateurComponent {
  nom = 'Alice';
}
```

| Propriété       | Description                                        | Obligatoire |
|-----------------|----------------------------------------------------|-------------|
| `selector`      | Balise HTML du composant (`app-xxx`)               | Oui         |
| `template`      | Template HTML inline                               | Oui*        |
| `templateUrl`   | Chemin vers un fichier HTML externe                | Oui*        |
| `styles`        | Tableau de styles inline                           | Non         |
| `styleUrl`      | Chemin vers un fichier CSS/SCSS externe             | Non         |
| `imports`       | Composants, directives, pipes utilisés             | Non         |

> \* Il faut **soit** `template`, **soit** `templateUrl`, jamais les deux.

### Template inline vs fichier externe

**Template inline** (petit composant) :

```typescript
@Component({
  selector: 'app-badge',
  template: `<span class="badge">{{ label }}</span>`,
  styles: [`.badge { background: #007bff; color: white; padding: 4px 8px; }`],
})
export class BadgeComponent {
  label = 'Nouveau';
}
```

**Template externe** (composant plus complexe) :

```typescript
@Component({
  selector: 'app-tableau-bord',
  templateUrl: './tableau-bord.component.html',
  styleUrl: './tableau-bord.component.scss',
})
export class TableauBordComponent {}
```

> **Bonne pratique** : utilisez un template inline si le HTML fait moins de ~10 lignes. Au-delà, préférez un fichier externe pour la lisibilité.

### Créer un composant avec la CLI

```bash
# Crée un composant standalone (par défaut en Angular 19)
ng generate component carte-utilisateur

# Raccourci
ng g c carte-utilisateur
```

Fichiers générés :

```
src/app/carte-utilisateur/
├── carte-utilisateur.component.ts       # Classe + décorateur
├── carte-utilisateur.component.html     # Template
├── carte-utilisateur.component.scss     # Styles
└── carte-utilisateur.component.spec.ts  # Tests
```

Options utiles :

```bash
# Template et styles inline
ng g c badge --inline-template --inline-style

# Sans fichier de test
ng g c badge --skip-tests

# Dans un sous-dossier
ng g c composants/badge
```

### Importer d'autres composants avec `imports`

Contrairement aux `NgModule` qui importaient pour tout un module, chaque composant standalone déclare **ses propres dépendances** :

```typescript
import { Component } from '@angular/core';
import { BadgeComponent } from './badge/badge.component';
import { CarteUtilisateurComponent } from './carte-utilisateur/carte-utilisateur.component';

@Component({
  selector: 'app-liste-utilisateurs',
  imports: [BadgeComponent, CarteUtilisateurComponent],  // ✅ Imports explicites
  template: `
    <h1>Utilisateurs</h1>
    <app-carte-utilisateur />
    <app-badge />
  `,
})
export class ListeUtilisateursComponent {}
```

```typescript
// ❌ Oublier d'importer = erreur dans le template
@Component({
  selector: 'app-liste-utilisateurs',
  imports: [],  // BadgeComponent manquant !
  template: `<app-badge />`,  // ❌ Angular ne connaît pas cette balise
})
export class ListeUtilisateursComponent {}
```

### Comparaison avec Vue 3 SFC

| Concept             | Vue 3 SFC                         | Angular Standalone             |
|---------------------|------------------------------------|--------------------------------|
| Fichier unique      | `.vue` (template + script + style)| `.ts` inline ou `.ts` + `.html` + `.scss` |
| Déclaration         | `defineComponent()` / `<script setup>` | `@Component({})` décorateur  |
| Balise HTML         | Nom du fichier / `name`           | `selector: 'app-xxx'`         |
| Styles scopés       | `<style scoped>`                  | Encapsulation par défaut       |
| Import composants   | `import` + utilisation directe    | `import` + `imports: [...]`    |
| Module central      | Aucun                             | Aucun (standalone)             |

```vue
<!-- Vue 3 SFC -->
<script setup>
import Badge from './Badge.vue'
</script>

<template>
  <Badge />
</template>

<style scoped>
/* styles scopés */
</style>
```

```typescript
// Angular standalone — équivalent
import { BadgeComponent } from './badge.component';

@Component({
  selector: 'app-parent',
  imports: [BadgeComponent],
  template: `<app-badge />`,
  styles: [``],  // styles encapsulés par défaut
})
export class ParentComponent {}
```

---

## Pratique

Créez un composant `CarteProduit` qui affiche le nom et le prix d'un produit. Puis créez un composant `ListeProduits` qui utilise `CarteProduit` trois fois.

**Consignes** :
1. Utilisez la CLI pour générer `carte-produit` avec template inline
2. Affichez un nom et un prix dans le template
3. Générez `liste-produits` et importez-y `CarteProduitComponent`

<details>
<summary>Solution</summary>

```bash
ng g c carte-produit --inline-template --inline-style
ng g c liste-produits
```

```typescript
// carte-produit.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-carte-produit',
  template: `
    <div class="carte">
      <h3>{{ nom }}</h3>
      <p>{{ prix }} EUR</p>
    </div>
  `,
  styles: [`
    .carte {
      border: 1px solid #ddd;
      padding: 12px;
      margin: 8px;
      border-radius: 6px;
    }
  `],
})
export class CarteProduitComponent {
  nom = 'Clavier mécanique';
  prix = 89.99;
}
```

```typescript
// liste-produits.component.ts
import { Component } from '@angular/core';
import { CarteProduitComponent } from '../carte-produit/carte-produit.component';

@Component({
  selector: 'app-liste-produits',
  imports: [CarteProduitComponent],
  templateUrl: './liste-produits.component.html',
})
export class ListeProduitsComponent {}
```

```html
<!-- liste-produits.component.html -->
<h2>Nos produits</h2>
<app-carte-produit />
<app-carte-produit />
<app-carte-produit />
```
</details>

---

## Résumé

| Point clé                        | À retenir                                                    |
|----------------------------------|--------------------------------------------------------------|
| Standalone par défaut            | Depuis Angular 17+, plus besoin de `NgModule`                |
| `@Component`                     | Décorateur obligatoire avec `selector` et `template`/`templateUrl` |
| `imports: [...]`                 | Chaque composant déclare ses propres dépendances             |
| CLI                              | `ng g c nom-composant` pour générer rapidement               |
| Template inline vs externe       | Inline pour les petits composants, externe pour les gros     |
| Styles encapsulés                | Par défaut, les styles ne fuient pas vers les autres composants |
| Parallèle Vue                    | SFC `.vue` = composant standalone `.ts` (même philosophie)   |

---

> **Prochain cours** : [Cours 5 — Les signaux (Signals) : signal, computed, effect](./02-signaux-base.md)
