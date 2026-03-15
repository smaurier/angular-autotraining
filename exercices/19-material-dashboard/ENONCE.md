# Exercice 19 — Material Dashboard

**Module** : 08-Angular-Material · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/08-angular-material/01-setup-et-theming.md`, `cours/08-angular-material/02-composants-courants.md`

## Objectif

Construire un tableau de bord complet de gestion de taches en utilisant les composants Angular Material : toolbar, sidenav responsive, table avec tri/pagination, dialog, snackbar et cards de statistiques.

## Consignes

1. **Layout principal** : créer un composant `DashboardComponent` dans `src/app/exercises/ex19/` avec :
   - `MatToolbar` : titre de l'application + bouton menu hamburger
   - `MatSidenav` : menu lateral responsive (ouvert sur desktop, ferme sur mobile via `BreakpointObserver`)
   - Le sidenav contient une `MatNavList` avec 3 liens : "Tableau de bord", "Taches", "Parametres"
2. **Table de taches** : créer un composant `TaskTableComponent` avec :
   - `MatTable` alimentee par un `MatTableDataSource<Task>`
   - Colonnes : id, titre, statut (badge colore), priorite, date d'echeance, actions
   - `MatSort` sur les colonnes titre, statut et date
   - `MatPaginator` avec 5/10/25 éléments par page
   - Un champ `<input matInput>` au-dessus de la table pour filtrer les taches
3. **Dialog création/edition** : créer un composant `TaskDialogComponent` avec :
   - `MatDialog` qui s'ouvre au clic sur "Nouvelle tache" ou "Modifier"
   - Formulaire réactif avec : titre (`MatFormField`), description (`MatFormField textarea`), priorite (`MatSelect`), date d'echeance (`MatDatepicker`)
   - Boutons "Annuler" et "Sauvegarder" dans `mat-dialog-actions`
4. **Notifications** : utiliser `MatSnackBar` pour afficher :
   - "Tache créée avec succes" (duree : 3s)
   - "Tache supprimee" avec un bouton "Annuler" (duree : 5s)
   - "Erreur lors de la sauvegarde" en cas d'echec
5. **Cards de statistiques** : afficher 4 `MatCard` en haut du dashboard :
   - Total des taches (icone `assignment`)
   - Taches terminees (icone `check_circle`, couleur verte)
   - Taches en cours (icone `pending`, couleur orange)
   - Taches en retard (icone `warning`, couleur rouge)
   - Les valeurs sont des `computed()` dérivés du signal de taches
6. **Theme personnalise** : configurer un theme Material avec :
   - Couleur primaire personnalisee (ex : indigo)
   - Couleur d'accentuation (ex : pink)
   - Appliquer le theme via `@use '@angular/material' as mat` dans les styles globaux

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Interface `Task` avec tous les champs types (`id: number`, `title: string`, `status: TaskStatus`, `priority: TaskPriority`, etc.)
- Types `TaskStatus = 'todo' | 'in_progress' | 'done'` et `TaskPriority = 'low' | 'medium' | 'high'`

## Bonus

- Exporter les donnees de la table en fichier CSV via un bouton "Exporter"
- Ajouter un `MatProgressBar` indeterminate pendant le chargement initial des taches

## Fichiers

-> `src/app/exercises/ex19/dashboard.component.ts`
-> `src/app/exercises/ex19/task-table.component.ts`
-> `src/app/exercises/ex19/task-dialog.component.ts`
-> `src/app/exercises/ex19/task.model.ts`
-> `src/app/exercises/ex19/task.service.ts`
