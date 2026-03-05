# Checklist — Exercice 20

- [ ] L'interface `Todo` est definie avec `id: number`, `title: string`, `completed: boolean`
- [ ] `TodoService` utilise un `signal<Todo[]>` comme source de verite
- [ ] Les methodes `add()`, `toggle()`, `delete()`, `filter()` fonctionnent correctement
- [ ] Les computed `activeCount` et `completedCount` retournent les bons comptes
- [ ] `loadFromApi()` charge les todos via HTTP avec `retry(1)` et `catchError`
- [ ] 5 tests unitaires du service passent (add, toggle, delete, filter, compteurs)
- [ ] `TodoListComponent` affiche la liste avec `@for` et le message "Aucun todo" avec `@if`
- [ ] Le formulaire d'ajout fonctionne (input + bouton)
- [ ] 5 tests de composant passent (affichage, ajout, toggle, suppression, etat vide)
- [ ] `fixture.detectChanges()` est appele apres chaque action dans les tests de composant
- [ ] 3 tests HTTP passent (chargement, erreur 500, retry reussi)
- [ ] `provideHttpClientTesting` et `HttpTestingController` sont utilises pour les mocks HTTP
- [ ] `httpMock.verify()` est appele dans `afterEach()`
- [ ] Zero `any` dans le code et les tests — types explicites partout
- [ ] Tous les tests passent (`ng test`)
