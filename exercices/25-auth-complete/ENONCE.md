# Exercice 25 — Auth complete

**Module** : 11-CI-CD-Auth-Sécurité · **Difficulte** : ⭐⭐⭐⭐
**Duree estimee** : 90 min
**Cours** : `cours/11-cicd-auth-securite/02-auth-jwt.md`, `cours/11-cicd-auth-securite/03-securite.md`

## Objectif

Implementer un système d'authentification complet avec un `AuthService` base sur les signaux, un intercepteur HTTP pour les tokens JWT, un guard de route, et la gestion de routes publiques vs privees avec affichage conditionnel par role.

## Consignes

1. Créer les fichiers dans `src/app/exercises/ex25/`
2. Définir les interfaces dans `models/auth.model.ts` :
   - `User` : `id`, `email`, `name`, `role` (type `'admin' | 'user' | 'guest'`)
   - `LoginRequest` : `email`, `password`
   - `RegisterRequest` : `email`, `password`, `name`
   - `AuthResponse` : `user: User`, `accessToken: string`, `refreshToken: string`
   - `AuthState` : `user: User | null`, `token: string | null`, `isAuthenticated: boolean`, `loading: boolean`
3. Créer le service `AuthService` dans `services/auth.service.ts` :
   - Un signal prive `_state` de type `WritableSignal<AuthState>`
   - Des computed publics : `user`, `isAuthenticated`, `isAdmin`, `loading`, `token`
   - Méthode `login(credentials: LoginRequest): void` — simule un appel API, stocke le token dans `localStorage`, met a jour l'état
   - Méthode `register(data: RegisterRequest): void` — simule l'inscription
   - Méthode `logout(): void` — supprime le token, reinitialise l'état
   - Méthode `checkAuth(): void` — vérifié si un token existe dans `localStorage` au démarrage et restaure la session
   - Utiliser un `effect()` pour synchroniser le token avec `localStorage`
4. Créer l'intercepteur fonctionnel `auth.interceptor.ts` :
   - Ajouter le header `Authorization: Bearer <token>` à chaque requête si un token est present
   - Ne pas ajouter le header pour les routes publiques (`/api/auth/login`, `/api/auth/register`)
   - Intercepter les réponses 401 et appeler `logout()` automatiquement
5. Créer le guard fonctionnel `auth.guard.ts` :
   - `canActivate` : redirige vers `/login` si l'utilisateur n'est pas authentifie
   - Créer un second guard `admin.guard.ts` qui vérifié le role `admin`
6. Configurer les routes dans `ex25.routes.ts` :
   - Routes publiques : `/login`, `/register` (accessibles sans authentification)
   - Routes privees : `/dashboard`, `/profile` (protegees par `authGuard`)
   - Route admin : `/admin` (protegee par `authGuard` + `adminGuard`)
   - Redirection de `/` vers `/dashboard`
7. Créer les composants :
   - `LoginComponent` — formulaire email/password avec réactive forms
   - `DashboardComponent` — page protegee affichant le nom de l'utilisateur
   - `NavbarComponent` — barre de navigation avec affichage conditionnel selon le role :
     - Utilisateur non connecte : liens "Connexion" et "Inscription"
     - Utilisateur connecte : nom, liens prives, bouton "Deconnexion"
     - Admin : lien supplementaire "Administration"
8. Appeler `checkAuth()` dans un `APP_INITIALIZER` ou dans le constructeur de `AppComponent` pour restaurer la session au démarrage

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Tous les signaux exposes doivent etre `readonly` et de type `Signal<T>`
- L'intercepteur doit etre une **fonction** (pas une classe) — style Angular 19+
- Le guard doit etre une **fonction** (pas une classe) — style Angular 19+
- Utiliser `inject()` dans l'intercepteur et le guard

## Bonus

- Ajouter un mécanisme de **refresh token** : quand le token expire (réponse 401), tenter un refresh avant de deconnecter
- Ajouter un **timer** qui deconnecte automatiquement après 30 minutes d'inactivite
- Stocker le token dans un `httpOnly cookie` simule (discussion sur les avantages vs `localStorage`)
- Ajouter un champ `permissions: string[]` sur le modèle `User` et un guard base sur les permissions

## Fichiers

-> `src/app/exercises/ex25/models/auth.model.ts`
-> `src/app/exercises/ex25/services/auth.service.ts`
-> `src/app/exercises/ex25/interceptors/auth.interceptor.ts`
-> `src/app/exercises/ex25/guards/auth.guard.ts`
-> `src/app/exercises/ex25/guards/admin.guard.ts`
-> `src/app/exercises/ex25/ex25.routes.ts`
-> `src/app/exercises/ex25/components/login.component.ts`
-> `src/app/exercises/ex25/components/dashboard.component.ts`
-> `src/app/exercises/ex25/components/navbar.component.ts`
