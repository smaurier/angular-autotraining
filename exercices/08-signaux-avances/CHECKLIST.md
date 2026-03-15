# Checklist — Exercice 08

- [ ] Le composant `AdvancedSignalsComponent` est standalone
- [ ] Un signal `selectedCategory` est declare avec des categories
- [ ] Un `linkedSignal` `currentPage` se reinitialise a 1 quand la categorie change
- [ ] La pagination fonctionne manuellement (précédent/suivant)
- [ ] `viewChild` est utilise pour obtenir la référence de l'input de recherche
- [ ] Le bouton "Focus recherche" donne le focus a l'input via `nativeElement.focus()`
- [ ] Un `resource()` charge des donnees fictives de manière asynchrone
- [ ] Le `resource` se recharge automatiquement quand la categorie ou la page change
- [ ] L'état de chargement est affiche (`isLoading`)
- [ ] L'état d'erreur est géré dans le template
- [ ] Les items charges sont affiches dans une liste
- [ ] Zero `any` dans le code
- [ ] Bonus : bouton "Recharger" avec `resource.reload()` (si tente)
- [ ] Bonus : erreur aleatoire simulee (si tente)
