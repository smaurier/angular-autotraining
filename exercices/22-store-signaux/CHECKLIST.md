# Checklist — Exercice 22 : Store signaux

## Modele

- [ ] L'interface `Task` est definie avec `id`, `title`, `completed`, `createdAt` (tous types strictement)
- [ ] Le type `TaskFilter` est un union literal `'all' | 'active' | 'completed'`
- [ ] Les proprietes de `Task` sont `readonly` pour garantir l'immutabilite

## Store

- [ ] Le service utilise `providedIn: 'root'` (singleton)
- [ ] Les signaux internes `_tasks` et `_filter` sont `private readonly`
- [ ] Les signaux sont exposes en lecture seule via `.asReadonly()` avec le type `Signal<T>`
- [ ] Le `computed` `filteredTasks` filtre correctement selon les 3 valeurs du filtre
- [ ] Les `computed` `taskCount`, `completedCount` et `activeCount` retournent les bons totaux
- [ ] La methode `addTask` genere un `id` avec `crypto.randomUUID()`
- [ ] La methode `toggleTask` inverse `completed` de maniere immutable (spread operator)
- [ ] La methode `deleteTask` filtre le tableau sans le muter
- [ ] La methode `clearCompleted` supprime toutes les taches completees
- [ ] Un `effect()` dans le constructeur log le nombre de taches a chaque changement

## Composant

- [ ] Le composant utilise `inject(TaskStore)` pour acceder au store
- [ ] Le template utilise `@for` avec `track task.id` pour afficher les taches
- [ ] Le formulaire d'ajout fonctionne (saisie + Entree ou clic sur le bouton)
- [ ] Les filtres changent l'affichage en temps reel

## Qualite

- [ ] Zero `any` dans le code
- [ ] Aucun `WritableSignal` expose publiquement
