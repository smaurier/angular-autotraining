# Correction — Exercice 20 : Tests complets

## Résultat attendu

Une application Todo avec un service (`TodoService`), un composant (`TodoListComponent`) et une suite de 13 tests couvrant les tests unitaires du service, les tests du composant et les tests HTTP avec mocks. Tous les tests passent au vert.

## Code corrige

### Modèle

```typescript
// src/app/exercises/ex20/todo.model.ts

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}
```

### Service Todo

```typescript
// src/app/exercises/ex20/todo.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, retry, EMPTY } from 'rxjs';
import { Todo } from './todo.model';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);

  // --- Signal principal contenant tous les todos ---
  readonly todos = signal<Todo[]>([]);

  // --- Compteur d'ID auto-incremente ---
  private nextId = 1;

  // --- Computed : nombre de todos actifs (non completes) ---
  readonly activeCount = computed<number>(() =>
    this.todos().filter(t => !t.completed).length
  );

  // --- Computed : nombre de todos completes ---
  readonly completedCount = computed<number>(() =>
    this.todos().filter(t => t.completed).length
  );

  // --- Ajouter un todo ---
  add(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: this.nextId++,
      title: trimmed,
      completed: false
    };
    this.todos.update(todos => [...todos, newTodo]);
  }

  // --- Basculer le statut completed ---
  toggle(id: number): void {
    this.todos.update(todos =>
      todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  // --- Supprimer un todo ---
  delete(id: number): void {
    this.todos.update(todos => todos.filter(t => t.id !== id));
  }

  // --- Filtrer les todos par statut ---
  filter(status: 'all' | 'active' | 'completed'): Todo[] {
    const allTodos = this.todos();
    switch (status) {
      case 'active':
        return allTodos.filter(t => !t.completed);
      case 'completed':
        return allTodos.filter(t => t.completed);
      default:
        return allTodos;
    }
  }

  // --- Charger les todos depuis une API ---
  loadFromApi(): void {
    this.http.get<Todo[]>('/api/todos').pipe(
      // Retry une fois en cas d'echec
      retry(1),
      // En cas d'erreur apres le retry, on log et on retourne EMPTY
      catchError(err => {
        console.error('Erreur lors du chargement des todos :', err);
        return EMPTY;
      })
    ).subscribe(todos => {
      this.todos.set(todos);
    });
  }
}
```

### Tests unitaires du service

```typescript
// src/app/exercises/ex20/todo.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(TodoService);
  });

  // --- Test 1 : add() ajoute un todo avec les bonnes proprietes ---
  it('devrait ajouter un todo avec id, title et completed=false', () => {
    service.add('Acheter du pain');

    const todos = service.todos();
    expect(todos.length).toBe(1);
    expect(todos[0].title).toBe('Acheter du pain');
    expect(todos[0].completed).toBe(false);
    expect(todos[0].id).toBeDefined();
  });

  // --- Test 2 : toggle() bascule le statut completed ---
  it('devrait basculer completed de false a true', () => {
    service.add('Faire les courses');
    const todoId = service.todos()[0].id;

    service.toggle(todoId);

    expect(service.todos()[0].completed).toBe(true);

    // Toggle a nouveau : revient a false
    service.toggle(todoId);
    expect(service.todos()[0].completed).toBe(false);
  });

  // --- Test 3 : delete() retire le todo de la liste ---
  it('devrait supprimer un todo par son id', () => {
    service.add('Todo A');
    service.add('Todo B');
    const idToDelete = service.todos()[0].id;

    service.delete(idToDelete);

    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Todo B');
  });

  // --- Test 4 : filter('active') retourne les todos non completes ---
  it('devrait filtrer les todos actifs', () => {
    service.add('Todo 1');
    service.add('Todo 2');
    service.add('Todo 3');
    // On complete le deuxieme todo
    service.toggle(service.todos()[1].id);

    const active = service.filter('active');
    expect(active.length).toBe(2);
    expect(active.every(t => !t.completed)).toBe(true);

    const completed = service.filter('completed');
    expect(completed.length).toBe(1);
    expect(completed[0].title).toBe('Todo 2');

    const all = service.filter('all');
    expect(all.length).toBe(3);
  });

  // --- Test 5 : activeCount et completedCount ---
  it('devrait calculer les compteurs actifs et completes', () => {
    service.add('A');
    service.add('B');
    service.add('C');

    expect(service.activeCount()).toBe(3);
    expect(service.completedCount()).toBe(0);

    service.toggle(service.todos()[0].id);
    service.toggle(service.todos()[2].id);

    expect(service.activeCount()).toBe(1);
    expect(service.completedCount()).toBe(2);
  });
});
```

### Composant TodoList

```typescript
// src/app/exercises/ex20/todo-list.component.ts

import { Component, inject, signal } from '@angular/core';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [],
  template: `
    <div class="todo-container">
      <h2>Mes Todos</h2>

      <!-- Formulaire d'ajout -->
      <div class="add-form">
        <input
          type="text"
          [value]="newTitle()"
          (input)="onTitleChange($event)"
          (keydown.enter)="addTodo()"
          placeholder="Ajouter un todo..."
          data-testid="todo-input"
        />
        <button (click)="addTodo()" data-testid="add-button">Ajouter</button>
      </div>

      <!-- Liste des todos -->
      @if (todoService.todos().length === 0) {
        <p class="empty" data-testid="empty-message">Aucun todo</p>
      } @else {
        <ul class="todo-list">
          @for (todo of todoService.todos(); track todo.id) {
            <li [class.completed]="todo.completed" data-testid="todo-item">
              <input
                type="checkbox"
                [checked]="todo.completed"
                (change)="todoService.toggle(todo.id)"
                data-testid="todo-checkbox"
              />
              <span class="todo-title">{{ todo.title }}</span>
              <button
                class="btn-delete"
                (click)="todoService.delete(todo.id)"
                data-testid="delete-button"
              >
                Supprimer
              </button>
            </li>
          }
        </ul>
      }

      <!-- Compteurs -->
      <div class="counters">
        <span>{{ todoService.activeCount() }} actif(s)</span>
        <span>{{ todoService.completedCount() }} termine(s)</span>
      </div>
    </div>
  `,
  styles: [`
    .todo-container { max-width: 500px; padding: 1rem; font-family: sans-serif; }
    .add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .add-form input { flex: 1; padding: 0.5rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; }
    .add-form button { padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .todo-list { list-style: none; padding: 0; }
    .todo-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .todo-list li.completed .todo-title { text-decoration: line-through; color: #999; }
    .todo-title { flex: 1; }
    .btn-delete { background: none; border: 1px solid #e53935; color: #e53935; border-radius: 4px; cursor: pointer; padding: 0.25rem 0.5rem; font-size: 0.8rem; }
    .empty { color: #999; font-style: italic; }
    .counters { margin-top: 1rem; display: flex; gap: 1rem; color: #666; font-size: 0.9rem; }
  `]
})
export class TodoListComponent {
  // Injection du service (public pour l'utiliser dans le template)
  readonly todoService = inject(TodoService);

  // Signal pour le champ de saisie
  readonly newTitle = signal<string>('');

  onTitleChange(event: Event): void {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  addTodo(): void {
    const title = this.newTitle();
    if (title.trim()) {
      this.todoService.add(title);
      this.newTitle.set('');
    }
  }
}
```

### Tests du composant

```typescript
// src/app/exercises/ex20/todo-list.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from './todo.service';

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let service: TodoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(TodoService);
    fixture.detectChanges();
  });

  // --- Test 1 : le composant affiche la liste des todos ---
  it('devrait afficher les todos existants', () => {
    service.add('Todo A');
    service.add('Todo B');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="todo-item"]') as NodeListOf<HTMLElement>;
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Todo A');
    expect(items[1].textContent).toContain('Todo B');
  });

  // --- Test 2 : le formulaire ajoute un todo ---
  it('devrait ajouter un todo via le formulaire', () => {
    const input = fixture.nativeElement.querySelector('[data-testid="todo-input"]') as HTMLInputElement;
    const button = fixture.nativeElement.querySelector('[data-testid="add-button"]') as HTMLButtonElement;

    // Simuler la saisie
    input.value = 'Nouveau todo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Cliquer sur "Ajouter"
    button.click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="todo-item"]') as NodeListOf<HTMLElement>;
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Nouveau todo');
  });

  // --- Test 3 : cliquer sur la checkbox toggle le todo ---
  it('devrait toggler un todo au clic sur la checkbox', () => {
    service.add('Mon todo');
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('[data-testid="todo-checkbox"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(service.todos()[0].completed).toBe(true);
    const item = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    expect(item.classList.contains('completed')).toBe(true);
  });

  // --- Test 4 : cliquer sur "Supprimer" retire le todo ---
  it('devrait supprimer un todo au clic sur le bouton', () => {
    service.add('A supprimer');
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="delete-button"]') as HTMLButtonElement;
    deleteBtn.click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="todo-item"]') as NodeListOf<HTMLElement>;
    expect(items.length).toBe(0);
    expect(service.todos().length).toBe(0);
  });

  // --- Test 5 : message "Aucun todo" quand la liste est vide ---
  it('devrait afficher "Aucun todo" quand la liste est vide', () => {
    fixture.detectChanges();

    const emptyMsg = fixture.nativeElement.querySelector('[data-testid="empty-message"]') as HTMLElement;
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.textContent).toContain('Aucun todo');
  });
});
```

### Tests HTTP avec mocks

```typescript
// src/app/exercises/ex20/todo-http.spec.ts

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TodoService } from './todo.service';
import { Todo } from './todo.model';

describe('TodoService - HTTP', () => {
  let service: TodoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TodoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifie qu'il n'y a pas de requetes en attente
    httpMock.verify();
  });

  // --- Test 1 : loadFromApi() charge les todos ---
  it('devrait charger les todos depuis l\'API', () => {
    const mockTodos: Todo[] = [
      { id: 1, title: 'Todo API 1', completed: false },
      { id: 2, title: 'Todo API 2', completed: true }
    ];

    service.loadFromApi();

    // Intercepter la requete GET
    const req = httpMock.expectOne('/api/todos');
    expect(req.request.method).toBe('GET');

    // Repondre avec les donnees mockees
    req.flush(mockTodos);

    // Verifier que le signal a ete mis a jour
    expect(service.todos().length).toBe(2);
    expect(service.todos()[0].title).toBe('Todo API 1');
    expect(service.todos()[1].completed).toBe(true);
  });

  // --- Test 2 : loadFromApi() gere une erreur 500 ---
  it('devrait gerer une erreur 500 sans planter', () => {
    spyOn(console, 'error');

    service.loadFromApi();

    // Premiere requete echoue (retry va relancer)
    const req1 = httpMock.expectOne('/api/todos');
    req1.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    // Deuxieme requete (retry) echoue aussi
    const req2 = httpMock.expectOne('/api/todos');
    req2.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    // Le signal reste vide
    expect(service.todos().length).toBe(0);
    // L'erreur a ete loggee dans la console
    expect(console.error).toHaveBeenCalled();
  });

  // --- Test 3 : loadFromApi() avec retry reussi ---
  it('devrait reussir au retry apres un premier echec', () => {
    const mockTodos: Todo[] = [
      { id: 1, title: 'Todo retry', completed: false }
    ];

    service.loadFromApi();

    // Premiere requete : echec
    const req1 = httpMock.expectOne('/api/todos');
    req1.flush('Error', { status: 503, statusText: 'Service Unavailable' });

    // Deuxieme requete (retry) : succes
    const req2 = httpMock.expectOne('/api/todos');
    req2.flush(mockTodos);

    // Le signal contient les donnees du retry
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Todo retry');
  });
});
```

## Ce que tu aurais pu oublier

### 1. Oublier `provideHttpClientTesting()` dans les tests HTTP
- ❌ Utiliser `provideHttpClient()` seul → les vraies requêtes HTTP sont envoyees
- ✅ Ajouter `provideHttpClientTesting()` pour intercepter les requêtes avec `HttpTestingController`

### 2. Ne pas appeler `httpMock.verify()` dans `afterEach`
- ❌ Des requêtes non traitees passent inapercues → faux positifs
- ✅ Toujours appeler `httpMock.verify()` dans `afterEach()` pour détecter les requêtes oubliees

### 3. Oublier `fixture.detectChanges()` après une action
- ❌ Modifier le service puis vérifier le DOM sans `detectChanges()` → le DOM n'est pas mis a jour
- ✅ Appeler `fixture.detectChanges()` après chaque action pour declencher le change detection

### 4. Ne pas gérer le retry dans les tests d'erreur
- ❌ S'attendre à une seule requête quand `retry(1)` est configure → le test echoue
- ✅ Avec `retry(1)`, il y a 2 requêtes en cas d'erreur : la première + le retry

### 5. Utiliser `any` dans les tests
- ❌ `const items = el.querySelectorAll('.item') as any` → viole la contrainte
- ✅ `const items = el.querySelectorAll('.item') as NodeListOf<HTMLElement>` → type correct

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `TestBed.configureTestingModule` | Configure le module de test avec les providers et imports nécessaires |
| `TestBed.inject(Service)` | Recupere une instance du service depuis l'injecteur de test |
| `fixture.detectChanges()` | Declenche le change detection pour mettre a jour le DOM du composant |
| `fixture.nativeElement` | Acces au DOM natif du composant pour les assertions |
| `provideHttpClientTesting()` | Remplace le HttpClient réel par un mock pour les tests |
| `HttpTestingController` | Permet d'intercepter, vérifier et repondre aux requêtes HTTP dans les tests |
| `httpMock.expectOne(url)` | Verifie qu'exactement une requête a ete faite vers l'URL donnee |
| `req.flush(data)` | Simule une réponse HTTP avec les donnees fournies |
| `req.flush(body, { status })` | Simule une réponse HTTP avec un code d'erreur |
| `httpMock.verify()` | Verifie qu'il ne reste aucune requête en attente non traitee |
| `data-testid` | Attribut HTML pour identifier les éléments dans les tests (meilleure pratique) |
| `retry(n)` | Operateur RxJS qui relance l'observable n fois en cas d'erreur |
