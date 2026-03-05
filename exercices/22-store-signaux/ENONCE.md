# Exercice 22 — Store signaux

**Module** : 10-State-Management · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/10-state-management/01-etat-local-signals.md`

## Objectif

Creer un service `TaskStore` qui gere l'etat d'une liste de taches en utilisant exclusivement les signaux Angular (signal, computed, effect).

## Consignes

1. Creer les fichiers dans `src/app/exercises/ex22/`
2. Definir une interface `Task` dans `models/task.model.ts` :
   - `id: string` (genere avec `crypto.randomUUID()`)
   - `title: string`
   - `completed: boolean`
   - `createdAt: Date`
3. Definir un type `TaskFilter` : `'all' | 'active' | 'completed'`
4. Creer un service `TaskStore` dans `services/task.store.ts` avec `providedIn: 'root'` :
   - Un **signal prive** `_tasks` de type `WritableSignal<Task[]>` initialise a `[]`
   - Un **signal prive** `_filter` de type `WritableSignal<TaskFilter>` initialise a `'all'`
   - Un **computed** `filteredTasks` qui filtre les taches selon le filtre courant
   - Un **computed** `taskCount` qui retourne le nombre total de taches
   - Un **computed** `completedCount` qui retourne le nombre de taches completees
   - Un **computed** `activeCount` qui retourne le nombre de taches non completees
5. Implementer les methodes :
   - `addTask(title: string): void` — ajoute une nouvelle tache
   - `toggleTask(id: string): void` — inverse le statut `completed` d'une tache
   - `deleteTask(id: string): void` — supprime une tache par son id
   - `setFilter(filter: TaskFilter): void` — change le filtre actif
   - `clearCompleted(): void` — supprime toutes les taches completees
6. Exposer les signaux en **lecture seule** via des proprietes publiques `readonly` (pas les WritableSignal directement)
7. Creer un composant `TaskListComponent` qui utilise le `TaskStore` pour afficher et manipuler les taches
8. Ajouter un `effect()` dans le store qui log dans la console chaque changement du nombre de taches (a des fins de debug)

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Les signaux internes (`_tasks`, `_filter`) doivent etre `private readonly`
- Les signaux exposes doivent etre `readonly` et de type `Signal<T>` (pas `WritableSignal<T>`)
- Utiliser `crypto.randomUUID()` pour generer les identifiants

## Bonus

- Ajouter une methode `reorderTasks(fromIndex: number, toIndex: number)` pour reordonner les taches
- Persister les taches dans `localStorage` via un `effect()` et les recharger au demarrage
- Ajouter un signal `searchTerm` et un computed `searchResults` qui filtre par titre

## Fichiers

-> `src/app/exercises/ex22/models/task.model.ts`
-> `src/app/exercises/ex22/services/task.store.ts`
-> `src/app/exercises/ex22/components/task-list.component.ts`
-> `src/app/exercises/ex22/components/task-item.component.ts`
