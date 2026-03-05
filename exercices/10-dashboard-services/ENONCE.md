# Exercice 10 — Dashboard avec services multiples

**Module** : 03-Services-DI · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/02-signals-avances/01-signaux-avances.md`

## Objectif

Construire un dashboard produit compose de trois services specialises (donnees, filtrage, tri) et de composants qui les consomment via injection de dependances, illustrant la composition de services.

## Consignes

### Interface et types
1. Definir une interface `Product` : `id`, `name`, `price`, `category`, `date` (string ISO), `rating`
2. Definir un type `SortField` : `'name' | 'price' | 'date' | 'rating'`
3. Definir un type `SortDirection` : `'asc' | 'desc'`

### Service 1 : DataService
1. Creer `data.service.ts` dans `src/app/exercises/ex10/`
2. `@Injectable({ providedIn: 'root' })`
3. Exposer un signal `products` avec 8-10 produits d'exemple (categories variees)
4. Methode `getCategories()` : retourne un computed avec la liste des categories uniques

### Service 2 : FilterService
1. Creer `filter.service.ts` dans `src/app/exercises/ex10/`
2. `@Injectable({ providedIn: 'root' })`
3. Signal `searchTerm` de type `string`
4. Signal `selectedCategory` de type `string` (vide = toutes)
5. Methodes `setSearch(term: string)` et `setCategory(category: string)`
6. Methode `reset()` qui remet les filtres a zero

### Service 3 : SortService
1. Creer `sort.service.ts` dans `src/app/exercises/ex10/`
2. `@Injectable({ providedIn: 'root' })`
3. Signal `sortField` de type `SortField` (defaut : `'name'`)
4. Signal `sortDirection` de type `SortDirection` (defaut : `'asc'`)
5. Methode `setSort(field: SortField)` : si meme champ, inverse la direction ; sinon, met le champ avec `'asc'`

### Composant principal DashboardComponent
1. Creer `dashboard.component.ts`
2. Injecter les trois services
3. Creer un **computed** `filteredAndSortedProducts` qui :
   - Filtre par `searchTerm` (sur le nom)
   - Filtre par `selectedCategory`
   - Trie selon `sortField` et `sortDirection`
4. Afficher le nombre de resultats, les filtres actifs, et la liste

### Composants enfants
1. `dashboard-filters.component.ts` : champ de recherche + select de categorie
2. `dashboard-table.component.ts` : tableau des produits avec en-tetes cliquables pour trier

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Chaque service dans son propre fichier
- Utiliser `inject()` partout

## Bonus

- Ajouter un signal `stats` dans DashboardComponent (computed) : prix moyen, note moyenne, nombre par categorie
- Ajouter un filtre de prix (min/max) dans FilterService

## Fichiers

→ `src/app/exercises/ex10/data.service.ts`
→ `src/app/exercises/ex10/filter.service.ts`
→ `src/app/exercises/ex10/sort.service.ts`
→ `src/app/exercises/ex10/dashboard.component.ts`
→ `src/app/exercises/ex10/dashboard-filters.component.ts`
→ `src/app/exercises/ex10/dashboard-table.component.ts`
