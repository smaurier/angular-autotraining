# Checklist — Exercice 03

- [ ] Le composant `TodoListComponent` est standalone
- [ ] L'interface `Todo` est definie avec `id`, `title`, `completed`
- [ ] Un signal `todos` de type `Todo[]` est declare avec des donnees initiales
- [ ] Un signal `newTodoTitle` permet de saisir le titre d'une nouvelle tache
- [ ] Un computed `remainingCount` retourne le nombre de taches non completees
- [ ] La methode `addTodo()` ajoute une tache et vide le champ de saisie
- [ ] La methode `toggleTodo(id)` inverse le statut completed avec `update()` (immutabilite)
- [ ] La methode `deleteTodo(id)` supprime une tache avec `update()` + `filter()`
- [ ] Le template utilise `@for` avec `track todo.id`
- [ ] Le template utilise `@empty` pour afficher un message quand la liste est vide
- [ ] Les taches completees sont visuellement barrees avec `[class.completed]`
- [ ] Zero `any` dans le code
- [ ] Bonus : filtre Toutes / Actives / Completees (si tente)
- [ ] Bonus : bouton "Supprimer les completees" (si tente)
