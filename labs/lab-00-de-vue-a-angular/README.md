# Lab 00 — De Vue à Angular : traduire un composant

> **Outcome :** à la fin, tu sais scaffolder un projet Angular 19 avec l'Angular CLI et **traduire à la main** un composant Vue 3 (état + liste filtrée) en composant standalone Angular, en appliquant les bonnes équivalences (`signal`, `computed`, `@for`/`track`, `[class.x]`, `(click)`).
> **Vrai outil :** Angular CLI (`ng new`, `ng generate component`, `ng serve`) — HMR visible en direct dans le navigateur.
> **Feedback :** le coach valide visuellement en session (le composant tourne dans le navigateur). Pas de test-runner auto-correcteur.

---

## Énoncé

Tu arrives sur la mission ESN qui migre TribuZen vers Angular 19. On te confie un composant Vue existant, `FamilyMemberList.vue`, et **ta seule tâche** est de le porter à l'identique en composant **standalone Angular** — même comportement visible, dialecte Angular.

**Composant Vue source (référence — ne pas modifier) :**

```vue
<!-- FamilyMemberList.vue — la version Vue existante -->
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Member {
  id: string
  name: string
  isAdmin: boolean
  isActive: boolean
}

const members = ref<Member[]>([
  { id: 'm1', name: 'Alice', isAdmin: true,  isActive: true  },
  { id: 'm2', name: 'Bob',   isAdmin: false, isActive: false },
  { id: 'm3', name: 'Cara',  isAdmin: false, isActive: true  },
  { id: 'm4', name: 'David', isAdmin: false, isActive: false },
])

const hideInactive = ref(false)

const visible = computed(() =>
  hideInactive.value ? members.value.filter(m => m.isActive) : members.value
)
</script>

<template>
  <button :class="{ 'btn--active': hideInactive }" @click="hideInactive = !hideInactive">
    {{ hideInactive ? 'Afficher tous' : 'Masquer inactifs' }}
  </button>

  <ul>
    <li
      v-for="m in visible"
      :key="m.id"
      :class="{ 'member--inactive': !m.isActive }"
    >
      {{ m.name }}
      <span v-if="m.isAdmin" class="badge">Admin</span>
    </li>
  </ul>

  <p v-if="visible.length === 0">Aucun membre pour l'instant.</p>
</template>
```

**Cahier des charges de la version Angular** (comportement identique) :

1. Un bouton **Masquer inactifs / Afficher tous** qui bascule un filtre.
2. La liste n'affiche que les membres actifs quand le filtre est activé, sinon tous.
3. Chaque ligne affiche le prénom + un badge **Admin** si `isAdmin`.
4. Les membres inactifs portent la classe `member--inactive` (les grise, `opacity: 0.45`).
5. Le bouton porte la classe `btn--active` quand le filtre est actif.
6. Un état vide « Aucun membre pour l'instant. » quand la liste visible est vide.

**Pas de gap-fill** — tu écris le composant Angular complet. Le vrai outil te scaffolde le projet ; le portage, tu le fais à la main.

### Mise en place (vrai outil : Angular CLI)

```bash
# 1. Créer le projet Angular 19 (accepte les défauts : routing non requis ici)
ng new tribuzen-angular-lab00 --style=css --skip-tests
cd tribuzen-angular-lab00

# 2. Générer le composant à traduire
ng generate component family/family-member-list
#   raccourci équivalent : ng g c family/family-member-list

# 3. Lancer le serveur de dev (HMR)
ng serve -o
```

Branche `<app-family-member-list />` dans `app.component.html` (importe le composant dans le tableau `imports` du décorateur de `AppComponent`), puis observe le rendu dans le navigateur.

---

## Étapes (en friction)

1. **Traduis l'état.** `ref<Member[]>([...])` → `signal<Member[]>([...])`. `hideInactive` → `signal(false)`.
2. **Traduis le dérivé.** Le `computed` garde son nom ; remplace chaque `.value` par un appel `()` et pense au `this.` dans la classe.
3. **Traduis le bouton.** `@click="hideInactive = !hideInactive"` → `(click)="hideInactive.set(!hideInactive())"`. `:class="{ 'btn--active': hideInactive }"` → `[class.btn--active]="hideInactive()"`.
4. **Traduis la boucle.** `v-for` + `:key` → `@for (m of visible(); track m.id) { ... }`. N'oublie pas `track` (sinon ça ne compile pas).
5. **Traduis le badge.** `v-if="m.isAdmin"` → `@if (m.isAdmin) { ... }`.
6. **Traduis la classe conditionnelle** de ligne : `:class="{ 'member--inactive': !m.isActive }"` → `[class.member--inactive]="!m.isActive"`.
7. **Traduis l'état vide.** Utilise le bloc `@empty` **à l'intérieur** du `@for` (pas un `@if` séparé) — c'est le bonus Angular.
8. **Vérifie les cas limites dans le navigateur** : filtre activé alors que tous sont inactifs → l'état vide apparaît ; badge Admin visible seulement sur Alice.

---

## Corrigé complet commenté

```ts
// family-member-list.component.ts — corrigé
import { Component, signal, computed } from '@angular/core';

// Même interface qu'en Vue — TypeScript est identique des deux côtés
interface Member {
  id: string;
  name: string;
  isAdmin: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-family-member-list',
  // standalone est implicite en Angular 19 — pas besoin de standalone: true
  template: `
    <!-- (click) écoute l'événement ; .set() écrit le signal (pas d'affectation directe)
         [class.btn--active] ajoute la classe quand hideInactive() est vrai -->
    <button
      [class.btn--active]="hideInactive()"
      (click)="hideInactive.set(!hideInactive())"
    >
      {{ hideInactive() ? 'Afficher tous' : 'Masquer inactifs' }}
    </button>

    <ul>
      <!-- @for remplace v-for ; track m.id est OBLIGATOIRE (identifiant métier stable)
           @empty remplace le v-if d'état vide : intégré au bloc -->
      @for (m of visible(); track m.id) {
        <li [class.member--inactive]="!m.isActive">
          {{ m.name }}
          <!-- @if remplace v-if : bloc autour du markup, pas un attribut -->
          @if (m.isAdmin) {
            <span class="badge">Admin</span>
          }
        </li>
      } @empty {
        <li>Aucun membre pour l'instant.</li>
      }
    </ul>
  `,
  styles: [`
    .member--inactive { opacity: 0.45; }
    .badge {
      margin-left: 0.5rem;
      padding: 0.1rem 0.4rem;
      background: #ef4444;
      color: #fff;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .btn--active { background: #1e293b; color: #fff; }
  `],
})
export class FamilyMemberListComponent {
  // signal(...) remplace ref(...) ; on lit avec members(), on écrit avec .set()/.update()
  members = signal<Member[]>([
    { id: 'm1', name: 'Alice', isAdmin: true,  isActive: true  },
    { id: 'm2', name: 'Bob',   isAdmin: false, isActive: false },
    { id: 'm3', name: 'Cara',  isAdmin: false, isActive: true  },
    { id: 'm4', name: 'David', isAdmin: false, isActive: false },
  ]);

  // État du filtre — signal booléen
  hideInactive = signal(false);

  // computed garde son nom ; on lit les signaux dépendants avec () et via this.
  visible = computed(() =>
    this.hideInactive()
      ? this.members().filter(m => m.isActive)
      : this.members()
  );
}
```

**Pourquoi ce corrigé est correct :**
- `visible` est un `computed` : Angular le recalcule automatiquement quand `hideInactive` ou `members` changent — exactement comme le `computed` Vue. Aucune logique de filtre dans le template.
- L'état vide passe par `@empty`, testé sur la liste **filtrée** (`visible()`), donc il apparaît aussi quand le filtre est actif et qu'aucun actif ne reste.
- Chaque traduction respecte la règle d'or : `.value` → `()`, affectation → `.set()`, `:prop` → `[prop]`, `@event` → `(event)`, `v-for`/`v-if` → `@for`/`@if`.
- `track m.id` utilise l'identifiant métier stable — résistant à un futur tri/filtre.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — à faire sans rouvrir ce corrigé ni le module 00 :**

Reproduis `FamilyMemberListComponent` **de mémoire, en 25 minutes**, avec deux ajouts :

1. **Recherche par prénom** : un second signal `search` (`signal('')`) alimenté par un `<input>` (`(input)="search.set($any($event.target).value)"`), et un `computed` `visible` qui applique **cumulativement** les deux filtres (inactifs masqués **et** correspondance de prénom via `name.toLowerCase().includes(...)`).
2. **Compteur de résultats** : afficher, sous le bouton, le nombre de membres visibles (interpolation d'un `computed` ou de `visible().length`).

**Critère de réussite :** le composant tourne dans `ng serve`, les deux filtres sont indépendants (activer l'un n'efface pas l'autre), et `@for` a toujours son `track`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen` (variante Angular), le composant vivra ici :

```
tribuzen-angular/
  src/
    app/
      family/
        family-member-list/
          family-member-list.component.ts
```

**Différences par rapport au lab :**

- Les membres viendront d'un **`input()`** (`input<Member[]>([])`) passé par un composant parent `FamilyPage` — c'est le **module 05**. Pour l'instant, garde les données locales dans un `signal`.
- L'interface `Member` sera importée depuis un fichier partagé (`src/app/family/family.types.ts`) plutôt que définie inline.
- Les données réelles viendront plus tard d'un **service** `FamilyService` injecté (`@Injectable`, module 11) qui remplace le composable Vue `useFamily()`.

**Commit cible :**
```
feat(family): FamilyMemberList Angular — signal + computed, @for/track, @empty, filtre actifs
```
