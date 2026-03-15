# Correction — Exercice 03 : Liste de taches

## Résultat attendu

Une application de todo list avec :
- Un champ de saisie pour ajouter de nouvelles taches
- Une liste de taches avec checkbox (cocher/decocher) et bouton supprimer
- Un compteur affichant le nombre de taches restantes
- Les taches completees sont barrees visuellement
- Un message s'affiche quand la liste est vide

## Code corrige

```typescript
// src/app/exercises/ex03/todo-list.component.ts

import { Component, signal, computed } from '@angular/core';

// --- Interface Todo ---
// On definit un contrat strict pour chaque tache
// Cela permet a TypeScript de verifier que chaque objet Todo a bien tous les champs
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// --- Type pour le filtre (bonus) ---
// Union literal : seules ces trois valeurs sont autorisees
type TodoFilter = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [],
  template: `
    <div class="todo-container">
      <h1>Mes taches</h1>

      <!-- Formulaire d'ajout -->
      <!-- On ecoute (keyup.enter) pour ajouter avec la touche Entree -->
      <div class="add-form">
        <input
          type="text"
          [value]="newTodoTitle()"
          (input)="onTitleChange($event)"
          (keyup.enter)="addTodo()"
          placeholder="Nouvelle tache..."
        />
        <button (click)="addTodo()" [disabled]="newTodoTitle().trim() === ''">
          Ajouter
        </button>
      </div>

      <!-- Filtres (bonus) -->
      <div class="filters">
        <button
          [class.active]="filter() === 'all'"
          (click)="filter.set('all')">
          Toutes ({{ todos().length }})
        </button>
        <button
          [class.active]="filter() === 'active'"
          (click)="filter.set('active')">
          Actives ({{ remainingCount() }})
        </button>
        <button
          [class.active]="filter() === 'completed'"
          (click)="filter.set('completed')">
          Completees ({{ completedCount() }})
        </button>
      </div>

      <!-- Liste des taches -->
      <!-- @for : nouvelle syntaxe de boucle Angular 17+ -->
      <!-- track todo.id : obligatoire, permet a Angular d'identifier chaque element -->
      <!-- @empty : bloc affiche quand le tableau est vide -->
      <ul class="todo-list">
        @for (todo of filteredTodos(); track todo.id) {
          <li [class.completed]="todo.completed">
            <!-- Checkbox pour basculer le statut completed -->
            <input
              type="checkbox"
              [checked]="todo.completed"
              (change)="toggleTodo(todo.id)"
            />

            <!-- Titre de la tache -->
            <span class="title">{{ todo.title }}</span>

            <!-- Bouton supprimer -->
            <button class="delete" (click)="deleteTodo(todo.id)">Supprimer</button>
          </li>
        } @empty {
          <!-- S'affiche quand filteredTodos() est un tableau vide -->
          <li class="empty-state">
            Aucune tache pour le moment. Ajoutez-en une !
          </li>
        }
      </ul>

      <!-- Compteur de taches restantes -->
      @if (todos().length > 0) {
        <p class="remaining">
          {{ remainingCount() }} tache{{ remainingCount() > 1 ? 's' : '' }} restante{{ remainingCount() > 1 ? 's' : '' }}
        </p>
      }

      <!-- Bouton supprimer les completees (bonus) -->
      @if (completedCount() > 0) {
        <button class="clear-completed" (click)="clearCompleted()">
          Supprimer les completees ({{ completedCount() }})
        </button>
      }
    </div>
  `,
  styles: [`
    .todo-container {
      padding: 2rem;
      max-width: 500px;
      font-family: sans-serif;
    }
    .add-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .add-form input {
      flex: 1;
      padding: 0.5rem;
      font-size: 1rem;
    }
    .add-form button {
      padding: 0.5rem 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .add-form button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .filters button {
      padding: 0.25rem 0.75rem;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }
    .filters button.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
    .todo-list {
      list-style: none;
      padding: 0;
    }
    .todo-list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    .todo-list li.completed .title {
      text-decoration: line-through;
      color: #999;
    }
    .title { flex: 1; }
    .delete {
      background: #ef5350;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .empty-state {
      color: #999;
      font-style: italic;
      justify-content: center;
    }
    .remaining {
      color: #666;
      font-size: 0.9rem;
      margin-top: 1rem;
    }
    .clear-completed {
      margin-top: 0.5rem;
      background: none;
      border: 1px solid #ef5350;
      color: #ef5350;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class TodoListComponent {

  // --- Signal todos ---
  // Tableau de taches, initialise avec quelques exemples
  // On utilise signal<Todo[]> pour typer strictement le contenu
  readonly todos = signal<Todo[]>([
    { id: 1, title: 'Apprendre Angular', completed: false },
    { id: 2, title: 'Creer un composant', completed: true },
    { id: 3, title: 'Maitriser les signaux', completed: false },
  ]);

  // --- Signal newTodoTitle ---
  // Contient le texte saisi dans le champ d'ajout
  readonly newTodoTitle = signal<string>('');

  // --- Signal filter (bonus) ---
  // Le filtre actif pour afficher toutes / actives / completees
  readonly filter = signal<TodoFilter>('all');

  // --- Compteur interne pour generer des IDs uniques ---
  private nextId = 4;

  // --- Computed remainingCount ---
  // Compte les taches dont completed === false
  // .filter() natif JavaScript filtre le tableau, .length donne le nombre
  readonly remainingCount = computed<number>(
    () => this.todos().filter((todo) => !todo.completed).length
  );

  // --- Computed completedCount ---
  // Compte les taches completees
  readonly completedCount = computed<number>(
    () => this.todos().filter((todo) => todo.completed).length
  );

  // --- Computed filteredTodos (bonus) ---
  // Retourne les taches filtrees selon le filtre actif
  readonly filteredTodos = computed<Todo[]>(() => {
    const currentFilter = this.filter();
    const allTodos = this.todos();

    switch (currentFilter) {
      case 'active':
        return allTodos.filter((todo) => !todo.completed);
      case 'completed':
        return allTodos.filter((todo) => todo.completed);
      default:
        return allTodos;
    }
  });

  // --- Methode addTodo ---
  // Ajoute une nouvelle tache si le titre n'est pas vide
  // Utilise update() pour modifier le tableau de maniere immutable
  addTodo(): void {
    const title = this.newTodoTitle().trim();

    // Guard clause : on ne fait rien si le titre est vide
    if (title === '') return;

    // update() recoit le tableau courant et retourne le nouveau tableau
    // On utilise le spread operator [...prev] pour creer un nouveau tableau (immutabilite)
    this.todos.update((prev) => [
      ...prev,
      {
        id: this.nextId++,
        title,
        completed: false,
      },
    ]);

    // On vide le champ de saisie apres l'ajout
    this.newTodoTitle.set('');
  }

  // --- Methode toggleTodo ---
  // Inverse le statut completed de la tache identifiee par son id
  // On utilise .map() pour creer un nouveau tableau avec la tache modifiee
  toggleTodo(id: number): void {
    this.todos.update((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }  // Spread + inversion
          : todo                                       // Les autres restent inchangees
      )
    );
  }

  // --- Methode deleteTodo ---
  // Supprime la tache identifiee par son id
  // On utilise .filter() pour creer un nouveau tableau sans cette tache
  deleteTodo(id: number): void {
    this.todos.update((prev) => prev.filter((todo) => todo.id !== id));
  }

  // --- Methode clearCompleted (bonus) ---
  // Supprime toutes les taches completees
  clearCompleted(): void {
    this.todos.update((prev) => prev.filter((todo) => !todo.completed));
  }

  // --- Methode onTitleChange ---
  // Met a jour le signal newTodoTitle depuis l'input
  onTitleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTodoTitle.set(input.value);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier `track` dans `@for`
- ❌ `@for (todo of todos())` → erreur de compilation, `track` est obligatoire
- ✅ `@for (todo of todos(); track todo.id)` → Angular identifie chaque élément

### 2. Muter le tableau directement
- ❌ `this.todos().push(newTodo)` → le signal ne détecté pas le changement (même référence)
- ✅ `this.todos.update(prev => [...prev, newTodo])` → nouveau tableau = nouvelle référence = detection

### 3. Oublier de vider le champ après ajout
- ❌ Ne pas appeler `this.newTodoTitle.set('')` → le texte reste dans l'input
- ✅ Remettre le signal a `''` après l'ajout pour vider le champ

### 4. Ne pas typer l'interface Todo
- ❌ Utiliser un objet `{ id, title, completed }` sans interface → pas de vérification de type
- ✅ Définir `interface Todo` et typer le signal `signal<Todo[]>`

### 5. Oublier le spread pour la modification
- ❌ `todo.completed = !todo.completed` → mutation directe, pas de detection
- ✅ `{ ...todo, completed: !todo.completed }` → nouvel objet, detection du changement

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `interface Todo` | Contrat TypeScript pour typer les objets tache |
| `signal<Todo[]>([])` | Signal contenant un tableau d'objets types |
| `signal.update(fn)` | Modification immutable : la fonction recoit l'ancienne valeur et retourne la nouvelle |
| `computed` | Valeur derivee recalculee automatiquement (remainingCount, filteredTodos) |
| `@for (item of list; track item.id)` | Boucle de template avec tracking obligatoire |
| `@empty` | Bloc affiche quand le tableau itere par `@for` est vide |
| `@if / @else` | Affichage conditionnel dans le template |
| `[class.completed]="expr"` | Classe CSS conditionnelle : ajoutee si l'expression est true |
| `(keyup.enter)` | Ecoute la touche Entree specifiquement |
| Spread operator `[...arr]` | Cree une copie superficielle du tableau (immutabilite) |
