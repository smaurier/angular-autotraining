# Exercice 05 — Catalogue produits

**Module** : 01-Composants-Templates · **Difficulte** : ⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/01-composants-templates/01-composants-standalone.md`, `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Creer un catalogue de produits compose de deux composants : un parent qui gere la liste et un enfant qui affiche chaque produit, en utilisant `input()` et `output()`.

## Consignes

1. Creer deux fichiers dans `src/app/exercises/ex05/` :
   - `product-catalog.component.ts` (composant parent)
   - `product-card.component.ts` (composant enfant)
2. Definir une **interface** `Product` :
   - `id` : `number`
   - `name` : `string`
   - `price` : `number`
   - `description` : `string`
   - `inStock` : `boolean`
3. **Composant enfant `ProductCardComponent`** :
   - Recevoir un produit via `input.required<Product>()` (input obligatoire)
   - Emettre un evenement `addToCart` via `output<Product>()` quand on clique sur "Ajouter au panier"
   - Afficher : nom, prix (formate), description, badge "En stock" / "Rupture"
   - Desactiver le bouton si le produit n'est pas en stock
4. **Composant parent `ProductCatalogComponent`** :
   - Declarer un signal `products` avec 4-5 produits d'exemple
   - Declarer un signal `cart` de type `Product[]` (le panier)
   - Creer un computed `cartCount` : nombre d'articles dans le panier
   - Creer un computed `cartTotal` : prix total du panier
   - Iterer avec `@for` sur les produits et afficher un `<app-product-card>` par produit
   - Gerer l'evenement `addToCart` pour ajouter le produit au panier
5. Afficher un resume du panier en haut de page

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Utiliser `input.required()` (pas `@Input()` decorateur)
- Utiliser `output()` (pas `@Output()` decorateur)

## Bonus

- Ajouter une quantite au panier (eviter les doublons, incrementer la quantite)
- Ajouter un champ de recherche pour filtrer les produits par nom

## Fichiers

→ `src/app/exercises/ex05/product-catalog.component.ts`
→ `src/app/exercises/ex05/product-card.component.ts`
