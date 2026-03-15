# Checklist — Exercice 10

- [ ] L'interface `Product` et les types `SortField`, `SortDirection` sont définis
- [ ] `DataService` est injectable et expose un signal `products` avec des donnees d'exemple
- [ ] `DataService` expose un computed `categories` avec les categories uniques
- [ ] `FilterService` géré un signal `searchTerm` et un signal `selectedCategory`
- [ ] `FilterService` à une méthode `reset()` qui remet les filtres a zero
- [ ] `SortService` géré un signal `sortField` et un signal `sortDirection`
- [ ] `SortService.setSort()` inverse la direction si même champ, sinon met 'asc'
- [ ] `DashboardComponent` injecte les trois services avec `inject()`
- [ ] Un computed `filteredAndSortedProducts` compose filtrage et tri de manière réactive
- [ ] Le tableau est trie par colonne en cliquant sur les en-tetes
- [ ] Un indicateur visuel montre le champ et la direction de tri
- [ ] Le nombre de résultats est affiche
- [ ] Zero `any` dans le code
- [ ] Bonus : statistiques (prix moyen, note moyenne, par categorie) (si tente)
- [ ] Bonus : filtre de prix min/max (si tente)
