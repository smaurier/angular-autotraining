# Checklist — Exercice 12 : Guards et lazy loading

- [ ] `AuthService` est créé avec les signaux `isLoggedIn` et `isAdmin`
- [ ] `AuthService` expose les méthodes `login()`, `logout()` et `toggleAdmin()`
- [ ] `authGuard` est une **fonction** (pas une classe) typee `CanActivateFn`
- [ ] `authGuard` redirige vers `/login` si l'utilisateur n'est pas connecte
- [ ] `adminGuard` vérifié à la fois l'authentification et le role admin
- [ ] `adminGuard` redirige vers `/unauthorized` si non admin
- [ ] `canDeactivateGuard` appelle `hasUnsavedChanges()` sur le composant
- [ ] L'interface `HasUnsavedChanges` est definie et implementee par `EditProductComponent`
- [ ] La section admin utilise `loadChildren` pour le lazy loading
- [ ] Les routes admin sont dans un fichier separe `admin.routes.ts`
- [ ] `LoginComponent` appelle `AuthService.login()` et redirige vers `/home`
- [ ] `UnauthorizedComponent` affiche un message d'acces refuse
- [ ] `EditProductComponent` détecté les modifications (signal `isDirty`)
- [ ] Les guards utilisent `inject()` pour acceder aux services
- [ ] Les guards retournent `boolean | UrlTree` (pas de `Observable` ou `Promise` inutile)
