# Checklist — Exercice 08

- [ ] Le composant `AdvancedSignalsComponent` est standalone
- [ ] Un signal `selectedCategory` est declare avec des categories
- [ ] Un `linkedSignal` `currentPage` se reinitialise a 1 quand la categorie change
- [ ] La pagination fonctionne manuellement (precedent/suivant)
- [ ] `viewChild` est utilise pour obtenir la reference de l'input de recherche
- [ ] Le bouton "Focus recherche" donne le focus a l'input via `nativeElement.focus()`
- [ ] Un `resource()` charge des donnees fictives de maniere asynchrone
- [ ] Le `resource` se recharge automatiquement quand la categorie ou la page change
- [ ] L'etat de chargement est affiche (`isLoading`)
- [ ] L'etat d'erreur est gere dans le template
- [ ] Les items charges sont affiches dans une liste
- [ ] Zero `any` dans le code
- [ ] Bonus : bouton "Recharger" avec `resource.reload()` (si tente)
- [ ] Bonus : erreur aleatoire simulee (si tente)
