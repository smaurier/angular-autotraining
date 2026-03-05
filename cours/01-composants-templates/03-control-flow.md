# Cours 6 — Le nouveau control flow : @if, @for, @switch

> **Objectif** : Maîtriser la nouvelle syntaxe de contrôle de flux intégrée au template Angular (`@if`, `@for`, `@switch`), comprendre pourquoi `track` est obligatoire, et faire le parallèle avec les directives Vue (`v-if`, `v-for`).

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre signal() et computed() ?</summary>

`signal()` crée une valeur réactive en lecture/écriture (comme `ref()` en Vue). `computed()` crée une valeur dérivée en lecture seule qui se recalcule automatiquement quand ses dépendances changent.
</details>

<details>
<summary>2. Comment lit-on la valeur d'un signal dans un template Angular ?</summary>

On appelle le signal comme une fonction : `{{ monSignal() }}`. C'est la différence majeure avec Vue où on écrit `.value` dans le script et rien dans le template.
</details>

<details>
<summary>3. Pourquoi faut-il éviter d'utiliser effect() pour dériver une valeur ?</summary>

Parce que `computed()` est fait pour ça. `effect()` est réservé aux effets de bord (localStorage, API externes, logs). Utiliser `effect()` pour dériver une valeur crée des mises à jour inutiles et un code plus difficile à maintenir.
</details>

---

## Analogie

Pensez à un **aiguillage ferroviaire**. Le train (les données) arrive et l'aiguillage décide quel chemin prendre :
- **@if** : "Si le train va à Paris, voie A ; sinon, voie B" — un embranchement conditionnel
- **@for** : "Pour chaque wagon, appliquer l'étiquette" — une répétition
- **@switch** : "Selon la destination : Paris → voie 1, Lyon → voie 2, Marseille → voie 3" — un aiguillage multiple

L'ancienne syntaxe (`*ngIf`, `*ngFor`) était comme des panneaux manuscrits. La nouvelle syntaxe est intégrée directement dans les rails — plus claire, plus performante.

---

## Théorie

### L'ancienne syntaxe vs la nouvelle

Angular 17 a introduit une **nouvelle syntaxe de contrôle de flux** intégrée au template. Elle remplace les directives structurelles `*ngIf`, `*ngFor` et `ngSwitch`.

```html
<!-- ❌ Ancienne syntaxe (dépréciée) -->
<div *ngIf="estConnecte">Bienvenue !</div>
<div *ngFor="let item of items">{{ item }}</div>
```

```html
<!-- ✅ Nouvelle syntaxe (Angular 17+) -->
@if (estConnecte()) {
  <div>Bienvenue !</div>
}
@for (item of items(); track item.id) {
  <div>{{ item }}</div>
}
```

> La nouvelle syntaxe n'a **pas besoin d'import** — elle fait partie intégrante du moteur de template Angular.

### @if / @else if / @else

La condition peut être n'importe quelle expression JavaScript valide :

```typescript
@Component({
  selector: 'app-statut',
  template: `
    @if (score() >= 90) {
      <p class="excellent">Excellent !</p>
    } @else if (score() >= 50) {
      <p class="moyen">Peut mieux faire</p>
    } @else {
      <p class="insuffisant">Insuffisant</p>
    }
  `,
})
export class StatutComponent {
  score = signal(75);
}
```

**Avec une variable locale** (équivalent du `as` de l'ancien `*ngIf`) :

```html
@if (utilisateur(); as user) {
  <p>Bonjour {{ user.nom }} !</p>
} @else {
  <p>Veuillez vous connecter.</p>
}
```

> Le `as user` crée une variable locale `user` qui contient la valeur véridique (truthy) de l'expression.

**Comparaison avec Vue** :

```vue
<!-- Vue 3 -->
<p v-if="score >= 90" class="excellent">Excellent !</p>
<p v-else-if="score >= 50" class="moyen">Peut mieux faire</p>
<p v-else class="insuffisant">Insuffisant</p>
```

```html
<!-- Angular 19 -->
@if (score() >= 90) {
  <p class="excellent">Excellent !</p>
} @else if (score() >= 50) {
  <p class="moyen">Peut mieux faire</p>
} @else {
  <p class="insuffisant">Insuffisant</p>
}
```

### @for avec track

`@for` itère sur une collection. La propriété `track` est **obligatoire** :

```html
@for (produit of produits(); track produit.id) {
  <div class="carte-produit">
    <h3>{{ produit.nom }}</h3>
    <p>{{ produit.prix }} EUR</p>
  </div>
}
```

#### Pourquoi `track` est obligatoire

`track` indique à Angular comment identifier chaque élément de manière unique. Sans cela, Angular devrait recréer tous les éléments DOM à chaque changement — ce qui est très coûteux.

```html
<!-- ✅ track par une propriété unique -->
@for (user of utilisateurs(); track user.id) {
  <app-carte-utilisateur [user]="user" />
}

<!-- ✅ track par l'index (si pas d'identifiant unique) -->
@for (couleur of couleurs(); track $index) {
  <span>{{ couleur }}</span>
}

<!-- ✅ track par l'élément lui-même (types primitifs) -->
@for (nom of noms(); track nom) {
  <li>{{ nom }}</li>
}
```

> **Bonne pratique** : préférez `track item.id` quand c'est possible. `track $index` est un dernier recours car il ne gère pas bien les réordonnancements.

**Comparaison avec Vue** :

| Concept        | Vue 3                        | Angular 19                        |
|----------------|------------------------------|-----------------------------------|
| Boucle         | `v-for="item in items"`     | `@for (item of items(); track ...)` |
| Clé unique     | `:key="item.id"` (recommandé) | `track item.id` (obligatoire)   |
| Index          | `v-for="(item, i) in items"` | Variable implicite `$index`      |

#### Variables implicites de @for

`@for` fournit automatiquement des variables contextuelles utiles :

```html
@for (tache of taches(); track tache.id; let i = $index; let premier = $first; let dernier = $last) {
  <div
    [class.premier]="premier"
    [class.dernier]="dernier"
    [class.pair]="$even"
  >
    {{ i + 1 }}. {{ tache.titre }}
  </div>
}
```

| Variable    | Type      | Description                        |
|-------------|-----------|------------------------------------|
| `$index`    | `number`  | Index de l'élément (commence à 0) |
| `$first`    | `boolean` | `true` pour le premier élément     |
| `$last`     | `boolean` | `true` pour le dernier élément     |
| `$even`     | `boolean` | `true` si l'index est pair         |
| `$odd`      | `boolean` | `true` si l'index est impair       |
| `$count`    | `number`  | Nombre total d'éléments            |

### @empty — Quand la liste est vide

Le bloc `@empty` s'affiche quand la collection est vide :

```html
@for (notification of notifications(); track notification.id) {
  <div class="notification">
    {{ notification.message }}
  </div>
} @empty {
  <p class="aucun-resultat">Aucune notification pour le moment.</p>
}
```

> En Vue, il faut gérer ce cas manuellement avec un `v-if="items.length === 0"`. Angular le fait de manière déclarative avec `@empty`.

### @switch / @case / @default

Pour des conditions multiples sur la même expression :

```html
@switch (statut()) {
  @case ('actif') {
    <span class="badge vert">Actif</span>
  }
  @case ('en_attente') {
    <span class="badge jaune">En attente</span>
  }
  @case ('inactif') {
    <span class="badge rouge">Inactif</span>
  }
  @default {
    <span class="badge gris">Inconnu</span>
  }
}
```

> `@switch` est utile quand vous avez 3+ conditions sur la même valeur. Pour 2 conditions, `@if / @else` reste plus lisible.

### Afficher/masquer sans détruire : [hidden]

Vue a `v-show` qui toggle la visibilité CSS sans supprimer l'élément du DOM. Angular n'a pas d'équivalent structurel, mais on peut utiliser le binding `[hidden]` :

```html
<!-- Vue : v-show -->
<div v-show="visible">Contenu</div>

<!-- Angular : [hidden] -->
<div [hidden]="!visible()">Contenu</div>
```

| Directive      | Détruit le DOM ? | Quand l'utiliser                 |
|----------------|------------------|----------------------------------|
| `@if`          | Oui              | Condition rarement modifiée      |
| `[hidden]`     | Non              | Toggle fréquent (onglets, etc.) |

### Imbriquer les blocs

Les blocs peuvent être imbriqués librement :

```html
@if (categories().length > 0) {
  @for (categorie of categories(); track categorie.id) {
    <h2>{{ categorie.nom }}</h2>

    @for (produit of categorie.produits; track produit.id) {
      @if (produit.enStock) {
        <p>{{ produit.nom }} — {{ produit.prix }} EUR</p>
      }
    } @empty {
      <p>Aucun produit dans cette catégorie.</p>
    }
  }
} @else {
  <p>Aucune catégorie disponible.</p>
}
```

---

## Pratique

Créez un composant `ListeTaches` qui :
1. Contient un signal avec un tableau de tâches `{ id: number, titre: string, terminee: boolean }`
2. Affiche les tâches avec `@for` et `track`
3. Affiche un message `@empty` si la liste est vide
4. Utilise `@if` pour afficher un style différent pour les tâches terminées
5. Affiche le numéro de chaque tâche avec `$index`

<details>
<summary>Solution</summary>

```typescript
import { Component, signal } from '@angular/core';

interface Tache {
  id: number;
  titre: string;
  terminee: boolean;
}

@Component({
  selector: 'app-liste-taches',
  template: `
    <h2>Mes tâches ({{ taches().length }})</h2>

    @for (tache of taches(); track tache.id; let i = $index) {
      <div class="tache">
        @if (tache.terminee) {
          <s>{{ i + 1 }}. {{ tache.titre }}</s> ✓
        } @else {
          <span>{{ i + 1 }}. {{ tache.titre }}</span>
        }
        <button (click)="basculer(tache.id)">
          {{ tache.terminee ? 'Rouvrir' : 'Terminer' }}
        </button>
      </div>
    } @empty {
      <p>Bravo ! Aucune tâche en cours.</p>
    }
  `,
  styles: [`
    .tache { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
    s { color: #999; }
  `],
})
export class ListeTachesComponent {
  taches = signal<Tache[]>([
    { id: 1, titre: 'Apprendre les signaux', terminee: true },
    { id: 2, titre: 'Maîtriser @for', terminee: false },
    { id: 3, titre: 'Créer un projet', terminee: false },
  ]);

  basculer(id: number) {
    this.taches.update(liste =>
      liste.map(t =>
        t.id === id ? { ...t, terminee: !t.terminee } : t
      )
    );
  }
}
```
</details>

---

## Résumé

| Syntaxe            | Remplace         | Équivalent Vue          |
|--------------------|------------------|-------------------------|
| `@if / @else`      | `*ngIf`          | `v-if / v-else`         |
| `@for ... track`   | `*ngFor`         | `v-for ... :key`        |
| `@empty`           | —                | `v-if="!items.length"`  |
| `@switch / @case`  | `ngSwitch`       | Pas d'équivalent direct |
| `[hidden]`         | —                | `v-show`                |

**Points clés** :
- La nouvelle syntaxe est intégrée au template (pas d'import nécessaire)
- `track` est **obligatoire** dans `@for` (contrairement à `:key` en Vue qui est recommandé)
- `@empty` simplifie la gestion des listes vides
- Les variables implicites (`$index`, `$first`, `$last`, `$even`, `$odd`, `$count`) sont très pratiques
- Préférez `@if` pour les conditions rares, `[hidden]` pour les toggles fréquents

---

> **Prochain cours** : [Cours 7 — Binding et événements](./04-binding-et-events.md)
