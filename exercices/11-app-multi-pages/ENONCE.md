# Exercice 11 — App multi-pages

**Module** : 04-Routing · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/04-routing/01-routing-base.md`, `cours/04-routing/02-route-params.md`

## Objectif

Construire une application multi-pages complete avec navigation, paramètres de route et gestion des pages introuvables.

## Consignes

1. Créer la structure de fichiers dans `src/app/exercises/ex11/`
2. Définir les **5 pages** suivantes comme composants standalone :
   - `HomeComponent` — page d'accueil avec un message de bienvenue et des liens vers les autres pages
   - `ProductListComponent` — affiche une liste de produits (donnees en dur dans un signal)
   - `ProductDetailComponent` — affiche le detail d'un produit selon le paramètre `:id` dans l'URL
   - `AboutComponent` — page "A propos" statique
   - `NotFoundComponent` — page 404 affichee pour les routes inconnues
3. Configurer le fichier de routes `ex11.routes.ts` :
   - `/` → `HomeComponent`
   - `/products` → `ProductListComponent`
   - `/products/:id` → `ProductDetailComponent`
   - `/about` → `AboutComponent`
   - `**` → `NotFoundComponent`
4. Créer un composant `LayoutComponent` qui contient :
   - Une barre de navigation avec des `routerLink` vers Home, Products et About
   - Un `<router-outlet>` pour afficher les pages
5. Utiliser `routerLinkActive` pour styler le lien actif (classe CSS `active`)
6. Dans `ProductDetailComponent`, récupérer le paramètre `:id` via la nouvelle API `input()` (Angular 19+) :
   ```typescript
   readonly id = input.required<string>();
   ```
7. Utiliser le `id` pour trouver le produit correspondant dans un signal computed
8. Afficher un message d'erreur si le produit n'est pas trouve
9. Dans `ProductListComponent`, chaque produit doit avoir un `routerLink` vers sa page de detail

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Définir une interface `Product` avec au minimum : `id`, `name`, `price`, `description`
- Typer toutes les routes avec `Routes` importe de `@angular/router`

## Bonus

- Ajouter un **breadcrumb** dynamique base sur les donnees de route (`data` dans la config)
- Ajouter des animations de transition entre les pages avec `@angular/animations`
- Implementer un `resolver` pour pre-charger le produit avant d'afficher la page detail

## Fichiers

→ `src/app/exercises/ex11/layout.component.ts`
→ `src/app/exercises/ex11/pages/home.component.ts`
→ `src/app/exercises/ex11/pages/product-list.component.ts`
→ `src/app/exercises/ex11/pages/product-detail.component.ts`
→ `src/app/exercises/ex11/pages/about.component.ts`
→ `src/app/exercises/ex11/pages/not-found.component.ts`
→ `src/app/exercises/ex11/ex11.routes.ts`
→ `src/app/exercises/ex11/models/product.model.ts`
→ `src/app/exercises/ex11/data/products.data.ts`
