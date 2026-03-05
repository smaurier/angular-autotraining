# Exercice 23 — NgRx SignalStore

**Module** : 10-State-Management · **Difficulte** : ⭐⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/10-state-management/02-ngrx-signal-store.md`

## Objectif

Migrer le `TaskStore` de l'exercice 22 vers NgRx SignalStore en utilisant `signalStore()`, `withState()`, `withComputed()`, `withMethods()` et `withHooks()`, puis ajouter la gestion d'entites avec `withEntities()`.

## Consignes

1. Creer les fichiers dans `src/app/exercises/ex23/`
2. Installer la dependance NgRx : `npm install @ngrx/signals`
3. Definir les memes interfaces `Task` et `TaskFilter` que l'exercice 22 dans `models/task.model.ts`
4. Creer le store avec `signalStore()` dans `store/task.store.ts` :
   - **`withState()`** : definir l'etat initial avec `tasks: Task[]`, `filter: TaskFilter` et `loading: boolean`
   - **`withComputed()`** : creer les computed `filteredTasks`, `taskCount`, `completedCount`, `activeCount` (meme logique que l'ex 22)
   - **`withMethods()`** : implementer `addTask`, `toggleTask`, `deleteTask`, `setFilter`, `clearCompleted` en utilisant `patchState()`
   - **`withHooks()`** : ajouter un hook `onInit` qui charge des taches d'exemple au demarrage
5. Creer un **second store** `TaskEntityStore` dans `store/task-entity.store.ts` qui utilise `withEntities()` :
   - Remplacer le tableau `tasks` par la gestion d'entites NgRx (`addEntity`, `updateEntity`, `removeEntity`)
   - Garder les memes computed et methodes
6. Creer un composant `TaskBoardComponent` qui utilise le `TaskStore` et affiche les taches
7. Ajouter un fichier `store/comparison.md` qui compare les deux approches (service + signals vs NgRx SignalStore) en termes de verbosity, scalability et testability
8. Utiliser `getState()` dans les tests ou le debug pour inspecter l'etat complet du store

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Typer l'etat initial avec une interface `TaskState`
- Utiliser `patchState()` pour toutes les mutations (pas de `.set()` ou `.update()` sur les signaux internes)
- Les types des entites doivent avoir une propriete `id` de type `string`

## Bonus

- Ajouter `withMethods()` pour un appel HTTP simule avec `rxMethod` (charger des taches depuis une fausse API)
- Ajouter un plugin custom avec `signalStoreFeature()` pour le logging automatique des changements d'etat
- Implementer l'optimistic update : modifier l'UI immediatement puis rollback en cas d'erreur

## Fichiers

-> `src/app/exercises/ex23/models/task.model.ts`
-> `src/app/exercises/ex23/store/task.store.ts`
-> `src/app/exercises/ex23/store/task-entity.store.ts`
-> `src/app/exercises/ex23/store/comparison.md`
-> `src/app/exercises/ex23/components/task-board.component.ts`
