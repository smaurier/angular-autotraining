# Checklist — Exercice 13b : RxJS vs Signals

- [ ] Le `SearchService` de l'exercice 13 est reutilise (pas de duplication)
- [ ] `SearchRxjsComponent` utilise **uniquement** RxJS (pas de signaux)
- [ ] Les resultats RxJS sont affiches avec le pipe `async`
- [ ] `SearchSignalsComponent` utilise `signal()` pour le terme de recherche
- [ ] `toObservable()` convertit le signal en observable pour les operateurs RxJS
- [ ] `toSignal()` convertit le resultat final en signal pour le template
- [ ] `toSignal()` a une `initialValue` pour eviter le type `undefined`
- [ ] Les deux versions ont le meme comportement (debounce, annulation, erreurs)
- [ ] Le composant parent affiche les deux versions cote a cote
- [ ] Un tableau comparatif est present sous les deux recherches
- [ ] Le desabonnement est gere correctement dans les deux versions
- [ ] Zero `any` dans tout le code
