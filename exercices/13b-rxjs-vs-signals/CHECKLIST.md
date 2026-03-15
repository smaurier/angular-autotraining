# Checklist — Exercice 13b : RxJS vs Signals

- [ ] Le `SearchService` de l'exercice 13 est reutilise (pas de duplication)
- [ ] `SearchRxjsComponent` utilise **uniquement** RxJS (pas de signaux)
- [ ] Les résultats RxJS sont affiches avec le pipe `async`
- [ ] `SearchSignalsComponent` utilise `signal()` pour le terme de recherche
- [ ] `toObservable()` convertit le signal en observable pour les operateurs RxJS
- [ ] `toSignal()` convertit le résultat final en signal pour le template
- [ ] `toSignal()` à une `initialValue` pour éviter le type `undefined`
- [ ] Les deux versions ont le même comportement (debounce, annulation, erreurs)
- [ ] Le composant parent affiche les deux versions cote a cote
- [ ] Un tableau comparatif est present sous les deux recherches
- [ ] Le desabonnement est géré correctement dans les deux versions
- [ ] Zero `any` dans tout le code
