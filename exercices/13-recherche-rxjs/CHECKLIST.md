# Checklist — Exercice 13 : Recherche RxJS

- [ ] L'interface `SearchResult` est definie avec des types stricts
- [ ] `SearchService.search()` retourne un `Observable<SearchResult[]>`
- [ ] Le service simule un delai reseau avec `delay()`
- [ ] Le service simule des erreurs aleatoires avec `throwError()`
- [ ] Un `Subject<string>` est utilise pour emettre les termes de recherche
- [ ] `debounceTime(300)` est applique pour eviter les requetes excessives
- [ ] `distinctUntilChanged()` empeche les requetes en double
- [ ] `filter()` ignore les requetes de moins de 2 caracteres
- [ ] `switchMap()` annule la requete precedente quand une nouvelle arrive
- [ ] `catchError()` est place dans le pipe **interne** (dans le `switchMap`)
- [ ] Un signal `loading` affiche un indicateur de chargement
- [ ] Un signal `error` affiche les messages d'erreur
- [ ] Un message "Aucun resultat" s'affiche si la liste est vide
- [ ] `takeUntilDestroyed()` assure le desabonnement a la destruction du composant
- [ ] Zero `any` dans tout le code
