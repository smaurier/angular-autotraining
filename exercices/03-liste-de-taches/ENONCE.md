# Exercice 03 — Liste de taches

**Module** : 01-Composants-Templates · **Difficulte** : ⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/01-composants-templates/02-signaux-base.md`, `cours/01-composants-templates/03-control-flow.md`

## Objectif

Créer une application de gestion de taches (todo list) utilisant les signaux et la syntaxe de control flow moderne (`@for`, `@if`).

## Consignes

1. Créer un fichier `todo-list.component.ts` dans `src/app/exercises/ex03/`
2. Définir une **interface** `Todo` avec les champs :
   - `id` : `number`
   - `title` : `string`
   - `completed` : `boolean`
3. Declarer un **signal** `todos` de type `Todo[]` initialise avec 2-3 taches d'exemple
4. Declarer un **signal** `newTodoTitle` de type `string` (pour le champ de saisie)
5. Créer un **computed** `remainingCount` : nombre de taches non completees
6. Créer un **computed** `completedCount` : nombre de taches completees
7. Implementer les méthodes :
   - `addTodo()` : ajoute une tache (si le titre n'est pas vide), puis vide le champ
   - `toggleTodo(id: number)` : inverse le statut `completed` d'une tache
   - `deleteTodo(id: number)` : supprime une tache par son id
8. Dans le template :
   - Un `<input>` + bouton "Ajouter" pour créer des taches
   - `@for` avec `track todo.id` pour lister les taches
   - `@empty` pour afficher un message quand la liste est vide
   - `@if` pour afficher le compteur de taches restantes
   - Chaque tache à une checkbox (toggle) et un bouton supprimer
   - Barrer le texte des taches completees avec `[class.completed]`

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Interface `Todo` definie dans le même fichier ou un fichier separe
- Utiliser `update()` sur le signal pour modifier le tableau (immutabilite)

## Bonus

- Ajouter un filtre : Toutes / Actives / Completees (signal `filter`)
- Ajouter un bouton "Supprimer les completees"

## Fichiers

→ `src/app/exercises/ex03/todo-list.component.ts`
