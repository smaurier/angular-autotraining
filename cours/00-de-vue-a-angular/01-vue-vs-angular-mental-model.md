# Cours 1 -- Modèle mental : de Vue a Angular

<!-- nav-cours-précédent -->
> **Cours précédent** : [Vue.js](../../../03-vue/cours/12-vue-query/02-patterns-avances.md). Si tu arrives ici sans avoir fait les cours précédents, consulte le [guide de démarrage](../../../GUIDE-DEMARRAGE.md).


> **Module** : 00 - De Vue a Angular
> **Duree estimee** : 1h15
> **Prérequis** : Experience Vue 3 (Composition API)

> **Ressource transversale** : consulte [`00-pieges-frequents.md`](../00-pieges-frequents.md) régulièrement — il liste les pièges courants quand on passe de Vue à Angular.

---

## Objectif

A la fin de ce cours, vous serez capable de :

- Expliquer les différences fondamentales entre l'approche Vue et l'approche Angular
- Comprendre la philosophie "batteries-included" d'Angular
- Naviguer dans un projet Angular sans etre perdu
- Identifier les équivalents Angular de vos reflexes Vue

---

## Analogie fondamentale

> **Vue, c'est un couteau suisse configurable.** Vous choisissez chaque lame : Pinia pour le state, Vue Router pour le routing, Vitest pour les tests, Axios ou fetch pour le HTTP. Chaque projet peut etre différent.
>
> **Angular, c'est une usine complete avec sa chaine de montage.** Le router, le client HTTP, les formulaires, les tests, le build system, l'injection de dépendances -- tout est intégré et prévu pour fonctionner ensemble. Chaque projet Angular se ressemble.

Cette différence est **le** point le plus important à comprendre. En Vue, vous etes architecte. En Angular, l'architecture est déjà la -- vous construisez dedans.

---

## 1. Framework vs ecosysteme de librairies

### Vue : la librairie progressive

Vue se présenté comme un **framework progressif**. En realite, le coeur de Vue est une librairie de rendu réactif. Vous y ajoutez des briques selon vos besoins :

```
Vue 3 (core)
  + Vue Router      (optionnel)
  + Pinia            (optionnel)
  + Axios            (externe)
  + Vitest           (externe)
  + Vite             (build)
```

**Avantage** : flexibilite, bundle minimal.
**Inconvenient** : chaque équipe fait des choix différents, les conventions varient.

### Angular : le framework opinione

Angular livre **tout dans la boite** :

```
Angular (core)
  Router             (integre)
  HttpClient         (integre)
  Forms              (integre)
  Animations         (integre)
  Testing            (integre)
  CLI                (integre)
  Dependency Injection (integre)
```

**Avantage** : coherence entre projets, documentation unifiee, conventions partagees.
**Inconvenient** : courbe d'apprentissage initiale plus raide, bundle plus important.

### Ce que ça change pour vous

En Vue, quand vous rejoigniez un projet, vous deviez comprendre les choix de l'équipe. En Angular, le cadre est fixe. Vous pouvez passer d'un projet Angular à un autre et retrouver vos reperes immediatement. C'est pourquoi Angular est très present en entreprise (banques, assurances, ESN).

---

## 2. CLI-driven development

### En Vue

Vous utilisez `npm create vue@latest` (via `create-vue`) ou `npm create vite@latest` pour générer un projet. Ensuite, la structure est libre.

### En Angular

Le CLI Angular (`ng`) est le centre nevralgique de votre workflow :

```bash
# Creer un projet
ng new mon-projet --style=scss --routing

# Generer un composant
ng generate component features/user/user-list
# Raccourci : ng g c features/user/user-list

# Generer un service
ng generate service core/services/user

# Lancer le serveur de dev
ng serve

# Lancer les tests
ng test

# Builder pour la production
ng build
```

Le CLI généré du code **qui respecte les conventions Angular**. Il met a jour les imports, créé les fichiers de test, respecte la structure. Utilisez-le systematiquement.

### Commandes `ng generate` courantes

| Commande | Raccourci | Genere |
|----------|-----------|--------|
| `ng generate component` | `ng g c` | Composant (.ts, .html, .scss, .spec.ts) |
| `ng generate service` | `ng g s` | Service (.ts, .spec.ts) |
| `ng generate pipe` | `ng g p` | Pipe (.ts, .spec.ts) |
| `ng generate directive` | `ng g d` | Directive (.ts, .spec.ts) |
| `ng generate guard` | `ng g guard` | Guard (.ts) |
| `ng generate interceptor` | `ng g interceptor` | Interceptor (.ts) |

### Le fichier `angular.json`

C'est l'équivalent du `vite.config.ts` de Vue, mais beaucoup plus complet. Il configure :
- Les chemins source et de build
- Les styles globaux et les scripts
- Les options de compilation (budgets, optimisation)
- Les environnements (dev, prod, staging)

Vous n'avez généralement pas a le modifier manuellement -- le CLI s'en charge.

---

## 3. Decorateurs et metadonnees

### En Vue (Composition API)

Un composant Vue est un simple objet ou une fonction `setup()`. Pas de decorateur, pas de metadonnee explicite :

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

### En Angular

Angular utilise des **decorateurs TypeScript** pour attacher des metadonnees aux classes :

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',       // Le "nom de balise" du composant
  template: `
    <button (click)="increment()">{{ count() }}</button>
  `,
  styles: [`
    button { font-size: 1.5rem; padding: 0.5rem 1rem; }
  `]
})
export class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update(c => c + 1);
  }
}
```

### Les decorateurs principaux

| Decorateur | Role | Equivalent Vue |
|------------|------|----------------|
| `@Component()` | Definit un composant | `<script setup>` + SFC |
| `@Injectable()` | Definit un service injectable | Composable exportable |
| `@Pipe()` | Definit une transformation de donnees | Filtre / fonction utilitaire |
| `@Directive()` | Definit une directive | Directive custom Vue |

Les decorateurs sont ce qui distingue Angular de Vue au premier coup d'oeil. Ils peuvent sembler verbeux, mais ils rendent le code **explicite et auto-documente**.

---

## 4. L'injection de dépendances (DI) -- la différence fondamentale

C'est ici que Vue et Angular divergent le plus. Comprendre la DI est **la clé** pour maîtriser Angular.

### En Vue

Les dépendances sont importees directement :

```typescript
// composables/useUserService.ts
import { ref } from 'vue'
import axios from 'axios'

export function useUserService() {
  const users = ref([])
  const fetchUsers = async () => {
    users.value = (await axios.get('/api/users')).data
  }
  return { users, fetchUsers }
}

// Dans un composant
import { useUserService } from '@/composables/useUserService'
const { users, fetchUsers } = useUserService()
```

Chaque composant créé une **nouvelle instance** du composable (sauf si vous utilisez `provide/inject` ou un store Pinia).

### En Angular

Les dépendances sont **injectees** par le framework :

```typescript
// services/user.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  users = signal<User[]>([]);

  fetchUsers() {
    this.http.get<User[]>('/api/users').subscribe(data => {
      this.users.set(data);
    });
  }
}

// Dans un composant
@Component({ /* ... */ })
export class UserListComponent {
  private userService = inject(UserService);
  users = this.userService.users;
}
```

`providedIn: 'root'` signifie : Angular créé **une seule instance** (singleton) pour toute l'application. Le composant ne sait pas comment `UserService` est créé -- il demandé juste a Angular de le lui fournir.

### Pourquoi la DI est importante

- **Testabilite** : en test, vous pouvez remplacer `UserService` par un mock sans modifier le composant.
- **Decouplage** : le composant ne depend pas d'un import concret. Vous pouvez changer l'implementation sans toucher aux consommateurs.
- **Hiérarchie** : vous pouvez fournir des implementations différentes a différents niveaux de l'arbre de composants.

En Vue, ces avantages necessitent une discipline manuelle (provide/inject, abstractions). En Angular, ils sont **integres au framework**.

---

## 5. Structure de projet : Vue vs Angular

### Projet Vue typique

```
my-vue-app/
  src/
    assets/
    components/
      UserCard.vue
    composables/
      useAuth.ts
    pages/ (ou views/)
      HomePage.vue
    router/
      index.ts
    stores/
      user.ts
    App.vue
    main.ts
  vite.config.ts
  package.json
```

### Projet Angular typique

```
my-angular-app/
  src/
    app/
      core/
        services/
          auth.service.ts
        interceptors/
          auth.interceptor.ts
        guards/
          auth.guard.ts
      features/
        user/
          user-list/
            user-list.component.ts
            user-list.component.html
            user-list.component.scss
            user-list.component.spec.ts
          user-detail/
            user-detail.component.ts
      shared/
        components/
          button/
            button.component.ts
        pipes/
          date-format.pipe.ts
      app.component.ts
      app.config.ts
      app.routes.ts
    assets/
    styles/
      _variables.scss
    index.html
    main.ts
  angular.json
  package.json
  tsconfig.json
```

### Points clés de la structure Angular

| Dossier | Role | Equivalent Vue |
|---------|------|----------------|
| `core/` | Services singleton, guards, interceptors | `composables/`, `stores/` |
| `features/` | Composants par fonctionnalite | `pages/`, `views/` |
| `shared/` | Composants et pipes réutilisables | `components/` |
| `app.config.ts` | Configuration de l'application | `main.ts` (createApp) |
| `app.routes.ts` | Definition des routes | `router/index.ts` |

Remarquez qu'Angular separe un composant en **plusieurs fichiers** (.ts, .html, .scss, .spec.ts) au lieu du SFC Vue (un seul .vue). C'est un choix de convention, pas une obligation -- vous pouvez tout mettre inline.

---

## 6. Système de build : Vue/Vite vs Angular/esbuild

### Vue

Vue utilise **Vite** comme build system par defaut :
- Dev : Vite dev server avec HMR ultra-rapide
- Prod : Rollup pour le bundling

### Angular

Angular 19+ utilise **esbuild + Vite** (application builder) :
- Dev : Vite dev server avec HMR
- Prod : esbuild pour une compilation extremement rapide
- SSR : Support intégré via `@angular/ssr`

Les deux ecosystemes convergent vers Vite, ce qui est une bonne nouvelle pour les développeurs Vue : le dev server Angular 19+ est rapide et familier.

### Configuration

| Aspect | Vue | Angular |
|--------|-----|---------|
| Config build | `vite.config.ts` | `angular.json` |
| TypeScript | `tsconfig.json` | `tsconfig.json` + `tsconfig.app.json` |
| Styles globaux | Import dans `main.ts` | Section `styles` dans `angular.json` |
| Env variables | `.env`, `import.meta.env` | `environment.ts` |

---

## Pratique : cartographie mentale

Prenez 10 minutes pour faire cet exercice mental :

1. **Pensez a votre dernier composant Vue.** Identifiez :
   - Les imports (composables, composants enfants)
   - Les donnees réactives (`ref`, `computed`)
   - Les événements emis
   - Le template (v-if, v-for)

2. **Imaginez-le en Angular :**
   - Les composables deviennent des **services** injectes via `inject()`
   - `ref()` devient `signal()`
   - `computed()` reste `computed()` (même nom !)
   - `defineEmits` devient `output()`
   - `v-if` devient `@if`
   - `v-for` devient `@for (...; track ...)`

3. **Dessinez** (sur papier) la structure de fichiers Angular correspondante.

---

## Résumé

| Concept | Vue 3 | Angular 19+ |
|---------|-------|-------------|
| Philosophie | Progressif, flexible | Opinione, complet |
| CLI | `create-vue` (leger) | `ng` CLI (complet) |
| Composant | SFC `.vue` | Classe + decorateur `@Component` |
| Metadonnees | Implicites (`<script setup>`) | Explicites (decorateurs) |
| DI | `provide/inject` (optionnel) | `inject()` (central) |
| Structure | Libre | Conventionnelle (core/features/shared) |
| Build | Vite | esbuild + Vite |
| State | Pinia (externe) | Services + Signals (intégré) |

---

## Prochain cours

**[Cours 2 -- Equivalences Vue / Angular](./02-equivalences-vue-angular.md)**
Un tableau complet et détaillé de toutes les correspondances entre les APIs Vue 3 et Angular 19+, avec des exemples de code cote a cote.
