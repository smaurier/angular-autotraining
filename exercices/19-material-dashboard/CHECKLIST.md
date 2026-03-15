# Checklist — Exercice 19

- [ ] Le layout utilise `MatToolbar` + `MatSidenav` avec un bouton hamburger
- [ ] Le sidenav est responsive : mode `side` sur desktop, mode `over` sur mobile (`BreakpointObserver`)
- [ ] Le sidenav contient une `MatNavList` avec au moins 3 liens
- [ ] La `MatTable` affiche les taches avec les colonnes : id, titre, statut, priorite, echeance, actions
- [ ] `MatSort` est branche sur les colonnes titre, statut et date
- [ ] `MatPaginator` est branche avec les options 5/10/25 par page
- [ ] Le champ de filtre fonctionne et filtre la table en temps réel
- [ ] Le `MatDialog` s'ouvre au clic sur "Nouvelle tache" ou "Modifier"
- [ ] Le dialog contient un formulaire avec titre, description, priorite (`MatSelect`), date (`MatDatepicker`)
- [ ] `MatSnackBar` affiche les notifications de succes et de suppression (avec "Annuler")
- [ ] Les 4 `MatCard` de statistiques affichent les bons comptes (total, terminees, en cours, en retard)
- [ ] Les statistiques sont des `computed()` dérivés du signal de taches
- [ ] Les interfaces `Task`, `TaskStatus`, `TaskPriority` sont typees strictement
- [ ] Zero `any` dans le code
- [ ] Bonus : export CSV (si tente)
