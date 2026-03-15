# Cours 2 -- Equivalences Vue 3 / Angular 19+

> **Module** : 00 - De Vue a Angular
> **Duree estimee** : 1h15
> **Prérequis** : Cours 1 (Modèle mental)

---

## Objectif

A la fin de ce cours, vous aurez un **tableau de référence complet** des équivalences entre Vue 3 (Composition API) et Angular 19+ (standalone, Signals). Pour chaque concept Vue, vous saurez exactement quoi utiliser en Angular, avec du code cote a cote.

---

## Vue d'ensemble des équivalences

| Concept | Vue 3 | Angular 19+ |
|---------|-------|-------------|
| État réactif | `ref()` | `signal()` |
| Valeur derivee | `computed()` | `computed()` |
| Effet de bord | `watch` / `watchEffect` | `effect()` |
| Props | `defineProps()` | `input()` |
| Événements | `defineEmits()` | `output()` |
| v-model | `defineModel()` | `model()` |
| Condition | `v-if` / `v-else` | `@if` / `@else` |
| Boucle | `v-for` | `@for` (+ `track`) |
| Afficher/Cacher | `v-show` | `[hidden]` ou `[style.display]` |
| Provide/Inject | `provide()` / `inject()` | Services + DI |
| State global | Pinia | Services + Signals |
| Routing | Vue Router | Angular Router |
| SFC | `.vue` | `.component.ts` standalone |
| Chargement differe | `<Suspense>` | `@defer` |
| SSR | Nuxt | Angular SSR (`@angular/ssr`) |
| Composable | `useXxx()` | Service `@Injectable()` |

---

## 1. `ref()` -> `signal()`

### Vue 3

```typescript
import { ref } from 'vue'

const count = ref(0)

// Lecture
console.log(count.value)  // 0

// Ecriture
count.value = 5
count.value++
```

### Angular 19+

```typescript
import { signal } from '@angular/core'

const count = signal(0)

// Lecture (appel de fonction)
console.log(count())  // 0

// Ecriture
count.set(5)
count.update(c => c + 1)
```

**Différence clé** : en Vue, on accede via `.value`. En Angular, un signal est une **fonction** : on lit avec `()` et on écrit avec `.set()` ou `.update()`. Pas de mutation directe.

---

## 2. `computed()` -> `computed()`

### Vue 3

```typescript
import { ref, computed } from 'vue'

const price = ref(100)
const tax = ref(0.2)

const total = computed(() => price.value * (1 + tax.value))
console.log(total.value)  // 120
```

### Angular 19+

```typescript
import { signal, computed } from '@angular/core'

const price = signal(100)
const tax = signal(0.2)

const total = computed(() => price() * (1 + tax()))
console.log(total())  // 120
```

**Différence clé** : quasi identique. Seule la syntaxe d'acces change (`.value` vs `()`). Le `computed` Angular est en lecture seule, comme en Vue.

---

## 3. `watch` / `watchEffect` -> `effect()`

### Vue 3

```typescript
import { ref, watch, watchEffect } from 'vue'

const query = ref('')

// watchEffect : s'execute immediatement et re-execute sur changement
watchEffect(() => {
  console.log('Recherche:', query.value)
})

// watch : observe une source specifique
watch(query, (newVal, oldVal) => {
  console.log(`Query changee de "${oldVal}" a "${newVal}"`)
})
```

### Angular 19+

```typescript
import { signal, effect } from '@angular/core'

const query = signal('')

// effect : equivalent de watchEffect
effect(() => {
  console.log('Recherche:', query())
  // Angular detecte automatiquement que query est une dependance
})
```

**Différence clé** : Angular n'a pas d'équivalent direct de `watch` avec `oldValue`/`newValue`. `effect()` correspond a `watchEffect`. Pour les cas avances, utilisez `toObservable()` + `pairwise()` de RxJS.

> **Attention** : `effect()` doit etre appele dans un contexte d'injection (constructeur, champ de classe). Pas dans une méthode appelee plus tard.

---

## 4. `defineProps()` -> `input()`

### Vue 3

```typescript
// ChildComponent.vue
const props = defineProps<{
  title: string
  count?: number
}>()

// Utilisation dans le template
// {{ props.title }} -- {{ props.count }}
```

```html
<!-- ParentComponent.vue -->
<ChildComponent title="Bonjour" :count="42" />
```

### Angular 19+

```typescript
// child.component.ts
@Component({
  selector: 'app-child',
  template: `{{ title() }} -- {{ count() }}`
})
export class ChildComponent {
  title = input.required<string>()    // Obligatoire
  count = input<number>(0)            // Optionnel avec valeur par defaut
}
```

```html
<!-- parent.component.html -->
<app-child title="Bonjour" [count]="42" />
```

**Différence clé** : En Angular, `input()` retourne un signal. On lit la valeur avec `title()`, pas `title`. Les inputs obligatoires utilisent `input.required<T>()`.

---

## 5. `defineEmits()` -> `output()`

### Vue 3

```typescript
// ChildComponent.vue
const emit = defineEmits<{
  (e: 'select', id: number): void
  (e: 'close'): void
}>()

// Emettre un evenement
emit('select', 42)
```

```html
<!-- ParentComponent.vue -->
<ChildComponent @select="onSelect($event)" @close="onClose" />
```

### Angular 19+

```typescript
// child.component.ts
@Component({
  selector: 'app-child',
  template: `<button (click)="select.emit(42)">Selectionner</button>`
})
export class ChildComponent {
  select = output<number>()
  close = output<void>()
}
```

```html
<!-- parent.component.html -->
<app-child (select)="onSelect($event)" (close)="onClose()" />
```

**Différence clé** : en Angular, chaque output est un objet avec une méthode `.emit()`. La syntaxe du template utilise `(eventName)` au lieu de `@eventName`.

---

## 6. `defineModel()` -> `model()`

### Vue 3

```typescript
// ToggleSwitch.vue
const modelValue = defineModel<boolean>()
```

```html
<!-- ParentComponent.vue -->
<ToggleSwitch v-model="isActive" />
```

### Angular 19+

```typescript
// toggle-switch.component.ts
@Component({
  selector: 'app-toggle-switch',
  template: `
    <button (click)="checked.set(!checked())">
      {{ checked() ? 'ON' : 'OFF' }}
    </button>
  `
})
export class ToggleSwitchComponent {
  checked = model(false)  // Signal bidirectionnel
}
```

```html
<!-- parent.component.html -->
<app-toggle-switch [(checked)]="isActive" />
```

**Différence clé** : Angular utilise la syntaxe `[(prop)]` (banana-in-a-box) pour le two-way binding. `model()` créé un signal writable qui synchronise parent et enfant.

---

## 7. `v-if` / `v-else` -> `@if` / `@else`

### Vue 3

```html
<div v-if="isLoading">Chargement...</div>
<div v-else-if="error">Erreur : {{ error }}</div>
<div v-else>{{ data }}</div>
```

### Angular 19+

```html
@if (isLoading()) {
  <div>Chargement...</div>
} @else if (error()) {
  <div>Erreur : {{ error() }}</div>
} @else {
  <div>{{ data() }}</div>
}
```

**Différence clé** : la syntaxe Angular utilise des blocs `{}` au lieu d'attributs sur les éléments. C'est plus lisible quand la logique est complexe.

---

## 8. `v-for` -> `@for` (+ `track`)

### Vue 3

```html
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</ul>

<!-- Liste vide -->
<p v-if="items.length === 0">Aucun element</p>
```

### Angular 19+

```html
<ul>
  @for (item of items(); track item.id) {
    <li>{{ item.name }}</li>
  } @empty {
    <li>Aucun element</li>
  }
</ul>
```

**Différence clé** : `track` est **obligatoire** en Angular (`:key` est optionnel en Vue). Le bloc `@empty` est un bonus pratique qu'Angular offre nativement.

---

## 9. `v-show` -> `[hidden]`

### Vue 3

```html
<!-- v-show utilise display: none -->
<div v-show="isVisible">Contenu</div>
```

### Angular 19+

```html
<!-- Option 1 : attribut hidden -->
<div [hidden]="!isVisible()">Contenu</div>

<!-- Option 2 : style inline -->
<div [style.display]="isVisible() ? 'block' : 'none'">Contenu</div>

<!-- Option 3 : classe CSS -->
<div [class.hidden]="!isVisible()">Contenu</div>
```

**Différence clé** : Angular n'a pas de directive `v-show` intégrée. `[hidden]` est l'équivalent le plus direct, mais attention : `hidden` peut etre surcharge par CSS (`display: flex` gagne sur `hidden`). Utilisez une classe CSS pour plus de controle.

---

## 10. `provide` / `inject` -> Services + DI

### Vue 3

```typescript
// Parent (fournisseur)
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)

// Enfant (consommateur)
import { inject } from 'vue'

const theme = inject('theme')  // Ref<string>
```

### Angular 19+

```typescript
// Service (equivalent du provide)
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'dark' | 'light'>('dark');

  toggle() {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }
}

// Composant (equivalent du inject)
@Component({ /* ... */ })
export class NavbarComponent {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;
}
```

**Différence clé** : en Vue, provide/inject est optionnel et ad-hoc. En Angular, l'injection de dépendances est **le mécanisme central**. Tout passe par des services et `inject()`.

---

## 11. Pinia -> Services + Signals

### Vue 3 (Pinia)

```typescript
// stores/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, doubled, increment }
})

// Dans un composant
const store = useCounterStore()
store.increment()
```

### Angular 19+

```typescript
// services/counter.service.ts
@Injectable({ providedIn: 'root' })
export class CounterService {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment() {
    this.count.update(c => c + 1);
  }
}

// Dans un composant
@Component({ /* ... */ })
export class AppComponent {
  counterService = inject(CounterService);
}
```

**Différence clé** : Angular n'a pas besoin d'une librairie externe comme Pinia. Un service `providedIn: 'root'` avec des Signals **est** un store. Pour des cas avances, il existe NgRx SignalStore (module 10).

---

## 12. Vue Router -> Angular Router

### Vue 3

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/user/:id', component: () => import('./pages/User.vue') },
  ]
})
```

```html
<!-- App.vue -->
<router-link to="/user/42">Utilisateur 42</router-link>
<router-view />
```

### Angular 19+

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'user/:id', loadComponent: () => import('./pages/user.component').then(m => m.UserComponent) },
];
```

```html
<!-- app.component.html -->
<a routerLink="/user/42">Utilisateur 42</a>
<router-outlet />
```

**Différence clé** : même concept, syntaxe différente. Angular utilise `loadComponent` pour le lazy loading (équivalent de `() => import()` en Vue). `<router-outlet>` remplace `<router-view>`.

---

## 13. SFC `.vue` -> `.component.ts` standalone

### Vue 3

```vue
<!-- UserCard.vue (Single File Component) -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ name: string }>()
const isExpanded = ref(false)
</script>

<template>
  <div class="card" @click="isExpanded = !isExpanded">
    <h2>{{ props.name }}</h2>
    <p v-if="isExpanded">Details...</p>
  </div>
</template>

<style scoped>
.card { border: 1px solid #ccc; padding: 1rem; }
</style>
```

### Angular 19+

```typescript
// user-card.component.ts (standalone component)
import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <div class="card" (click)="isExpanded.set(!isExpanded())">
      <h2>{{ name() }}</h2>
      @if (isExpanded()) {
        <p>Details...</p>
      }
    </div>
  `,
  styles: [`
    .card { border: 1px solid #ccc; padding: 1rem; }
  `]
})
export class UserCardComponent {
  name = input.required<string>();
  isExpanded = signal(false);
}
```

**Différence clé** : Vue utilise un format de fichier special (`.vue`) avec des blocs `<script>`, `<template>`, `<style>`. Angular met tout dans un fichier TypeScript standard. Le template et les styles peuvent etre inline ou dans des fichiers separes (`templateUrl`, `styleUrl`).

---

## 14. `<Suspense>` -> `@defer`

### Vue 3

```html
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <LoadingSpinner />
  </template>
</Suspense>
```

### Angular 19+

```html
@defer (on viewport) {
  <app-heavy-component />
} @placeholder {
  <div>Bientot charge...</div>
} @loading (minimum 500ms) {
  <app-loading-spinner />
} @error {
  <div>Erreur de chargement</div>
}
```

**Différence clé** : `@defer` d'Angular est beaucoup plus puissant. Il supporte des **declencheurs** (`on viewport`, `on interaction`, `on idle`, `on timer`, `when condition`), un placeholder, un état de chargement et un état d'erreur. Le composant est lazy-loade automatiquement.

---

## 15. Nuxt -> Angular SSR

### Vue 3 (Nuxt)

```bash
npx nuxi init my-nuxt-app
```

Nuxt ajoute le SSR, le routing par fichiers, les composables auto-importes, etc.

### Angular 19+

```bash
ng new my-app --ssr
# Ou ajouter SSR a un projet existant :
ng add @angular/ssr
```

Angular SSR est **intégré au framework** depuis Angular 17+. Pas besoin d'un meta-framework separe.

---

## 16. Composables -> Services

### Vue 3

```typescript
// composables/useLocalStorage.ts
import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const data = ref<T>(JSON.parse(localStorage.getItem(key) ?? 'null') ?? defaultValue)

  watch(data, (newVal) => {
    localStorage.setItem(key, JSON.stringify(newVal))
  }, { deep: true })

  return data
}
```

### Angular 19+

```typescript
// services/local-storage.service.ts
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  getSignal<T>(key: string, defaultValue: T) {
    const stored = localStorage.getItem(key);
    const data = signal<T>(stored ? JSON.parse(stored) : defaultValue);

    effect(() => {
      localStorage.setItem(key, JSON.stringify(data()));
    });

    return data;
  }
}
```

**Différence clé** : en Vue, un composable est une simple fonction. En Angular, un service est une classe injectable. La logique est la même, le conteneur change. L'avantage du service : testabilité native (on peut mocker `LocalStorageService` en test).

---

## Résumé : aide-mémoire rapide

Gardez ce tableau sous la main pendant vos premiers jours Angular :

```
Vue 3                    Angular 19+
─────────────────────    ─────────────────────
ref(val)                 signal(val)
ref.value                signal()
computed(() =>)          computed(() =>)
watchEffect(() =>)       effect(() =>)
defineProps<T>()         input<T>() / input.required<T>()
defineEmits()            output<T>()
defineModel()            model<T>()
v-if / v-else            @if / @else
v-for + :key             @for + track
v-show                   [hidden]
provide/inject           Services + inject()
Pinia store              Service + Signals
Vue Router               Angular Router
.vue SFC                 .component.ts standalone
<Suspense>               @defer
Nuxt                     Angular SSR
composables              services
```

---

## Prochain cours

**[Cours 3 -- Premier projet Angular](./03-premier-projet-angular.md)**
On passe à la pratique : créer un vrai projet Angular, explorer chaque fichier, et coder votre premier composant standalone.
