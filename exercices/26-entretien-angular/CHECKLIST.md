# Checklist — Exercice 26 : Entretien Angular

## QCM

- [ ] Les 20 questions ont ete lues et les reponses notees AVANT de consulter la correction
- [ ] Le score a ete calcule et le bareme consulte
- [ ] Les questions ratees ont ete identifiees et les cours correspondants relus
- [ ] Capable d'expliquer pourquoi chaque reponse incorrecte est fausse

## LC1 — Compteur (5 min)

- [ ] Le signal `count` est cree avec `signal<number>(0)`
- [ ] Le computed `doubleCount` retourne `count() * 2`
- [ ] Le computed `isEven` retourne "Pair" ou "Impair"
- [ ] Les boutons +1, -1 et Reset fonctionnent correctement
- [ ] Realise en moins de 5 minutes

## LC2 — Recherche debounce (10 min)

- [ ] Le signal `searchTerm` est mis a jour a chaque frappe
- [ ] `toObservable()` convertit le signal en Observable
- [ ] `debounceTime(300)` et `distinctUntilChanged()` sont appliques dans le pipe
- [ ] `toSignal()` reconvertit le resultat en signal avec `{ initialValue: '' }`
- [ ] Le computed `filteredProducts` filtre sur le terme debouncé (pas le terme brut)
- [ ] Realise en moins de 10 minutes

## LC3 — Service CRUD (10 min)

- [ ] Le signal `_products` est prive et de type `WritableSignal<Product[]>`
- [ ] Le signal est expose en lecture seule via `.asReadonly()`
- [ ] `add()` utilise le spread operator pour creer un nouveau tableau
- [ ] `update()` utilise `map()` + spread pour modifier un element de maniere immutable
- [ ] `delete()` utilise `filter()` pour supprimer un element
- [ ] `getById()` retourne un `computed` (pas une valeur statique)
- [ ] Les types utilitaires (`Omit`, `Partial`) sont utilises pour le typage
- [ ] Realise en moins de 10 minutes

## Qualite globale

- [ ] Zero `any` dans tous les exercices
- [ ] Tous les signaux sont types explicitement
- [ ] Tous les concepts ont ete mis en pratique au moins une fois dans la formation
