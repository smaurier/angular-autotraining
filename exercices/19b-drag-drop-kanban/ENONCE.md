# Exercice 19b — Drag-drop Kanban

**Module** : 08-Angular-Material · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/08-angular-material/03-cdk-patterns.md`

> **Exercice de renforcement** : cet exercice consolide les concepts du module 08 (CDK DragDrop) avec une mise en pratique complete.

## Objectif

Construire un tableau Kanban interactif avec 3 colonnes et du drag-and-drop entre colonnes grace au CDK DragDrop d'Angular, avec un store de taches base sur les signaux.

## Consignes

1. **3 colonnes Kanban** : creer un composant `KanbanBoardComponent` dans `src/app/exercises/ex19b/` avec 3 colonnes :
   - "A faire" (`todo`)
   - "En cours" (`in_progress`)
   - "Termine" (`done`)
   - Chaque colonne affiche un compteur du nombre de taches qu'elle contient
2. **CDK Drop Lists** : chaque colonne est un `cdkDropList` connecte aux deux autres via `[cdkDropListConnectedTo]`
   - Implementer le handler `(cdkDropListDropped)="onDrop($event)"` qui appelle `moveItemInArray` ou `transferArrayItem` selon le cas
3. **Cartes de taches** : chaque tache est un element `cdkDrag` qui affiche :
   - Le titre de la tache
   - Un badge de priorite colore (`haute` = rouge, `moyenne` = orange, `basse` = vert)
   - Le nom de l'assignee
   - Ajouter un `cdkDragHandle` (icone grip) pour deplacer uniquement via la poignee
4. **Mise a jour reactive** : quand une tache est deplacee vers une autre colonne, son signal `status` est mis a jour automatiquement via le `TaskStore`
5. **TaskStore service** : creer un service `TaskStoreService` dans `src/app/exercises/ex19b/` :
   - Signal principal `tasks` contenant toutes les taches
   - 3 computed derivant les taches par colonne : `todoTasks`, `inProgressTasks`, `doneTasks`
   - Methode `moveTask(taskId: number, newStatus: KanbanStatus)` qui met a jour le statut
   - Methode `addTask(task: Omit<KanbanTask, 'id'>)` pour ajouter une tache
6. **Formulaire d'ajout** : ajouter un bouton "Nouvelle tache" qui affiche un formulaire inline simple (titre + priorite + assignee) dans la colonne "A faire"

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Interface `KanbanTask` avec : `id: number`, `title: string`, `priority: KanbanPriority`, `assignee: string`, `status: KanbanStatus`
- Types : `KanbanStatus = 'todo' | 'in_progress' | 'done'` et `KanbanPriority = 'low' | 'medium' | 'high'`
- Typer correctement l'evenement `CdkDragDrop<KanbanTask[]>`

## Bonus

- Ajouter une animation de placeholder (l'espace vide ou la tache va atterrir) avec `*cdkDragPlaceholder`
- Persister l'etat du kanban dans le `localStorage` et le restaurer au chargement
- Ajouter la possibilite de supprimer une tache par un bouton sur la carte

## Fichiers

-> `src/app/exercises/ex19b/kanban-board.component.ts`
-> `src/app/exercises/ex19b/kanban-task.model.ts`
-> `src/app/exercises/ex19b/task-store.service.ts`
