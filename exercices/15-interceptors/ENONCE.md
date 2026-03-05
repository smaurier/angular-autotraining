# Exercice 15 — Interceptors

**Module** : 06-HTTP-API · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/06-http-api/01-httpclient.md`

## Objectif

Ajouter des intercepteurs HTTP fonctionnels a l'application CRUD de l'exercice 14 : authentification, gestion d'erreurs globale et spinner de chargement.

## Consignes

1. Creer les fichiers dans `src/app/exercises/ex15/`
2. Reprendre le `ProductService` de l'exercice 14
3. Creer un **intercepteur d'authentification** `authInterceptor` dans `interceptors/auth.interceptor.ts` :
   - Ajouter un header `Authorization: Bearer <token>` a chaque requete
   - Le token est recupere depuis un service `TokenService` (signal stockant un token simule)
   - Ne pas ajouter le header si pas de token
4. Creer un **intercepteur d'erreurs** `errorInterceptor` dans `interceptors/error.interceptor.ts` :
   - Intercepter les erreurs 4xx et 5xx
   - Afficher un message toast via un `NotificationService`
   - 401 : "Session expiree, veuillez vous reconnecter"
   - 403 : "Acces refuse"
   - 404 : "Ressource introuvable"
   - 500+ : "Erreur serveur, reessayez plus tard"
   - Re-propager l'erreur avec `throwError`
5. Creer un **intercepteur de chargement** `loadingInterceptor` dans `interceptors/loading.interceptor.ts` :
   - Incrementer un compteur dans un `LoadingService` au debut de chaque requete
   - Decrementer a la fin (succes ou erreur) via `finalize()`
   - Le `LoadingService` expose un signal `isLoading` (true si compteur > 0)
6. Creer le `NotificationService` dans `services/notification.service.ts` :
   - Signal `notifications` (tableau de messages)
   - Methode `show(message: string, type: 'success' | 'error' | 'info')`
   - Les notifications disparaissent apres 4 secondes
7. Creer le `LoadingService` dans `services/loading.service.ts` :
   - Signal `requestCount` (number)
   - Computed `isLoading` (true si `requestCount() > 0`)
8. Creer un composant `GlobalSpinnerComponent` qui affiche un spinner quand `isLoading` est true
9. Creer un composant `ToastContainerComponent` qui affiche les notifications
10. Configurer les intercepteurs avec `provideHttpClient(withInterceptors([...]))`

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Les intercepteurs doivent etre des **fonctions** (pas des classes), syntaxe Angular 19+
- Typer `HttpInterceptorFn` pour chaque intercepteur

## Bonus

- Ajouter un intercepteur de **retry** qui retente les requetes echouees (503) jusqu'a 3 fois
- Ajouter un intercepteur de **cache** pour les requetes GET (Map en memoire)
- Logger le temps de chaque requete dans la console

## Fichiers

→ `src/app/exercises/ex15/interceptors/auth.interceptor.ts`
→ `src/app/exercises/ex15/interceptors/error.interceptor.ts`
→ `src/app/exercises/ex15/interceptors/loading.interceptor.ts`
→ `src/app/exercises/ex15/services/token.service.ts`
→ `src/app/exercises/ex15/services/notification.service.ts`
→ `src/app/exercises/ex15/services/loading.service.ts`
→ `src/app/exercises/ex15/components/global-spinner.component.ts`
→ `src/app/exercises/ex15/components/toast-container.component.ts`
