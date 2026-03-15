# Correction — Exercice 23 : NgRx SignalStore

## Résultat attendu

Deux stores NgRx SignalStore (un classique avec `withState`, un avec `withEntities`) qui gerent une liste de taches. Le composant consomme le store injecte et le manipule via des méthodes typees. Une comparaison ecrite entre l'approche service+signals et NgRx SignalStore.

## Code corrige

### Modèle de donnees

```typescript
// src/app/exercises/ex23/models/task.model.ts

// Meme interface que l'exercice 22
export interface Task {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: Date;
}

export type TaskFilter = 'all' | 'active' | 'completed';

// --- Interface de l'etat du store ---
// Definit la forme de l'etat gere par signalStore()
// Utile pour typer withState() et getState()
export interface TaskState {
  readonly tasks: Task[];
  readonly filter: TaskFilter;
  readonly loading: boolean;
}
```

### Store principal avec signalStore()

```typescript
// src/app/exercises/ex23/store/task.store.ts

// --- Imports NgRx SignalStore ---
// signalStore : fonction factory qui cree un store injectable
// withState : definit l'etat initial du store (cree des signaux automatiquement)
// withComputed : ajoute des signaux derives (computed)
// withMethods : ajoute des methodes pour muter l'etat
// withHooks : ajoute des hooks de cycle de vie (onInit, onDestroy)
// patchState : met a jour l'etat de maniere immutable (comme un spread partiel)
// getState : retourne un snapshot de l'etat complet (utile pour le debug)
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState,
  getState,
} from '@ngrx/signals';

// computed d'Angular pour les signaux derives
import { computed } from '@angular/core';

import { type Task, type TaskFilter, type TaskState } from '../models/task.model';

// --- Etat initial ---
// Definit les valeurs par defaut de chaque propriete de l'etat
// signalStore() creera automatiquement un signal pour chaque propriete
const initialState: TaskState = {
  tasks: [],
  filter: 'all',
  loading: false,
};

// --- Creation du store ---
// signalStore() est une fonction factory qui compose des "features"
// Chaque withXxx() ajoute des capacites au store
// L'ordre des features compte : chaque feature peut acceder aux precedentes
export const TaskStore = signalStore(
  // { providedIn: 'root' } rend le store injectable globalement (singleton)
  { providedIn: 'root' },

  // =============================================
  // withState() — Etat initial
  // =============================================
  // Cree un signal pour chaque propriete de l'objet
  // store.tasks() → Signal<Task[]>
  // store.filter() → Signal<TaskFilter>
  // store.loading() → Signal<boolean>
  withState(initialState),

  // =============================================
  // withComputed() — Signaux derives
  // =============================================
  // Recoit le store en parametre (acces aux signaux crees par withState)
  // Chaque propriete retournee est un computed() Angular
  withComputed((store) => ({
    // --- Taches filtrees ---
    // Se recalcule quand store.tasks() ou store.filter() change
    filteredTasks: computed(() => {
      const tasks = store.tasks();
      const filter = store.filter();

      switch (filter) {
        case 'active':
          return tasks.filter((t) => !t.completed);
        case 'completed':
          return tasks.filter((t) => t.completed);
        case 'all':
        default:
          return tasks;
      }
    }),

    // --- Compteurs ---
    taskCount: computed(() => store.tasks().length),
    completedCount: computed(() => store.tasks().filter((t) => t.completed).length),
    activeCount: computed(() => store.tasks().filter((t) => !t.completed).length),
  })),

  // =============================================
  // withMethods() — Methodes de mutation
  // =============================================
  // Recoit le store en parametre
  // Chaque methode utilise patchState() pour modifier l'etat
  withMethods((store) => ({
    // --- Ajouter une tache ---
    addTask(title: string): void {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        completed: false,
        createdAt: new Date(),
      };

      // patchState() met a jour partiellement l'etat
      // On passe un objet avec les proprietes a modifier
      // Les proprietes non mentionnees restent inchangees
      patchState(store, (state) => ({
        tasks: [...state.tasks, newTask],
      }));
    },

    // --- Basculer le statut ---
    toggleTask(id: string): void {
      patchState(store, (state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, completed: !task.completed }
            : task
        ),
      }));
    },

    // --- Supprimer une tache ---
    deleteTask(id: string): void {
      patchState(store, (state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
    },

    // --- Changer le filtre ---
    setFilter(filter: TaskFilter): void {
      // patchState avec un objet simple (pas de fonction callback)
      patchState(store, { filter });
    },

    // --- Supprimer les taches completees ---
    clearCompleted(): void {
      patchState(store, (state) => ({
        tasks: state.tasks.filter((task) => !task.completed),
      }));
    },

    // --- Debug : afficher l'etat complet ---
    debugState(): void {
      // getState() retourne un snapshot synchrone de tout l'etat
      console.log('[TaskStore] Etat complet :', getState(store));
    },
  })),

  // =============================================
  // withHooks() — Cycle de vie du store
  // =============================================
  withHooks({
    // onInit est appele la premiere fois que le store est injecte
    onInit(store) {
      console.log('[TaskStore] Initialisation du store');

      // Charger des taches d'exemple au demarrage
      const exampleTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Apprendre NgRx SignalStore',
          completed: false,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Migrer depuis le service custom',
          completed: false,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Ecrire les tests',
          completed: true,
          createdAt: new Date(),
        },
      ];

      patchState(store, { tasks: exampleTasks });
    },

    // onDestroy est appele quand le store est detruit
    onDestroy() {
      console.log('[TaskStore] Destruction du store');
    },
  })
);
```

### Store avec entites (withEntities)

```typescript
// src/app/exercises/ex23/store/task-entity.store.ts

// --- Imports NgRx SignalStore + Entities ---
// withEntities : ajoute la gestion d'entites (collection normalisee par id)
// Les fonctions addEntity, updateEntity, removeEntity manipulent la collection
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState,
} from '@ngrx/signals';

import {
  withEntities,
  addEntity,
  updateEntity,
  removeEntity,
  setAllEntities,
} from '@ngrx/signals/entities';

import { computed } from '@angular/core';

import { type Task, type TaskFilter } from '../models/task.model';

// --- Etat additionnel ---
// withEntities gere les entites (tasks) automatiquement
// On n'a besoin que de l'etat supplementaire (filter, loading)
interface TaskEntityExtraState {
  readonly filter: TaskFilter;
  readonly loading: boolean;
}

export const TaskEntityStore = signalStore(
  { providedIn: 'root' },

  // withEntities<Task>() ajoute automatiquement :
  //   - store.entities() → Signal<Task[]> (toutes les entites)
  //   - store.ids() → Signal<string[]> (tous les ids)
  //   - store.entityMap() → Signal<Record<string, Task>> (dictionnaire par id)
  withEntities<Task>(),

  // Etat supplementaire (en plus des entites)
  withState<TaskEntityExtraState>({
    filter: 'all',
    loading: false,
  }),

  withComputed((store) => ({
    // store.entities() remplace store.tasks()
    filteredTasks: computed(() => {
      const tasks = store.entities();
      const filter = store.filter();

      switch (filter) {
        case 'active':
          return tasks.filter((t) => !t.completed);
        case 'completed':
          return tasks.filter((t) => t.completed);
        default:
          return tasks;
      }
    }),

    taskCount: computed(() => store.entities().length),
    completedCount: computed(() => store.entities().filter((t) => t.completed).length),
    activeCount: computed(() => store.entities().filter((t) => !t.completed).length),
  })),

  withMethods((store) => ({
    addTask(title: string): void {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        completed: false,
        createdAt: new Date(),
      };

      // addEntity() ajoute une entite a la collection
      // Plus besoin de gerer le spread manuellement
      patchState(store, addEntity(newTask));
    },

    toggleTask(id: string): void {
      // updateEntity() met a jour une entite par son id
      // On passe un objet { id, changes } ou changes est une fonction ou un objet partiel
      patchState(
        store,
        updateEntity({
          id,
          changes: (task) => ({ completed: !task.completed }),
        })
      );
    },

    deleteTask(id: string): void {
      // removeEntity() supprime une entite par son id
      patchState(store, removeEntity(id));
    },

    setFilter(filter: TaskFilter): void {
      patchState(store, { filter });
    },

    clearCompleted(): void {
      // On filtre les entites completees et on les supprime une par une
      // Ou on reconstruit la collection avec setAllEntities
      const activeTasks = store.entities().filter((t) => !t.completed);
      patchState(store, setAllEntities(activeTasks));
    },
  })),

  withHooks({
    onInit(store) {
      console.log('[TaskEntityStore] Initialisation');

      const exampleTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Decouvrir withEntities',
          completed: false,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Comparer avec le store classique',
          completed: true,
          createdAt: new Date(),
        },
      ];

      // setAllEntities() remplace toute la collection
      patchState(store, setAllEntities(exampleTasks));
    },
  })
);
```

### Composant TaskBoard

```typescript
// src/app/exercises/ex23/components/task-board.component.ts

import { Component, inject, signal } from '@angular/core';

// On importe le store comme un type injectable
// signalStore() retourne une classe injectable (comme un @Injectable)
import { TaskStore } from '../store/task.store';
import { type TaskFilter } from '../models/task.model';

@Component({
  selector: 'app-task-board',
  standalone: true,
  template: `
    <div class="board-container">
      <h2>Task Board (NgRx SignalStore)</h2>

      <!-- Formulaire d'ajout -->
      <div class="add-form">
        <input
          type="text"
          [value]="newTitle()"
          (input)="onInput($event)"
          (keydown.enter)="onAdd()"
          placeholder="Nouvelle tache..."
        />
        <button (click)="onAdd()">Ajouter</button>
      </div>

      <!-- Statistiques (signaux computed du store) -->
      <div class="stats">
        <span>Total : {{ store.taskCount() }}</span>
        <span>Actives : {{ store.activeCount() }}</span>
        <span>Terminees : {{ store.completedCount() }}</span>
      </div>

      <!-- Filtres -->
      <div class="filters">
        @for (f of filters; track f) {
          <button
            [class.active]="store.filter() === f"
            (click)="store.setFilter(f)"
          >
            {{ f }}
          </button>
        }
      </div>

      <!-- Liste -->
      <ul>
        @for (task of store.filteredTasks(); track task.id) {
          <li [class.completed]="task.completed">
            <input
              type="checkbox"
              [checked]="task.completed"
              (change)="store.toggleTask(task.id)"
            />
            <span>{{ task.title }}</span>
            <button class="delete" (click)="store.deleteTask(task.id)">x</button>
          </li>
        } @empty {
          <li class="empty">Aucune tache</li>
        }
      </ul>

      @if (store.completedCount() > 0) {
        <button class="clear" (click)="store.clearCompleted()">
          Supprimer terminees
        </button>
      }
    </div>
  `,
  styles: [`
    .board-container { max-width: 600px; margin: 0 auto; padding: 1rem; }
    .add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .add-form input { flex: 1; padding: 0.5rem; }
    .add-form button { padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; }
    .stats { display: flex; gap: 1rem; margin-bottom: 1rem; color: #666; }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .filters button { padding: 0.25rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; background: white; }
    .filters button.active { background: #1976d2; color: white; }
    ul { list-style: none; padding: 0; }
    li { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }
    li.completed span { text-decoration: line-through; color: #999; }
    .delete { background: #e74c3c; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; margin-left: auto; }
    .empty { text-align: center; color: #999; }
    .clear { margin-top: 1rem; background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; }
  `],
})
export class TaskBoardComponent {
  // --- Injection du store ---
  // Le store cree par signalStore() est injectable comme un service classique
  protected readonly store = inject(TaskStore);

  // Liste des filtres pour le @for dans le template
  readonly filters: TaskFilter[] = ['all', 'active', 'completed'];

  // Signal local pour le champ de saisie
  readonly newTitle = signal('');

  onInput(event: Event): void {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  onAdd(): void {
    const title = this.newTitle().trim();
    if (title.length === 0) return;
    this.store.addTask(title);
    this.newTitle.set('');
  }
}
```

### Comparaison des approches

```markdown
<!-- src/app/exercises/ex23/store/comparison.md -->

# Comparaison : Service + Signals vs NgRx SignalStore

| Critere | Service + Signals (ex 22) | NgRx SignalStore (ex 23) |
|---------|---------------------------|--------------------------|
| **Verbosity** | Faible — code direct, peu de boilerplate | Moyenne — composition de features, plus de structure |
| **Scalability** | Moyenne — croit lineairement, mais pas de structure imposee | Haute — features composables, patterns standardises |
| **Testability** | Bonne — service classique, facile a mocker | Tres bonne — getState(), patchState(), store isolable |
| **Separation etat/logique** | Manuelle — on peut melanger | Imposee — withState/withComputed/withMethods separent clairement |
| **Gestion d'entites** | Manuelle — map/filter a ecrire soi-meme | Integree — withEntities + addEntity/updateEntity/removeEntity |
| **Courbe d'apprentissage** | Faible — si on connait les signaux Angular | Moyenne — API specifique NgRx a apprendre |
| **Quand l'utiliser** | Petites a moyennes applications, state local | Moyennes a grandes applications, state partage complexe |
```

## Ce que tu aurais pu oublier

### 1. Oublier `{ providedIn: 'root' }` dans signalStore()
- ❌ `signalStore(withState(...))` → le store n'est pas injectable, erreur "No provider for TaskStore"
- ✅ `signalStore({ providedIn: 'root' }, withState(...))` → injectable globalement

### 2. Utiliser `.set()` au lieu de `patchState()`
- ❌ `store.tasks.set([...])` → les signaux du store sont en lecture seule
- ✅ `patchState(store, { tasks: [...] })` → seul moyen de modifier l'état du store

### 3. Oublier que `withEntities` nomme les signaux `entities()` et pas `tasks()`
- ❌ `store.tasks()` → erreur, la propriété n'existe pas avec withEntities
- ✅ `store.entities()` → retourne toutes les entites du store

### 4. Ne pas passer une fonction a `patchState()` quand on a besoin de l'état précédent
- ❌ `patchState(store, { tasks: [...store.tasks(), newTask] })` → fonctionne mais moins clair
- ✅ `patchState(store, (state) => ({ tasks: [...state.tasks, newTask] }))` → acces a l'état précédent via le callback

### 5. Confondre l'ordre des features dans signalStore()
- ❌ `withComputed` avant `withState` → les signaux d'état ne sont pas encore disponibles
- ✅ Ordre : `withState` → `withComputed` → `withMethods` → `withHooks`

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `signalStore()` | Factory qui créé un store injectable en composant des features |
| `withState(initialState)` | Definit l'état initial et créé un signal par propriété |
| `withComputed(store => {...})` | Ajoute des signaux dérivés (computed) au store |
| `withMethods(store => {...})` | Ajoute des méthodes pour muter l'état |
| `withHooks({ onInit, onDestroy })` | Ajoute des hooks de cycle de vie au store |
| `patchState(store, changes)` | Met a jour l'état de manière immutable (merge partiel) |
| `getState(store)` | Retourne un snapshot synchrone de l'état complet |
| `withEntities<T>()` | Ajoute la gestion d'une collection normalisee d'entites |
| `addEntity(entity)` | Ajoute une entite à la collection |
| `updateEntity({ id, changes })` | Met a jour une entite par son id |
| `removeEntity(id)` | Supprime une entite par son id |
| `setAllEntities(entities)` | Remplace toute la collection d'entites |
