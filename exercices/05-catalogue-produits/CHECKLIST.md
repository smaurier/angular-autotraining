# Checklist — Exercice 05

- [ ] Le composant `ProductCardComponent` est standalone
- [ ] Le composant `ProductCatalogComponent` est standalone et importe `ProductCardComponent`
- [ ] L'interface `Product` est definie avec `id`, `name`, `price`, `description`, `inStock`
- [ ] L'enfant utilise `input.required<Product>()` pour recevoir un produit
- [ ] L'enfant utilise `output<Product>()` pour emettre l'evenement addToCart
- [ ] Le parent declare un signal `products` avec des donnees d'exemple
- [ ] Le parent declare un signal `cart` de type `Product[]`
- [ ] Un computed `cartCount` retourne le nombre d'articles dans le panier
- [ ] Un computed `cartTotal` retourne le prix total du panier
- [ ] Le template parent utilise `@for` avec `track product.id`
- [ ] Le bouton "Ajouter au panier" est desactive si le produit n'est pas en stock
- [ ] Le resume du panier s'affiche en haut de page
- [ ] Zero `any` dans le code
- [ ] Bonus : champ de recherche pour filtrer les produits (si tente)
