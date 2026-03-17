# Parcours de formation Angular 19+ (pour développeurs Vue 3)

> **Philosophie** : Ce parcours est concu pour un développeur Vue 3 souhaitant maîtriser Angular 19+
> avec les pratiques modernes (standalone, Signals, `@if`/`@for`, SSR).
> Chaque cours est une brique autonome, chaque exercice consolide les acquis.
>
> **Ce cours se fait APRES Vue (03).** Malgre le numéro 09, l'ordre pedagogique est 03-Vue → 09-Angular → 08-React. Après ce cours, tu passeras a React (08).

---

## Principes de science cognitive appliques

Ce parcours s'appuie sur des principes issus de la recherche en apprentissage :

| Principe | Application dans ce parcours |
|---|---|
| **1 cours = 1 session** | Ne faites jamais deux cours le même jour. Votre cerveau a besoin de sommeil pour consolider. |
| **24h minimum entre deux cours** | Laissez une nuit entre chaque session. La mémoire se forme pendant le repos. |
| **Tentez avant de regarder la solution** | Pour chaque exercice, essayez pendant **au moins 20 minutes** avant de consulter la correction. L'effort de récupération renforce la mémoire. |
| **Révision espacee** | Revisez chaque cours a J+1, J+7 et J+30. Trois passages suffisent pour ancrer durablement. |
| **Interleaving (entrelacement)** | Alternez théorie et pratique. Ne faites pas 5 cours d'affilee sans exercice. |
| **Elaboration** | Reformulez chaque concept avec vos propres mots. Expliquez-le à un collegue (réel ou imaginaire). |

---

## Vue d'ensemble des modules

| # | Module | Cours | Exercices | Duree estimee |
|---|--------|-------|-----------|---------------|
| 00 | De Vue a Angular | 3 | 1 | ~3h30 |
| 01 | Composants & Templates | 7 | 6 | ~10h |
| 02 | Signals avances | 3 | 1 | ~4h |
| 03 | Services & DI | 3 | 2 | ~4h30 |
| 04 | Routing | 4 | 2 | ~5h |
| 05 | RxJS Essentiel | 5 | 2 + 1 bonus | ~5h30 |
| 06 | HTTP & API | 3 | 2 | ~4h30 |
| 07 | Formulaires | 4 | 3 | ~6h |
| 08 | Angular Material | 3 | 2 + 1 bonus | ~5h |
| 09 | Tests | 2 | 1 | ~3h |
| 10 | State Management | 3 | 2 | ~4h30 |
| 11 | Auth (spécifique Angular) | 1 | 1 | ~2h |
| 12 | Recettes ESN | 2 | 1 | ~3h |
| | **TOTAL** | **43** | **27** | **~60h** |

---

## Detail des modules

### Module 00 -- De Vue a Angular (3 cours, 1 exercice)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Modèle mental : de Vue a Angular | Framework vs ecosysteme, CLI, decorateurs, DI |
| 02 | Equivalences Vue / Angular | Tableau complet ref/signal, props/input, etc. |
| 03 | Premier projet Angular | `ng new`, structure, premier composant standalone |
| Ex01 | HelloComponent | Créer un composant, l'afficher, ajouter un signal |

Quizzes :
- `quizzes/quiz-00-01-vue-vs-angular-mental-model.html`
- `quizzes/quiz-00-02-equivalences-vue-angular.html`
- `quizzes/quiz-00-03-premier-projet-angular.html`

### Module 01 -- Composants & Templates (7 cours, 6 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Anatomie d'un composant standalone | @Component, template, styles, imports |
| 02 | Template syntax : interpolation & bindings | `{{ }}`, `[attr]`, `(event)` |
| 03 | Control flow : @if, @else, @switch | Nouvelle syntaxe de templates |
| 04 | Control flow : @for et track | Boucles, track obligatoire, @empty |
| 05 | Input / Output : communication parent-enfant | `input()`, `output()`, `model()` |
| 06 | Projeter du contenu avec ng-content | Slots nommes, content projection |
| 07 | Cycle de vie et afterRender | OnInit, OnDestroy, afterNextRender |

Quizzes :
- `quizzes/quiz-01-01-composants-standalone.html`
- `quizzes/quiz-01-02-signaux-base.html`
- `quizzes/quiz-01-03-control-flow.html`
- `quizzes/quiz-01-04-binding-et-events.html`
- `quizzes/quiz-01-05-input-output-model.html`
- `quizzes/quiz-01-06-lifecycle-hooks.html`
- `quizzes/quiz-01-07-pipes-et-directives.html`

### Module 02 -- Signals avances (3 cours, 1 exercice)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | signal, computed, effect en profondeur | Graphe réactif, egalite, untracked |
| 02 | linkedSignal et resource | Signals dérivés, chargement async |
| 03 | Patterns avances | Signaux en services, state local, bonnes pratiques |

Quizzes :
- `quizzes/quiz-02-01-signaux-avances.html`
- `quizzes/quiz-02-02-resource-api.html`
- `quizzes/quiz-02-03-patterns-signaux.html`

### Module 03 -- Services & DI (3 cours, 2 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Services et inject() | providedIn, injection hiérarchique |
| 02 | InjectionToken et providers avances | Tokens, useFactory, useValue |
| 03 | Patterns DI en entreprise | Multi-providers, injection conditionnelle |

Quizzes :
- `quizzes/quiz-03-01-services-et-injectable.html`
- `quizzes/quiz-03-02-providers-et-scopes.html`
- `quizzes/quiz-03-03-injection-tokens.html`

### Module 04 -- Routing (4 cours, 2 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Configuration des routes | Routes, RouterOutlet, lazy loading |
| 02 | Navigation et paramètres | routerLink, ActivatedRoute, queryParams |
| 03 | Guards et resolvers | canActivate, resolve, redirections |
| 04 | Layouts et routes imbriquees | Routes enfants, layouts partages |

Quizzes :
- `quizzes/quiz-04-01-routing-basique.html`
- `quizzes/quiz-04-02-parametres-et-data.html`
- `quizzes/quiz-04-03-guards-et-protection.html`
- `quizzes/quiz-04-04-lazy-loading.html`

### Module 05 -- RxJS Essentiel (4 cours, 2 + 1 bonus exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Observable, Observer, Subscription | Le modèle push, subscribe/unsubscribe |
| 02 | Operateurs de transformation | map, filter, switchMap, mergeMap |
| 03 | Gestion du cycle de vie | takeUntilDestroyed, async pipe |
| 04 | Patterns RxJS courants | debounceTime, distinctUntilChanged, combineLatest |
| 05 | Error handling et testing RxJS | catchError, retry, marble testing, TestScheduler |

Quizzes :
- `quizzes/quiz-05-01-observables-et-subscribe.html`
- `quizzes/quiz-05-02-operators-courants.html`
- `quizzes/quiz-05-03-patterns-async.html`
- `quizzes/quiz-05-04-interop-signals-rxjs.html`
- `quizzes/quiz-05-05-error-handling-testing.html`

### Module 06 -- HTTP & API (3 cours, 2 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | HttpClient et requêtes REST | GET, POST, PUT, DELETE, typage |
| 02 | Interceptors fonctionnels | Auth token, logging, retry |
| 03 | Gestion d'erreurs et cache | catchError, retry, stratégies de cache |

Quizzes :
- `quizzes/quiz-06-01-httpclient-crud.html`
- `quizzes/quiz-06-02-interceptors.html`
- `quizzes/quiz-06-03-error-handling-et-cache.html`

### Module 07 -- Formulaires (4 cours, 3 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Reactive Forms : les bases | FormControl, FormGroup, FormBuilder |
| 02 | Validation synchrone et asynchrone | Validators, custom validators |
| 03 | FormArray et formulaires dynamiques | Listes, ajout/suppression dynamique |
| 04 | Bonnes pratiques formulaires | Typage strict, helpers, UX |

Quizzes :
- `quizzes/quiz-07-01-template-driven-forms.html`
- `quizzes/quiz-07-02-reactive-forms.html`
- `quizzes/quiz-07-03-signal-forms.html`
- `quizzes/quiz-07-04-patterns-formulaires.html`

### Module 08 -- Angular Material (3 cours, 2 + 1 bonus exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Installation et theming | Palette, typographie, dark mode |
| 02 | Composants courants | Table, Dialog, Snackbar, Form fields |
| 03 | CDK et composants avances | Drag & drop, virtual scroll, overlay |

Quizzes :
- `quizzes/quiz-08-01-setup-et-theming.html`
- `quizzes/quiz-08-02-composants-courants.html`
- `quizzes/quiz-accessibilite-cdk-a11y.html`

### Module 09 -- Tests (2 cours, 1 exercice)

> Les fondamentaux du testing (describe/it/expect, mocking, Playwright E2E) sont couverts dans la formation Vue. Ce module se concentre sur les specificites Angular.

| # | Cours | Contenu clé |
|---|-------|-------------|
| 02 | Tester les composants | TestBed, ComponentFixture, queries |
| 03 | Tester les services et HTTP | HttpTestingController, mocks |

Quizzes :
- `quizzes/quiz-09-02-tests-composants.html`
- `quizzes/quiz-09-03-tests-http-et-di.html`

### Module 10 -- State Management (3 cours, 2 exercices)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | État local avec Signals | Patterns signal-based, state services |
| 02 | NgRx SignalStore | Stores, features, entites |
| 03 | Patterns avances d'état | Optimistic updates, cache, sync |

Quizzes :
- `quizzes/quiz-10-01-state-avec-services.html`
- `quizzes/quiz-10-02-ngrx-signal-store.html`
- `quizzes/quiz-10-03-quand-utiliser-quoi.html`

### Module 11 -- Auth (spécifique Angular) (1 cours, 1 exercice)

> Le pipeline CI/CD (GitHub Actions) et la sécurité front-end (XSS, CSP) sont couverts dans la formation Vue. Ce module se concentre sur l'implementation Angular de l'authentification.

| # | Cours | Contenu clé |
|---|-------|-------------|
| 02 | Authentification JWT | Login, guards, interceptors auth |

Quizzes :
- `quizzes/quiz-11-02-auth-jwt-guards.html`

### Module 12 -- Recettes ESN (2 cours, 1 exercice)

| # | Cours | Contenu clé |
|---|-------|-------------|
| 01 | Architecture et conventions d'entreprise | Monorepo, feature modules, coding style |
| 02 | Performance et optimisation | Lazy loading, bundle size, OnPush, SSR |

Quizzes :
- `quizzes/quiz-12-01-patterns-esn.html`
- `quizzes/quiz-12-02-entretien-technique.html`
- `quizzes/quiz-defer-zoneless.html`

---

## Tracker de révision

Utilisez ce tableau pour suivre vos revisions espacees. Cochez chaque case après révision.

| Module | Cours | Date 1ere lecture | J+1 | J+7 | J+30 |
|--------|-------|-------------------|-----|-----|------|
| 00 | 01 - Modèle mental | ____/____/____ | [ ] | [ ] | [ ] |
| 00 | 02 - Equivalences | ____/____/____ | [ ] | [ ] | [ ] |
| 00 | 03 - Premier projet | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 01 - Anatomie composant | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 02 - Template syntax | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 03 - @if @else @switch | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 04 - @for et track | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 05 - Input / Output | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 06 - ng-content | ____/____/____ | [ ] | [ ] | [ ] |
| 01 | 07 - Cycle de vie | ____/____/____ | [ ] | [ ] | [ ] |
| 02 | 01 - signal, computed, effect | ____/____/____ | [ ] | [ ] | [ ] |
| 02 | 02 - linkedSignal, resource | ____/____/____ | [ ] | [ ] | [ ] |
| 02 | 03 - Patterns avances | ____/____/____ | [ ] | [ ] | [ ] |
| 03 | 01 - Services et inject() | ____/____/____ | [ ] | [ ] | [ ] |
| 03 | 02 - InjectionToken | ____/____/____ | [ ] | [ ] | [ ] |
| 03 | 03 - Patterns DI | ____/____/____ | [ ] | [ ] | [ ] |
| 04 | 01 - Config routes | ____/____/____ | [ ] | [ ] | [ ] |
| 04 | 02 - Navigation | ____/____/____ | [ ] | [ ] | [ ] |
| 04 | 03 - Guards et resolvers | ____/____/____ | [ ] | [ ] | [ ] |
| 04 | 04 - Layouts imbriques | ____/____/____ | [ ] | [ ] | [ ] |
| 05 | 01 - Observable | ____/____/____ | [ ] | [ ] | [ ] |
| 05 | 02 - Operateurs | ____/____/____ | [ ] | [ ] | [ ] |
| 05 | 03 - Cycle de vie RxJS | ____/____/____ | [ ] | [ ] | [ ] |
| 05 | 04 - Patterns RxJS | ____/____/____ | [ ] | [ ] | [ ] |
| 05 | 05 - Error handling et testing RxJS | ____/____/____ | [ ] | [ ] | [ ] |
| 06 | 01 - HttpClient | ____/____/____ | [ ] | [ ] | [ ] |
| 06 | 02 - Interceptors | ____/____/____ | [ ] | [ ] | [ ] |
| 06 | 03 - Erreurs et cache | ____/____/____ | [ ] | [ ] | [ ] |
| 07 | 01 - Reactive Forms bases | ____/____/____ | [ ] | [ ] | [ ] |
| 07 | 02 - Validation | ____/____/____ | [ ] | [ ] | [ ] |
| 07 | 03 - FormArray | ____/____/____ | [ ] | [ ] | [ ] |
| 07 | 04 - Bonnes pratiques | ____/____/____ | [ ] | [ ] | [ ] |
| 08 | 01 - Theming Material | ____/____/____ | [ ] | [ ] | [ ] |
| 08 | 02 - Composants courants | ____/____/____ | [ ] | [ ] | [ ] |
| 08 | 03 - CDK avance | ____/____/____ | [ ] | [ ] | [ ] |
| 09 | 02 - Tests composants | ____/____/____ | [ ] | [ ] | [ ] |
| 09 | 03 - Tests services | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 01 - État local Signals | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 02 - NgRx SignalStore | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 03 - Patterns état | ____/____/____ | [ ] | [ ] | [ ] |
| 11 | 02 - Auth JWT | ____/____/____ | [ ] | [ ] | [ ] |
| 12 | 01 - Architecture ESN | ____/____/____ | [ ] | [ ] | [ ] |
| 12 | 02 - Performance | ____/____/____ | [ ] | [ ] | [ ] |

---

## Conseils pour maximiser l'apprentissage

1. **Lisez un cours par jour**, pas plus. Même si vous avez envie d'avancer, votre cerveau a besoin de repos.
2. **Faites les exercices à la main** avant de regarder la solution. L'echec productif renforce la mémoire.
3. **Revisez activement** : ne relisez pas passivement, essayez de vous rappeler le contenu avant de le relire.
4. **Codez en parallele** : reproduisez chaque exemple dans un vrai projet Angular.
5. **Expliquez a voix haute** : la technique de Feynman (expliquer simplement) revele les lacunes.
6. **Prenez des notes manuscrites** : écrire à la main active des circuits de mémoire différents du clavier.

---

> **Duree totale estimee** : ~60 heures sur 42 jours minimum (1 cours/jour).
> Avec les revisions espacees, comptez environ **3 mois** pour une maîtrise solide.

Bon courage et bonne formation !
