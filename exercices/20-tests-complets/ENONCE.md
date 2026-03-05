# Exercice 20 — Tests complets

**Module** : 09-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 90 min
**Cours** : `cours/09-tests/01-tests-unitaires.md`, `cours/09-tests/02-tests-composants.md`, `cours/09-tests/03-tests-http-et-di.md`

## Objectif

Ecrire une suite de tests complete (service, composant, HTTP) pour une application Todo, en couvrant les cas nominaux, les cas limites et la gestion d'erreurs.

## Consignes

1. **Creer `TodoService`** dans `src/app/exercises/ex20/todo.service.ts` :
   - Signal `todos` de type `signal<Todo[]>` (initialise a `[]`)
   - Methode `add(title: string)` : ajoute un todo avec `id` auto-incremente, `title`, `completed: false`
   - Methode `toggle(id: number)` : bascule le `completed` d'un todo
   - Methode `delete(id: number)` : supprime un todo
   - Methode `filter(status: 'all' | 'active' | 'completed')` : retourne un signal filtre
   - Computed `activeCount` : nombre de todos non completes
   - Computed `completedCount` : nombre de todos completes
   - Methode `loadFromApi()` : charge les todos depuis une API HTTP (GET `/api/todos`)
2. **Ecrire 5 tests unitaires du service** dans `todo.service.spec.ts` :
   - Test 1 : `add()` ajoute un todo avec les bonnes proprietes
   - Test 2 : `toggle()` bascule le statut completed
   - Test 3 : `delete()` retire le todo de la liste
   - Test 4 : `filter('active')` retourne uniquement les todos non completes
   - Test 5 : `activeCount` et `completedCount` retournent les bons comptes
3. **Creer `TodoListComponent`** dans `src/app/exercises/ex20/todo-list.component.ts` :
   - Injecte `TodoService`
   - Affiche la liste des todos avec `@for`
   - Formulaire d'ajout avec un `<input>` et un bouton
   - Bouton toggle (checkbox) et bouton supprimer pour chaque todo
   - Message "Aucun todo" quand la liste est vide
4. **Ecrire 5 tests de composant** dans `todo-list.component.spec.ts` :
   - Test 1 : le composant affiche la liste des todos
   - Test 2 : le formulaire ajoute un todo au clic sur "Ajouter"
   - Test 3 : cliquer sur la checkbox toggle le todo
   - Test 4 : cliquer sur "Supprimer" retire le todo
   - Test 5 : le message "Aucun todo" s'affiche quand la liste est vide
5. **Ecrire 3 tests HTTP** dans `todo-http.spec.ts` :
   - Test 1 : `loadFromApi()` charge les todos depuis l'API (mock `HttpTestingController`)
   - Test 2 : `loadFromApi()` gere une erreur 500 (le signal reste vide, erreur loggee)
   - Test 3 : `loadFromApi()` avec retry (la premiere requete echoue, la seconde reussit)
6. **Tous les tests doivent passer** : executer `ng test` et verifier que tout est vert

## Contraintes TypeScript

- Zero `any` dans le code (y compris dans les tests)
- TypeScript strict active
- Interface `Todo` : `id: number`, `title: string`, `completed: boolean`
- Utiliser `TestBed.configureTestingModule` pour les tests de composant
- Utiliser `provideHttpClientTesting` et `HttpTestingController` pour les tests HTTP

## Bonus

- Atteindre une couverture de tests > 80 % (`ng test --code-coverage`)
- Tester un `MatDialog` avec les harnesses Angular Material (`MatDialogHarness`)
- Ajouter un test de snapshot pour le composant

## Fichiers

-> `src/app/exercises/ex20/todo.model.ts`
-> `src/app/exercises/ex20/todo.service.ts`
-> `src/app/exercises/ex20/todo.service.spec.ts`
-> `src/app/exercises/ex20/todo-list.component.ts`
-> `src/app/exercises/ex20/todo-list.component.spec.ts`
-> `src/app/exercises/ex20/todo-http.spec.ts`
