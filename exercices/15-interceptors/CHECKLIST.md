# Checklist — Exercice 15 : Interceptors

- [ ] Les 3 intercepteurs sont des **fonctions** typees `HttpInterceptorFn`
- [ ] `authInterceptor` ajoute le header `Authorization: Bearer <token>`
- [ ] `authInterceptor` ne modifie pas la requete si aucun token n'est disponible
- [ ] `authInterceptor` utilise `req.clone()` (requetes immutables)
- [ ] `errorInterceptor` affiche un toast different selon le code HTTP (401, 403, 404, 5xx)
- [ ] `errorInterceptor` re-propage l'erreur avec `throwError`
- [ ] `loadingInterceptor` utilise `finalize()` pour decrementer le compteur
- [ ] `LoadingService` utilise un **compteur** (pas un boolean) pour gerer les requetes paralleles
- [ ] `LoadingService.isLoading` est un `computed` derive du compteur
- [ ] `NotificationService` supprime les notifications apres 4 secondes
- [ ] `GlobalSpinnerComponent` affiche un spinner quand `isLoading()` est true
- [ ] `ToastContainerComponent` affiche les notifications empilees
- [ ] Les intercepteurs sont enregistres avec `withInterceptors()` dans `provideHttpClient()`
- [ ] L'ordre des intercepteurs est correct (auth → loading → error)
- [ ] Zero `any` dans tout le code
