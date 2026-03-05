# Checklist — Exercice 11 : App multi-pages

- [ ] L'interface `Product` est definie avec des types stricts (pas de `any`)
- [ ] Le fichier de routes `ex11.routes.ts` est cree avec toutes les routes
- [ ] La redirection `''` → `'home'` utilise `pathMatch: 'full'`
- [ ] Le wildcard `**` est positionne en **dernier** dans le tableau de routes
- [ ] Le `LayoutComponent` contient un `<router-outlet />` et une barre de navigation
- [ ] Les liens utilisent `routerLink` (pas de `href` classique)
- [ ] `routerLinkActive="active"` est applique sur les liens de navigation
- [ ] `HomeComponent` affiche un message de bienvenue avec des liens vers les autres pages
- [ ] `ProductListComponent` affiche la liste des produits avec un lien `[routerLink]` vers chaque detail
- [ ] `ProductDetailComponent` utilise `input.required<string>()` pour recuperer le parametre `:id`
- [ ] Un `computed` recherche le produit correspondant a l'id (avec conversion `Number()`)
- [ ] Un message d'erreur s'affiche si le produit n'est pas trouve
- [ ] `AboutComponent` affiche une page statique "A propos"
- [ ] `NotFoundComponent` affiche une page 404 pour les routes inconnues
- [ ] `withComponentInputBinding()` est ajoute a `provideRouter()` dans la configuration
