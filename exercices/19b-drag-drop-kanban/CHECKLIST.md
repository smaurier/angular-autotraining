# Checklist — Exercice 19b

- [ ] Le composant `KanbanBoardComponent` est standalone et importe `CdkDropList` + `CdkDrag`
- [ ] 3 colonnes sont affichees : "A faire", "En cours", "Termine"
- [ ] Chaque colonne est un `cdkDropList` avec un `[id]` unique
- [ ] Les drop lists sont connectees entre elles via `[cdkDropListConnectedTo]`
- [ ] Chaque tache est un `cdkDrag` avec titre, badge de priorite colore et assignee
- [ ] Le handler `onDrop()` est type avec `CdkDragDrop<KanbanTask[]>`
- [ ] Deplacer une tache entre colonnes met a jour son `status` via le `TaskStoreService`
- [ ] Le `TaskStoreService` utilise un `signal<KanbanTask[]>` comme source de verite
- [ ] 3 computed (`todoTasks`, `inProgressTasks`, `doneTasks`) derivent les taches par colonne
- [ ] Chaque colonne affiche un compteur du nombre de taches
- [ ] Le bouton "Nouvelle tache" ouvre un formulaire inline (titre + priorite + assignee)
- [ ] Les interfaces et types sont stricts : `KanbanTask`, `KanbanStatus`, `KanbanPriority`
- [ ] Zero `any` dans le code — `Event` + cast `as HTMLInputElement`
- [ ] Bonus : `cdkDragHandle` pour la poignee de drag (si tente)
- [ ] Bonus : persistance localStorage via `effect()` (si tente)
