---
titre: Binding et événements — [prop], (event), [attr.]/[class.]/[style.], #ref
cours: 03-angular
notions: ["property binding [prop]", "event binding (event) et $event", "attribute binding [attr.x]", "class binding [class.x]", "style binding [style.x] et unités", "two-way [(ngModel)] et FormsModule", "variable de référence template #var", "interpolation vs binding"]
outcomes:
  - sait lier une propriété DOM à une expression avec le property binding [prop]
  - sait écouter un événement DOM avec (event) et récupérer l'objet $event dans le handler
  - sait choisir entre [attr.x], [class.x] et [style.x] selon la cible, et ajouter une unité avec [style.width.px]
  - sait mettre en place un two-way binding de formulaire avec [(ngModel)] après avoir importé FormsModule
  - sait déclarer une variable de référence template #var et l'utiliser dans le même template
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone, module 02 signaux-base, module 03 control-flow]
next: 05-input-output-model
libs: [{ name: "@angular/core", version: "19" }, { name: "@angular/forms", version: "19" }]
tribuzen: front-office TribuZen — couche liaison template de la carte d'activité (image, bouton d'inscription, styles d'état) et du champ de recherche d'activités
last-reviewed: 2026-07
---

# Binding et événements — `[prop]`, `(event)`, `[attr.]` / `[class.]` / `[style.]`, `#ref`

> **Outcomes — tu sauras FAIRE :** lier une propriété DOM avec `[prop]`, écouter un événement avec `(event)` et son `$event`, piloter attribut/classe/style dynamiquement, et déclarer une référence template `#var`.
> **Difficulté :** :star::star:
>
> **Portée :** ce module couvre **la liaison entre la classe du composant et le template** : property binding `[prop]`, event binding `(event)`, attribute/class/style binding, two-way `[(ngModel)]` de formulaire, et variable de référence `#var`. C'est tout. Le passage de données **entre composants** — `input()`, `output()`, et le two-way signal `model()` — est le **module 05** ; ne les confonds pas avec `[(ngModel)]` vu ici, qui est un two-way de **contrôle de formulaire**. Les signaux (`signal`/`computed`) viennent du **module 02**, le control flow `@if`/`@for` du **module 03**. Pas de DI ni de RxJS ici.

## 1. Cas concret d'abord

Deuxième écran interactif de TribuZen : la **carte d'activité**. Une famille parcourt les sorties proposées ; chaque carte affiche une photo, un titre, un bouton « M'inscrire » et doit **réagir visuellement à son état** — grisée quand l'activité est complète, bouton désactivé pendant l'envoi, bordure d'alerte quand il ne reste qu'une place.

Un collègue a tout écrit en HTML statique, puis a essayé de coller les valeurs dynamiques avec de l'interpolation partout :

```typescript
// aventure-card.component.ts — AVANT (interpolation détournée)
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-aventure-card',
  template: `
    <!-- interpolation dans un attribut : fragile, et impossible pour disabled -->
    <img src="{{ urlPhoto() }}" alt="{{ titre() }}" />
    <button disabled="{{ envoiEnCours() }}">M'inscrire</button>
  `,
})
export class AventureCardComponent {
  urlPhoto = signal('/img/canoe.jpg');
  titre = signal('Canoë en famille');
  envoiEnCours = signal(false);
}
```

Deux problèmes. D'abord `disabled="{{ envoiEnCours() }}"` ne fonctionne pas comme attendu : l'interpolation produit la **chaîne** `"false"`, et en HTML un attribut `disabled` présent — même à `"false"` — désactive le bouton. Ensuite, aucune classe ni style ne bouge quand l'état change.

Ce qu'il faut, c'est lier des **propriétés DOM** (pas des attributs texte) à des expressions, écouter les **événements** du bouton, et piloter **classes et styles** selon l'état. C'est exactement le rôle du binding Angular. Ce module te donne les cinq formes : `[prop]`, `(event)`, `[attr.]`, `[class.]`, `[style.]`, plus la référence `#var`.

---

## 2. Théorie complète, concise

### 2.1 Les quatre directions de flux

Angular a une syntaxe par direction de flux de données. Retiens le repère : **crochets `[]` = donnée qui entre dans le DOM**, **parenthèses `()` = événement qui sort du DOM**.

| Syntaxe | Direction | Exemple |
|---|---|---|
| interpolation | composant → DOM (texte) | `{{ titre() }}` |
| `[prop]` | composant → DOM (propriété) | `[disabled]="envoiEnCours()"` |
| `(event)` | DOM → composant | `(click)="sInscrire()"` |
| `[(ngModel)]` | bidirectionnel | `[(ngModel)]="recherche"` |

### 2.2 Property binding — `[prop]="expression"`

`[prop]` lie une **propriété du DOM** (pas un attribut HTML) à une expression du composant. L'expression est réévaluée à chaque cycle de détection ; la propriété reçoit la **vraie valeur** (booléen, nombre, objet), pas une chaîne.

```typescript
@Component({
  selector: 'app-aventure-card',
  template: `
    <img [src]="urlPhoto()" [alt]="titre()" />
    <button [disabled]="envoiEnCours()">M'inscrire</button>
    <input [value]="titre()" [placeholder]="indice()" />
  `,
})
export class AventureCardComponent {
  urlPhoto = signal('/img/canoe.jpg');
  titre = signal('Canoë en famille');
  envoiEnCours = signal(false);
  indice = signal('Titre de l\'activité');
}
```

Ici `[disabled]="envoiEnCours()"` passe le **booléen** `false` → le bouton est actif ; `true` → désactivé. C'est la solution au piège du §1.

**Interpolation vs property binding.** L'interpolation `{{ expr }}` est du sucre pour un binding vers la propriété textuelle : réserve-la au **contenu texte**. Dès qu'une valeur est booléenne, numérique, ou vise une vraie propriété (`src`, `disabled`, `value`), utilise `[prop]`.

### 2.3 Event binding — `(event)="handler($event)"`

`(event)` écoute un événement DOM et exécute une **expression** — le plus souvent l'appel d'une méthode. La méthode doit être **invoquée** avec `()` : `(click)="sInscrire()"`. Écrire `(click)="sInscrire"` (sans parenthèses) ne l'exécute jamais — Angular signale d'ailleurs le diagnostic NG8111.

```typescript
@Component({
  selector: 'app-recherche-activite',
  template: `
    <button (click)="sInscrire()">M'inscrire</button>

    <!-- $event = l'objet DOM natif de l'événement -->
    <input (input)="surSaisie($event)" />

    <!-- pseudo-event clavier filtré : ne se déclenche que sur Entrée -->
    <input (keyup.enter)="lancerRecherche()" />
  `,
})
export class RechercheActiviteComponent {
  sInscrire() {
    console.log('Inscription !');
  }

  surSaisie(event: Event) {
    // le DOM ne type pas event.target : on affine avec un cast
    const input = event.target as HTMLInputElement;
    console.log('Saisie :', input.value);
  }

  lancerRecherche() {
    console.log('Recherche lancée');
  }
}
```

Deux détails qui comptent :

- **`$event`** est la variable magique qui expose l'objet événement natif au handler. Pour un événement DOM standard, son type est `Event` (à affiner par cast, ex. `HTMLInputElement`).
- **Modificateurs clavier** : Angular filtre les touches directement dans le nom du binding — `(keyup.enter)`, `(keydown.escape)`, `(keydown.control.s)`. En revanche, il **n'y a pas** de `.prevent`/`.stop` dans le template (contrairement à Vue) : `event.preventDefault()` / `event.stopPropagation()` s'appellent **dans le handler**.

### 2.4 Attribute binding — `[attr.nom]="expression"`

Certains attributs HTML n'ont **pas** de propriété DOM correspondante (`colspan`, `aria-*`, `data-*`). Le property binding classique ne peut donc pas les viser : on passe par `[attr.nom]`.

```html
<!-- ARIA : accessibilité (pas de propriété DOM 'aria-label') -->
<button [attr.aria-label]="labelBouton()">X</button>

<!-- colspan n'a pas de propriété DOM -->
<td [attr.colspan]="nbColonnes()">Total</td>
```

Règle de choix : **propriété DOM existante → `[prop]`** (`[disabled]`, `[value]`, `[src]`) ; **pas de propriété DOM → `[attr.x]`**. Un binding `[attr.x]` dont l'expression vaut `null` **retire** l'attribut du DOM.

### 2.5 Class binding — `[class.nom]="condition"`

`[class.nom]` ajoute la classe `nom` quand l'expression est vraie (truthy), la retire sinon. C'est le moyen le plus lisible pour **une** classe conditionnelle.

```html
<div
  class="carte"                          
  [class.complet]="estComplet()"
  [class.derniere-place]="placesRestantes() === 1"
>
  ...
</div>
```

Points vérifiés :

- La classe **statique** `class="carte"` et les `[class.x]` dynamiques **coexistent** : Angular fusionne les deux, l'attribut statique n'est jamais écrasé.
- Pour piloter plusieurs classes d'un coup depuis un objet, il existe aussi `[class]="{ complet: estComplet(), actif: estActif() }"` (forme objet). Reste sur `[class.x]` tant qu'il n'y a qu'une ou deux classes.

### 2.6 Style binding — `[style.propriété]="expression"`

`[style.prop]` lie **un** style inline. La forme la plus utile ajoute l'**unité** dans le nom du binding, ce qui évite la concaténation de chaînes.

```html
<div [style.color]="couleurTexte()">Texte</div>

<!-- l'unité est dans le nom du binding : la valeur reste un nombre pur -->
<div [style.width.px]="largeur()">Barre</div>
<div [style.font-size.rem]="taille()">Grand</div>

<!-- opacité dérivée d'un état de survol -->
<div [style.opacity]="survole() ? 0.6 : 1">Carte</div>
```

`[style.width.px]="largeur()"` avec `largeur()` valant `240` produit `width: 240px`. Sans le suffixe `.px`, il faudrait écrire `[style.width]="largeur() + 'px'"`.

### 2.7 Two-way binding — `[(ngModel)]` (« banana in a box »)

Le two-way binding combine un `[prop]` (composant → DOM) et un `(event)` (DOM → composant) en une seule syntaxe : les parenthèses **à l'intérieur** des crochets, `[(...)]`. Pour les champs de formulaire, Angular fournit `ngModel`, exposé par `FormsModule`.

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-recherche-activite',
  imports: [FormsModule],           // ⚠️ sans cet import, [(ngModel)] ne compile pas
  template: `
    <input [(ngModel)]="recherche" placeholder="Filtrer les activités" />
    <p>Recherche : {{ recherche }}</p>
  `,
})
export class RechercheActiviteComponent {
  recherche = '';                   // propriété liée dans les deux sens
}
```

Deux garde-fous :

- L'ordre des symboles est **`[( )]`**, pas `([ ])`. `([ngModel])="..."` est interprété par Angular comme un event binding nommé `[ngModel]` et **ne lie rien** (diagnostic NG8101).
- `FormsModule` **doit** être importé dans le composant standalone. Oubli fréquent en venant de Vue, où `v-model` marche sans import.

> Le two-way **entre composants** basé sur les signaux (`model()`) est un autre outil, vu au **module 05**. Ici, `[(ngModel)]` reste cantonné aux champs de formulaire.

### 2.8 Variable de référence template — `#var`

Une variable de référence, déclarée avec `#nom` sur un élément, donne accès à cet élément (ou au composant/directive porté) **dans le reste du même template**.

```html
<!-- #champNom référence l'élément <input> -->
<input #champNom type="text" />

<!-- on lit sa valeur DOM directement dans un handler -->
<button (click)="saluer(champNom.value)">Saluer</button>

<!-- ou on appelle une méthode DOM native -->
<button (click)="champNom.focus()">Donner le focus</button>
```

`champNom` est ici l'`HTMLInputElement` lui-même : `champNom.value`, `champNom.focus()` sont les API DOM natives. Une référence template est **locale au template** : elle n'est pas visible dans la classe. Pour manipuler l'élément **depuis la classe**, on utilise une requête de vue (`viewChild`) — c'est une notion de composants avancés, hors de ce module ; ici on reste sur l'usage template-à-template, qui couvre la majorité des besoins (lire une valeur, déclencher un focus).

---

## 3. Worked examples

### Exemple 1 — `AventureCardComponent` : property, event, class et style bindings (TribuZen)

On reprend la carte d'activité du §1 et on la rend entièrement réactive à son état.

```typescript
// aventure-card.component.ts — version binding complet
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-aventure-card',
  standalone: true,
  template: `
    <article
      class="carte"
      [class.complet]="estComplet()"
      [class.derniere-place]="placesRestantes() === 1"
      [style.opacity]="survole() ? 0.85 : 1"
      (mouseenter)="survole.set(true)"
      (mouseleave)="survole.set(false)"
    >
      <!-- property binding : vraie URL, vrai texte alt -->
      <img [src]="urlPhoto()" [alt]="titre()" [style.width.px]="largeurPhoto()" />

      <h3>{{ titre() }}</h3>
      <p>{{ placesRestantes() }} place(s) restante(s)</p>

      <!-- [disabled] reçoit un booléen : désactivé si complet OU envoi en cours -->
      <!-- [attr.aria-label] : attribut sans propriété DOM -->
      <button
        [disabled]="estComplet() || envoiEnCours()"
        [attr.aria-label]="'M inscrire a ' + titre()"
        (click)="sInscrire()"
      >
        {{ envoiEnCours() ? 'Envoi…' : 'M\'inscrire' }}
      </button>
    </article>
  `,
  styles: [`
    .carte { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; transition: opacity .2s; }
    .complet { filter: grayscale(1); }
    .derniere-place { border-color: #ef4444; }
  `],
})
export class AventureCardComponent {
  urlPhoto        = signal('/img/canoe.jpg');
  titre           = signal('Canoë en famille');
  placesRestantes = signal(3);
  envoiEnCours    = signal(false);
  survole         = signal(false);
  largeurPhoto    = signal(240);

  // computed dérivé (module 02) : plus aucune place
  estComplet = computed(() => this.placesRestantes() === 0);

  sInscrire() {
    if (this.estComplet()) return;
    // simulation d'une prise de place — la logique réelle (HTTP) viendra plus tard
    this.placesRestantes.update(n => Math.max(0, n - 1));
  }
}
```

**Ce qui se joue.** `[disabled]` reçoit un booléen calculé, donc le bouton se grise dès la dernière place prise. `[class.complet]` bascule le filtre grayscale via `estComplet()`. `[style.opacity]` réagit au survol capté par `(mouseenter)`/`(mouseleave)` qui écrivent dans le signal `survole`. Chaque `[prop]` lit un signal avec `()` — la réactivité vient des signaux (module 02), le binding ne fait que **relier** classe et template.

### Exemple 2 — champ de recherche : `(input)` + `$event`, `#ref` et `[(ngModel)]`

Le bandeau de recherche d'activités montre les trois façons de récupérer ce que tape l'utilisateur.

```typescript
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-recherche-activite',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Voie A : event binding + $event, on lit la valeur du DOM -->
    <input (input)="surSaisie($event)" placeholder="Recherche (event)" />

    <!-- Voie B : variable de référence template, valeur lue au moment du clic -->
    <input #champ placeholder="Recherche (#ref)" />
    <button (click)="rechercher(champ.value)">Chercher</button>
    <button (click)="champ.focus()">Focus</button>

    <!-- Voie C : two-way de formulaire, la propriété suit la frappe automatiquement -->
    <input [(ngModel)]="terme" placeholder="Recherche (ngModel)" />

    <p>Terme courant : {{ terme }}</p>
  `,
})
export class RechercheActiviteComponent {
  terme = '';                       // liée en two-way par [(ngModel)]
  dernierEvenement = signal('');

  surSaisie(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dernierEvenement.set(input.value);
  }

  rechercher(valeur: string) {
    console.log('Recherche :', valeur);
  }
}
```

**Comparaison des trois voies.** La voie A (`$event`) sert quand on veut l'objet événement complet (touche pressée, cible…). La voie B (`#champ`) lit la valeur **à la demande**, sans état intermédiaire — idéale pour un bouton « Chercher ». La voie C (`[(ngModel)]`) maintient `terme` synchronisé en continu, au prix de l'import `FormsModule`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Interpoler un attribut booléen (`disabled="{{ ... }}"`)

```html
<!-- ❌ produit la chaîne "false" ; un attribut disabled présent désactive TOUJOURS -->
<button disabled="{{ envoiEnCours() }}">Envoyer</button>

<!-- ✅ property binding : passe le vrai booléen -->
<button [disabled]="envoiEnCours()">Envoyer</button>
```

L'interpolation vise la représentation **texte**. Pour un booléen, un nombre ou une vraie propriété DOM, utilise `[prop]`.

### PIÈGE #2 — Oublier d'invoquer la méthode dans un event binding

```html
<!-- ❌ référence la fonction sans l'appeler : rien ne s'exécute (NG8111) -->
<button (click)="sInscrire">M'inscrire</button>

<!-- ✅ on invoque avec () -->
<button (click)="sInscrire()">M'inscrire</button>
```

Dans un `(event)`, la valeur est une **expression à exécuter** au déclenchement, pas une référence de fonction à passer.

### PIÈGE #3 — « banana in a box » à l'envers

```html
<!-- ❌ ([ngModel]) : interprété comme un event binding nommé [ngModel], ne lie rien (NG8101) -->
<input ([ngModel])="terme" />

<!-- ✅ [(ngModel)] : banane DANS la boîte -->
<input [(ngModel)]="terme" />
```

Moyen mnémotechnique : **la banane `()` est dans la boîte `[]`** → `[( )]`.

### PIÈGE #4 — `[(ngModel)]` sans importer `FormsModule`

```typescript
// ❌ compile pas : « Can't bind to 'ngModel' since it isn't a known property »
@Component({ selector: 'app-x', template: `<input [(ngModel)]="v" />` })

// ✅ importer FormsModule dans le composant standalone
@Component({ selector: 'app-x', imports: [FormsModule], template: `<input [(ngModel)]="v" />` })
```

Contrairement à `v-model` en Vue, `[(ngModel)]` n'est pas natif : il vient de `@angular/forms`.

### PIÈGE #5 — Chercher `.prevent` / `.stop` dans le template

```html
<!-- ❌ n'existe pas en Angular -->
<form (submit.prevent)="envoyer()"></form>

<!-- ✅ on appelle preventDefault() dans le handler via $event -->
<form (submit)="envoyer($event)"></form>
```

```typescript
envoyer(event: Event) {
  event.preventDefault();   // et/ou event.stopPropagation()
  // ...
}
```

Les modificateurs d'événement de Vue n'ont pas d'équivalent template en Angular : la logique passe par `$event` dans la méthode.

### PIÈGE #6 — Confondre `[attr.x]` et `[x]`

```html
<!-- ❌ 'colspan' n'est pas une propriété DOM → binding sans effet -->
<td [colspan]="n()">…</td>

<!-- ✅ pas de propriété DOM → attribute binding -->
<td [attr.colspan]="n()">…</td>

<!-- ✅ 'disabled' EST une propriété DOM → property binding -->
<button [disabled]="charge()">…</button>
```

Règle : propriété DOM existante → `[x]` ; sinon (`colspan`, `aria-*`, `data-*`) → `[attr.x]`.

---

## 5. Ancrage TribuZen

Le binding est la **couche de liaison** entre l'état (signaux du module 02) et le DOM de tous les composants front-office TribuZen. Dès qu'un écran réagit visuellement à une donnée, c'est du property/class/style binding ; dès qu'il capte une action, c'est de l'event binding.

**`AventureCardComponent`** (Exemple 1) — la carte d'activité du catalogue : `[src]`/`[alt]` pour la photo, `[disabled]` pour le bouton d'inscription, `[class.complet]`/`[class.derniere-place]` et `[style.opacity]` pour les états visuels, `(click)`/`(mouseenter)`/`(mouseleave)` pour les interactions.

**`RechercheActiviteComponent`** (Exemple 2) — le bandeau de recherche : `(input)` + `$event`, référence `#champ` pour un bouton « Chercher », et `[(ngModel)]` pour le filtre lié en continu.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      activites/
        aventure-card.component.ts        ← Exemple 1 (property/class/style/event)
        recherche-activite.component.ts   ← Exemple 2 (event/$event, #ref, ngModel)
```

> Le titre, la photo et le nombre de places arriveront d'un parent via `input()` au **module 05** ; ici ils sont en `signal` local. L'événement d'inscription remontera au parent via `output()` (module 05 aussi) ; ici `sInscrire()` traite l'action localement. Le rendu d'une liste de cartes avec `@for` relève du **module 03**.

---

## 6. Points clés

1. Repère de flux : crochets `[]` = donnée qui entre dans le DOM, parenthèses `()` = événement qui en sort, `[()]` = les deux.
2. `[prop]="expr"` lie une **propriété DOM** à la vraie valeur (booléen, nombre, objet) ; réserve l'interpolation `{{ }}` au contenu texte.
3. `(event)="handler($event)"` écoute un événement ; la méthode doit être **invoquée** avec `()`, et `$event` expose l'objet natif.
4. Modificateurs clavier dans le nom du binding (`(keyup.enter)`) ; `preventDefault`/`stopPropagation` s'appellent dans le handler, pas via des modificateurs template.
5. `[attr.x]` uniquement quand il n'y a pas de propriété DOM (`colspan`, `aria-*`, `data-*`) ; sinon `[x]`.
6. `[class.nom]` bascule une classe conditionnelle (fusionnée avec la classe statique) ; `[style.prop]` un style, avec unité intégrée via `[style.width.px]`.
7. `[(ngModel)]` = two-way de formulaire, banane dans la boîte `[( )]`, **nécessite** `FormsModule` — distinct de `model()` (module 05).
8. `#var` référence un élément dans le **même** template (`champ.value`, `champ.focus()`) ; pour l'atteindre depuis la classe, ce sera une requête de vue plus tard.

---

## 7. Seeds Anki

```
Pourquoi disabled="{{ envoiEnCours() }}" ne marche-t-il pas ?|L'interpolation produit la chaîne "false" ; en HTML un attribut disabled présent — même à "false" — désactive l'élément. Il faut le property binding [disabled]="envoiEnCours()" qui passe le vrai booléen.
Quand utiliser [prop] plutôt que l'interpolation ?|Pour toute vraie propriété DOM ou valeur non-texte (booléen, nombre, objet) : [disabled], [src], [value]. L'interpolation est réservée au contenu textuel.
Que se passe-t-il si on écrit (click)="sInscrire" sans parenthèses ?|Rien ne s'exécute : dans un event binding la valeur est une expression à exécuter, pas une référence de fonction. Angular signale le diagnostic NG8111. Il faut (click)="sInscrire()".
Comment récupérer l'objet événement dans un handler Angular ?|Via la variable $event passée au handler : (input)="surSaisie($event)". Son type est Event, à affiner par cast (ex. event.target as HTMLInputElement).
Quand utiliser [attr.x] au lieu de [x] ?|Quand l'attribut n'a PAS de propriété DOM correspondante : colspan, aria-*, data-*. Pour disabled, src, value (propriétés DOM existantes), on utilise [x].
Que fait [style.width.px]="largeur()" si largeur() vaut 240 ?|Produit width: 240px. Le suffixe .px ajoute l'unité automatiquement, la valeur liée reste un nombre pur — pas de concaténation de chaîne.
Quelle est la syntaxe correcte du two-way binding et que faut-il importer ?|[(ngModel)]="terme" — la banane () dans la boîte []. Il faut importer FormsModule dans le composant. ([ngModel]) à l'envers est interprété comme un event binding et ne lie rien (NG8101).
À quoi sert une variable de référence template #var ?|Elle référence un élément (ou composant) dans le reste du même template : #champ donne champ.value, champ.focus(). Elle est locale au template ; pour l'atteindre depuis la classe on utilise une requête de vue (viewChild).
Comment empêcher le comportement par défaut d'un événement en Angular ?|Il n'y a pas de modificateur .prevent dans le template : on passe $event au handler et on appelle event.preventDefault() (et/ou event.stopPropagation()) dans la méthode.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-04-binding-et-events/README.md`. Construire la carte d'activité TribuZen — property/class/style bindings pilotés par des signaux, event bindings, référence `#var` et `[(ngModel)]` — avec `ng serve` comme oracle visuel, zéro gap-fill, corrigé commenté intégral.
