# Exercice 13b — RxJS vs Signals

**Module** : 05-RxJS-Essentiel · **Difficulte** : ⭐⭐
**Duree estimee** : 45 min
**Cours** : `cours/05-rxjs-essentiel/01-observables-et-subscribe.md`, `cours/02-signals-avances/01-signaux-avances.md`

> **Exercice de renforcement** — Compare deux approches pour une meme fonctionnalite.

## Objectif

Implementer la meme fonctionnalite de recherche de deux manieres differentes (RxJS pur vs Signals) pour comprendre quand utiliser chaque approche.

## Consignes

1. Creer les fichiers dans `src/app/exercises/ex13b/`
2. Reutiliser le `SearchService` de l'exercice 13
3. Creer **deux composants** cote a cote :

### Version A — RxJS pur (`SearchRxjsComponent`)
4. Utiliser un `Subject` pour les frappes clavier
5. Chaine complete : `debounceTime` → `distinctUntilChanged` → `switchMap`
6. Afficher les resultats avec le pipe `async` dans le template
7. Le composant ne doit **pas utiliser de signaux**
8. Stocker l'observable de resultats dans une propriete `results$`

### Version B — Signals (`SearchSignalsComponent`)
9. Utiliser un `signal()` pour le terme de recherche
10. Utiliser `toSignal()` pour convertir l'observable en signal
11. Utiliser `effect()` ou `computed()` + `toObservable()` pour declencher la recherche
12. Gerer le debounce avec `toObservable()` + operateurs RxJS + `toSignal()`
13. Afficher les resultats avec des signaux (pas de pipe `async`)

### Comparaison
14. Creer un composant parent `ComparisonComponent` qui affiche les deux versions cote a cote
15. Ajouter un tableau HTML comparatif sous les deux recherches :
    - Nombre de lignes de code
    - Lisibilite
    - Gestion du desabonnement
    - Performance

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Les deux versions doivent avoir exactement le meme comportement fonctionnel
- Utiliser `toSignal()` et `toObservable()` pour l'interop

## Bonus

- Mesurer le temps de rendu de chaque version avec `performance.now()`
- Ajouter une troisieme version avec `resource()` (Angular 19+)
- Documenter dans un commentaire quand preferer RxJS vs Signals

## Fichiers

→ `src/app/exercises/ex13b/comparison.component.ts`
→ `src/app/exercises/ex13b/search-rxjs.component.ts`
→ `src/app/exercises/ex13b/search-signals.component.ts`
