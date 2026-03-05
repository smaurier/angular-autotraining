# Checklist — Exercice 10

- [ ] L'interface `Product` et les types `SortField`, `SortDirection` sont definis
- [ ] `DataService` est injectable et expose un signal `products` avec des donnees d'exemple
- [ ] `DataService` expose un computed `categories` avec les categories uniques
- [ ] `FilterService` gere un signal `searchTerm` et un signal `selectedCategory`
- [ ] `FilterService` a une methode `reset()` qui remet les filtres a zero
- [ ] `SortService` gere un signal `sortField` et un signal `sortDirection`
- [ ] `SortService.setSort()` inverse la direction si meme champ, sinon met 'asc'
- [ ] `DashboardComponent` injecte les trois services avec `inject()`
- [ ] Un computed `filteredAndSortedProducts` compose filtrage et tri de maniere reactive
- [ ] Le tableau est trie par colonne en cliquant sur les en-tetes
- [ ] Un indicateur visuel montre le champ et la direction de tri
- [ ] Le nombre de resultats est affiche
- [ ] Zero `any` dans le code
- [ ] Bonus : statistiques (prix moyen, note moyenne, par categorie) (si tente)
- [ ] Bonus : filtre de prix min/max (si tente)
