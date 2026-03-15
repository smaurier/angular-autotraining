# Exercice 13 — Recherche RxJS

**Module** : 05-RxJS-Essentiel · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/05-rxjs-essentiel/01-observables-et-subscribe.md`

## Objectif

Implementer un champ de recherche réactif utilisant les operateurs RxJS essentiels pour interroger une API simulee.

## Consignes

1. Créer les fichiers dans `src/app/exercises/ex13/`
2. Créer un service `SearchService` dans `services/search.service.ts` :
   - Méthode `search(query: string)` qui retourne un `Observable<SearchResult[]>`
   - Simuler un delai réseau avec `delay(500)`
   - Filtrer un tableau de donnees en dur selon la query
   - Simuler une erreur aleatoire (1 chance sur 5) avec `throwError`
3. Définir l'interface `SearchResult` avec : `id`, `title`, `description`, `category`
4. Créer le composant `SearchComponent` :
   - Un champ `<input>` de recherche
   - Ecouter les frappes clavier avec `fromEvent` ou un `Subject`
   - Appliquer la chaine d'operateurs RxJS :
     - `debounceTime(300)` — attendre 300ms après la dernière frappe
     - `distinctUntilChanged()` — ignorer si la valeur n'a pas change
     - `filter()` — ignorer les requêtes de moins de 2 caracteres
     - `switchMap()` — annuler la requête précédente et lancer la nouvelle
   - Gérer l'état de chargement avec un signal `loading`
   - Gérer les erreurs avec `catchError` et afficher un message
5. Afficher les résultats dans une liste
6. Afficher un indicateur de chargement pendant la recherche
7. Afficher un message "Aucun résultat" si la liste est vide
8. Se desabonner proprement avec `DestroyRef` et `takeUntilDestroyed()`

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Typer tous les operateurs RxJS (pas de `pipe(map((x: any) => ...))`)
- L'observable de recherche doit etre type `Observable<SearchResult[]>`

## Bonus

- Ajouter un compteur de requêtes effectuees
- Ajouter un `retry(2)` avant le `catchError` pour retenter en cas d'erreur
- Afficher le temps de réponse de chaque recherche
- Mettre en surbrillance le terme recherche dans les résultats

## Fichiers

→ `src/app/exercises/ex13/search.component.ts`
→ `src/app/exercises/ex13/services/search.service.ts`
→ `src/app/exercises/ex13/models/search-result.model.ts`
