# Exercice 14 — CRUD API

**Module** : 06-HTTP-API · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 90 min
**Cours** : `cours/06-http-api/01-httpclient.md`, `cours/03-services-di/01-services-injection.md`

## Objectif

Construire une application CRUD complete communiquant avec une API REST simulee via `json-server`.

## Consignes

1. Créer les fichiers dans `src/app/exercises/ex14/`
2. Installer et configurer `json-server` :
   - Installer : `npm install -D json-server`
   - Créer un fichier `db.json` à la racine du projet avec des produits
   - Script npm : `"api": "json-server --watch db.json --port 3000"`
3. Définir l'interface `Product` dans `models/product.model.ts` :
   - `id` (number), `name` (string), `price` (number), `description` (string), `category` (string)
4. Créer le service `ProductService` dans `services/product.service.ts` :
   - Injecter `HttpClient`
   - Méthode `getAll(): Observable<Product[]>` — GET `/api/products`
   - Méthode `getById(id: number): Observable<Product>` — GET `/api/products/:id`
   - Méthode `create(product: Omit<Product, 'id'>): Observable<Product>` — POST `/api/products`
   - Méthode `update(id: number, product: Partial<Product>): Observable<Product>` — PUT `/api/products/:id`
   - Méthode `delete(id: number): Observable<void>` — DELETE `/api/products/:id`
   - Gestion d'erreur centralisee avec `catchError` dans chaque méthode
5. Créer le composant `ProductListComponent` :
   - Afficher la liste des produits dans un tableau
   - Bouton "Ajouter" qui ouvre le formulaire de création
   - Bouton "Modifier" et "Supprimer" sur chaque ligne
   - Signal `products` pour stocker la liste
   - Signal `loading` pour l'état de chargement
   - Signal `error` pour les messages d'erreur
6. Créer le composant `ProductFormComponent` :
   - Formulaire pour créer / modifier un produit
   - Input pour recevoir un produit existant (mode edition)
   - Output pour emettre le produit sauvegarde
   - Validation des champs (nom requis, prix > 0)
7. Rafraichir la liste après chaque operation CRUD
8. Ajouter un message de confirmation avant la suppression

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Utiliser `Omit<Product, 'id'>` pour le type de création
- Utiliser `Partial<Product>` pour le type de mise a jour
- Configurer `provideHttpClient()` dans la configuration de l'app

## Bonus

- Ajouter une recherche/filtre sur la liste
- Ajouter une pagination (json-server supporte `_page` et `_limit`)
- Ajouter un tri par colonne
- Utiliser `resource()` (Angular 19+) au lieu d'un subscribe explicite pour le chargement initial

## Fichiers

→ `src/app/exercises/ex14/models/product.model.ts`
→ `src/app/exercises/ex14/services/product.service.ts`
→ `src/app/exercises/ex14/product-list.component.ts`
→ `src/app/exercises/ex14/product-form.component.ts`
→ `db.json` (racine du projet)
