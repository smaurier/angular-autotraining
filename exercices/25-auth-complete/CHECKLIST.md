# Checklist — Exercice 25 : Auth complete

## Modeles

- [ ] L'interface `User` inclut `id`, `email`, `name` et `role` (union literal `'admin' | 'user' | 'guest'`)
- [ ] Les interfaces `LoginRequest`, `RegisterRequest`, `AuthResponse` et `AuthState` sont definies
- [ ] `AuthState` contient `user`, `token`, `isAuthenticated` et `loading`

## AuthService

- [ ] Le signal `_state` est prive et de type `WritableSignal<AuthState>`
- [ ] Les signaux publics (`user`, `isAuthenticated`, `isAdmin`, `loading`, `token`) sont des `computed` en lecture seule
- [ ] La méthode `login()` met a jour l'état et redirige vers `/dashboard`
- [ ] La méthode `logout()` reinitialise l'état et redirige vers `/login`
- [ ] La méthode `checkAuth()` restaure la session depuis `localStorage`
- [ ] Un `effect()` synchronise le token avec `localStorage`

## Intercepteur

- [ ] L'intercepteur est une **fonction** (pas une classe) de type `HttpInterceptorFn`
- [ ] Le header `Authorization: Bearer <token>` est ajoute aux requêtes authentifiees
- [ ] Les URLs publiques (`/api/auth/login`, `/api/auth/register`) sont exclues
- [ ] La requête est clonee avec `req.clone()` (pas de mutation directe)
- [ ] Les réponses 401 declenchent un `logout()` automatique

## Guards

- [ ] `authGuard` est une fonction de type `CanActivateFn`
- [ ] `authGuard` redirige vers `/login` si non authentifie (via `createUrlTree`)
- [ ] `adminGuard` vérifié le role `admin` en plus de l'authentification
- [ ] `adminGuard` redirige vers `/dashboard` si l'utilisateur n'est pas admin

## Routes

- [ ] Les routes publiques (`/login`, `/register`) n'ont pas de guard
- [ ] Les routes privees (`/dashboard`, `/profile`) sont protegees par `authGuard`
- [ ] La route `/admin` est protegee par `authGuard` ET `adminGuard`
- [ ] Le lazy loading est utilise (`loadComponent`)

## Composants

- [ ] `LoginComponent` utilise un formulaire réactif avec validation
- [ ] `NavbarComponent` affiche un contenu différent selon l'état d'authentification
- [ ] Le lien "Administration" n'est visible que pour les admins
- [ ] `checkAuth()` est appele au démarrage de l'application

## Qualite

- [ ] Zero `any` dans le code
- [ ] Tous les signaux exposes sont `readonly` et de type `Signal<T>`
