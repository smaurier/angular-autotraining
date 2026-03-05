# Parcours de formation Angular 19+ (pour developpeurs Vue 3)

> **Philosophie** : Ce parcours est concu pour un developpeur Vue 3 souhaitant maitriser Angular 19+
> avec les pratiques modernes (standalone, Signals, `@if`/`@for`, SSR).
> Chaque cours est une brique autonome, chaque exercice consolide les acquis.

---

## Principes de science cognitive appliques

Ce parcours s'appuie sur des principes issus de la recherche en apprentissage :

| Principe | Application dans ce parcours |
|---|---|
| **1 cours = 1 session** | Ne faites jamais deux cours le meme jour. Votre cerveau a besoin de sommeil pour consolider. |
| **24h minimum entre deux cours** | Laissez une nuit entre chaque session. La memoire se forme pendant le repos. |
| **Tentez avant de regarder la solution** | Pour chaque exercice, essayez pendant **au moins 20 minutes** avant de consulter la correction. L'effort de recuperation renforce la memoire. |
| **Revision espacee** | Revisez chaque cours a J+1, J+7 et J+30. Trois passages suffisent pour ancrer durablement. |
| **Interleaving (entrelacement)** | Alternez theorie et pratique. Ne faites pas 5 cours d'affilee sans exercice. |
| **Elaboration** | Reformulez chaque concept avec vos propres mots. Expliquez-le a un collegue (reel ou imaginaire). |

---

## Vue d'ensemble des modules

| # | Module | Cours | Exercices | Duree estimee |
|---|--------|-------|-----------|---------------|
| 00 | De Vue a Angular | 3 | 1 | ~3h30 |
| 01 | Composants & Templates | 7 | 6 | ~10h |
| 02 | Signals avances | 3 | 1 | ~4h |
| 03 | Services & DI | 3 | 2 | ~4h30 |
| 04 | Routing | 4 | 2 | ~5h |
| 05 | RxJS Essentiel | 4 | 2 + 1 bonus | ~5h30 |
| 06 | HTTP & API | 3 | 2 | ~4h30 |
| 07 | Formulaires | 4 | 3 | ~6h |
| 08 | Angular Material | 3 | 2 + 1 bonus | ~5h |
| 09 | Tests | 4 | 2 | ~5h30 |
| 10 | State Management | 3 | 2 | ~4h30 |
| 11 | CI/CD, Auth & Securite | 3 | 2 | ~4h30 |
| 12 | Recettes ESN | 2 | 1 | ~3h |
| | **TOTAL** | **46** | **29** | **~65h** |

---

## Detail des modules

### Module 00 -- De Vue a Angular (3 cours, 1 exercice)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Modele mental : de Vue a Angular | Framework vs ecosysteme, CLI, decorateurs, DI |
| 02 | Equivalences Vue / Angular | Tableau complet ref/signal, props/input, etc. |
| 03 | Premier projet Angular | `ng new`, structure, premier composant standalone |
| Ex01 | HelloComponent | Creer un composant, l'afficher, ajouter un signal |

### Module 01 -- Composants & Templates (7 cours, 6 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Anatomie d'un composant standalone | @Component, template, styles, imports |
| 02 | Template syntax : interpolation & bindings | `{{ }}`, `[attr]`, `(event)` |
| 03 | Control flow : @if, @else, @switch | Nouvelle syntaxe de templates |
| 04 | Control flow : @for et track | Boucles, track obligatoire, @empty |
| 05 | Input / Output : communication parent-enfant | `input()`, `output()`, `model()` |
| 06 | Projeter du contenu avec ng-content | Slots nommes, content projection |
| 07 | Cycle de vie et afterRender | OnInit, OnDestroy, afterNextRender |

### Module 02 -- Signals avances (3 cours, 1 exercice)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | signal, computed, effect en profondeur | Graphe reactif, egalite, untracked |
| 02 | linkedSignal et resource | Signals derives, chargement async |
| 03 | Patterns avances | Signaux en services, state local, bonnes pratiques |

### Module 03 -- Services & DI (3 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Services et inject() | providedIn, injection hierarchique |
| 02 | InjectionToken et providers avances | Tokens, useFactory, useValue |
| 03 | Patterns DI en entreprise | Multi-providers, injection conditionnelle |

### Module 04 -- Routing (4 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Configuration des routes | Routes, RouterOutlet, lazy loading |
| 02 | Navigation et parametres | routerLink, ActivatedRoute, queryParams |
| 03 | Guards et resolvers | canActivate, resolve, redirections |
| 04 | Layouts et routes imbriquees | Routes enfants, layouts partages |

### Module 05 -- RxJS Essentiel (4 cours, 2 + 1 bonus exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Observable, Observer, Subscription | Le modele push, subscribe/unsubscribe |
| 02 | Operateurs de transformation | map, filter, switchMap, mergeMap |
| 03 | Gestion du cycle de vie | takeUntilDestroyed, async pipe |
| 04 | Patterns RxJS courants | debounceTime, distinctUntilChanged, combineLatest |

### Module 06 -- HTTP & API (3 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | HttpClient et requetes REST | GET, POST, PUT, DELETE, typage |
| 02 | Interceptors fonctionnels | Auth token, logging, retry |
| 03 | Gestion d'erreurs et cache | catchError, retry, strategies de cache |

### Module 07 -- Formulaires (4 cours, 3 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Reactive Forms : les bases | FormControl, FormGroup, FormBuilder |
| 02 | Validation synchrone et asynchrone | Validators, custom validators |
| 03 | FormArray et formulaires dynamiques | Listes, ajout/suppression dynamique |
| 04 | Bonnes pratiques formulaires | Typage strict, helpers, UX |

### Module 08 -- Angular Material (3 cours, 2 + 1 bonus exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Installation et theming | Palette, typographie, dark mode |
| 02 | Composants courants | Table, Dialog, Snackbar, Form fields |
| 03 | CDK et composants avances | Drag & drop, virtual scroll, overlay |

### Module 09 -- Tests (4 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Tests unitaires avec Jest / Vitest | Configuration, premier test |
| 02 | Tester les composants | TestBed, ComponentFixture, queries |
| 03 | Tester les services et HTTP | HttpTestingController, mocks |
| 04 | Tests e2e avec Playwright | Configuration, scenarios, CI |

### Module 10 -- State Management (3 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Etat local avec Signals | Patterns signal-based, state services |
| 02 | NgRx SignalStore | Stores, features, entites |
| 03 | Patterns avances d'etat | Optimistic updates, cache, sync |

### Module 11 -- CI/CD, Auth & Securite (3 cours, 2 exercices)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Pipeline CI/CD | GitHub Actions, lint, test, build, deploy |
| 02 | Authentification JWT | Login, guards, interceptors auth |
| 03 | Securite Angular | XSS, CSRF, sanitization, CSP |

### Module 12 -- Recettes ESN (2 cours, 1 exercice)

| # | Cours | Contenu cle |
|---|-------|-------------|
| 01 | Architecture et conventions d'entreprise | Monorepo, feature modules, coding style |
| 02 | Performance et optimisation | Lazy loading, bundle size, OnPush, SSR |

---

## Tracker de revision

Utilisez ce tableau pour suivre vos revisions espacees. Cochez chaque case apres revision.

| Module | Cours | Date 1ere lecture | J+1 | J+7 | J+30 |
|--------|-------|-------------------|-----|-----|------|
| 00 | 01 - Modele mental | ____/____/____ | [ ] | [ ] | [ ] |
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
| 09 | 01 - Tests unitaires | ____/____/____ | [ ] | [ ] | [ ] |
| 09 | 02 - Tests composants | ____/____/____ | [ ] | [ ] | [ ] |
| 09 | 03 - Tests services | ____/____/____ | [ ] | [ ] | [ ] |
| 09 | 04 - Tests e2e | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 01 - Etat local Signals | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 02 - NgRx SignalStore | ____/____/____ | [ ] | [ ] | [ ] |
| 10 | 03 - Patterns etat | ____/____/____ | [ ] | [ ] | [ ] |
| 11 | 01 - Pipeline CI/CD | ____/____/____ | [ ] | [ ] | [ ] |
| 11 | 02 - Auth JWT | ____/____/____ | [ ] | [ ] | [ ] |
| 11 | 03 - Securite | ____/____/____ | [ ] | [ ] | [ ] |
| 12 | 01 - Architecture ESN | ____/____/____ | [ ] | [ ] | [ ] |
| 12 | 02 - Performance | ____/____/____ | [ ] | [ ] | [ ] |

---

## Conseils pour maximiser l'apprentissage

1. **Lisez un cours par jour**, pas plus. Meme si vous avez envie d'avancer, votre cerveau a besoin de repos.
2. **Faites les exercices a la main** avant de regarder la solution. L'echec productif renforce la memoire.
3. **Revisez activement** : ne relisez pas passivement, essayez de vous rappeler le contenu avant de le relire.
4. **Codez en parallele** : reproduisez chaque exemple dans un vrai projet Angular.
5. **Expliquez a voix haute** : la technique de Feynman (expliquer simplement) revele les lacunes.
6. **Prenez des notes manuscrites** : ecrire a la main active des circuits de memoire differents du clavier.

---

> **Duree totale estimee** : ~65 heures sur 46 jours minimum (1 cours/jour).
> Avec les revisions espacees, comptez environ **3 mois** pour une maitrise solide.

Bon courage et bonne formation !
