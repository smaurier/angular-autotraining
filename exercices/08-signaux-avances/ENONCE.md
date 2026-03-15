# Exercice 08 — Signaux avances

**Module** : 02-Signals-Avances · **Difficulte** : ⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/02-signals-avances/01-signaux-avances.md`, `cours/02-signals-avances/02-resource-api.md`

## Objectif

Explorer les APIs avancees des signaux Angular : `linkedSignal` pour la synchronisation réactive, `viewChild` pour acceder au DOM, et `resource()` pour le chargement de donnees asynchrones.

## Consignes

### Partie 1 : linkedSignal (filtre avec reset)
1. Créer `advanced-signals.component.ts` dans `src/app/exercises/ex08/`
2. Declarer un signal `categories` avec les valeurs : `['Tous', 'Livres', 'Films', 'Musique']`
3. Declarer un signal `selectedCategory` initialise a `'Tous'`
4. Declarer un **linkedSignal** `currentPage` lie a `selectedCategory` :
   - Quand `selectedCategory` change, `currentPage` revient automatiquement a `1`
   - L'utilisateur peut modifier `currentPage` manuellement (ex: pagination)
5. Afficher les boutons de categories et un controle de pagination

### Partie 2 : viewChild (focus sur input)
1. Ajouter un `<input>` de recherche dans le template avec une référence `#searchInput`
2. Utiliser `viewChild<ElementRef>('searchInput')` pour obtenir la référence
3. Ajouter un bouton "Focus recherche" qui appelle `searchInput.nativeElement.focus()`

### Partie 3 : resource() (chargement de donnees)
1. Créer un `resource()` qui simule un appel API :
   - Le `request` depend de `selectedCategory` et `currentPage`
   - Le `loader` utilise un `setTimeout` / `Promise` pour simuler un delai
   - Retourner des items fictifs filtres par categorie
2. Afficher les états : chargement, succes, erreur
3. Utiliser `resource.value()`, `resource.isLoading()`, `resource.status()`

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Utiliser `linkedSignal` (pas un simple `effect` pour reset)
- Utiliser `resource()` (pas un appel manuel dans un effect)

## Bonus

- Ajouter un bouton "Recharger" qui appelle `resource.reload()`
- Gérer un état d'erreur en faisant echouer le loader aleatoirement

## Fichiers

→ `src/app/exercises/ex08/advanced-signals.component.ts`
