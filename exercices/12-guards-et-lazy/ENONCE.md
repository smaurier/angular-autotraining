# Exercice 12 — Guards et lazy loading

**Module** : 04-Routing · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/04-routing/01-routing-base.md`, `cours/04-routing/02-route-params.md`

## Objectif

Ajouter des guards fonctionnels et du lazy loading a l'application multi-pages de l'exercice 11.

## Consignes

1. Reprendre l'application de l'exercice 11 dans `src/app/exercises/ex12/`
2. Creer un service `AuthService` dans `services/auth.service.ts` :
   - Signal `isLoggedIn` (boolean, initialise a `false`)
   - Signal `isAdmin` (boolean, initialise a `false`)
   - Methode `login()` qui passe `isLoggedIn` a `true`
   - Methode `logout()` qui remet tout a `false`
   - Methode `toggleAdmin()` qui bascule le role admin
3. Creer un **guard fonctionnel** `authGuard` dans `guards/auth.guard.ts` :
   - Verifie que l'utilisateur est connecte via `AuthService`
   - Redirige vers `/login` si non connecte
4. Creer un **guard fonctionnel** `adminGuard` dans `guards/admin.guard.ts` :
   - Verifie que l'utilisateur est admin via `AuthService`
   - Redirige vers `/unauthorized` si non admin
5. Creer un **guard fonctionnel** `canDeactivateGuard` dans `guards/can-deactivate.guard.ts` :
   - Verifie si un formulaire a des modifications non sauvegardees
   - Affiche un `confirm()` pour demander confirmation avant de quitter
6. Creer une section admin **lazy-loaded** :
   - `admin.routes.ts` avec des routes enfants (`loadChildren`)
   - `AdminDashboardComponent` comme page principale
   - `AdminUsersComponent` comme sous-page
7. Creer les pages supplementaires :
   - `LoginComponent` — formulaire de connexion simple (bouton login)
   - `UnauthorizedComponent` — message d'acces refuse
   - `EditProductComponent` — formulaire avec `canDeactivate` guard
8. Appliquer les guards dans la configuration des routes :
   - `authGuard` sur les routes protegees (edit product)
   - `adminGuard` sur la section admin
   - `canDeactivateGuard` sur le formulaire d'edition

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Les guards doivent etre des **fonctions** (pas des classes), syntaxe Angular 19+
- Typer le retour des guards : `boolean | UrlTree`

## Bonus

- Ajouter un `RoleGuard` generique qui accepte un parametre de role
- Implementer un vrai formulaire reactif dans `EditProductComponent`
- Ajouter un `canMatch` guard pour masquer completement les routes admin aux non-admins

## Fichiers

→ `src/app/exercises/ex12/services/auth.service.ts`
→ `src/app/exercises/ex12/guards/auth.guard.ts`
→ `src/app/exercises/ex12/guards/admin.guard.ts`
→ `src/app/exercises/ex12/guards/can-deactivate.guard.ts`
→ `src/app/exercises/ex12/pages/login.component.ts`
→ `src/app/exercises/ex12/pages/unauthorized.component.ts`
→ `src/app/exercises/ex12/pages/edit-product.component.ts`
→ `src/app/exercises/ex12/admin/admin-dashboard.component.ts`
→ `src/app/exercises/ex12/admin/admin-users.component.ts`
→ `src/app/exercises/ex12/admin/admin.routes.ts`
→ `src/app/exercises/ex12/ex12.routes.ts`
