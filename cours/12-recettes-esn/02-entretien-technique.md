# Cours 46 — Entretien technique Angular : 30 questions et reponses

> **Objectif** : Se preparer aux entretiens techniques Angular en ESN avec 30 questions classees par difficulte, des reponses synthetiques, et une checklist "pret pour une mission".

---

## Rappel du cours precedent

<details>
<summary>1. Quels sont les trois dossiers principaux de la structure feature-based ?</summary>

`core/` (singletons : services, guards, interceptors), `shared/` (composants, pipes, directives reutilisables), `features/` (domaines metier autonomes).
</details>

<details>
<summary>2. Quel est le format des conventional commits ?</summary>

`type(scope): description` — ex: `feat(auth): ajout refresh token`, `fix(tasks): correction tri par date`.
</details>

<details>
<summary>3. Comment charger une configuration au demarrage ?</summary>

Avec `APP_INITIALIZER` : un provider qui execute un `fetch()` vers un fichier JSON ou endpoint. Angular attend la resolution avant de demarrer.
</details>

---

## Analogie

Les entretiens Angular suivent la meme structure que Vue.js : fondamentaux, patterns, tests. La difference en ESN : l'accent sur la **rigueur architecturale** (DI, guards, interceptors). Pense a l'entretien comme un **match d'echecs** : prepare tes ouvertures (fondamentaux) et tes strategies (patterns avances).

---

## Theorie

### Groupe 1 — Fondamentaux

<details>
<summary><strong>Q1. Qu'est-ce qu'un composant standalone ?</strong></summary>

Composant qui n'a pas besoin de `NgModule`. Par defaut depuis Angular 17+. Il declare ses dependances dans `imports: [...]`. Avantage : meilleur tree-shaking, imports explicites.
</details>

<details>
<summary><strong>Q2. signal() vs Observable ?</strong></summary>

`signal()` = valeur synchrone reactive, lecture via `()`, ecriture via `.set()/.update()`. `Observable` = flux asynchrone, lecture via `.subscribe()`. **Signals pour l'etat UI, Observables pour les flux async (HTTP, WebSocket).**
</details>

<details>
<summary><strong>Q3. L'injection de dependances ?</strong></summary>

`@Injectable({ providedIn: 'root' })` = singleton global. `inject(MonService)` pour recuperer l'instance. L'injecteur est hierarchique : composant → parent → root. Equivalent Vue : `provide/inject` mais automatique.
</details>

<details>
<summary><strong>Q4. Le change detection ?</strong></summary>

**Default** : verifie tout l'arbre apres chaque evenement. **OnPush** : verifie uniquement si les inputs changent ou si un signal est lu. Avec Signals, Angular sait exactement quelles vues mettre a jour (base du mode zoneless).
</details>

<details>
<summary><strong>Q5. @if vs *ngIf ?</strong></summary>

Meme fonction, syntaxe differente. `@if` (Angular 17+) : meilleure lisibilite, pas besoin de `ng-template`, meilleure performance. `*ngIf` : ancien style avec structural directive. `@if` est recommande.
</details>

<details>
<summary><strong>Q6. Creer un pipe custom ?</strong></summary>

`@Pipe({ name: 'tronquer' })` + `implements PipeTransform` + methode `transform(value, ...args)`. Usage : `{{ texte | tronquer:100 }}`. Pure par defaut (recalcule uniquement si l'input change).
</details>

<details>
<summary><strong>Q7. input() vs @Input ?</strong></summary>

`input()` renvoie un **Signal** en lecture seule. `input.required()` pour les inputs obligatoires. Avantages : meilleure inference de type, compatible avec `computed()` et `effect()`. `@Input` est l'ancien style decorateur.
</details>

<details>
<summary><strong>Q8. Le cycle de vie ?</strong></summary>

`constructor` (injection) → `ngOnInit` (initialisation, appels HTTP) → `ngOnChanges` (quand un input change) → `ngOnDestroy` (nettoyage). `afterNextRender` pour l'acces DOM. Avec Signals, `computed()`/`effect()` remplacent souvent `ngOnChanges`.
</details>

<details>
<summary><strong>Q9. Le lazy loading ?</strong></summary>

Charge un composant/feature **uniquement quand la route est visitee**. `loadComponent: () => import('./admin.component').then(m => m.AdminComponent)`. Reduit le bundle initial, accelere le premier chargement.
</details>

<details>
<summary><strong>Q10. Le two-way binding ?</strong></summary>

`[(ngModel)]="nom"` = binding de propriete + binding d'evenement. Avec Signals : `model()` cree un signal bidirectionnel. `<app-input [(valeur)]="monSignal" />`.
</details>

### Groupe 2 — Intermediaire

<details>
<summary><strong>Q11. switchMap vs mergeMap vs concatMap ?</strong></summary>

`switchMap` : annule le precedent (autocomplete). `mergeMap` : parallele (telechargements). `concatMap` : sequentiel dans l'ordre (sauvegardes).
</details>

<details>
<summary><strong>Q12. Template-driven vs Reactive Forms ?</strong></summary>

Template-driven : logique dans le template (ngModel), typage faible. Reactive : logique dans la classe (FormControl), typage fort, testable. **Reactive Forms = standard en ESN.**
</details>

<details>
<summary><strong>Q13. Implementer un interceptor ?</strong></summary>

Fonction `HttpInterceptorFn` : `(req, next) => { ... return next(req); }`. Enregistre avec `provideHttpClient(withInterceptors([monInterceptor]))`.
</details>

<details>
<summary><strong>Q14. Les guards de route ?</strong></summary>

`canActivate` (acceder ?), `canDeactivate` (quitter ?), `canMatch` (matcher ?), `resolve` (charger des donnees). Fonctions avec `inject()` en Angular 19.
</details>

<details>
<summary><strong>Q15. Tester un composant ?</strong></summary>

`TestBed.configureTestingModule({ imports: [MonComponent], providers: [...] })`. `fixture = TestBed.createComponent(MonComponent)`. `fixture.detectChanges()`. Assertions sur `fixture.nativeElement`.
</details>

<details>
<summary><strong>Q16. toSignal() ?</strong></summary>

Convertit un Observable en Signal : `users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] })`. Inverse : `toObservable(monSignal)`.
</details>

<details>
<summary><strong>Q17. Erreurs HTTP globales ?</strong></summary>

Interceptor d'erreurs avec `catchError` : gerer 401 (redirect login), 403 (unauthorized), 500+ (notification). Plus `ErrorHandler` global pour les erreurs non HTTP.
</details>

<details>
<summary><strong>Q18. Providers et scopes ?</strong></summary>

`providedIn: 'root'` = singleton global. `providers: [Service]` dans `@Component` = instance par composant. `providers` dans une route = instance par route.
</details>

<details>
<summary><strong>Q19. Optimiser les performances ?</strong></summary>

OnPush, lazy loading, `track` dans `@for`, Signals au lieu de getters, virtual scrolling (CDK), preloading strategy, bundle budgets, NgOptimizedImage, SSR/SSG.
</details>

<details>
<summary><strong>Q20. NgRx SignalStore ?</strong></summary>

State management base sur Signals. `signalStore()` + `withState()`, `withComputed()`, `withMethods()`. Plus leger que NgRx Store classique (pas de reducers/actions/effects).
</details>

### Groupe 3 — Avance

<details>
<summary><strong>Q21. Le zoneless ?</strong></summary>

Supprime Zone.js. Angular ne detecte les changements que via les Signals. `provideExperimentalZonelessChangeDetection()`. Bundle plus petit, meilleure performance.
</details>

<details>
<summary><strong>Q22. Le pattern facade ?</strong></summary>

Service qui simplifie l'acces a un sous-systeme (store + API + cache). Le composant n'interagit qu'avec la facade, sans connaitre les details d'implementation.
</details>

<details>
<summary><strong>Q23. RBAC cote front ?</strong></summary>

Directive structurelle `*appHasRole="'admin'"` ou guard avec `route.data['role']`. **Important** : le RBAC front est un confort UX, la vraie securite est cote serveur.
</details>

<details>
<summary><strong>Q24. Angular SSR ?</strong></summary>

`ng add @angular/ssr`. Genere le HTML cote serveur (SEO, premier rendu rapide). **Quand** : sites publics, e-commerce. **Pas necessaire** : dashboards internes.
</details>

<details>
<summary><strong>Q25. State dans une grande app ?</strong></summary>

4 niveaux : etat local (Signals composant), etat feature (service signal-based), etat global (SignalStore), etat serveur (cache HTTP). Chaque donnee au niveau le plus bas possible.
</details>

<details>
<summary><strong>Q26. ControlValueAccessor ?</strong></summary>

Interface pour qu'un composant custom fonctionne avec Reactive Forms. Implemente `writeValue`, `registerOnChange`, `registerOnTouched`. Permet `<app-star-rating formControlName="note" />`.
</details>

<details>
<summary><strong>Q27. Migrer modules vers standalone ?</strong></summary>

`ng generate @angular/core:standalone`. Ajouter `standalone: true`, deplacer les imports des NgModules vers les composants, remplacer `bootstrapModule` par `bootstrapApplication`.
</details>

<details>
<summary><strong>Q28. Strategie de test ESN ?</strong></summary>

Pyramide : unitaire (services, 70%) → composant (TestBed, 20%) → integration (8%) → E2E (Playwright, 2%). Priorite : tester la logique metier, pas l'UI simple.
</details>

<details>
<summary><strong>Q29. Securiser une app Angular ?</strong></summary>

Sanitization DOM, httpOnly cookies, CSP, guards, validation front+back, `npm audit` en CI, CORS restrictif, HTTPS, pas de secrets dans le code.
</details>

<details>
<summary><strong>Q30. Architecture enterprise ?</strong></summary>

`core/shared/features/layouts`. Lazy loading par feature, smart/dumb components, facade pattern, Reactive Forms, error handling global, feature flags, conventional commits.
</details>

---

## Pratique

### Checklist "Je suis pret pour une mission Angular"

```markdown
## Fondamentaux
- [ ] Creer un composant standalone avec @Component
- [ ] Maitriser signal, computed, effect
- [ ] Connaitre le control flow (@if, @for, @switch)
- [ ] Communication parent-enfant (input, output, model)
- [ ] Comprendre l'injection de dependances

## Intermediaire
- [ ] CRUD complet avec HttpClient
- [ ] Reactive Forms + validation custom
- [ ] Routing (guards, lazy loading, resolvers)
- [ ] Ecrire des tests (unitaires + composants)
- [ ] Utiliser Angular Material

## Avance
- [ ] RxJS (switchMap, debounceTime, takeUntilDestroyed)
- [ ] Change detection (OnPush, Signals)
- [ ] State management (services, SignalStore)
- [ ] Interceptors (auth, error handling)
- [ ] Pipeline CI/CD

## ESN
- [ ] Structure feature-based (core/shared/features)
- [ ] Lire et contribuer a un projet existant
- [ ] Conventions de nommage et workflow Git
- [ ] Code review Angular
- [ ] Securite front (XSS, CSRF, CSP)
```

### Simulation d'entretien (5 questions, 2 min/question)

1. Difference entre `signal()` et `computed()` ?
2. Comment proteger une route pour les non-authentifies ?
3. Avantage du lazy loading ?
4. Comment fonctionne un interceptor ?
5. Structure de dossiers d'un projet Angular enterprise ?

<details>
<summary>Grille d'evaluation</summary>

| Note | Critere |
|---|---|
| **3/3** | Reponse claire avec exemple de code |
| **2/3** | Correcte mais incomplete |
| **1/3** | Idee generale mais vague |
| **0/3** | Incorrecte ou pas de reponse |

**13-15** : pret senior. **10-12** : pret intermediaire. **< 10** : revoir les modules concernes.
</details>

---

## Resume

| Point cle | A retenir |
|---|---|
| Fondamentaux | Standalone, Signals, DI, change detection, control flow |
| Intermediaire | HttpClient, Reactive Forms, routing, tests, RxJS |
| Avance | Zoneless, facades, RBAC, SSR, ControlValueAccessor |
| ESN | Architecture feature-based, conventions, securite, tests |
| Checklist | 20 competences a maitriser avant une mission |

---

## Felicitations !

Tu as termine les **46 cours** de cette formation Angular 19 pour developpeurs Vue 3. Tu maitrises maintenant les fondamentaux, les competences metier, les outils et les pratiques ESN.

**Prochaine etape** : construis un projet complet (CRUD + auth + tests) et deploie-le. C'est la meilleure preuve de competence pour un entretien.

> Bonne chance pour ta prochaine mission Angular !
