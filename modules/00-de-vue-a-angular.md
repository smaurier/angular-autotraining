---
titre: De Vue à Angular — modèle mental et équivalences
cours: 03-angular
notions: [philosophie batteries-included, standalone component, décorateur Component, Angular CLI ng, table d'équivalences Vue vers Angular, signal vs ref, control flow @if @for]
outcomes:
  - sait expliquer en quoi Angular est un framework opinioné là où Vue est une librairie progressive
  - sait lire un composant standalone Angular 19 et repérer décorateur, template, classe
  - sait traduire ses réflexes Vue (ref, computed, v-if, v-for, props, emits) vers l'équivalent Angular
  - connaît 5 pièges du développeur Vue qui débarque sur Angular et sait les éviter
prerequis: [expérience Vue 3 avec la Composition API (ref, computed, v-if, v-for, defineProps)]
next: 01-premier-projet-standalone
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: cartographie mentale du front TribuZen — traduire les réflexes Vue en réflexes Angular avant d'écrire le premier écran
last-reviewed: 2026-07
---

# De Vue à Angular — modèle mental et équivalences

> **Outcomes — tu sauras FAIRE :** expliquer la philosophie d'Angular face à Vue, lire un composant standalone Angular 19, traduire tes réflexes Vue vers Angular.
> **Difficulté :** :star::star:
>
> **Portée :** ce module est une **carte mentale**, pas un tutoriel d'API. On pose le vocabulaire et les équivalences. Chaque notion citée ici (signaux, control flow, inputs/outputs, services & injection de dépendances, routing) est **enseignée en profondeur dans son propre module** : signaux au **module 02**, control flow au **module 03**, `input()/output()/model()` au **module 05**, services & DI aux **modules 11-13**. Ici, on ne fait que situer chaque brique sur la carte.

## 1. Cas concret d'abord

Tu démarres une mission ESN. L'équipe est sur **Angular 19**. Toi, tu viens de Vue 3. Ta première tâche : reprendre l'écran « membres d'une famille » que tu connais par cœur en Vue.

En Vue, tu écrirais ce composant sans réfléchir :

```vue
<!-- FamilyMemberList.vue — ton réflexe Vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const members = ref([{ id: 'm1', name: 'Alice', active: true }])
const hideInactive = ref(false)
const visible = computed(() =>
  hideInactive.value ? members.value.filter(m => m.active) : members.value
)
</script>

<template>
  <button @click="hideInactive = !hideInactive">Filtrer</button>
  <ul>
    <li v-for="m in visible" :key="m.id">{{ m.name }}</li>
  </ul>
</template>
```

Ton collègue t'ouvre l'équivalent Angular déjà en place. Tu lis ça :

```ts
// family-member-list.component.ts — ce que tu dois savoir lire
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-family-member-list',
  template: `
    <button (click)="hideInactive.set(!hideInactive())">Filtrer</button>
    <ul>
      @for (m of visible(); track m.id) {
        <li>{{ m.name }}</li>
      }
    </ul>
  `,
})
export class FamilyMemberListComponent {
  members = signal([{ id: 'm1', name: 'Alice', active: true }]);
  hideInactive = signal(false);
  visible = computed(() =>
    this.hideInactive() ? this.members().filter(m => m.active) : this.members()
  );
}
```

Même logique, autre dialecte. Trois réflexes Vue qui vont te piéger **tout de suite** :

1. `members.value` en Vue devient `members()` en Angular — un signal se **lit en l'appelant** comme une fonction, pas via `.value`.
2. `hideInactive = !hideInactive` en Vue devient `hideInactive.set(...)` — on n'affecte pas un signal, on appelle `.set()`.
3. `v-for` + `:key` devient `@for (...; track ...)` — et le `track` est **obligatoire**, pas optionnel.

Ce module te donne la carte complète pour que ces traductions deviennent automatiques.

---

## 2. Théorie complète, concise

### 2.1 Librairie progressive vs framework opinioné

C'est **la** différence de fond, celle qui change ta façon de travailler.

**Vue est une librairie progressive.** Le cœur fait le rendu réactif ; tu ajoutes les briques que tu veux : Vue Router pour la navigation, Pinia pour le state global, Axios ou `fetch` pour le HTTP, Vitest pour les tests. Chaque équipe Vue fait ses choix. Tu es l'architecte.

**Angular est un framework opinioné, « batteries incluses ».** Le routing, le client HTTP, les formulaires, les tests, le build, l'injection de dépendances — tout est livré dans la boîte et prévu pour fonctionner ensemble. L'architecture est déjà là ; tu construis dedans.

| | Vue 3 | Angular 19 |
|---|---|---|
| Nature | Librairie progressive | Framework complet |
| Routing | Vue Router (à installer) | Angular Router (intégré) |
| HTTP | fetch / Axios (au choix) | `HttpClient` (intégré) |
| State global | Pinia (externe) | Services + Signals (intégré) |
| Rôle du dev | Architecte : tu choisis | Constructeur : le cadre est fixé |

Conséquence concrète en mission : deux projets Angular se ressemblent beaucoup (mêmes conventions, mêmes noms), là où deux projets Vue peuvent être radicalement différents. C'est pourquoi Angular domine en grande entreprise (banques, assurances, ESN) : on branche un dev sur n'importe quel projet et il retrouve ses repères.

### 2.2 Le composant standalone et le décorateur

En Vue, un composant est un fichier `.vue` (Single File Component) avec trois blocs : `<script setup>`, `<template>`, `<style>`. Aucune cérémonie : ce que tu déclares au niveau racine est exposé au template.

En Angular, un composant est une **classe TypeScript** décorée par `@Component`. Le décorateur attache les métadonnées (sélecteur, template, styles) ; la classe porte l'état et la logique.

```ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',        // le "nom de balise" du composant : <app-counter>
  template: `
    <button (click)="increment()">{{ count() }}</button>
  `,
  styles: [`button { font-size: 1.5rem; }`],
})
export class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update(c => c + 1);
  }
}
```

Deux points de vocabulaire à retenir dès maintenant :

- **Standalone par défaut.** Historiquement, Angular obligeait à déclarer chaque composant dans un `NgModule`. Depuis **Angular 19, les composants sont standalone par défaut** : ils s'importent directement les uns les autres via un tableau `imports` sur le décorateur, sans `NgModule`. Tu peux même **omettre** `standalone: true` — c'est implicite. (Le module 01 détaille la création d'un projet standalone.)
- **Le décorateur, c'est du déclaratif explicite.** `@Component`, `@Injectable`, `@Pipe`, `@Directive` : Angular rend visible ce que Vue laisse implicite. Plus verbeux, mais auto-documenté.

Template et styles peuvent être **inline** (comme ci-dessus, avec `template:` et `styles:`) ou dans des fichiers séparés (`templateUrl:` et `styleUrl:`). C'est une convention d'équipe, pas une obligation.

### 2.3 L'Angular CLI (`ng`) est le centre de gravité

En Vue, tu génères un projet (`npm create vue@latest`) puis la structure est libre. En Angular, le CLI `ng` pilote tout le cycle de vie et **génère du code conforme aux conventions** (imports mis à jour, fichiers de test créés).

```bash
ng new tribuzen-front            # créer un projet
ng generate component family/member-list  # générer un composant (raccourci : ng g c ...)
ng serve                         # serveur de dev (HMR)
ng test                          # lancer les tests
ng build                         # build de production
```

Réflexe à prendre : **ne crée pas les fichiers à la main**, utilise `ng generate`. Le CLII respecte la structure attendue et t'évite les oublis d'import.

### 2.4 La table d'équivalences Vue → Angular (ta carte de référence)

Garde ce tableau sous les yeux pendant tes premiers jours. Chaque ligne renvoie au module qui l'enseigne réellement.

| Concept | Vue 3 | Angular 19 | Enseigné au module |
|---|---|---|---|
| État réactif | `ref(0)` | `signal(0)` | 02 |
| Lecture de l'état | `count.value` | `count()` | 02 |
| Écriture de l'état | `count.value = 5` | `count.set(5)` / `count.update(...)` | 02 |
| Valeur dérivée | `computed(() => ...)` | `computed(() => ...)` | 02 |
| Effet de bord | `watchEffect(() => ...)` | `effect(() => ...)` | 09 |
| Condition | `v-if` / `v-else` | `@if` / `@else` | 03 |
| Boucle | `v-for` + `:key` | `@for` + `track` (obligatoire) | 03 |
| Prop entrante | `defineProps()` | `input()` / `input.required()` | 05 |
| Événement sortant | `defineEmits()` | `output()` | 05 |
| Two-way binding | `defineModel()` | `model()` + `[(prop)]` | 05 |
| Provide / inject | `provide()` / `inject()` | Services + `inject()` | 11-13 |
| State global | Pinia | Service `providedIn: 'root'` + Signals | 24 |
| Routing | Vue Router | Angular Router | 14 |
| Composant | `.vue` (SFC) | classe + `@Component` (standalone) | 01 |
| Chargement différé | `<Suspense>` | `@defer` | 08 |
| Composable | `useXxx()` | Service `@Injectable()` | 11 |

### 2.5 Les trois différences de syntaxe qui piègent le plus

Tu peux mémoriser toute la table, mais **trois traductions** reviennent à chaque ligne de code. Ancre-les.

**a) Un signal se lit en l'appelant.** En Vue, `ref` s'accède via `.value`. En Angular, un signal **est une fonction** : on lit avec `()`, on écrit avec `.set()` ou `.update()`. Jamais de mutation directe.

```ts
// Vue                          // Angular
count.value          // lire    count()
count.value = 5      // écrire  count.set(5)
count.value++        // muter   count.update(c => c + 1)
```

**b) Le binding de template inverse les symboles.** Vue préfixe : `:prop` (bind), `@event` (écoute). Angular encadre : `[prop]` (bind), `(event)` (écoute).

```html
<!-- Vue -->                        <!-- Angular -->
<img :src="url" />                  <img [src]="url" />
<button @click="save()">            <button (click)="save()">
```

**c) Le control flow est en blocs, pas en attributs.** Vue met la logique dans des attributs (`v-if`, `v-for`) posés sur un élément. Angular utilise des **blocs** `@if` / `@for` qui entourent le markup, et `track` est **obligatoire** dans `@for`.

```html
<!-- Vue -->
<li v-for="m in items" :key="m.id">{{ m.name }}</li>

<!-- Angular : track obligatoire, @empty offert en bonus -->
@for (m of items(); track m.id) {
  <li>{{ m.name }}</li>
} @empty {
  <li>Aucun élément</li>
}
```

> Note SSR : dans les exemples de ce cours, les doubles accolades d'interpolation Angular n'apparaissent qu'à l'intérieur de blocs de code — jamais en prose — pour ne pas être interprétées par le moteur du site.

---

## 3. Worked examples

### Exemple 1 — Traduire un compteur Vue en composant Angular standalone

On part du réflexe Vue et on le porte pas à pas.

```vue
<!-- Départ : Counter.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">+1</button>
  <p>{{ count }} × 2 = {{ double }}</p>
</template>
```

Traduction Angular, étape par étape :

1. Le SFC devient une **classe** décorée par `@Component`.
2. `ref(0)` → `signal(0)` ; `count.value` → `count()`.
3. `count.value++` → `count.update(c => c + 1)`.
4. `computed` garde le même nom, mais lit les signaux avec `()`.
5. `@click` → `(click)` ; l'interpolation reste en doubles accolades mais lit le signal avec `()`.

```ts
// Arrivée : counter.component.ts
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="increment()">+1</button>
    <p>{{ count() }} × 2 = {{ double() }}</p>
  `,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);

  increment() {
    this.count.update(c => c + 1);
  }
}
```

Points de vigilance :
- Dans la classe, on accède aux champs via `this.` (`this.count()`), là où `<script setup>` exposait les variables directement.
- `count()` s'appelle **aussi dans le template**, pas seulement dans la classe.

### Exemple 2 — Traduire une liste filtrée Vue en control flow Angular

On reprend l'écran « membres » du cas concret et on détaille la traduction du template.

```html
<!-- Vue : v-for + :key + empty state via v-if -->
<button @click="hideInactive = !hideInactive">Filtrer</button>
<ul>
  <li v-for="m in visible" :key="m.id" :class="{ inactif: !m.active }">
    {{ m.name }}
  </li>
</ul>
<p v-if="visible.length === 0">Aucun membre</p>
```

```html
<!-- Angular : @for avec track + @empty intégré -->
<button (click)="hideInactive.set(!hideInactive())">Filtrer</button>
<ul>
  @for (m of visible(); track m.id) {
    <li [class.inactif]="!m.active">{{ m.name }}</li>
  } @empty {
    <li>Aucun membre</li>
  }
</ul>
```

Ce que la traduction change :
- `@click="hideInactive = !hideInactive"` (affectation Vue) devient `(click)="hideInactive.set(!hideInactive())"` : on **appelle** `.set()`.
- `:key="m.id"` (optionnel en Vue) devient `track m.id` (**obligatoire** en Angular).
- `:class="{ inactif: !m.active }"` devient `[class.inactif]="!m.active"` : la classe conditionnelle passe par la syntaxe `[class.nom]`.
- Plus besoin d'un `v-if` séparé pour l'état vide : `@empty` est **dans** le bloc `@for`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier les `()` pour lire un signal

```ts
// ❌ Réflexe Vue : on pense "count est la valeur"
const total = count * 2;        // erreur : count est une fonction, pas un nombre

// ❌ Dans le template
{{ count }}                     // affiche la fonction, pas 0

// ✅ Un signal se lit en l'appelant
const total = count() * 2;
{{ count() }}
```

C'est **le** piège numéro un du dev Vue. En Vue, `.value` est facultatif dans le template (auto-unwrap) ; en Angular, les `()` sont **toujours** requis, y compris dans le template.

### PIÈGE #2 — Affecter un signal comme une `ref`

```ts
// ❌ Réflexe Vue
count.value = 5;                // pas de .value sur un signal
count = 5;                      // écrase le signal lui-même : catastrophe

// ✅ On appelle set / update
count.set(5);
count.update(c => c + 1);
```

Un signal n'a pas de propriété `.value`. Écrire `count.value = 5` ne lève parfois même pas d'erreur (ça crée une propriété parasite) — d'où le bug silencieux.

### PIÈGE #3 — Oublier `track` dans `@for`

```html
<!-- ❌ track manquant : erreur de compilation en Angular -->
@for (m of items()) {
  <li>{{ m.name }}</li>
}

<!-- ✅ track obligatoire (choisis un identifiant stable) -->
@for (m of items(); track m.id) {
  <li>{{ m.name }}</li>
}
```

En Vue, `:key` est recommandé mais optionnel ; le template compile sans. En Angular, `track` est **obligatoire** — le template ne compile pas sans lui. Choisis un identifiant métier stable (`m.id`), pas l'index sauf liste jamais réordonnée.

### PIÈGE #4 — Croire qu'on choisit son routeur / son client HTTP

Le réflexe Vue « je vais installer telle librairie de routing » n'a pas lieu d'être. Angular fournit **son** routeur, **son** `HttpClient`, **ses** formulaires. Chercher une alternative externe, c'est ramer à contre-courant du framework et de ton équipe. La bonne question n'est pas « quelle lib choisir » mais « comment Angular le fait-il ».

### PIÈGE #5 — Chercher un `NgModule` en Angular 19

Beaucoup de tutoriels anciens montrent des `NgModule` (`@NgModule({ declarations: [...] })`). Depuis Angular 19, c'est **standalone par défaut** : les composants s'importent directement via le tableau `imports` du décorateur, et `bootstrapApplication()` remplace le `NgModule` racine. Si tu vois du `NgModule` dans un exemple, c'est du code d'avant la v17 — la référence à jour est le composant standalone.

---

## 5. Ancrage TribuZen

Ce module ne produit pas encore de code TribuZen : il produit ta **carte mentale** avant d'écrire le premier écran Angular du produit.

TribuZen a un front-office déjà pensé en Vue (module de cours Vue). Le passage en Angular consiste à **retraduire chaque brique** :

| Écran / brique TribuZen | Version Vue | Cible Angular | Module Angular |
|---|---|---|---|
| `LoginForm` | `ref<string \| null>(null)` | `signal<string \| null>(null)` | 02 |
| `FamilyMemberList` | `v-for` + `computed` filtre | `@for` + `track` + `computed` | 03 |
| Communication carte → parent | `defineEmits('select')` | `output<string>()` | 05 |
| Service de session famille | composable `useFamily()` | service `FamilyService` (`@Injectable`) | 11 |

Exercice de cartographie (10 min, sur papier, avant de coder) :

1. Prends **ton dernier composant Vue** de TribuZen. Repère : les `ref`, les `computed`, les `v-if`/`v-for`, les emits.
2. Réécris chaque ligne en Angular selon la table §2.4 : `ref` → `signal`, `.value` → `()`, `v-if` → `@if`, `v-for` → `@for ... track`, `defineEmits` → `output`.
3. Dessine la classe `@Component` correspondante : décorateur en haut, champs signaux + méthodes dans la classe.

C'est cette gymnastique de traduction qui rend les modules suivants (où l'on code vraiment) beaucoup plus rapides.

---

## 6. Points clés

1. Vue est une **librairie progressive** (tu choisis les briques) ; Angular est un **framework opinioné batteries-incluses** (routeur, HTTP, forms, DI intégrés).
2. Un composant Angular = **classe TypeScript** + décorateur `@Component` (sélecteur, template, styles), là où Vue utilise un SFC `.vue`.
3. Depuis **Angular 19, les composants sont standalone par défaut** : pas de `NgModule`, `standalone: true` implicite, imports directs via le décorateur.
4. Le **CLI `ng`** génère et pilote tout : utilise `ng generate` plutôt que créer les fichiers à la main.
5. Un **signal se lit en l'appelant** (`count()`) et s'écrit avec `.set()` / `.update()` — jamais `.value`, jamais d'affectation directe.
6. Le **binding de template** inverse Vue : `[prop]` pour lier, `(event)` pour écouter.
7. Le **control flow** est en blocs (`@if` / `@for`), et `track` est **obligatoire** dans `@for`.
8. `computed` et `inject` gardent le même nom qu'en Vue — mais tout le reste (state global, routing, HTTP) est **intégré** au framework, pas à installer.

---

## 7. Seeds Anki

```
Quelle est la différence de philosophie entre Vue et Angular ?|Vue est une librairie progressive (tu ajoutes routeur, state, HTTP au choix). Angular est un framework opinioné batteries-incluses : routeur, HttpClient, forms, DI, tests, build sont intégrés et prévus pour marcher ensemble.
Comment lit-on et écrit-on un signal Angular, versus une ref Vue ?|Vue : lecture count.value, écriture count.value = 5. Angular : un signal est une fonction — lecture count(), écriture count.set(5) ou count.update(c => c + 1). Pas de .value, pas d'affectation directe.
En quoi la déclaration d'un composant diffère entre Vue et Angular ?|Vue : SFC .vue avec <script setup> / <template> / <style>. Angular : classe TypeScript décorée par @Component (selector, template, styles) ; l'état vit dans les champs de la classe, accédés via this.
Qu'est-ce qui change pour les composants depuis Angular 19 (standalone) ?|Les composants sont standalone par défaut : plus de NgModule, standalone: true est implicite, les dépendances s'importent via le tableau imports du décorateur, et bootstrapApplication() remplace le NgModule racine.
Comment traduire v-if et v-for de Vue vers Angular ?|v-if/v-else deviennent les blocs @if/@else ; v-for + :key devient @for (item of items(); track item.id) avec track OBLIGATOIRE (optionnel en Vue). Bonus Angular : le bloc @empty pour l'état vide.
Comment traduire le binding de template de Vue vers Angular ?|Vue préfixe : :prop pour lier, @event pour écouter. Angular encadre : [prop] pour lier, (event) pour écouter. Ex : :src devient [src], @click devient (click).
Quel est le rôle du CLI ng en Angular par rapport à Vue ?|En Vue la structure est libre après create. En Angular, ng est le centre : ng new (projet), ng generate (composant/service conforme aux conventions), ng serve, ng test, ng build. Réflexe : ng generate plutôt que créer les fichiers à la main.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-00-de-vue-a-angular/README.md`. Tu traduis à la main un composant Vue de TribuZen en composant standalone Angular 19, avec l'Angular CLI comme vrai outil — corrigé commenté intégral, zéro gap-fill.
