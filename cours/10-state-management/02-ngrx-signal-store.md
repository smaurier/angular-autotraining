# Cours 40 — NgRx SignalStore : store structure pour grandes équipes

> **Objectif** : Comprendre pourquoi et quand utiliser NgRx SignalStore, maîtriser sa création avec `signalStore()`, `withState()`, `withComputed()`, `withMethods()`, `withHooks()`, `patchState()`, et la gestion d'entites avec `withEntities()`. Savoir quand choisir SignalStore plutot qu'un simple service.

---

## Rappel du cours précédent

<details>
<summary>1. Quel est le pattern "store maison" avec un service Angular ?</summary>

Un `@Injectable` avec des `signal()` prives pour l'état, des `computed()` pour les selecteurs, des méthodes pour les actions, et `.asReadonly()` pour exposer l'état en lecture seule.
</details>

<details>
<summary>2. Quel est l'équivalent Pinia de `signal()` et `computed()` en Angular ?</summary>

`ref()` correspond a `signal()`, et `computed()` existe dans les deux frameworks avec la même semantique.
</details>

<details>
<summary>3. Quand est-ce qu'un service + signals suffit ?</summary>

Pour la plupart des projets ESN : équipe de 1-5 dev, état pas trop complexe, pas besoin de devtools ou de middleware.
</details>

---

## Analogie

Imaginez que le "store maison" (service + signals) est comme cuisiner chez soi : vous etes libre, flexible, vous organisez votre cuisine comme vous voulez.

**NgRx SignalStore** est comme une cuisine professionnelle de restaurant : tout est standardise, chaque ustensile a sa place, chaque processus suit un protocole. C'est plus rigid mais quand 10 cuisiniers travaillent ensemble, cette structure evite le chaos.

En termes Vue 3 :
| Vue 3 | Angular |
|-------|---------|
| Pinia "setup store" (libre) | Service + Signals |
| Pinia "option store" (structure) | NgRx SignalStore |
| Vuex (legacy strict) | NgRx Store classique |

---

## Théorie

### Pourquoi NgRx SignalStore ?

```
Service + Signals :
  + Flexible, leger, pas de dependance
  - Pas de convention imposee
  - Chaque dev organise differemment
  - Pas de devtools integres

NgRx SignalStore :
  + Convention stricte (withState, withMethods...)
  + Plugins (withEntities, withHooks...)
  + Compatible DevTools NgRx
  + Toute l'equipe code de la meme facon
  - Dependance supplementaire
  - Courbe d'apprentissage
```

> **En ESN** : Si le client utilise déjà NgRx, vous devez le maîtriser. Si c'est un nouveau projet avec une grande équipe, SignalStore est un bon choix.

### Installation

```bash
npm install @ngrx/signals
```

### Création d'un store avec signalStore()

```typescript
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface TaskState {
  tasks: Task[];
  filtre: 'toutes' | 'actives' | 'terminees';
  chargement: boolean;
}

const initialState: TaskState = {
  tasks: [],
  filtre: 'toutes',
  chargement: false,
};

export const TaskStore = signalStore(
  // Rend le store disponible globalement (comme providedIn: 'root')
  { providedIn: 'root' },

  // 1. Etat initial
  withState(initialState),

  // 2. Selecteurs derives
  withComputed((store) => ({
    tasksFiltrees: computed(() => {
      const tasks = store.tasks();
      switch (store.filtre()) {
        case 'actives': return tasks.filter(t => !t.terminee);
        case 'terminees': return tasks.filter(t => t.terminee);
        default: return tasks;
      }
    }),
    nbActives: computed(() => store.tasks().filter(t => !t.terminee).length),
    nbTerminees: computed(() => store.tasks().filter(t => t.terminee).length),
    progression: computed(() => {
      const total = store.tasks().length;
      return total === 0 ? 0 : Math.round(
        (store.tasks().filter(t => t.terminee).length / total) * 100
      );
    }),
  })),

  // 3. Actions (methodes)
  withMethods((store) => ({
    ajouter(titre: string): void {
      const nouvelle: Task = {
        id: Date.now(),
        titre,
        terminee: false,
      };
      patchState(store, { tasks: [...store.tasks(), nouvelle] });
    },

    supprimer(id: number): void {
      patchState(store, { tasks: store.tasks().filter(t => t.id !== id) });
    },

    basculer(id: number): void {
      patchState(store, {
        tasks: store.tasks().map(t =>
          t.id === id ? { ...t, terminee: !t.terminee } : t
        ),
      });
    },

    setFiltre(filtre: TaskState['filtre']): void {
      patchState(store, { filtre });
    },

    viderTerminees(): void {
      patchState(store, { tasks: store.tasks().filter(t => !t.terminee) });
    },
  })),
);
```

### Decomposition de l'API

| Fonction | Role | Equivalent service |
|----------|------|-------------------|
| `signalStore()` | Cree le store | `@Injectable` |
| `withState(initial)` | Definit l'état initial | `signal()` prives |
| `withComputed(fn)` | Ajoute des selecteurs dérivés | `computed()` |
| `withMethods(fn)` | Ajoute des actions | Méthodes du service |
| `patchState(store, partial)` | Met a jour partiellement l'état | `signal.update()` |
| `withHooks(fn)` | Lifecycle (onInit, onDestroy) | constructor / effect |

### patchState : mise a jour partielle

```typescript
// ❌ Remplacer tout l'etat manuellement
withMethods((store) => ({
  setChargement(): void {
    // Il faut re-specifier tasks, filtre... tout !
    store.tasks.set(store.tasks());
    store.filtre.set(store.filtre());
    store.chargement.set(true);  // ← le signal genere par withState
  }
}));

// ✅ patchState — ne met a jour que ce qui change
withMethods((store) => ({
  setChargement(): void {
    patchState(store, { chargement: true });  // Le reste ne bouge pas
  }
}));
```

> `patchState` est l'équivalent de `Object.assign` pour les signals du store. Seules les propriétés specifiees sont modifiees.

### withHooks : lifecycle du store

```typescript
export const TaskStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    charger(): void {
      const http = inject(HttpClient);
      patchState(store, { chargement: true });
      http.get<Task[]>('/api/tasks').subscribe({
        next: (tasks) => patchState(store, { tasks, chargement: false }),
        error: () => patchState(store, { chargement: false }),
      });
    },
  })),
  // Hook : appele quand le store est initialise
  withHooks({
    onInit(store) {
      console.log('TaskStore initialise');
      store.charger();  // Chargement automatique
    },
    onDestroy() {
      console.log('TaskStore detruit');
    },
  }),
);
```

### Gestion d'entites avec withEntities()

Pour les collections (listes d'objets avec un `id`), `@ngrx/signals/entities` fournit des utilitaires :

```typescript
import { signalStore, withMethods } from '@ngrx/signals';
import {
  withEntities, addEntity, updateEntity,
  removeEntity, setAllEntities,
} from '@ngrx/signals/entities';

export interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: string;
}

export const UtilisateurStore = signalStore(
  { providedIn: 'root' },

  // Cree automatiquement : entities(), ids(), entityMap()
  withEntities<Utilisateur>(),

  withMethods((store) => ({
    charger(utilisateurs: Utilisateur[]): void {
      patchState(store, setAllEntities(utilisateurs));
    },

    ajouter(utilisateur: Utilisateur): void {
      patchState(store, addEntity(utilisateur));
    },

    modifier(id: number, changements: Partial<Utilisateur>): void {
      patchState(store, updateEntity({ id, changes: changements }));
    },

    supprimer(id: number): void {
      patchState(store, removeEntity(id));
    },
  })),
);
```

```typescript
// Utilisation dans un composant
@Component({
  selector: 'app-users',
  template: `
    @for (user of store.entities(); track user.id) {
      <div>{{ user.nom }} — {{ user.email }}</div>
    }
    <p>Total : {{ store.ids().length }} utilisateurs</p>
  `,
})
export class UsersComponent {
  readonly store = inject(UtilisateurStore);
}
```

| Fonction entites | Role |
|-----------------|------|
| `withEntities<T>()` | Ajoute entities(), ids(), entityMap() |
| `setAllEntities(list)` | Remplace toutes les entites |
| `addEntity(entity)` | Ajoute une entite |
| `addEntities(list)` | Ajoute plusieurs entites |
| `updateEntity({ id, changes })` | Modifie une entite |
| `removeEntity(id)` | Supprime une entite |
| `removeAllEntities()` | Vide la collection |

### Utilisation dans un composant

```typescript
@Component({
  selector: 'app-task-page',
  template: `
    @if (store.chargement()) {
      <mat-spinner />
    } @else {
      <div class="filtres">
        <button (click)="store.setFiltre('toutes')">Toutes</button>
        <button (click)="store.setFiltre('actives')">
          Actives ({{ store.nbActives() }})
        </button>
        <button (click)="store.setFiltre('terminees')">
          Terminees ({{ store.nbTerminees() }})
        </button>
      </div>

      @for (task of store.tasksFiltrees(); track task.id) {
        <mat-checkbox [checked]="task.terminee"
                      (change)="store.basculer(task.id)">
          {{ task.titre }}
        </mat-checkbox>
      }

      <p>Progression : {{ store.progression() }}%</p>
    }
  `,
})
export class TaskPageComponent {
  // Injection directe — le store est un service injectable
  readonly store = inject(TaskStore);
}
```

### Quand SignalStore vs simple service ?

| Critere | Service + Signals | NgRx SignalStore |
|---------|------------------|-----------------|
| Équipe | 1-5 devs | 5+ devs |
| Complexite état | Simple a moyen | Moyen a complexe |
| Conventions | Libres | Imposees par l'API |
| Entites (CRUD) | Manuel | `withEntities()` intégré |
| Plugins | Aucun | Extensible (custom features) |
| DevTools | Non | Oui (NgRx DevTools) |
| Dependance | Aucune | `@ngrx/signals` |
| Courbe | Minimale | Moderee |

---

## Pratique

Refactorisez le `PanierStore` du cours précédent en utilisant NgRx SignalStore avec `withEntities()`.

**Consignes** :
1. Utilisez `signalStore()` avec `withEntities<ArticlePanier>()`
2. Ajoutez un état `chargement` avec `withState`
3. Computed : `total`, `nbArticles`
4. Méthodes : `ajouter`, `supprimer`, `vider`

<details>
<summary>Solution</summary>

```typescript
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { withEntities, addEntity, removeEntity, removeAllEntities, updateEntity } from '@ngrx/signals/entities';
import { computed } from '@angular/core';

export interface ArticlePanier {
  id: number;
  nom: string;
  prix: number;
  quantite: number;
}

export const PanierStore = signalStore(
  { providedIn: 'root' },

  withEntities<ArticlePanier>(),

  withState({ chargement: false }),

  withComputed((store) => ({
    nbArticles: computed(() =>
      store.entities().reduce((sum, a) => sum + a.quantite, 0)
    ),
    total: computed(() =>
      store.entities().reduce((sum, a) => sum + a.prix * a.quantite, 0)
    ),
  })),

  withMethods((store) => ({
    ajouter(article: Omit<ArticlePanier, 'quantite'>): void {
      const existant = store.entityMap()[article.id];
      if (existant) {
        patchState(store, updateEntity({
          id: article.id,
          changes: { quantite: existant.quantite + 1 },
        }));
      } else {
        patchState(store, addEntity({ ...article, quantite: 1 }));
      }
    },

    supprimer(id: number): void {
      patchState(store, removeEntity(id));
    },

    modifierQuantite(id: number, quantite: number): void {
      if (quantite <= 0) {
        patchState(store, removeEntity(id));
      } else {
        patchState(store, updateEntity({ id, changes: { quantite } }));
      }
    },

    vider(): void {
      patchState(store, removeAllEntities());
    },
  })),
);
```

```typescript
// Utilisation dans un composant
@Component({
  selector: 'app-panier',
  template: `
    @for (article of store.entities(); track article.id) {
      <div>
        {{ article.nom }} — {{ article.prix }} EUR x {{ article.quantite }}
        <button (click)="store.supprimer(article.id)">Supprimer</button>
      </div>
    }
    <p>Total : {{ store.total() }} EUR ({{ store.nbArticles() }} articles)</p>
    <button (click)="store.vider()">Vider le panier</button>
  `,
})
export class PanierComponent {
  readonly store = inject(PanierStore);
}
```
</details>

---

## Résumé

| API SignalStore | Role | Equivalent service |
|----------------|------|-------------------|
| `signalStore()` | Point d'entree | `@Injectable` |
| `withState()` | État initial | `signal()` prives |
| `withComputed()` | Derivations | `computed()` |
| `withMethods()` | Actions | Méthodes publiques |
| `patchState()` | MAJ partielle | `signal.update()` |
| `withHooks()` | Lifecycle | constructor / ngOnInit |
| `withEntities()` | Gestion CRUD | Code manuel |

> **A retenir** : NgRx SignalStore impose une structure. Utilisez-le quand l'équipe est grande ou que le client l'exige. Sinon, un service + signals est plus simple et tout aussi efficace.

---

> **Prochain cours** : [Cours 41 — Quand utiliser quoi : matrice de decision state management](./03-quand-utiliser-quoi.md)
