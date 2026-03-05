# Checklist — Exercice 14 : CRUD API

- [ ] `json-server` est installe et le fichier `db.json` contient des donnees de test
- [ ] L'interface `Product` est definie avec des types stricts
- [ ] Les types `CreateProduct` et `UpdateProduct` utilisent `Omit` et `Partial`
- [ ] `ProductService` injecte `HttpClient` via `inject()`
- [ ] Les 5 methodes CRUD sont implementees (getAll, getById, create, update, delete)
- [ ] Chaque methode HTTP est typee avec un generic (`get<Product[]>`, etc.)
- [ ] La gestion d'erreur est centralisee dans une methode `handleError`
- [ ] `provideHttpClient()` est configure dans `app.config.ts`
- [ ] `ProductListComponent` affiche les produits dans un tableau
- [ ] Les signaux `loading`, `error`, `products` sont utilises pour l'etat de l'UI
- [ ] `ProductFormComponent` gere la creation ET l'edition via un input optionnel
- [ ] Le formulaire valide les champs (nom requis, prix > 0)
- [ ] La liste est rafraichie apres chaque operation CRUD
- [ ] Un `confirm()` est affiche avant chaque suppression
- [ ] Zero `any` dans tout le code
