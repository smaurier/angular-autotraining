# Exercice 21 — E2E Playwright

**Module** : 09-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/09-tests/04-tests-e2e.md`

## Objectif

Ecrire 5 tests end-to-end avec Playwright pour une application Todo, en utilisant le pattern Page Object et des selecteurs `data-testid`.

## Consignes

1. Initialiser Playwright dans le projet avec `npx playwright install` et creer le fichier de configuration `playwright.config.ts` dans `src/app/exercises/ex21/e2e/`
2. Creer un **Page Object** `TodoPage` dans `src/app/exercises/ex21/e2e/pages/todo.page.ts` qui encapsule les interactions avec la page :
   - `goto()` — naviguer vers la page Todo
   - `addTask(title: string)` — saisir un titre et soumettre
   - `toggleTask(index: number)` — cocher/decocher une tache
   - `deleteTask(index: number)` — supprimer une tache
   - `editTask(index: number, newTitle: string)` — modifier le titre
   - `filterBy(status: 'all' | 'active' | 'completed')` — filtrer les taches
   - `getTaskCount()` — retourner le nombre de taches affichees
   - `getTaskTitle(index: number)` — retourner le titre de la tache a l'index donne
3. Ecrire le **test 1 — Navigation** : verifier que la page se charge, que le titre est present et que la liste est initialement vide
4. Ecrire le **test 2 — Creer une tache** : ajouter 3 taches, verifier qu'elles apparaissent dans la liste avec le bon titre
5. Ecrire le **test 3 — Modifier une tache** : creer une tache, double-cliquer dessus, modifier le titre, verifier la mise a jour
6. Ecrire le **test 4 — Supprimer une tache** : creer 2 taches, supprimer la premiere, verifier qu'il ne reste qu'une tache avec le bon titre
7. Ecrire le **test 5 — Filtrer les taches** : creer 3 taches, en completer 2, filtrer par "active" (1 resultat), par "completed" (2 resultats), par "all" (3 resultats)
8. Tous les selecteurs doivent utiliser `data-testid` (ex: `[data-testid="todo-input"]`, `[data-testid="todo-item"]`)

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Toutes les methodes du Page Object doivent etre typees avec des `Promise<>` explicites
- Utiliser les assertions Playwright (`expect`) et non les assertions Jest/Vitest

## Bonus

- Ajouter un test de **performance** : verifier que l'ajout de 100 taches prend moins de 5 secondes
- Ajouter un test d'**accessibilite** avec `@axe-core/playwright`
- Generer un rapport HTML Playwright apres les tests

## Fichiers

-> `src/app/exercises/ex21/e2e/playwright.config.ts`
-> `src/app/exercises/ex21/e2e/pages/todo.page.ts`
-> `src/app/exercises/ex21/e2e/tests/todo.spec.ts`
