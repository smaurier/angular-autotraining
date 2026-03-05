# Correction — Exercice 19 : Material Dashboard

## Resultat attendu

Un tableau de bord professionnel avec un layout responsive (toolbar + sidenav), 4 cartes de statistiques en haut, une table triable et paginee au centre, un dialog pour creer/editer des taches, et des notifications snackbar pour les actions utilisateur.

## Code corrige

### Modele et types

```typescript
// src/app/exercises/ex19/task.model.ts

// --- Types stricts pour le statut et la priorite ---
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

// --- Interface principale ---
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
}

// --- Labels pour l'affichage ---
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  done: 'Termine'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute'
};
```

### Service de taches

```typescript
// src/app/exercises/ex19/task.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { Task, TaskStatus } from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  // --- Signal contenant la liste des taches ---
  readonly tasks = signal<Task[]>([
    { id: 1, title: 'Configurer le projet', description: 'Setup initial', status: 'done', priority: 'high', dueDate: new Date('2025-01-15') },
    { id: 2, title: 'Creer les composants', description: 'Composants principaux', status: 'in_progress', priority: 'medium', dueDate: new Date('2025-02-01') },
    { id: 3, title: 'Ecrire les tests', description: 'Tests unitaires', status: 'todo', priority: 'low', dueDate: new Date('2025-03-01') },
    { id: 4, title: 'Deployer en production', description: 'CI/CD', status: 'todo', priority: 'high', dueDate: new Date('2024-12-31') },
  ]);

  // --- Computed : statistiques derivees ---
  readonly totalCount = computed<number>(() => this.tasks().length);

  readonly doneCount = computed<number>(() =>
    this.tasks().filter(t => t.status === 'done').length
  );

  readonly inProgressCount = computed<number>(() =>
    this.tasks().filter(t => t.status === 'in_progress').length
  );

  readonly overdueCount = computed<number>(() => {
    const now = new Date();
    return this.tasks().filter(t => t.status !== 'done' && t.dueDate < now).length;
  });

  // --- Compteur d'ID auto-incremente ---
  private nextId = 5;

  // --- Ajout d'une tache ---
  addTask(task: Omit<Task, 'id'>): Task {
    const newTask: Task = { ...task, id: this.nextId++ };
    this.tasks.update(tasks => [...tasks, newTask]);
    return newTask;
  }

  // --- Mise a jour d'une tache ---
  updateTask(updated: Task): void {
    this.tasks.update(tasks =>
      tasks.map(t => t.id === updated.id ? updated : t)
    );
  }

  // --- Suppression d'une tache ---
  deleteTask(id: number): Task | undefined {
    const task = this.tasks().find(t => t.id === id);
    this.tasks.update(tasks => tasks.filter(t => t.id !== id));
    return task;
  }

  // --- Restauration d'une tache (pour le "Annuler" du snackbar) ---
  restoreTask(task: Task): void {
    this.tasks.update(tasks => [...tasks, task]);
  }
}
```

### Composant Dashboard (layout principal)

```typescript
// src/app/exercises/ex19/dashboard.component.ts

import { Component, inject, signal, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TaskTableComponent } from './task-table.component';
import { TaskService } from './task.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatCardModule,
    TaskTableComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <!-- Bouton hamburger pour ouvrir/fermer le sidenav -->
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span>Dashboard Taches</span>
    </mat-toolbar>

    <mat-sidenav-container class="sidenav-container">
      <!-- Sidenav responsive : mode 'side' sur desktop, 'over' sur mobile -->
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
      >
        <mat-nav-list>
          <a mat-list-item><mat-icon>dashboard</mat-icon> Tableau de bord</a>
          <a mat-list-item><mat-icon>list</mat-icon> Taches</a>
          <a mat-list-item><mat-icon>settings</mat-icon> Parametres</a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <!-- 4 cartes de statistiques -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-icon>assignment</mat-icon>
            <div class="stat-value">{{ taskService.totalCount() }}</div>
            <div class="stat-label">Total</div>
          </mat-card>
          <mat-card class="stat-card done">
            <mat-icon>check_circle</mat-icon>
            <div class="stat-value">{{ taskService.doneCount() }}</div>
            <div class="stat-label">Terminees</div>
          </mat-card>
          <mat-card class="stat-card progress">
            <mat-icon>pending</mat-icon>
            <div class="stat-value">{{ taskService.inProgressCount() }}</div>
            <div class="stat-label">En cours</div>
          </mat-card>
          <mat-card class="stat-card overdue">
            <mat-icon>warning</mat-icon>
            <div class="stat-value">{{ taskService.overdueCount() }}</div>
            <div class="stat-label">En retard</div>
          </mat-card>
        </div>

        <!-- Table des taches -->
        <app-task-table />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: calc(100vh - 64px); }
    mat-sidenav { width: 220px; }
    .content { padding: 1.5rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      text-align: center;
      padding: 1rem;
    }
    .stat-card.done mat-icon { color: #43a047; }
    .stat-card.progress mat-icon { color: #ff9800; }
    .stat-card.overdue mat-icon { color: #e53935; }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { color: #666; font-size: 0.9rem; }
  `]
})
export class DashboardComponent {
  // inject() : injection de dependances fonctionnelle (Angular 14+)
  readonly taskService = inject(TaskService);

  // --- Signal responsive ---
  // BreakpointObserver detecte les changements de taille d'ecran
  readonly isMobile = signal<boolean>(false);

  constructor() {
    const breakpointObserver = inject(BreakpointObserver);
    // On observe le breakpoint Handset (mobile)
    breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile.set(result.matches);
    });
  }
}
```

### Composant Table des taches

```typescript
// src/app/exercises/ex19/task-table.component.ts

import { Component, inject, ViewChild, AfterViewInit, effect } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from './task.service';
import { Task, STATUS_LABELS, PRIORITY_LABELS } from './task.model';
import { TaskDialogComponent } from './task-dialog.component';

@Component({
  selector: 'app-task-table',
  standalone: true,
  imports: [
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatInputModule, MatFormFieldModule, MatButtonModule,
    MatIconModule, MatChipsModule
  ],
  template: `
    <div class="table-header">
      <mat-form-field appearance="outline">
        <mat-label>Filtrer les taches</mat-label>
        <input matInput (input)="applyFilter($event)" placeholder="Rechercher..." />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nouvelle tache
      </button>
    </div>

    <table mat-table [dataSource]="dataSource" matSort class="full-width">
      <ng-container matColumnDef="id">
        <th mat-header-cell *matHeaderCellDef>#</th>
        <td mat-cell *matCellDef="let task">{{ task.id }}</td>
      </ng-container>

      <ng-container matColumnDef="title">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Titre</th>
        <td mat-cell *matCellDef="let task">{{ task.title }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
        <td mat-cell *matCellDef="let task">
          <span class="badge" [attr.data-status]="task.status">
            {{ statusLabel(task.status) }}
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="priority">
        <th mat-header-cell *matHeaderCellDef>Priorite</th>
        <td mat-cell *matCellDef="let task">{{ priorityLabel(task.priority) }}</td>
      </ng-container>

      <ng-container matColumnDef="dueDate">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Echeance</th>
        <td mat-cell *matCellDef="let task">{{ task.dueDate | date:'dd/MM/yyyy' }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let task">
          <button mat-icon-button (click)="openDialog(task)">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="deleteTask(task)">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons />
  `,
  styles: [`
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .full-width { width: 100%; }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .badge[data-status="done"] { background: #e8f5e9; color: #2e7d32; }
    .badge[data-status="in_progress"] { background: #fff3e0; color: #e65100; }
    .badge[data-status="todo"] { background: #e3f2fd; color: #1565c0; }
  `]
})
export class TaskTableComponent implements AfterViewInit {
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // --- Colonnes affichees ---
  readonly displayedColumns: string[] = ['id', 'title', 'status', 'priority', 'dueDate', 'actions'];

  // --- DataSource pour MatTable ---
  readonly dataSource = new MatTableDataSource<Task>();

  // --- References aux directives MatSort et MatPaginator ---
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    // effect() synchronise le signal tasks avec le MatTableDataSource
    effect(() => {
      this.dataSource.data = this.taskService.tasks();
    });
  }

  ngAfterViewInit(): void {
    // On branche le tri et la pagination apres l'initialisation de la vue
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // --- Filtre sur la table ---
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  // --- Labels d'affichage ---
  statusLabel(status: Task['status']): string {
    return STATUS_LABELS[status];
  }

  priorityLabel(priority: Task['priority']): string {
    return PRIORITY_LABELS[priority];
  }

  // --- Ouvrir le dialog de creation/edition ---
  openDialog(task?: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '500px',
      data: task ?? null
    });

    dialogRef.afterClosed().subscribe((result: Task | undefined) => {
      if (!result) return;
      if (task) {
        this.taskService.updateTask(result);
        this.snackBar.open('Tache mise a jour', 'OK', { duration: 3000 });
      } else {
        this.taskService.addTask(result);
        this.snackBar.open('Tache creee avec succes', 'OK', { duration: 3000 });
      }
    });
  }

  // --- Supprimer une tache avec possibilite d'annuler ---
  deleteTask(task: Task): void {
    this.taskService.deleteTask(task.id);
    const snackRef = this.snackBar.open('Tache supprimee', 'Annuler', { duration: 5000 });
    snackRef.onAction().subscribe(() => {
      this.taskService.restoreTask(task);
    });
  }
}
```

### Composant Dialog

```typescript
// src/app/exercises/ex19/task-dialog.component.ts

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { Task, TaskStatus, TaskPriority } from './task.model';

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule,
    MatButtonModule, MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Modifier la tache' : 'Nouvelle tache' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Titre</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priorite</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="low">Basse</mat-option>
            <mat-option value="medium">Moyenne</mat-option>
            <mat-option value="high">Haute</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date d'echeance</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="dueDate" />
          <mat-datepicker-toggle matSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">
        Sauvegarder
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      min-width: 400px;
      gap: 0.5rem;
    }
  `]
})
export class TaskDialogComponent {
  // Injection du dialog data (null si creation, Task si edition)
  readonly data = inject<Task | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TaskDialogComponent>);
  private readonly fb = inject(FormBuilder);

  // --- Formulaire reactif pour le dialog ---
  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? '', Validators.required],
    description: [this.data?.description ?? ''],
    priority: [this.data?.priority ?? ('medium' as TaskPriority)],
    dueDate: [this.data?.dueDate ?? new Date(), Validators.required],
    status: [this.data?.status ?? ('todo' as TaskStatus)]
  });

  save(): void {
    if (this.form.valid) {
      const value = this.form.getRawValue();
      const result: Task = {
        id: this.data?.id ?? 0,
        title: value.title,
        description: value.description,
        priority: value.priority as TaskPriority,
        status: value.status as TaskStatus,
        dueDate: value.dueDate
      };
      this.dialogRef.close(result);
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. Ne pas brancher MatSort et MatPaginator dans `ngAfterViewInit`
- ❌ Les brancher dans le constructeur → `@ViewChild` n'est pas encore resolu
- ✅ Toujours brancher `dataSource.sort` et `dataSource.paginator` dans `ngAfterViewInit()`

### 2. Oublier de synchroniser le signal avec le DataSource
- ❌ Passer `taskService.tasks()` directement a `[dataSource]` → le tri/filtre ne fonctionne pas
- ✅ Utiliser `MatTableDataSource` et synchroniser via `effect(() => dataSource.data = tasks())`

### 3. Ne pas importer les modules Material necessaires
- ❌ Utiliser `<mat-table>` sans importer `MatTableModule` → erreur de compilation
- ✅ Importer chaque module Material utilise dans `imports: [...]` du composant standalone

### 4. Oublier le bouton "Annuler" dans le snackbar de suppression
- ❌ `snackBar.open('Supprime', 'OK')` → pas de possibilite d'annuler
- ✅ `snackBar.open('Supprime', 'Annuler')` puis ecouter `onAction()` pour restaurer

### 5. Ne pas rendre le sidenav responsive
- ❌ Sidenav toujours en mode `side` → inutilisable sur mobile
- ✅ Utiliser `BreakpointObserver` pour basculer entre `'side'` et `'over'`

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `MatToolbar` | Barre d'outils en haut de l'ecran avec titre et boutons |
| `MatSidenav` + `BreakpointObserver` | Menu lateral responsive qui s'adapte a la taille d'ecran |
| `MatTableDataSource` | Source de donnees pour MatTable avec tri, pagination et filtre integres |
| `MatSort` / `MatPaginator` | Directives pour le tri des colonnes et la pagination de la table |
| `MatDialog` | Fenetre modale pour creation/edition avec injection de donnees via `MAT_DIALOG_DATA` |
| `MatSnackBar` | Notification temporaire avec action optionnelle (ex: "Annuler") |
| `MatCard` | Carte Material pour afficher les statistiques du dashboard |
| `effect()` | Synchronise le signal de taches avec le `MatTableDataSource` |
| `computed()` | Derive les statistiques (total, done, in_progress, overdue) du signal principal |
| `inject()` | Injection de dependances fonctionnelle sans constructeur |
