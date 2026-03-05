# Checklist — Exercice 23 : NgRx SignalStore

## Installation et modele

- [ ] La dependance `@ngrx/signals` est installee (`npm install @ngrx/signals`)
- [ ] L'interface `Task` est definie avec `id: string` (obligatoire pour withEntities)
- [ ] Le type `TaskFilter` et l'interface `TaskState` sont exportes

## Store classique (signalStore + withState)

- [ ] Le store est cree avec `signalStore({ providedIn: 'root' }, ...)`
- [ ] `withState()` definit l'etat initial avec `tasks`, `filter` et `loading`
- [ ] `withComputed()` cree `filteredTasks`, `taskCount`, `completedCount`, `activeCount`
- [ ] `withMethods()` implemente `addTask`, `toggleTask`, `deleteTask`, `setFilter`, `clearCompleted`
- [ ] Toutes les mutations utilisent `patchState()` (pas de `.set()` direct sur les signaux)
- [ ] `withHooks()` charge des taches d'exemple dans `onInit`

## Store entites (withEntities)

- [ ] Le second store utilise `withEntities<Task>()` au lieu de `withState({ tasks: [] })`
- [ ] Les mutations utilisent `addEntity`, `updateEntity`, `removeEntity`, `setAllEntities`
- [ ] Les computed utilisent `store.entities()` au lieu de `store.tasks()`
- [ ] Le store entite a les memes fonctionnalites que le store classique

## Composant

- [ ] Le composant injecte le store avec `inject(TaskStore)`
- [ ] Le template affiche les statistiques via les computed du store
- [ ] Les filtres et les actions appellent directement les methodes du store

## Comparaison

- [ ] Le fichier `comparison.md` compare les deux approches (verbosity, scalability, testability)
- [ ] La comparaison mentionne quand utiliser chaque approche

## Qualite

- [ ] Zero `any` dans le code
- [ ] L'ordre des features est correct : `withState` → `withComputed` → `withMethods` → `withHooks`
