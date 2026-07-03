---
titre: Le control flow Angular — @if, @for (track), @empty, @switch
cours: 03-angular
notions: ["@if / @else if / @else", "variable de bloc avec as", "@for avec track obligatoire", "variables contextuelles $index $first $last $count", "@empty", "@switch / @case / @default", "control flow integre au template sans import"]
outcomes:
  - "sait afficher du contenu conditionnel avec @if / @else if / @else et capturer la valeur avec as"
  - "sait iterer sur une collection avec @for en fournissant un track stable et correct"
  - "sait afficher un etat vide avec @empty et choisir entre track id, track $index et track item"
  - "sait choisir @switch / @case / @default pour aiguiller sur une seule valeur a plusieurs cas"
  - "sait utiliser les variables contextuelles $index $first $last $count dans une boucle"
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone, module 02 signaux-base]
next: 04-binding-et-events
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — rendu de la liste des propositions de sortie (etats vides, badges de statut, boucle sur les activites)
last-reviewed: 2026-07
---

# Le control flow Angular — `@if`, `@for`, `@empty`, `@switch`

> **Outcomes — tu sauras FAIRE :** afficher du conditionnel avec `@if`, itérer une liste avec `@for` + `track`, gérer la liste vide avec `@empty`, et aiguiller sur une valeur avec `@switch`.
> **Difficulté :** :star::star:
>
> **Portée :** ce module couvre **le control flow dans le template** : `@if` / `@else`, `@for` (avec `track`, `@empty`, variables contextuelles) et `@switch`. C'est tout. Le **binding** d'attributs et la gestion fine des **événements** `(click)` au-delà de l'usage minimal sont le **module 04**. Les `input()` / `output()` pour passer des données entre composants sont le **module 05**. Le chargement asynchrone d'une liste (`resource`) est le **module 10**. On réutilise les `signal()` / `computed()` du **module 02** comme sources de données, sans rien introduire de neuf côté état.

## 1. Cas concret d'abord

Deuxième écran de TribuZen : la **liste des propositions de sortie**. La famille propose des activités (« Accrobranche », « Ciné », « Pique-nique au parc »), chacune avec un statut (`proposee`, `validee`, `annulee`). L'écran doit :

- afficher **un message spécifique** quand aucune activité n'a encore été proposée ;
- **lister** chaque activité avec son numéro d'ordre ;
- montrer **un badge différent selon le statut** ;
- afficher **une bannière** en haut seulement si au moins une activité est validée.

En venant de Vue, le réflexe est un mélange de `v-for`, `v-if` et une gestion manuelle de la liste vide. Un collègue a tenté l'ancienne syntaxe Angular (`*ngFor`, `*ngIf`) :

```html
<!-- AVANT — ancienne syntaxe structurelle, verbeuse et sans etat vide integre -->
<div *ngIf="activites.length === 0">Aucune activite.</div>
<div *ngFor="let a of activites">{{ a.titre }} — {{ a.statut }}</div>
```

Problèmes : la liste vide est gérée par un `*ngIf` séparé qu'il faut penser à synchroniser, l'index et le premier/dernier élément demandent des variables `let i = index` peu lisibles, et le statut afficherait du texte brut au lieu d'un badge. Angular 17+ règle tout ça avec un **control flow intégré au template** : `@if`, `@for` (avec `@empty` inclus) et `@switch`. Pas d'import, pas de directive structurelle. Ce module te donne les trois blocs.

---

## 2. Théorie complète, concise

### 2.1 Un control flow intégré, sans import

Depuis Angular 17 (stable et recommandé en 19), les blocs `@if`, `@for` et `@switch` font partie du **moteur de template** lui-même. On ne les importe pas, on ne les déclare pas dans `imports`. Ils remplacent les directives structurelles `*ngIf`, `*ngFor`, `ngSwitch`, qui sont maintenant l'ancienne façon de faire.

La syntaxe utilise l'arobase `@` suivi d'un bloc entre accolades `{ ... }`.

### 2.2 `@if` / `@else if` / `@else`

La condition est **n'importe quelle expression** du template (souvent un signal lu avec `()`).

```html
@if (score() >= 90) {
  <p class="excellent">Excellent</p>
} @else if (score() >= 50) {
  <p class="moyen">Peut mieux faire</p>
} @else {
  <p class="insuffisant">Insuffisant</p>
}
```

`@else if` et `@else` sont optionnels. Le contenu d'une branche non prise n'est **pas rendu** dans le DOM (contrairement à un simple masquage CSS).

### 2.3 Capturer la valeur avec `as`

Quand l'expression d'un `@if` produit une valeur qu'on veut réutiliser dans le bloc, on la stocke avec `as` :

```html
@if (utilisateur(); as user) {
  <p>Bonjour {{ user.nom }}</p>
} @else {
  <p>Non connecte</p>
}
```

Ici `user` contient la valeur (véridique) de `utilisateur()`. Utile pour éviter de rappeler `utilisateur()` plusieurs fois et pour se débarrasser du `?` de navigation optionnelle à l'intérieur du bloc.

### 2.4 `@for` et le `track` **obligatoire**

`@for` itère sur une collection. **Le `track` est obligatoire** — le template ne compile pas sans lui. `track` dit à Angular **comment identifier** chaque élément entre deux rendus, pour réutiliser les nœuds DOM au lieu de tout recréer.

```html
@for (activite of activites(); track activite.id) {
  <li>{{ activite.titre }}</li>
}
```

La syntaxe est `@for (item of collection; track <clé>) { ... }`. La collection peut être un tableau, un signal lu avec `()`, n'importe quel itérable.

**Quel `track` choisir ?**

- **`track item.id`** — le cas normal : un identifiant métier stable et unique. À privilégier dès qu'il existe.
- **`track item`** (l'objet lui-même) — piège fréquent. Si tu mets à jour la liste de façon **immuable** (module 02 : `map`, spread), chaque objet est une **nouvelle référence** à chaque rendu, donc Angular recrée tout le DOM et perd l'état (focus, scroll). Angular signale même l'erreur **NG0956** dans ce cas. À éviter avec des objets mutés immuablement.
- **`track $index`** — dernier recours quand il n'y a **aucun identifiant** (ex. liste de chaînes primitives sans clé). Attention : `$index` gère mal les réordonnancements, car l'identité suit la **position**, pas l'élément.
- **`track nom`** (l'élément lui-même, pour des primitifs uniques) — acceptable pour un tableau de chaînes uniques.

### 2.5 Variables contextuelles de `@for`

À l'intérieur d'un `@for`, Angular fournit des variables implicites, **toujours** disponibles :

| Variable  | Type      | Sens                              |
|-----------|-----------|-----------------------------------|
| `$index`  | `number`  | index (commence à 0)              |
| `$first`  | `boolean` | premier élément                   |
| `$last`   | `boolean` | dernier élément                   |
| `$even`   | `boolean` | index pair                        |
| `$odd`    | `boolean` | index impair                      |
| `$count`  | `number`  | nombre total d'éléments           |

On peut les **aliaser** avec un segment `let`, utile pour la lisibilité ou pour éviter les collisions dans des `@for` imbriqués :

```html
@for (activite of activites(); track activite.id; let i = $index, e = $even) {
  <li [class.paire]="e">{{ i + 1 }}. {{ activite.titre }}</li>
}
```

### 2.6 `@empty` — la liste vide, intégrée

Le bloc `@empty` se place **juste après** le bloc `@for` et s'affiche quand la collection est vide. Plus besoin d'un `@if` séparé à synchroniser.

```html
@for (activite of activites(); track activite.id) {
  <li>{{ activite.titre }}</li>
} @empty {
  <li>Aucune activite proposee pour le moment.</li>
}
```

### 2.7 `@switch` / `@case` / `@default`

Pour aiguiller sur **une seule valeur** ayant plusieurs cas (typiquement un statut) :

```html
@switch (activite.statut) {
  @case ('validee') {
    <span class="badge vert">Validee</span>
  }
  @case ('annulee') {
    <span class="badge rouge">Annulee</span>
  }
  @default {
    <span class="badge gris">Proposee</span>
  }
}
```

La comparaison des `@case` est stricte (`===`). Un seul `@case` correspondant est rendu ; `@default` (optionnel) couvre le reste.

**Pas de fall-through en Angular.** Contrairement au `switch` de JavaScript, `@switch` **ne permet pas** d'enchaîner plusieurs `@case` vides pour partager un même bloc (`@case ('reviewer') @case ('editor') { ... }` ne compile pas). Pour regrouper plusieurs valeurs sur un même rendu, deux techniques :

- **normaliser en amont avec un `computed`** — mapper les valeurs équivalentes vers une seule clé, puis un seul `@case` :

```typescript
// dans la classe : 'reviewer' et 'editor' -> 'staff'
roleAffiche = computed(() =>
  ['reviewer', 'editor'].includes(this.permission()) ? 'staff' : this.permission()
);
```

```html
@switch (roleAffiche()) {
  @case ('staff') {
    <app-editor-dashboard />
  }
  @default {
    <app-viewer-dashboard />
  }
}
```

- **ou un `@if` avec `||`** quand il n'y a que deux ou trois valeurs à regrouper :

```html
@if (permission() === 'reviewer' || permission() === 'editor') {
  <app-editor-dashboard />
} @else {
  <app-viewer-dashboard />
}
```

Règle de choix : `@switch` dès **3 cas ou plus** sur la même valeur ; en dessous, `@if / @else` reste plus lisible.

---

## 3. Worked examples

### Exemple 1 — `ListeSortiesComponent` complet (TribuZen)

On assemble le cas concret : bannière conditionnelle, boucle avec `track` + numéro d'ordre, badge de statut via `@switch`, et état vide via `@empty`.

```typescript
// liste-sorties.component.ts
import { Component, signal, computed } from '@angular/core';

type Statut = 'proposee' | 'validee' | 'annulee';

interface Activite {
  id: string;
  titre: string;
  statut: Statut;
}

@Component({
  selector: 'app-liste-sorties',
  standalone: true,
  template: `
    <h2>Propositions de sortie</h2>

    <!-- Banniere : @if sur un computed derive de la liste -->
    @if (auMoinsUneValidee()) {
      <p class="banniere">Au moins une activite est validee, on peut reserver.</p>
    }

    <ul>
      <!-- track activite.id : identifiant metier stable -> reutilisation DOM correcte
           let num = $index : alias lisible pour numeroter -->
      @for (activite of activites(); track activite.id; let num = $index) {
        <li>
          {{ num + 1 }}. {{ activite.titre }}

          <!-- @switch aiguille le badge sur le statut (3 cas -> switch, pas if/else) -->
          @switch (activite.statut) {
            @case ('validee') {
              <span class="badge vert">Validee</span>
            }
            @case ('annulee') {
              <span class="badge rouge">Annulee</span>
            }
            @default {
              <span class="badge gris">Proposee</span>
            }
          }
        </li>
      } @empty {
        <!-- @empty : rendu uniquement quand activites() est vide -->
        <li class="vide">Aucune activite proposee pour le moment.</li>
      }
    </ul>
  `,
})
export class ListeSortiesComponent {
  // signal source (module 02) — en vrai produit viendra de resource (module 10)
  activites = signal<Activite[]>([
    { id: 'a1', titre: 'Accrobranche',       statut: 'proposee' },
    { id: 'a2', titre: 'Cine',               statut: 'validee'  },
    { id: 'a3', titre: 'Pique-nique au parc', statut: 'annulee'  },
  ]);

  // computed derive : true si au moins une activite est validee
  auMoinsUneValidee = computed(() =>
    this.activites().some(a => a.statut === 'validee')
  );
}
```

**Ce qui se passe** : `@for` rend une `<li>` par activité en réutilisant les nœuds grâce à `track activite.id`. `@switch` choisit le bon badge sans cascade de `@if`. Si `activites()` devient `[]`, le bloc `@empty` prend le relais **automatiquement**. La bannière apparaît/disparaît selon le `computed` `auMoinsUneValidee()`.

### Exemple 2 — `@if ... as` + `@for` imbriqué avec alias

On affiche le détail d'une famille sélectionnée et la liste de ses membres, avec un séparateur seulement entre les lignes (pas après la dernière).

```typescript
import { Component, signal } from '@angular/core';

interface Famille {
  nom: string;
  membres: string[];
}

@Component({
  selector: 'app-famille-detail',
  standalone: true,
  template: `
    <!-- as capture la valeur : on ecrit fam.nom au lieu de rappeler familleSelectionnee() -->
    @if (familleSelectionnee(); as fam) {
      <h3>Famille {{ fam.nom }}</h3>

      <ul>
        @for (membre of fam.membres; track membre; let dernier = $last) {
          <li>{{ membre }}</li>
          <!-- $last : pas de separateur apres le dernier membre -->
          @if (!dernier) {
            <hr />
          }
        } @empty {
          <li>Cette famille n'a aucun membre.</li>
        }
      </ul>
    } @else {
      <p>Selectionne une famille.</p>
    }
  `,
})
export class FamilleDetailComponent {
  familleSelectionnee = signal<Famille | null>({
    nom: 'Maurier',
    membres: ['Alice', 'Bob', 'Cara'],
  });
}
```

Ici `track membre` est acceptable car `membres` est un tableau de **chaînes uniques**. `as fam` évite de rappeler `familleSelectionnee()` et supprime le besoin de `?.` dans le bloc (la valeur est garantie non nulle à l'intérieur).

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier `track` dans `@for`

```html
<!-- Erreur de compilation : @for exige track -->
@for (activite of activites()) {
  <li>{{ activite.titre }}</li>
}

<!-- Correct -->
@for (activite of activites(); track activite.id) {
  <li>{{ activite.titre }}</li>
}
```

Contrairement à `:key` en Vue qui est seulement **recommandé**, `track` est **obligatoire** en Angular — le template ne compile pas sans lui.

### PIÈGE #2 — `track item` (l'objet) avec des mises à jour immuables

```html
<!-- Mauvais : track sur l'objet -> nouvelle reference a chaque update immuable
     -> Angular recree tout le DOM (perte de focus/scroll), erreur NG0956 -->
@for (todo of todos(); track todo) {
  <li>{{ todo.tache }}</li>
}

<!-- Bon : track sur l'id stable -> Angular reutilise les noeuds -->
@for (todo of todos(); track todo.id) {
  <li>{{ todo.tache }}</li>
}
```

Comme au module 02, on met à jour les listes de façon **immuable** (`map`, spread), ce qui crée de **nouveaux objets**. `track todo` compare l'identité de l'objet, qui change à chaque fois → tout est recréé. Toujours `track` sur une **clé stable** (`id`).

### PIÈGE #3 — `track $index` par défaut

```html
<!-- Risque : si la liste est reordonnee/filtree, l'identite suit la position,
     pas l'element -> etat associe (input, focus) attribue au mauvais item -->
@for (activite of activites(); track $index) { ... }
```

`$index` n'est un bon `track` **que** s'il n'existe aucun identifiant et que la liste ne bouge pas (pas de tri, pas de filtre, pas d'insertion au milieu). Sinon, préfère un `id`.

### PIÈGE #4 — Gérer la liste vide avec un `@if` séparé au lieu de `@empty`

```html
<!-- Verbeux et fragile : deux conditions a garder synchro -->
@if (activites().length === 0) { <p>Vide</p> }
@for (a of activites(); track a.id) { <li>{{ a.titre }}</li> }

<!-- Idiomatique : @empty est lie au @for, impossible de desynchroniser -->
@for (a of activites(); track a.id) {
  <li>{{ a.titre }}</li>
} @empty {
  <p>Vide</p>
}
```

`@empty` fait partie du bloc `@for` : il n'y a qu'une seule source de vérité sur « la liste est-elle vide ».

### PIÈGE #5 — Utiliser `@switch` pour deux cas, ou `@if` pour cinq cas

`@switch` sur une valeur binaire est du bruit ; une cascade de cinq `@if / @else if` sur la même variable est illisible. Règle : **1-2 cas → `@if`**, **3+ cas sur la même valeur → `@switch`**. Et `@switch` compare en **`===`** strict — `@case (1)` ne matche pas la chaîne `'1'`.

### PIÈGE #6 — Croire qu'il faut importer les blocs

```typescript
// Inutile : @if/@for/@switch ne sont PAS des directives a importer
imports: [NgIf, NgFor, NgSwitch]  // ancienne monde, plus necessaire
```

Le control flow est intégré au moteur de template. Aucun import, aucune entrée dans `imports`. (Les anciennes directives `*ngIf` / `*ngFor` existent encore pour la rétrocompat, mais on ne les utilise plus.)

---

## 5. Ancrage TribuZen

Le control flow est la **couche de rendu conditionnel et répété** de tout le front-office TribuZen. Dès qu'un écran affiche une liste, un état vide ou un contenu qui dépend d'un statut, ce sont ces blocs.

**`ListeSortiesComponent`** (Exemple 1) — la liste des propositions de sortie de la famille : `@for` + `track id` pour les activités, `@empty` pour l'onboarding (aucune proposition encore), `@switch` pour le badge de statut, `@if` pour la bannière « au moins une validée ». C'est le deuxième écran interactif, juste après le `SortieBudgetComponent` du module 02.

**`FamilleDetailComponent`** (Exemple 2) — le panneau de détail d'une famille : `@if ... as` pour n'afficher le détail que si une famille est sélectionnée, `@for` sur les membres avec `$last` pour les séparateurs.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        liste-sorties.component.ts     ← Exemple 1 (@for/track/@empty/@switch/@if)
      familles/
        famille-detail.component.ts    ← Exemple 2 (@if as + @for imbrique)
```

> Le chargement des activités depuis l'API (au lieu du tableau en dur) relèvera de `resource` au **module 10** ; ici la source reste un `signal` local (module 02). Passer l'activité à un composant enfant `<app-carte-activite [activite]="activite" />` relèvera d'`input()` au **module 05**.

---

## 6. Points clés

1. `@if` / `@else if` / `@else` rendent du conditionnel ; la branche non prise n'existe **pas** dans le DOM. `@if (expr; as x)` capture la valeur pour le bloc.
2. `@for (item of collection; track <clé>)` : le `track` est **obligatoire** (le template ne compile pas sinon).
3. `track item.id` par défaut ; `track $index` seulement sans identifiant et sans réordonnancement ; **jamais** `track item` (l'objet) avec des updates immuables (erreur NG0956, DOM recréé).
4. Variables contextuelles de `@for` : `$index`, `$first`, `$last`, `$even`, `$odd`, `$count` — aliasables avec `let i = $index`.
5. `@empty` est attaché au `@for` et s'affiche quand la collection est vide — une seule source de vérité, pas de `@if` séparé.
6. `@switch` / `@case` / `@default` aiguille sur **une** valeur (comparaison `===`), à partir de 3 cas ; en dessous, `@if`.
7. Le control flow est **intégré au template** : aucun import, contrairement aux anciennes directives `*ngIf` / `*ngFor`.

---

## 7. Seeds Anki

```
Pourquoi le track est-il obligatoire dans un @for Angular ?|Il indique a Angular comment identifier chaque element entre deux rendus, pour reutiliser les noeuds DOM au lieu de tout recreer. Sans track, le template ne compile pas.
Quel track choisir par defaut dans @for ?|track item.id : un identifiant metier stable et unique. On l'utilise des qu'il existe.
Pourquoi track item (l'objet lui-meme) est-il un piege ?|Avec des updates immuables (map/spread), chaque objet est une nouvelle reference a chaque rendu -> Angular recree tout le DOM et perd focus/scroll (erreur NG0956). Il faut track sur une cle stable comme id.
Quand utiliser track $index ?|Uniquement quand il n'existe aucun identifiant et que la liste ne bouge pas (pas de tri/filtre/insertion). L'identite suit la position, donc gere mal les reordonnancements.
A quoi sert le bloc @empty ?|Il est attache au @for et s'affiche quand la collection est vide. Une seule source de verite, pas besoin d'un @if separe a synchroniser.
Comment capturer la valeur d'un @if pour la reutiliser dans le bloc ?|Avec as : @if (utilisateur(); as user) { {{ user.nom }} }. user contient la valeur veridique et evite le ?. dans le bloc.
Quand preferer @switch a @if ?|Des 3 cas ou plus sur la meme valeur. En dessous, @if/@else reste plus lisible. @switch compare en === strict.
Faut-il importer @if, @for et @switch ?|Non. Le control flow est integre au moteur de template Angular : aucun import, aucune entree dans imports. Il remplace *ngIf/*ngFor/ngSwitch.
Quelles variables contextuelles @for fournit-il ?|$index, $first, $last, $even, $odd, $count. Toujours disponibles, aliasables avec un segment let (ex: let i = $index).
```

---

## Pont vers le lab

> Lab associé : `labs/lab-03-control-flow/README.md`. Construire `ListeSortiesComponent` avec `@for` + `track`, `@empty`, `@switch` de statut et `@if` de bannière — dev server Angular en oracle visuel, corrigé commenté intégral.
