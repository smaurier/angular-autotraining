# Correction — Exercice 19b : Drag-drop Kanban

## Resultat attendu

Un tableau Kanban avec 3 colonnes ("A faire", "En cours", "Termine"). Les taches sont des cartes deplacables par drag-and-drop entre les colonnes. Chaque deplacement met a jour le statut de la tache. Un formulaire inline permet d'ajouter de nouvelles taches.

## Code corrige

### Modele

```typescript
// src/app/exercises/ex19b/kanban-task.model.ts

// --- Types stricts pour le Kanban ---
export type KanbanStatus = 'todo' | 'in_progress' | 'done';
export type KanbanPriority = 'low' | 'medium' | 'high';

// --- Interface de tache Kanban ---
export interface KanbanTask {
  id: number;
  title: string;
  priority: KanbanPriority;
  assignee: string;
  status: KanbanStatus;
}

// --- Labels d'affichage pour les colonnes ---
export const COLUMN_LABELS: Record<KanbanStatus, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  done: 'Termine'
};

// --- Labels et couleurs pour les priorites ---
export const PRIORITY_CONFIG: Record<KanbanPriority, { label: string; color: string }> = {
  high: { label: 'Haute', color: '#e53935' },
  medium: { label: 'Moyenne', color: '#ff9800' },
  low: { label: 'Basse', color: '#43a047' }
};
```

### Service TaskStore

```typescript
// src/app/exercises/ex19b/task-store.service.ts

import { Injectable, signal, computed, effect } from '@angular/core';
import { KanbanTask, KanbanStatus } from './kanban-task.model';

// --- Donnees initiales ---
const INITIAL_TASKS: KanbanTask[] = [
  { id: 1, title: 'Configurer le projet', priority: 'high', assignee: 'Alice', status: 'done' },
  { id: 2, title: 'Creer les composants', priority: 'medium', assignee: 'Bob', status: 'in_progress' },
  { id: 3, title: 'Ecrire les tests', priority: 'low', assignee: 'Charlie', status: 'todo' },
  { id: 4, title: 'Revoir le design', priority: 'medium', assignee: 'Alice', status: 'todo' },
  { id: 5, title: 'Deployer en staging', priority: 'high', assignee: 'Bob', status: 'todo' },
];

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  // --- Signal principal ---
  // Contient toutes les taches, quelle que soit leur colonne
  readonly tasks = signal<KanbanTask[]>(this.loadFromStorage());

  // --- Computed : taches filtrees par colonne ---
  // Chaque computed derive automatiquement ses taches du signal principal
  readonly todoTasks = computed<KanbanTask[]>(() =>
    this.tasks().filter(t => t.status === 'todo')
  );

  readonly inProgressTasks = computed<KanbanTask[]>(() =>
    this.tasks().filter(t => t.status === 'in_progress')
  );

  readonly doneTasks = computed<KanbanTask[]>(() =>
    this.tasks().filter(t => t.status === 'done')
  );

  // --- Compteur d'ID auto-incremente ---
  private nextId = 6;

  constructor() {
    // --- Bonus : persistance dans le localStorage ---
    // effect() sauvegarde automatiquement quand le signal tasks change
    effect(() => {
      const currentTasks = this.tasks();
      localStorage.setItem('kanban-tasks', JSON.stringify(currentTasks));
    });
  }

  // --- Charger depuis le localStorage (ou donnees initiales) ---
  private loadFromStorage(): KanbanTask[] {
    const stored = localStorage.getItem('kanban-tasks');
    if (stored) {
      try {
        return JSON.parse(stored) as KanbanTask[];
      } catch {
        return INITIAL_TASKS;
      }
    }
    return INITIAL_TASKS;
  }

  // --- Deplacer une tache vers une nouvelle colonne ---
  // Appele quand l'utilisateur drop une tache dans une colonne differente
  moveTask(taskId: number, newStatus: KanbanStatus): void {
    this.tasks.update(tasks =>
      tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );
  }

  // --- Ajouter une nouvelle tache ---
  addTask(task: Omit<KanbanTask, 'id'>): void {
    const newTask: KanbanTask = { ...task, id: this.nextId++ };
    this.tasks.update(tasks => [...tasks, newTask]);
  }

  // --- Bonus : supprimer une tache ---
  deleteTask(taskId: number): void {
    this.tasks.update(tasks => tasks.filter(t => t.id !== taskId));
  }
}
```

### Composant Kanban Board

```typescript
// src/app/exercises/ex19b/kanban-board.component.ts

import { Component, inject, signal } from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { TaskStoreService } from './task-store.service';
import {
  KanbanTask,
  KanbanStatus,
  KanbanPriority,
  COLUMN_LABELS,
  PRIORITY_CONFIG
} from './kanban-task.model';

// --- Definition des colonnes ---
interface KanbanColumn {
  id: KanbanStatus;
  label: string;
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  // On importe les directives CDK DragDrop en standalone
  imports: [CdkDropList, CdkDrag],
  template: `
    <h2>Tableau Kanban</h2>

    <!-- Formulaire d'ajout rapide -->
    @if (showForm()) {
      <div class="add-form">
        <input
          placeholder="Titre de la tache"
          [value]="newTitle()"
          (input)="onNewTitleChange($event)"
        />
        <select [value]="newPriority()" (change)="onNewPriorityChange($event)">
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
        </select>
        <input
          placeholder="Assignee"
          [value]="newAssignee()"
          (input)="onNewAssigneeChange($event)"
        />
        <button (click)="addTask()">Ajouter</button>
        <button (click)="showForm.set(false)">Annuler</button>
      </div>
    } @else {
      <button class="btn-add" (click)="showForm.set(true)">+ Nouvelle tache</button>
    }

    <!-- 3 colonnes Kanban -->
    <div class="board">
      @for (column of columns; track column.id) {
        <div class="column">
          <div class="column-header">
            <h3>{{ column.label }}</h3>
            <span class="count">{{ getTasksForColumn(column.id)().length }}</span>
          </div>

          <!-- cdkDropList : zone de depot pour les taches -->
          <div
            cdkDropList
            [id]="column.id"
            [cdkDropListData]="getTasksForColumn(column.id)()"
            [cdkDropListConnectedTo]="getOtherColumnIds(column.id)"
            (cdkDropListDropped)="onDrop($event, column.id)"
            class="task-list"
          >
            <!-- Chaque tache est un element draggable -->
            @for (task of getTasksForColumn(column.id)(); track task.id) {
              <div cdkDrag class="task-card">
                <!-- Placeholder : espace vide affiche pendant le drag (Bonus) -->
                <div class="placeholder" *cdkDragPlaceholder></div>

                <!-- Poignee de drag (cdkDragHandle) -->
                <div class="drag-handle" cdkDragHandle>⠿</div>

                <div class="task-content">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-meta">
                    <span
                      class="priority-badge"
                      [style.background-color]="getPriorityColor(task.priority)"
                    >
                      {{ getPriorityLabel(task.priority) }}
                    </span>
                    <span class="assignee">{{ task.assignee }}</span>
                  </div>
                </div>

                <!-- Bouton supprimer (Bonus) -->
                <button class="btn-delete" (click)="deleteTask(task.id)">×</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .board {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      min-height: 400px;
    }
    .column {
      flex: 1;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 0.75rem;
      min-width: 250px;
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .column-header h3 { margin: 0; font-size: 1.1rem; }
    .count {
      background: #e0e0e0;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .task-list {
      min-height: 60px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .task-card {
      background: white;
      border-radius: 6px;
      padding: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      cursor: grab;
    }
    .task-card:active { cursor: grabbing; }
    .drag-handle {
      cursor: grab;
      color: #999;
      font-size: 1.2rem;
      user-select: none;
    }
    .task-content { flex: 1; }
    .task-title { font-weight: 600; margin-bottom: 0.5rem; }
    .task-meta { display: flex; gap: 0.5rem; align-items: center; }
    .priority-badge {
      color: white;
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .assignee { color: #666; font-size: 0.85rem; }
    .btn-delete {
      background: none;
      border: none;
      color: #999;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .btn-delete:hover { color: #e53935; }
    /* Placeholder pendant le drag (Bonus) */
    .placeholder {
      background: #e3f2fd;
      border: 2px dashed #90caf9;
      border-radius: 6px;
      min-height: 60px;
      transition: transform 0.2s;
    }
    /* Animation pendant le drag */
    .cdk-drag-preview {
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      border-radius: 6px;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .add-form {
      display: flex;
      gap: 0.5rem;
      padding: 0 1rem;
      margin-bottom: 1rem;
    }
    .add-form input, .add-form select {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .add-form button, .btn-add {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #1976d2;
      color: white;
      font-size: 0.9rem;
    }
    .btn-add { margin: 0 1rem 1rem; }
  `]
})
export class KanbanBoardComponent {
  private readonly store = inject(TaskStoreService);

  // --- Definition des 3 colonnes ---
  readonly columns: KanbanColumn[] = [
    { id: 'todo', label: 'A faire' },
    { id: 'in_progress', label: 'En cours' },
    { id: 'done', label: 'Termine' }
  ];

  // --- Signaux pour le formulaire d'ajout ---
  readonly showForm = signal<boolean>(false);
  readonly newTitle = signal<string>('');
  readonly newPriority = signal<KanbanPriority>('medium');
  readonly newAssignee = signal<string>('');

  // --- Retourne le computed des taches pour une colonne donnee ---
  getTasksForColumn(status: KanbanStatus) {
    const map = {
      todo: this.store.todoTasks,
      in_progress: this.store.inProgressTasks,
      done: this.store.doneTasks
    } as const;
    return map[status];
  }

  // --- Retourne les IDs des autres colonnes (pour cdkDropListConnectedTo) ---
  getOtherColumnIds(currentId: KanbanStatus): string[] {
    return this.columns
      .map(c => c.id)
      .filter(id => id !== currentId);
  }

  // --- Handler du drop ---
  // CdkDragDrop contient toutes les infos sur le deplacement
  onDrop(event: CdkDragDrop<KanbanTask[]>, targetStatus: KanbanStatus): void {
    if (event.previousContainer === event.container) {
      // Deplacement dans la meme colonne : on reordonne
      // Note : moveItemInArray modifie le tableau en place,
      // mais notre store est immutable donc on peut ignorer le reordonnement intra-colonne
      // ou l'implementer si necessaire
      return;
    }

    // Deplacement vers une autre colonne : on met a jour le statut
    const task = event.previousContainer.data[event.previousIndex];
    if (task) {
      this.store.moveTask(task.id, targetStatus);
    }
  }

  // --- Labels et couleurs de priorite ---
  getPriorityColor(priority: KanbanPriority): string {
    return PRIORITY_CONFIG[priority].color;
  }

  getPriorityLabel(priority: KanbanPriority): string {
    return PRIORITY_CONFIG[priority].label;
  }

  // --- Handlers du formulaire ---
  onNewTitleChange(event: Event): void {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  onNewPriorityChange(event: Event): void {
    this.newPriority.set((event.target as HTMLSelectElement).value as KanbanPriority);
  }

  onNewAssigneeChange(event: Event): void {
    this.newAssignee.set((event.target as HTMLInputElement).value);
  }

  // --- Ajouter une tache ---
  addTask(): void {
    const title = this.newTitle().trim();
    if (!title) return;

    this.store.addTask({
      title,
      priority: this.newPriority(),
      assignee: this.newAssignee().trim() || 'Non assigne',
      status: 'todo'
    });

    // Reset du formulaire
    this.newTitle.set('');
    this.newPriority.set('medium');
    this.newAssignee.set('');
    this.showForm.set(false);
  }

  // --- Supprimer une tache (Bonus) ---
  deleteTask(taskId: number): void {
    this.store.deleteTask(taskId);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Ne pas connecter les drop lists entre elles
- ❌ Oublier `[cdkDropListConnectedTo]` → les taches ne peuvent pas etre deposees dans une autre colonne
- ✅ Passer un tableau des IDs des autres colonnes a `[cdkDropListConnectedTo]`

### 2. Confondre `moveItemInArray` et `transferArrayItem`
- ❌ Utiliser `moveItemInArray` quand on change de colonne → erreur d'index
- ✅ Verifier `event.previousContainer === event.container` pour choisir la bonne fonction

### 3. Oublier de typer `CdkDragDrop`
- ❌ `onDrop(event: any)` → pas de securite de type
- ✅ `onDrop(event: CdkDragDrop<KanbanTask[]>)` → acces type a `previousContainer`, `container`, `previousIndex`

### 4. Muter le signal au lieu d'utiliser `update()`
- ❌ `this.tasks().push(newTask)` → le signal n'est pas notifie du changement
- ✅ `this.tasks.update(tasks => [...tasks, newTask])` → cree un nouveau tableau et notifie

### 5. Oublier le `track` dans `@for`
- ❌ `@for (task of tasks())` sans `track` → Angular 19 exige un `track`
- ✅ `@for (task of tasks(); track task.id)` → Angular suit les elements par leur ID

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `cdkDropList` | Directive CDK qui transforme un conteneur en zone de depot pour les elements draggables |
| `cdkDrag` | Directive CDK qui rend un element deplacable par drag-and-drop |
| `cdkDragHandle` | Limite le drag a une zone specifique (poignee) au lieu de tout l'element |
| `*cdkDragPlaceholder` | Template affiche dans la zone d'atterrissage pendant le drag |
| `[cdkDropListConnectedTo]` | Connecte les drop lists entre elles pour permettre le transfert |
| `CdkDragDrop<T>` | Evenement type contenant les infos du deplacement (source, destination, index) |
| `transferArrayItem()` | Fonction utilitaire CDK pour deplacer un element entre deux tableaux |
| `signal<T[]>()` | Signal contenant la liste des taches (source de verite unique) |
| `computed<T[]>()` | Derive les taches filtrees par colonne a partir du signal principal |
| `effect()` | Persiste automatiquement l'etat dans le localStorage |
