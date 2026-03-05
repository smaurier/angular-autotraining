# Cours 39 — State management avec Services et Signals

> **Objectif** : Construire un systeme de gestion d'etat avec des services Angular et des signals — l'equivalent d'un "Pinia maison". Comprendre le pattern service + signal, les selecteurs computed, les actions, et quand cette approche suffit (spoiler : la plupart du temps en ESN).

---

## Rappel du cours precedent

<details>
<summary>1. Quel est le role du Page Object Pattern dans les tests E2E ?</summary>

Il encapsule les selecteurs et les actions d'une page dans une classe reutilisable. Si un selecteur change, on le modifie a un seul endroit au lieu de chaque test.
</details>

<details>
<summary>2. Quels selecteurs Playwright faut-il privilegier ?</summary>

`getByRole()` pour les elements interactifs, `getByTestId()` pour les elements sans role semantique clair, `getByLabel()` pour les champs de formulaire.
</details>

<details>
<summary>3. Quelle est la pyramide des tests recommandee ?</summary>

Beaucoup de tests unitaires (base), des tests d'integration au milieu, et peu de tests E2E au sommet (uniquement les parcours critiques).
</details>

---

## Analogie

Si vous venez de Vue 3, vous connaissez **Pinia** : un store avec un `state` (reactif), des `getters` (derives) et des `actions` (methodes qui modifient l'etat).

En Angular, **un service injectable + des signals** fait exactement la meme chose. C'est ce qu'on appelle un "store maison" ou "lightweight store" :

| Pinia (Vue 3) | Service + Signals (Angular) |
|---------------|---------------------------|
| `ref()` dans state | `signal()` |
| `computed()` dans getters | `computed()` |
| Fonctions dans actions | Methodes du service |
| `defineStore('tasks', ...)` | `@Injectable({ providedIn: 'root' })` |
| `store.tasks` | `service.tasks()` |
| `storeToRefs(store)` | Signals deja reactifs |
| Auto-import dans composants | `inject(TaskStore)` |

L'approche est **si similaire** qu'un developpeur Vue/Pinia se sent immediatement a l'aise.

---

## Theorie

### Pattern : service + signal = store

```typescript
// task-store.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface Task {
  id: number;
  titre: string;
  terminee: boolean;
  priorite: 'haute' | 'moyenne' | 'basse';
}

@Injectable({ providedIn: 'root' })
export class TaskStore {
  // --- State (equivalent de ref() dans Pinia) ---
  private readonly _tasks = signal<Task[]>([]);
  private readonly _filtre = signal<'toutes' | 'actives' | 'terminees'>('toutes');
  private readonly _chargement = signal(false);

  // --- Selecteurs (equivalent des getters Pinia) ---
  readonly tasks = this._tasks.asReadonly();
  readonly filtre = this._filtre.asReadonly();
  readonly chargement = this._chargement.asReadonly();

  readonly tasksFiltrees = computed(() => {
    const toutes = this._tasks();
    switch (this._filtre()) {
      case 'actives': return toutes.filter(t => !t.terminee);
      case 'terminees': return toutes.filter(t => t.terminee);
      default: return toutes;
    }
  });

  readonly nbActives = computed(() =>
    this._tasks().filter(t => !t.terminee).length
  );

  readonly nbTerminees = computed(() =>
    this._tasks().filter(t => t.terminee).length
  );

  readonly progression = computed(() => {
    const total = this._tasks().length;
    if (total === 0) return 0;
    return Math.round((this.nbTerminees() / total) * 100);
  });

  // --- Actions (equivalent des actions Pinia) ---
  ajouter(titre: string, priorite: Task['priorite'] = 'moyenne'): void {
    const nouvelleTask: Task = {
      id: Date.now(),
      titre,
      terminee: false,
      priorite,
    };
    this._tasks.update(tasks => [...tasks, nouvelleTask]);
  }

  supprimer(id: number): void {
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
  }

  basculer(id: number): void {
    this._tasks.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, terminee: !t.terminee } : t)
    );
  }

  setFiltre(filtre: 'toutes' | 'actives' | 'terminees'): void {
    this._filtre.set(filtre);
  }

  viderTerminees(): void {
    this._tasks.update(tasks => tasks.filter(t => !t.terminee));
  }
}
```

### Decomposition du pattern

```
1. State privee     →  signal<T>()        → Seul le store peut modifier
2. Selecteurs       →  computed()          → Derivations en lecture seule
3. Lecture publique  →  .asReadonly()       → Les composants ne peuvent que lire
4. Actions          →  methodes            → Seul moyen de modifier l'etat
```

### Exposer en lecture seule avec .asReadonly()

```typescript
// ❌ Signal public modifiable — n'importe quel composant peut casser l'etat
export class TaskStore {
  readonly tasks = signal<Task[]>([]);  // Modifiable de l'exterieur !
}

// Un composant peut faire :
this.store.tasks.set([]);  // Perte de donnees !

// ✅ Signal prive + readonly public
export class TaskStore {
  private readonly _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();  // Lecture seule
}

// Un composant ne peut que lire :
this.store.tasks();        // OK : lecture
this.store.tasks.set([]);  // ❌ Erreur TypeScript !
```

> **Regle d'or** : L'etat interne est prive. Les composants lisent via `asReadonly()` et modifient via les methodes (actions).

### Utilisation dans un composant

```typescript
@Component({
  selector: 'app-task-list',
  imports: [MatListModule, MatCheckboxModule, MatButtonModule, MatIconModule, MatBadgeModule],
  template: `
    <div class="filtres">
      <button mat-button (click)="store.setFiltre('toutes')"
              [class.actif]="store.filtre() === 'toutes'">
        Toutes
      </button>
      <button mat-button (click)="store.setFiltre('actives')">
        Actives ({{ store.nbActives() }})
      </button>
      <button mat-button (click)="store.setFiltre('terminees')">
        Terminees ({{ store.nbTerminees() }})
      </button>
    </div>

    <mat-list>
      @for (task of store.tasksFiltrees(); track task.id) {
        <mat-list-item>
          <mat-checkbox
            [checked]="task.terminee"
            (change)="store.basculer(task.id)">
            {{ task.titre }}
          </mat-checkbox>
          <button mat-icon-button (click)="store.supprimer(task.id)">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-list-item>
      }
    </mat-list>

    <p>Progression : {{ store.progression() }}%</p>
  `,
})
export class TaskListComponent {
  readonly store = inject(TaskStore);
}
```

### Store avec appels HTTP

Dans la realite, les donnees viennent d'une API :

```typescript
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private http = inject(HttpClient);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _chargement = signal(false);
  private readonly _erreur = signal<string | null>(null);

  readonly tasks = this._tasks.asReadonly();
  readonly chargement = this._chargement.asReadonly();
  readonly erreur = this._erreur.asReadonly();

  charger(): void {
    this._chargement.set(true);
    this._erreur.set(null);

    this.http.get<Task[]>('/api/tasks').subscribe({
      next: (tasks) => {
        this._tasks.set(tasks);
        this._chargement.set(false);
      },
      error: (err) => {
        this._erreur.set('Impossible de charger les taches');
        this._chargement.set(false);
      },
    });
  }

  ajouter(titre: string): void {
    const nouvelle = { titre, terminee: false };
    this.http.post<Task>('/api/tasks', nouvelle).subscribe({
      next: (task) => {
        this._tasks.update(list => [...list, task]);
      },
      error: () => {
        this._erreur.set('Erreur lors de l\'ajout');
      },
    });
  }
}
```

### Comparaison directe avec Pinia

```javascript
// Pinia (Vue 3) — pour comparaison
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([]);
  const filtre = ref('toutes');

  const tasksFiltrees = computed(() => {
    if (filtre.value === 'actives') return tasks.value.filter(t => !t.terminee);
    if (filtre.value === 'terminees') return tasks.value.filter(t => t.terminee);
    return tasks.value;
  });

  function ajouter(titre) {
    tasks.value.push({ id: Date.now(), titre, terminee: false });
  }

  return { tasks, filtre, tasksFiltrees, ajouter };
});
```

```typescript
// Angular — equivalent exact
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _tasks = signal<Task[]>([]);
  private readonly _filtre = signal<Filtre>('toutes');

  readonly tasksFiltrees = computed(() => {
    if (this._filtre() === 'actives') return this._tasks().filter(t => !t.terminee);
    if (this._filtre() === 'terminees') return this._tasks().filter(t => t.terminee);
    return this._tasks();
  });

  ajouter(titre: string): void {
    this._tasks.update(list => [...list, { id: Date.now(), titre, terminee: false }]);
  }
}
```

> La structure est quasi identique. `ref()` devient `signal()`, `computed()` reste `computed()`, les fonctions deviennent des methodes.

### Quand cette approche suffit

```
Service + Signals suffit quand :
  ✅ App de petite a moyenne taille
  ✅ Equipe de 1-5 developpeurs
  ✅ Etat pas trop complexe
  ✅ Pas besoin de devtools de state management
  ✅ La majorite des projets ESN !

Envisagez NgRx SignalStore quand :
  ⚠️ Equipe > 5 developpeurs
  ⚠️ Conventions strictes imposees
  ⚠️ Etat complexe avec beaucoup de derivations
  ⚠️ Besoin de plugins / middleware
```

---

## Pratique

Creez un `PanierStore` (service) pour un e-commerce simple. Il doit gerer une liste d'articles avec : ajout, suppression, modification de quantite, et calcul du total.

**Consignes** :
1. Interface `ArticlePanier { id: number; nom: string; prix: number; quantite: number }`
2. Signal prive `_articles`, expose en readonly
3. Computed `total`, `nbArticles`
4. Actions : `ajouter`, `supprimer`, `modifierQuantite`, `vider`

<details>
<summary>Solution</summary>

```typescript
export interface ArticlePanier {
  id: number;
  nom: string;
  prix: number;
  quantite: number;
}

@Injectable({ providedIn: 'root' })
export class PanierStore {
  private readonly _articles = signal<ArticlePanier[]>([]);

  readonly articles = this._articles.asReadonly();

  readonly nbArticles = computed(() =>
    this._articles().reduce((sum, a) => sum + a.quantite, 0)
  );

  readonly total = computed(() =>
    this._articles().reduce((sum, a) => sum + a.prix * a.quantite, 0)
  );

  ajouter(article: Omit<ArticlePanier, 'quantite'>): void {
    this._articles.update(list => {
      const existant = list.find(a => a.id === article.id);
      if (existant) {
        return list.map(a =>
          a.id === article.id ? { ...a, quantite: a.quantite + 1 } : a
        );
      }
      return [...list, { ...article, quantite: 1 }];
    });
  }

  supprimer(id: number): void {
    this._articles.update(list => list.filter(a => a.id !== id));
  }

  modifierQuantite(id: number, quantite: number): void {
    if (quantite <= 0) {
      this.supprimer(id);
      return;
    }
    this._articles.update(list =>
      list.map(a => a.id === id ? { ...a, quantite } : a)
    );
  }

  vider(): void {
    this._articles.set([]);
  }
}
```

```typescript
// panier-store.service.spec.ts
describe('PanierStore', () => {
  let store: PanierStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PanierStore);
  });

  it('devrait ajouter un article', () => {
    store.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
    expect(store.articles().length).toBe(1);
    expect(store.articles()[0].quantite).toBe(1);
  });

  it('devrait incrementer la quantite si article deja present', () => {
    store.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
    store.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
    expect(store.articles().length).toBe(1);
    expect(store.articles()[0].quantite).toBe(2);
  });

  it('devrait calculer le total', () => {
    store.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
    store.ajouter({ id: 2, nom: 'Souris', prix: 45 });
    expect(store.total()).toBe(134);
  });

  it('devrait vider le panier', () => {
    store.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
    store.vider();
    expect(store.articles().length).toBe(0);
    expect(store.total()).toBe(0);
  });
});
```
</details>

---

## Resume

| Concept Pinia | Equivalent Angular | Pattern |
|---------------|-------------------|---------|
| `ref()` state | `signal()` prive | `private readonly _x = signal(...)` |
| `computed()` getters | `computed()` | `readonly x = computed(() => ...)` |
| Actions (fonctions) | Methodes du service | `methode(): void { this._x.update(...) }` |
| `storeToRefs()` | `.asReadonly()` | Deja reactif, pas besoin de conversion |
| `defineStore()` | `@Injectable()` | Service singleton, injecte avec `inject()` |

> **A retenir** : Pour 80% des projets ESN, un service + signals suffit largement. C'est simple, testable, et familier pour un developpeur Vue/Pinia.

---

> **Prochain cours** : [Cours 40 — NgRx SignalStore : store structure pour grandes equipes](./02-ngrx-signal-store.md)
