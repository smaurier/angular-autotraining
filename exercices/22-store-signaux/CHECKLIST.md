# Checklist — Exercice 22 : Store signaux

## Modèle

- [ ] L'interface `Task` est definie avec `id`, `title`, `completed`, `createdAt` (tous types strictement)
- [ ] Le type `TaskFilter` est un union literal `'all' | 'active' | 'completed'`
- [ ] Les propriétés de `Task` sont `readonly` pour garantir l'immutabilite

## Store

- [ ] Le service utilise `providedIn: 'root'` (singleton)
- [ ] Les signaux internes `_tasks` et `_filter` sont `private readonly`
- [ ] Les signaux sont exposes en lecture seule via `.asReadonly()` avec le type `Signal<T>`
- [ ] Le `computed` `filteredTasks` filtre correctement selon les 3 valeurs du filtre
- [ ] Les `computed` `taskCount`, `completedCount` et `activeCount` retournent les bons totaux
- [ ] La méthode `addTask` généré un `id` avec `crypto.randomUUID()`
- [ ] La méthode `toggleTask` inverse `completed` de manière immutable (spread operator)
- [ ] La méthode `deleteTask` filtre le tableau sans le muter
- [ ] La méthode `clearCompleted` supprime toutes les taches completees
- [ ] Un `effect()` dans le constructeur log le nombre de taches à chaque changement

## Composant

- [ ] Le composant utilise `inject(TaskStore)` pour acceder au store
- [ ] Le template utilise `@for` avec `track task.id` pour afficher les taches
- [ ] Le formulaire d'ajout fonctionne (saisie + Entree ou clic sur le bouton)
- [ ] Les filtres changent l'affichage en temps réel

## Qualite

- [ ] Zero `any` dans le code
- [ ] Aucun `WritableSignal` expose publiquement
