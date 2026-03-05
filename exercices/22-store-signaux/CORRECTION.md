# Correction — Exercice 22 : Store signaux

## Resultat attendu

Un service `TaskStore` qui gere entierement l'etat d'une liste de taches via les signaux Angular. Le composant consomme des signaux en lecture seule et appelle des methodes pour modifier l'etat. Aucun Observable, aucun BehaviorSubject — tout est signal.

## Code corrige

### Modele de donnees

```typescript
// src/app/exercises/ex22/models/task.model.ts

// --- Interface Task ---
// Represente une tache dans l'application
// Chaque propriete est typee strictement, zero 'any'
export interface Task {
  readonly id: string;        // Identifiant unique genere par crypto.randomUUID()
  readonly title: string;     // Titre de la tache
  readonly completed: boolean; // Statut de completion
  readonly createdAt: Date;   // Date de creation
}

// --- Type TaskFilter ---
// Union literal qui restreint les valeurs possibles du filtre
// 'all' : toutes les taches
// 'active' : taches non completees uniquement
// 'completed' : taches completees uniquement
export type TaskFilter = 'all' | 'active' | 'completed';
```

### Service TaskStore

```typescript
// src/app/exercises/ex22/services/task.store.ts

// --- Imports Angular ---
// Injectable : decorateur pour enregistrer le service dans l'injecteur
// signal : cree un signal mutable (WritableSignal)
// computed : cree un signal derive en lecture seule
// effect : execute un side-effect a chaque changement des signaux lus a l'interieur
// Signal : type en lecture seule (sans .set() ni .update())
import {
  Injectable,
  signal,
  computed,
  effect,
  type Signal,
  type WritableSignal,
} from '@angular/core';

import { type Task, type TaskFilter } from '../models/task.model';

@Injectable({
  // providedIn: 'root' → singleton disponible dans toute l'application
  // Pas besoin de l'ajouter dans un tableau providers
  providedIn: 'root',
})
export class TaskStore {
  // =========================================
  // ETAT INTERNE (prive, mutable)
  // =========================================

  // --- Signal prive des taches ---
  // private readonly → inaccessible depuis l'exterieur
  // WritableSignal<Task[]> → on peut appeler .set() et .update()
  private readonly _tasks: WritableSignal<Task[]> = signal<Task[]>([]);

  // --- Signal prive du filtre actif ---
  private readonly _filter: WritableSignal<TaskFilter> = signal<TaskFilter>('all');

  // =========================================
  // ETAT PUBLIC (lecture seule)
  // =========================================

  // --- Exposition en lecture seule ---
  // On expose le signal avec le type Signal<T> (pas WritableSignal<T>)
  // L'appelant peut lire avec tasks() mais ne peut PAS appeler tasks.set()
  // C'est le pattern "readonly signal" recommande par l'equipe Angular
  readonly tasks: Signal<Task[]> = this._tasks.asReadonly();
  readonly filter: Signal<TaskFilter> = this._filter.asReadonly();

  // =========================================
  // COMPUTED (derives, recalcules automatiquement)
  // =========================================

  // --- Taches filtrees ---
  // Se recalcule quand _tasks ou _filter change
  // C'est l'equivalent d'un getter reactif
  readonly filteredTasks: Signal<Task[]> = computed(() => {
    const tasks = this._tasks();
    const filter = this._filter();

    switch (filter) {
      case 'active':
        return tasks.filter((task) => !task.completed);
      case 'completed':
        return tasks.filter((task) => task.completed);
      case 'all':
      default:
        return tasks;
    }
  });

  // --- Nombre total de taches ---
  readonly taskCount: Signal<number> = computed(() => this._tasks().length);

  // --- Nombre de taches completees ---
  readonly completedCount: Signal<number> = computed(
    () => this._tasks().filter((task) => task.completed).length
  );

  // --- Nombre de taches actives ---
  readonly activeCount: Signal<number> = computed(
    () => this._tasks().filter((task) => !task.completed).length
  );

  // =========================================
  // EFFECTS (side-effects)
  // =========================================

  constructor() {
    // --- Effect de debug ---
    // effect() s'execute a chaque fois qu'un signal lu a l'interieur change
    // Ici, il se declenchera quand taskCount() change
    // Utile pour le debug, le logging, ou la synchronisation avec localStorage
    effect(() => {
      console.log(`[TaskStore] Nombre de taches : ${this.taskCount()}`);
    });
  }

  // =========================================
  // METHODES (mutations de l'etat)
  // =========================================

  // --- Ajouter une tache ---
  // Cree un nouvel objet Task et l'ajoute au tableau via .update()
  addTask(title: string): void {
    const newTask: Task = {
      // crypto.randomUUID() genere un UUID v4 unique
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
      createdAt: new Date(),
    };

    // .update() prend la valeur precedente et retourne la nouvelle
    // On utilise le spread operator pour creer un nouveau tableau (immutabilite)
    this._tasks.update((tasks) => [...tasks, newTask]);
  }

  // --- Basculer le statut d'une tache ---
  // Inverse la propriete completed de la tache ciblee par son id
  toggleTask(id: string): void {
    this._tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed } // Nouveau objet (immutabilite)
          : task
      )
    );
  }

  // --- Supprimer une tache ---
  // Filtre le tableau pour exclure la tache ciblee
  deleteTask(id: string): void {
    this._tasks.update((tasks) => tasks.filter((task) => task.id !== id));
  }

  // --- Changer le filtre ---
  // Remplace la valeur du signal _filter
  setFilter(filter: TaskFilter): void {
    this._filter.set(filter);
  }

  // --- Supprimer toutes les taches completees ---
  clearCompleted(): void {
    this._tasks.update((tasks) => tasks.filter((task) => !task.completed));
  }
}
```

### Composant TaskItem

```typescript
// src/app/exercises/ex22/components/task-item.component.ts

import { Component, input, output } from '@angular/core';
import { type Task } from '../models/task.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  template: `
    <li [class.completed]="task().completed">
      <!-- Checkbox pour basculer le statut -->
      <input
        type="checkbox"
        [checked]="task().completed"
        (change)="toggle.emit(task().id)"
        data-testid="task-checkbox"
      />

      <!-- Titre de la tache -->
      <span class="task-title">{{ task().title }}</span>

      <!-- Date de creation -->
      <small class="task-date">{{ task().createdAt.toLocaleDateString() }}</small>

      <!-- Bouton supprimer -->
      <button
        (click)="delete.emit(task().id)"
        class="delete-btn"
        data-testid="task-delete"
      >
        Supprimer
      </button>
    </li>
  `,
  styles: [`
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    li.completed .task-title {
      text-decoration: line-through;
      color: #999;
    }
    .task-date { color: #aaa; font-size: 0.8rem; }
    .delete-btn {
      margin-left: auto;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
    }
  `],
})
export class TaskItemComponent {
  // --- input() Angular 19+ ---
  // Remplace @Input() — fonction qui retourne un Signal en lecture seule
  readonly task = input.required<Task>();

  // --- output() Angular 19+ ---
  // Remplace @Output() + EventEmitter
  readonly toggle = output<string>();
  readonly delete = output<string>();
}
```

### Composant TaskList

```typescript
// src/app/exercises/ex22/components/task-list.component.ts

import { Component, inject, signal } from '@angular/core';
import { TaskStore } from '../services/task.store';
import { TaskItemComponent } from './task-item.component';
import { type TaskFilter } from '../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  // On importe TaskItemComponent car on l'utilise dans le template
  imports: [TaskItemComponent],
  template: `
    <div class="task-list-container">
      <h2>Gestionnaire de taches</h2>

      <!-- Formulaire d'ajout -->
      <div class="add-form">
        <input
          type="text"
          [value]="newTaskTitle()"
          (input)="onInputChange($event)"
          (keydown.enter)="onAddTask()"
          placeholder="Nouvelle tache..."
          data-testid="task-input"
        />
        <button (click)="onAddTask()" data-testid="task-add-btn">
          Ajouter
        </button>
      </div>

      <!-- Filtres -->
      <div class="filters">
        <button
          [class.active]="store.filter() === 'all'"
          (click)="store.setFilter('all')"
        >
          Toutes ({{ store.taskCount() }})
        </button>
        <button
          [class.active]="store.filter() === 'active'"
          (click)="store.setFilter('active')"
        >
          Actives ({{ store.activeCount() }})
        </button>
        <button
          [class.active]="store.filter() === 'completed'"
          (click)="store.setFilter('completed')"
        >
          Terminees ({{ store.completedCount() }})
        </button>
      </div>

      <!-- Liste des taches -->
      <ul class="task-list">
        @for (task of store.filteredTasks(); track task.id) {
          <app-task-item
            [task]="task"
            (toggle)="store.toggleTask($event)"
            (delete)="store.deleteTask($event)"
          />
        } @empty {
          <li class="empty-message">Aucune tache a afficher</li>
        }
      </ul>

      <!-- Actions globales -->
      @if (store.completedCount() > 0) {
        <button class="clear-btn" (click)="store.clearCompleted()">
          Supprimer les taches terminees ({{ store.completedCount() }})
        </button>
      }
    </div>
  `,
  styles: [`
    .task-list-container { max-width: 600px; margin: 0 auto; padding: 1rem; }
    .add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .add-form input { flex: 1; padding: 0.5rem; font-size: 1rem; }
    .add-form button {
      padding: 0.5rem 1rem; background: #1976d2; color: white;
      border: none; border-radius: 4px; cursor: pointer;
    }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .filters button {
      padding: 0.25rem 0.75rem; border: 1px solid #ccc;
      border-radius: 4px; background: white; cursor: pointer;
    }
    .filters button.active { background: #1976d2; color: white; border-color: #1976d2; }
    .task-list { list-style: none; padding: 0; }
    .empty-message { text-align: center; color: #999; padding: 2rem; }
    .clear-btn {
      margin-top: 1rem; background: #e74c3c; color: white;
      border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
    }
  `],
})
export class TaskListComponent {
  // --- inject() ---
  // Nouvelle API Angular pour injecter un service (remplace le constructeur)
  // protected : accessible depuis le template
  protected readonly store = inject(TaskStore);

  // Signal local pour le champ de saisie
  readonly newTaskTitle = signal<string>('');

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTaskTitle.set(input.value);
  }

  onAddTask(): void {
    const title = this.newTaskTitle().trim();
    if (title.length === 0) return;

    this.store.addTask(title);
    this.newTaskTitle.set(''); // Reset le champ
  }
}
```

## Ce que tu aurais pu oublier

### 1. Exposer le WritableSignal directement
- ❌ `readonly tasks = this._tasks;` → le consommateur peut appeler `tasks.set([])` et contourner les methodes
- ✅ `readonly tasks: Signal<Task[]> = this._tasks.asReadonly();` → lecture seule, impossible de modifier depuis l'exterieur

### 2. Muter le tableau directement au lieu de creer un nouveau
- ❌ `this._tasks().push(newTask)` → le signal ne detecte pas le changement (meme reference)
- ✅ `this._tasks.update(tasks => [...tasks, newTask])` → nouveau tableau, le signal notifie les dependants

### 3. Oublier `effect()` qui necessite un contexte d'injection
- ❌ Appeler `effect()` dans une methode ordinaire → erreur "effect() requires an injection context"
- ✅ Appeler `effect()` dans le constructeur ou dans une fonction appelee depuis le constructeur

### 4. Confondre `signal.set()` et `signal.update()`
- ❌ `this._filter.update('all')` → `update()` attend une fonction `(ancien) => nouveau`
- ✅ `this._filter.set('all')` → `set()` remplace directement la valeur

### 5. Ne pas typer les signaux exposes
- ❌ `readonly tasks = this._tasks.asReadonly()` → TypeScript infere `Signal<Task[]>` mais c'est implicite
- ✅ `readonly tasks: Signal<Task[]> = this._tasks.asReadonly()` → type explicite, plus clair

### 6. Oublier le `trim()` sur le titre
- ❌ `addTask('  ')` cree une tache avec un titre vide → mauvaise UX
- ✅ `title.trim()` puis verifier `title.length === 0` avant de creer

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `signal<T>(value)` | Cree un signal mutable (WritableSignal) pour l'etat interne |
| `computed(() => ...)` | Cree un signal derive recalcule automatiquement quand ses dependances changent |
| `effect(() => ...)` | Execute un side-effect chaque fois qu'un signal lu dedans change |
| `.asReadonly()` | Convertit un WritableSignal en Signal (lecture seule) pour l'exposition publique |
| `.set(value)` | Remplace la valeur du signal |
| `.update(fn)` | Met a jour le signal en appliquant une fonction sur la valeur precedente |
| `providedIn: 'root'` | Le service est un singleton disponible dans toute l'application |
| `inject()` | Injecte un service dans un composant sans passer par le constructeur |
| `input.required<T>()` | Declare un input obligatoire (Angular 19+) |
| `output<T>()` | Declare un output sans EventEmitter (Angular 19+) |
| Immutabilite | Toujours creer de nouveaux objets/tableaux au lieu de muter les existants |
