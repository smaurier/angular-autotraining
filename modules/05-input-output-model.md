---
titre: Communication parent-enfant — input(), output(), model()
cours: 03-angular
notions: ["input()", "InputSignal lecture seule", "input.required()", "valeur par défaut", "transform (booleanAttribute / numberAttribute)", "alias", "input lu dans un computed()", "output()", "OutputEmitterRef", "emit()", "model()", "ModelSignal", "two-way binding [(prop)]", "model.required()", "desugar [prop] + (propChange)"]
outcomes:
  - sait recevoir une donnée du parent avec input() et input.required() et la lire comme un signal
  - sait transformer un attribut entrant avec transform (booleanAttribute / numberAttribute) et le renommer avec alias
  - sait émettre un événement typé vers le parent avec output() et emit()
  - sait créer une liaison bidirectionnelle avec model() et la câbler côté parent avec la syntaxe [(prop)]
  - sait choisir entre input, output et model selon le sens de circulation de la donnée
prerequis: [modules 00-04, dont 02-signaux-base]
next: 06-lifecycle-hooks
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — le planificateur de sortie éclaté en composants (carte de config parent, contrôleur de participants enfant réutilisable)
last-reviewed: 2026-07
---

# Communication parent-enfant — `input()`, `output()`, `model()`

> **Outcomes — tu sauras FAIRE :** recevoir une donnée du parent avec `input()` / `input.required()`, émettre un événement avec `output()`, et créer une liaison bidirectionnelle avec `model()` (`[(prop)]`).
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **la communication entre un composant parent et un composant enfant, uniquement via les API signal d'Angular 19** : `input()` (parent → enfant), `output()` (enfant → parent), `model()` (les deux). C'est tout. La communication via un **service partagé** et l'injection de dépendances sont les **modules 11-13**. Les flux asynchrones (RxJS) sont les **modules 16-17**. On reste sur du passage de données direct de composant à composant, sans DI ni Observable.

## 1. Cas concret d'abord

Au module 02, on a construit `SortieBudgetComponent` d'un seul bloc : `participants`, `prixParPersonne`, `budgetMax` étaient tous des `signal` locaux dans le **même** composant. Ça tient tant que tout l'écran est monolithique.

Mais TribuZen grandit. On veut réutiliser le **contrôleur de participants** (les boutons `-1` / `+1` et le compteur) à plusieurs endroits : sur la sortie famille, mais aussi sur une future page « atelier ». On l'extrait donc dans un composant enfant `CompteurParticipantsComponent`. Immédiatement, trois questions se posent :

1. Le parent connaît le **minimum** et le **maximum** autorisés (0 à 20 personnes). Comment les **fait-il descendre** dans l'enfant ?
2. Quand l'utilisateur pousse le compteur au-delà du max, l'enfant veut **prévenir** le parent (pour afficher une alerte au niveau de la page). Comment **remonte-t-il** cet événement ?
3. Le nombre de participants doit rester **synchronisé dans les deux sens** : le parent le lit pour calculer le budget, mais l'enfant le modifie. Comment obtenir une liaison **bidirectionnelle** ?

Voici l'enfant, non câblé, avec ses trois trous :

```typescript
// compteur-participants.component.ts — AVANT (rien ne relie parent et enfant)
import { Component } from '@angular/core';

@Component({
  selector: 'app-compteur-participants',
  template: `
    <button (click)="retirer()">-1</button>
    <span>??? participants</span>
    <button (click)="ajouter()">+1</button>
  `,
})
export class CompteurParticipantsComponent {
  // Comment recevoir min / max du parent ?          → input()
  // Comment prévenir le parent d'un dépassement ?    → output()
  // Comment partager le nombre dans les deux sens ?  → model()
  retirer() { /* ??? */ }
  ajouter() { /* ??? */ }
}
```

En Angular 19, ces trois trous se bouchent avec trois fonctions signal : `input()`, `output()`, `model()`. Pas de décorateur `@Input` / `@Output` (l'ancienne API, hors périmètre ici), pas de service : du passage de données direct, typé, réactif.

---

## 2. Théorie complète, concise

### 2.1 Le sens de circulation détermine l'API

Trois directions, trois fonctions, toutes importées de `@angular/core` :

| Direction | API | Ce que l'enfant reçoit |
|-----------|-----|------------------------|
| Parent → Enfant | `input()` | un signal **en lecture seule** |
| Enfant → Parent | `output()` | un **émetteur** d'événements |
| Parent ↔ Enfant | `model()` | un signal **modifiable des deux côtés** |

C'est la première question à te poser devant un composant : « dans quel sens va la donnée ? ». La réponse choisit l'outil.

### 2.2 `input()` — recevoir du parent (lecture seule)

`input()` crée un `InputSignal<T>` : un signal **en lecture seule**, dont la valeur est fournie par le parent. On le lit comme tout signal, en l'appelant : `titre()`.

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-carte-sortie',
  template: `<h3>{{ titre() }}</h3><p>{{ lieu() }}</p>`,
})
export class CarteSortieComponent {
  // input optionnel AVEC valeur par défaut → InputSignal<string>
  readonly titre = input('Sortie sans nom');
  readonly lieu  = input('');
}
```

Signature vérifiée : `input<T>(defaultValue: T): InputSignal<T>`. Le type est inféré depuis la valeur par défaut (`input('')` → `InputSignal<string>`). Le mot-clé `readonly` est la convention recommandée : le composant ne réassigne jamais son propre input.

Côté parent, on **fournit** la valeur avec le property binding (`[prop]`, vu au module 04) :

```html
<app-carte-sortie [titre]="'Pique-nique au parc'" [lieu]="'Lyon'" />
<app-carte-sortie />   <!-- utilise les valeurs par défaut -->
```

**Un input NE se lit QUE, il ne s'écrit jamais depuis l'enfant.** `this.titre.set(...)` n'existe pas : `InputSignal` n'a pas de `set` / `update`. C'est le parent, et lui seul, qui pilote la valeur.

### 2.3 `input.required()` — input obligatoire

Sans valeur par défaut, un input doit être marqué **requis**, sinon sa valeur initiale serait `undefined`. `input.required<T>()` force le parent à le fournir, sous peine d'**erreur de compilation**.

```typescript
readonly sortieId = input.required<string>();   // InputSignal<string>, PAS string | undefined
readonly capacite = input.required<number>();
```

```html
<!-- ✅ tous les inputs requis fournis -->
<app-carte-sortie [sortieId]="'s-42'" [capacite]="20" />

<!-- ❌ erreur de compilation : 'sortieId' est requis -->
<app-carte-sortie [capacite]="20" />
```

Règle : **valeur par défaut sensée → `input(defaut)` ; donnée sans laquelle le composant n'a pas de sens → `input.required<T>()`.**

### 2.4 `transform` — normaliser la valeur entrante

L'option `transform` applique une fonction à la valeur reçue **avant** qu'elle n'entre dans le signal. Les deux transforms fournis par Angular sont `booleanAttribute` et `numberAttribute`, faits pour les attributs HTML (toujours des chaînes).

```typescript
import { Component, input, booleanAttribute, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-badge-sortie',
  template: `<span [class.actif]="actif()">Places : {{ places() }}</span>`,
})
export class BadgeSortieComponent {
  // "" ou présence seule de l'attribut → true ; absence → false
  readonly actif  = input(false, { transform: booleanAttribute });
  // la chaîne "20" devient le nombre 20
  readonly places = input(0, { transform: numberAttribute });
}
```

```html
<app-badge-sortie actif places="20" />     <!-- actif() === true, places() === 20 -->
<app-badge-sortie [actif]="false" />       <!-- actif() === false -->
```

Le type d'un input transformé a **deux** paramètres génériques : `input<TypeStocké, TypeAccepté>(...)`. Exemple : `input<boolean, unknown>(false, { transform: ... })` accepte `unknown` en entrée mais stocke un `boolean`. Pour les deux transforms standard, tu n'as pas besoin d'écrire les génériques : ils sont inférés.

### 2.5 `alias` — renommer l'input côté parent

L'option `alias` donne à l'input un **nom public** différent de son nom de propriété interne.

```typescript
// interne : labelTexte ; côté parent : "label"
readonly labelTexte = input('', { alias: 'label' });
```

```html
<app-badge-sortie label="Complet" />
```

À utiliser avec parcimonie (un nom qui diffère entre parent et enfant complique la lecture) — surtout utile pour exposer un nom d'API stable sans renommer la propriété interne.

### 2.6 Un input est un signal → il vit dans un `computed()`

Puisque `input()` renvoie un signal, il se **compose** directement avec `computed()` (module 02). C'est le gros gain de la nouvelle API : une valeur dérivée d'un input se recalcule automatiquement quand le parent change la valeur.

```typescript
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-prix-total',
  template: `<p>{{ prixFormate() }}</p>`,
})
export class PrixTotalComponent {
  readonly montant = input.required<number>();
  readonly devise  = input('EUR');

  // se recalcule dès que le parent modifie montant ou devise
  readonly prixFormate = computed(() => `${this.montant().toFixed(2)} ${this.devise()}`);
}
```

### 2.7 `output()` — émettre vers le parent

`output()` crée un `OutputEmitterRef<T>` : un émetteur d'événement typé. L'enfant **émet** avec `.emit(valeur)` ; le parent **écoute** avec l'event binding `(prop)` (module 04), et récupère la valeur via `$event`.

```typescript
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-barre-recherche',
  template: `
    <input #champ (keyup.enter)="lancer(champ.value)" />
    <button (click)="lancer(champ.value)">Chercher</button>
    <button (click)="annulation.emit()">Annuler</button>
  `,
})
export class BarreRechercheComponent {
  readonly recherche  = output<string>();   // OutputEmitterRef<string>
  readonly annulation = output<void>();      // OutputEmitterRef<void> — output() sans type = void

  lancer(terme: string) {
    this.recherche.emit(terme);
  }
}
```

```html
<app-barre-recherche
  (recherche)="surRecherche($event)"
  (annulation)="fermer()"
/>
```

```typescript
// dans le parent — $event porte la valeur émise, typée string
surRecherche(terme: string) { console.log('cherche', terme); }
```

Signature vérifiée : `output<T = void>(opts?): OutputEmitterRef<T>`. Un `output()` sans paramètre de type émet `void` — pour un événement « nu » (un clic, une annulation) qui ne transporte aucune donnée. Pas d'`EventEmitter` ni de `new` : `output()` remplace l'ancienne API `@Output`.

### 2.8 `model()` — liaison bidirectionnelle

`model()` combine un `input` et un `output` en un seul signal **modifiable des deux côtés**. Il renvoie un `ModelSignal<T>` : contrairement à `InputSignal`, il **possède** `set()` et `update()`. L'enfant peut donc écrire dedans, et sa modification **remonte** au parent.

```typescript
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-compteur-participants',
  template: `
    <button (click)="retirer()">-1</button>
    <span>{{ valeur() }} participants</span>
    <button (click)="ajouter()">+1</button>
  `,
})
export class CompteurParticipantsComponent {
  readonly valeur = model(0);   // ModelSignal<number> — lisible ET modifiable

  ajouter() { this.valeur.update(n => n + 1); }   // met à jour ET notifie le parent
  retirer() { this.valeur.update(n => Math.max(0, n - 1)); }
}
```

Côté parent, on utilise la syntaxe **two-way binding** `[(prop)]` (les « bananes dans une boîte ») :

```typescript
import { Component, signal } from '@angular/core';
import { CompteurParticipantsComponent } from './compteur-participants.component';

@Component({
  selector: 'app-page-sortie',
  imports: [CompteurParticipantsComponent],
  template: `
    <app-compteur-participants [(valeur)]="nbParticipants" />
    <p>Le parent voit : {{ nbParticipants() }}</p>
  `,
})
export class PageSortieComponent {
  readonly nbParticipants = signal(2);   // un signal writable
}
```

**Point clé (vérifié Context7) :** avec un signal côté parent, `[(valeur)]="nbParticipants"` lie l'**instance** du signal, pas sa valeur (`nbParticipants`, sans parenthèses). Quand l'enfant fait `.update(...)`, le signal du parent se met à jour tout seul, et tout `computed` qui en dépend (le budget, par exemple) se recalcule.

### 2.9 Le desugar de `[(prop)]`

`[(prop)]` n'est pas magique : c'est du sucre syntaxique. Angular le décompose en un input `prop` + un output nommé `propChange` :

```html
<!-- ces deux lignes sont équivalentes -->
<app-compteur-participants [(valeur)]="nbParticipants" />
<app-compteur-participants [valeur]="nbParticipants" (valeurChange)="nbParticipants.set($event)" />
```

`model()` crée donc **automatiquement** l'output `valeurChange` qui va avec l'input `valeur`. Comprendre ce desugar explique deux choses : pourquoi le nom de l'événement est toujours `<nom>Change`, et pourquoi on peut brancher un seul côté quand on n'a pas besoin de la bidirectionnalité complète.

### 2.10 `model.required()`

Comme pour `input`, un `model` sans valeur par défaut se déclare requis : `model.required<T>()`. Le parent **doit** fournir un binding `[(prop)]`.

```typescript
readonly note = model.required<number>();   // ModelSignal<number>, binding [(note)] obligatoire
```

---

## 3. Worked examples

### Exemple 1 — le compteur de participants complet (TribuZen)

On boucle le cas concret : `CompteurParticipantsComponent` reçoit ses bornes du parent (`input`), partage le nombre dans les deux sens (`model`), et signale les dépassements (`output`).

```typescript
// compteur-participants.component.ts — enfant réutilisable
import { Component, input, output, model, computed } from '@angular/core';

@Component({
  selector: 'app-compteur-participants',
  template: `
    <button (click)="retirer()" [disabled]="valeur() <= min()">-1</button>
    <span>{{ valeur() }} / {{ max() }} participants</span>
    <button (click)="ajouter()" [disabled]="pleinOuAuDela()">+1</button>
  `,
})
export class CompteurParticipantsComponent {
  // --- Parent → Enfant : bornes en lecture seule ---
  readonly min = input(0);                    // défaut sensé → input simple
  readonly max = input.required<number>();    // pas de défaut raisonnable → requis

  // --- Parent ↔ Enfant : le nombre, modifiable des deux côtés ---
  readonly valeur = model(0);                 // ModelSignal<number>

  // --- Enfant → Parent : signal de dépassement ---
  readonly maxAtteint = output<number>();     // émet la valeur au moment du blocage

  // input + model composés dans un computed (tout est signal)
  readonly pleinOuAuDela = computed(() => this.valeur() >= this.max());

  ajouter() {
    if (this.pleinOuAuDela()) {
      this.maxAtteint.emit(this.max());       // on prévient le parent, on ne dépasse pas
      return;
    }
    this.valeur.update(n => n + 1);           // remonte au parent via le model
  }

  retirer() {
    this.valeur.update(n => Math.max(this.min(), n - 1));
  }
}
```

```typescript
// page-sortie.component.ts — parent
import { Component, signal, computed } from '@angular/core';
import { CompteurParticipantsComponent } from './compteur-participants.component';

@Component({
  selector: 'app-page-sortie',
  imports: [CompteurParticipantsComponent],
  template: `
    <h2>Sortie famille</h2>

    <app-compteur-participants
      [min]="1"
      [max]="20"
      [(valeur)]="nbParticipants"
      (maxAtteint)="surMax($event)"
    />

    <p>Budget estimé : {{ budget() }} EUR</p>
    @if (alerte()) {
      <p class="alerte">{{ alerte() }}</p>
    }
  `,
})
export class PageSortieComponent {
  readonly nbParticipants = signal(2);
  readonly prixParPersonne = signal(15);
  readonly alerte = signal('');

  // budget dérive du model bidirectionnel : bouger le compteur enfant met à jour ce computed parent
  readonly budget = computed(() => this.nbParticipants() * this.prixParPersonne());

  surMax(plafond: number) {
    this.alerte.set(`Maximum de ${plafond} participants atteint.`);
  }
}
```

**Ce qui circule** : `min` / `max` descendent (input) ; `nbParticipants` fait des allers-retours (model — l'enfant l'incrémente, le parent le lit pour `budget`) ; `maxAtteint` remonte (output) pour déclencher l'alerte. Trois directions, trois API, aucun service.

### Exemple 2 — une carte configurable avec `transform` et `alias`

Un composant d'affichage pur, piloté entièrement par des inputs, dont un booléen d'attribut et un renommage.

```typescript
import { Component, input, booleanAttribute, computed } from '@angular/core';

@Component({
  selector: 'app-carte-sortie',
  template: `
    <article [class.mise-en-avant]="misEnAvant()">
      <h3>{{ titreAffiche() }}</h3>
      <p>{{ placesRestantes() }} place(s) restante(s)</p>
    </article>
  `,
})
export class CarteSortieComponent {
  // requis : une carte sans titre n'a pas de sens
  readonly titre = input.required<string>();

  // alias : interne 'placesLibres', public 'places'
  readonly placesLibres = input.required<number>({ alias: 'places' });

  // booleanAttribute : présence de l'attribut => true
  readonly misEnAvant = input(false, { transform: booleanAttribute });

  readonly titreAffiche   = computed(() => this.titre().toUpperCase());
  readonly placesRestantes = computed(() => Math.max(0, this.placesLibres()));
}
```

```html
<!-- 'places' est l'alias public ; 'misEnAvant' présent sans valeur => true -->
<app-carte-sortie [titre]="'Rando lac'" [places]="8" misEnAvant />
<app-carte-sortie [titre]="'Ciné'" [places]="0" />
```

Ici, **aucun** `output` ni `model` : la carte ne fait qu'afficher, la donnée ne va que dans un sens. C'est le signal (jeu de mots) qu'`input()` seul suffit.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Vouloir écrire dans un `input()`

```typescript
readonly titre = input('Sans titre');

modifier() {
  this.titre.set('Nouveau');   // ❌ erreur de compilation : InputSignal n'a pas de set
}
```

Un `input` est **en lecture seule** : seul le parent le pilote. Si l'enfant a besoin de modifier la valeur ET de la remonter, ce n'est pas un `input`, c'est un `model()`. S'il a juste besoin d'un état local dérivé, c'est un `signal` local (ou un `linkedSignal`, module 09) initialisé depuis l'input.

### PIÈGE #2 — Lire le signal côté parent dans un `[(prop)]`

```html
<!-- ❌ on lie la VALEUR, pas le signal → le two-way ne peut pas réécrire dedans -->
<app-compteur-participants [(valeur)]="nbParticipants()" />

<!-- ✅ on lie l'INSTANCE du signal (sans parenthèses) -->
<app-compteur-participants [(valeur)]="nbParticipants" />
```

Le two-way binding a besoin de l'**instance** writable pour la mettre à jour. `nbParticipants()` renvoie un nombre figé : Angular n'a plus rien où réécrire. Règle : dans un `[(...)]`, on passe le signal **sans** l'appeler.

### PIÈGE #3 — Confondre `output()` et `model()`

`output()` **notifie** (l'enfant crie « il s'est passé un truc ! »), il ne stocke aucune valeur. `model()` **synchronise un état** partagé. Si tu écris `output` pour tenir une valeur à jour dans le parent, tu réinventes `model` à la main :

```typescript
// ❌ output pour synchroniser un état → le parent doit gérer la valeur lui-même, verbeux et fragile
readonly valeur = input(0);
readonly valeurChange = output<number>();
ajouter() { this.valeurChange.emit(this.valeur() + 1); }

// ✅ model fait exactement ça, avec [(valeur)] côté parent
readonly valeur = model(0);
ajouter() { this.valeur.update(n => n + 1); }
```

Retiens : **une valeur à garder synchronisée → `model` ; un fait ponctuel à signaler (« supprimé », « soumis », « annulé ») → `output`.**

### PIÈGE #4 — Oublier que `[(prop)]` cherche l'output `propChange`

```typescript
readonly valeur = model(0);
```

```html
<!-- ✅ le nom de l'événement du desugar est TOUJOURS <nom>Change -->
<app-compteur [valeur]="n" (valeurChange)="n.set($event)" />

<!-- ❌ 'valeurChanged', 'onValeur'… ça ne se branche pas -->
<app-compteur [valeur]="n" (valeurChanged)="n.set($event)" />
```

Si tu décomposes un two-way à la main (pour brancher un seul côté), l'output généré par `model` s'appelle exactement `<nomDuModel>Change`. Pas `Changed`, pas `on...`.

### PIÈGE #5 — `input.required()` avec un binding manquant… ou statique oublié

```html
<!-- ❌ 'titre' est requis mais absent → erreur de compilation -->
<app-carte-sortie [places]="8" />

<!-- ❌ subtil : sans crochets, on passe la CHAÎNE "capacite", pas la variable -->
<app-carte-sortie [titre]="'Rando'" places="capacite" />

<!-- ✅ crochets = expression ; 'capacite' est bien lu comme propriété du parent -->
<app-carte-sortie [titre]="'Rando'" [places]="capacite" />
```

`[titre]="'Rando'"` (crochets + guillemets internes) passe la chaîne littérale `Rando`. `places="capacite"` (sans crochets) passe la chaîne `"capacite"` — sauf transform `numberAttribute`, ce n'est presque jamais ce qu'on veut. Pour passer une **valeur du parent**, il faut les crochets.

### PIÈGE #6 — Réintroduire les décorateurs `@Input` / `@Output`

```typescript
// ❌ ancienne API (pré-signaux) — hors périmètre Angular 19 signal-first
@Input() titre = '';
@Output() selection = new EventEmitter<string>();

// ✅ API signal
readonly titre = input('');
readonly selection = output<string>();
```

Les décorateurs fonctionnent encore, mais ils ne renvoient **pas** de signal : impossible de les composer dans un `computed` sans bricolage. Dans ce cursus, on écrit exclusivement `input()` / `output()` / `model()`.

---

## 5. Ancrage TribuZen

`input` / `output` / `model` sont la **couche de composition des composants** du front-office TribuZen : dès qu'un écran se découpe en parent + enfants réutilisables, ce sont ces trois API qui font passer la donnée.

**`CompteurParticipantsComponent`** (Exemple 1) — l'enfant réutilisable extrait du `SortieBudgetComponent` du module 02. Il reçoit `min` / `max` en `input`, partage le nombre de participants en `model` avec la page, et signale les dépassements en `output`. La page parent recalcule le budget via un `computed` qui lit le `model` — la boucle du module 02 (signal + computed) se poursuit ici entre composants.

**`CarteSortieComponent`** (Exemple 2) — la vignette d'une sortie dans la liste du tableau de bord famille : purement pilotée par des `input` (`titre`, `places`, `misEnAvant`), aucun état propre.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        page-sortie.component.ts            ← parent : [(valeur)], (maxAtteint), computed budget
        compteur-participants.component.ts  ← enfant : input(min/max) + model(valeur) + output(maxAtteint)
        carte-sortie.component.ts           ← enfant d'affichage : input + transform + alias
```

> Quand plusieurs écrans **éloignés** devront partager le même nombre de participants (hors relation parent-enfant directe), on passera par un **service** (`SortieStore`, module 11) plutôt que par une cascade de `model`. Ici, on reste sur la communication directe parent ↔ enfant. Le rendu de la liste de cartes avec `@for` relève du module 03.

---

## 6. Points clés

1. Le **sens de circulation** choisit l'API : parent → enfant = `input()`, enfant → parent = `output()`, les deux = `model()`.
2. `input(defaut)` crée un `InputSignal<T>` **en lecture seule** ; on le lit en l'appelant `titre()`, le parent le fournit avec `[prop]`, l'enfant ne l'écrit jamais.
3. `input.required<T>()` rend l'input obligatoire (erreur de compilation si le parent l'oublie) ; à réserver aux données sans valeur par défaut sensée.
4. `transform` normalise l'entrée (`booleanAttribute`, `numberAttribute`) ; `alias` donne un nom public distinct — un input transformé a deux génériques `input<Stocké, Accepté>`.
5. Un `input` étant un signal, il se compose directement dans un `computed()` et se recalcule quand le parent change la valeur.
6. `output<T>()` crée un `OutputEmitterRef<T>` ; l'enfant `emit(valeur)`, le parent écoute avec `(prop)="handler($event)"` ; `output()` seul = événement `void`.
7. `model(defaut)` crée un `ModelSignal<T>` modifiable des deux côtés ; côté parent `[(prop)]="signalWritable"` (l'instance, sans parenthèses) ; `[(prop)]` desugar en `[prop]` + `(propChange)`.
8. Une **valeur à synchroniser** → `model` ; un **fait ponctuel à signaler** → `output`. Ne pas confondre les deux.

---

## 7. Seeds Anki

```
Quelle API Angular 19 pour chaque sens de communication parent-enfant ?|Parent vers enfant : input(). Enfant vers parent : output(). Bidirectionnel : model(). Toutes importées de @angular/core, toutes basées sur les signaux.
Que renvoie input('defaut') et peut-on l'écrire depuis l'enfant ?|Un InputSignal<T> en lecture seule. On le lit en l'appelant (titre()), mais il n'a ni set ni update : seul le parent le pilote via [prop]. Pour écrire ET remonter, utiliser model().
Quand utiliser input.required<T>() plutôt que input(defaut) ?|Quand il n'existe pas de valeur par défaut sensée et que le composant n'a pas de sens sans cette donnée. Le parent est alors forcé de la fournir, sous peine d'erreur de compilation.
À quoi servent les options transform et alias d'input() ?|transform normalise la valeur entrante avant stockage (booleanAttribute, numberAttribute pour les attributs HTML string). alias donne à l'input un nom public différent du nom de propriété interne.
Comment l'enfant émet un événement et le parent l'écoute avec output() ?|L'enfant déclare readonly ev = output<string>() et appelle this.ev.emit(valeur). Le parent écoute avec (ev)="handler($event)", $event portant la valeur typée. output() sans type émet void.
Qu'est-ce que model() renvoie et en quoi diffère-t-il d'input() ?|Un ModelSignal<T>, modifiable des DEUX côtés : contrairement à InputSignal, il possède set() et update(). Une écriture de l'enfant remonte au parent. Côté parent : two-way binding [(prop)].
En quoi [(valeur)]="nbParticipants" se décompose-t-il ?|En [valeur]="nbParticipants" + (valeurChange)="nbParticipants.set($event)". model() crée automatiquement l'output <nom>Change. On lie l'INSTANCE du signal (sans parenthèses), pas sa valeur.
model ou output : lequel pour quoi ?|model pour une valeur à garder synchronisée entre parent et enfant (état partagé). output pour signaler un fait ponctuel sans état (supprimé, soumis, annulé). Utiliser output pour synchroniser une valeur réinvente model à la main.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-05-input-output-model/README.md`. Éclater le compteur de participants de TribuZen en composant enfant réutilisable câblé au parent par `input` + `output` + `model`, dev server Angular en oracle visuel — zéro gap-fill, corrigé commenté intégral.
