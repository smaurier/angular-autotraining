# Exercice 26 — Entretien Angular

**Module** : 12-Recettes-ESN · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/12-recettes-esn/01-architecture-conventions.md`, `cours/12-recettes-esn/02-performance-optimisation.md`

## Objectif

Se preparer a un entretien technique Angular en repondant a un QCM de 20 questions et en realisant 3 exercices de live coding chronometres.

## Consignes

### Partie 1 — QCM (20 questions, 20 min)

Repondre aux 20 questions a choix multiples ci-dessous. Une seule reponse correcte par question. Notez vos reponses sur une feuille avant de consulter la correction.

**Q1.** Quel decorateur est utilise pour definir un composant Angular ?
- A) `@Directive`
- B) `@Component`
- C) `@Injectable`
- D) `@NgModule`

**Q2.** Quelle est la difference entre `signal()` et `computed()` ?
- A) `signal()` est en lecture seule, `computed()` est mutable
- B) `signal()` est mutable, `computed()` est un signal derive en lecture seule
- C) Les deux sont mutables
- D) Les deux sont en lecture seule

**Q3.** Comment creer un composant standalone en Angular 19+ ?
- A) Ajouter `standalone: true` dans `@Component` (ou rien, c'est le defaut)
- B) L'enregistrer dans un NgModule avec `declarations`
- C) Utiliser `@Standalone()` comme decorateur
- D) Ajouter `type: 'standalone'` dans le decorator

**Q4.** Quelle syntaxe remplace `*ngIf` dans Angular 19+ ?
- A) `[ngIf]`
- B) `@if`
- C) `#if`
- D) `ng-if`

**Q5.** Quel est le role de `track` dans `@for` ?
- A) Suivre les clics de l'utilisateur
- B) Identifier de maniere unique chaque element pour optimiser le rendu DOM
- C) Compter le nombre d'iterations
- D) Trier les elements

**Q6.** Comment injecter un service dans un composant avec la nouvelle API ?
- A) `constructor(private service: MyService)`
- B) `readonly service = inject(MyService)`
- C) `@Inject(MyService) service`
- D) `this.service = new MyService()`

**Q7.** Quelle methode de `signal` prend une fonction en parametre ?
- A) `set()`
- B) `update()`
- C) `assign()`
- D) `mutate()`

**Q8.** Quel type d'intercepteur est recommande en Angular 19+ ?
- A) Une classe implementant `HttpInterceptor`
- B) Une fonction de type `HttpInterceptorFn`
- C) Un decorateur `@Interceptor`
- D) Un middleware Express

**Q9.** Comment proteger une route en Angular ?
- A) Avec un `middleware`
- B) Avec `canActivate` et un guard fonctionnel
- C) Avec `@Protected()` sur le composant
- D) Avec un `filter` dans le router

**Q10.** Quel operateur RxJS est recommande pour annuler les requetes precedentes lors d'une recherche ?
- A) `mergeMap`
- B) `concatMap`
- C) `switchMap`
- D) `exhaustMap`

**Q11.** Que fait `providedIn: 'root'` dans un `@Injectable` ?
- A) Le service est disponible uniquement dans le composant racine
- B) Le service est un singleton disponible dans toute l'application
- C) Le service est cree a chaque injection
- D) Le service est disponible uniquement en mode developpement

**Q12.** Quelle est la bonne maniere d'exposer un signal en lecture seule depuis un service ?
- A) `readonly tasks = this._tasks`
- B) `readonly tasks: Signal<Task[]> = this._tasks.asReadonly()`
- C) `get tasks() { return this._tasks() }`
- D) `public tasks = this._tasks`

**Q13.** Comment fonctionne le lazy loading de routes en Angular ?
- A) Avec `import()` dynamique et `loadComponent` ou `loadChildren`
- B) Avec `require()` dans les routes
- C) Avec `@Lazy()` sur le composant
- D) Avec `defer` dans le template

**Q14.** Quel est le role de `FormBuilder.nonNullable.group()` ?
- A) Creer un formulaire sans validation
- B) Creer un FormGroup dont les controles ne peuvent pas etre `null` apres `reset()`
- C) Creer un formulaire en lecture seule
- D) Creer un formulaire qui accepte les valeurs null

**Q15.** Que se passe-t-il si on oublie `track` dans `@for` ?
- A) Rien, c'est optionnel
- B) Une erreur de compilation — `track` est obligatoire
- C) Un warning dans la console
- D) Les elements sont rendus mais sans animation

**Q16.** Comment tester un service qui utilise `HttpClient` ?
- A) Avec un vrai serveur HTTP
- B) Avec `HttpClientTestingModule` et `HttpTestingController`
- C) En mockant `fetch()` manuellement
- D) Avec Playwright

**Q17.** Quel est l'avantage de `patchState()` dans NgRx SignalStore ?
- A) Il mute l'etat directement
- B) Il met a jour partiellement l'etat de maniere immutable
- C) Il remplace tout l'etat
- D) Il cree un nouvel store

**Q18.** Quel est le role de `@defer` dans un template Angular ?
- A) Differer le chargement d'un composant jusqu'a ce qu'une condition soit remplie
- B) Creer une animation de transition
- C) Gerer les erreurs dans le template
- D) Creer un composant asynchrone

**Q19.** Quelle strategie de detection de changement est la plus performante ?
- A) `ChangeDetectionStrategy.Default`
- B) `ChangeDetectionStrategy.OnPush`
- C) `ChangeDetectionStrategy.Manual`
- D) `ChangeDetectionStrategy.Lazy`

**Q20.** Comment annuler proprement un Observable dans un composant Angular ?
- A) Appeler `unsubscribe()` dans `ngOnDestroy`
- B) Utiliser `takeUntilDestroyed()` de `@angular/core/rxjs-interop`
- C) Les deux sont valides, mais `takeUntilDestroyed()` est plus idiomatique
- D) Les Observables se desabonnent automatiquement

---

### Partie 2 — Live coding (3 exercices, 25 min total)

Realiser les 3 exercices suivants en code, comme lors d'un entretien technique. Chronometrez-vous.

#### Exercice LC1 — Composant compteur avec signaux (5 min)

Creer un composant `CounterComponent` qui :
- Affiche un compteur (signal `count` initialise a 0)
- A 3 boutons : `+1`, `-1`, `Reset`
- Affiche un computed `isEven` ("Pair" / "Impair")
- Affiche un computed `doubleCount` (le double du compteur)

#### Exercice LC2 — Recherche avec debounce (10 min)

Creer un composant `SearchComponent` qui :
- A un champ de recherche `<input>`
- Utilise un `signal` pour stocker la saisie
- Filtre une liste de produits (noms) en temps reel avec un delai de 300ms (debounce)
- Affiche les resultats filtres
- Indice : utiliser `toObservable()`, `debounceTime()`, `toSignal()`

#### Exercice LC3 — Service CRUD simple (10 min)

Creer un service `ProductService` qui :
- Gere un signal `products: Signal<Product[]>`
- Expose les methodes : `add(product)`, `update(id, changes)`, `delete(id)`, `getById(id)`
- `getById` retourne un `computed` qui se met a jour automatiquement
- Toutes les mutations sont immutables

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Chaque exercice de live coding doit etre dans un fichier autonome
- Tous les types doivent etre explicitement annotes

## Bonus

- Chronometrez-vous reellement et notez votre temps pour chaque exercice
- Refaites les exercices de live coding une semaine plus tard sans regarder la correction
- Preparez une explication orale de 2 minutes pour chaque concept majeur (signals, guards, interceptors)

## Fichiers

-> `src/app/exercises/ex26/qcm/questions.md` (copie des questions pour travailler hors ligne)
-> `src/app/exercises/ex26/live-coding/counter.component.ts`
-> `src/app/exercises/ex26/live-coding/search.component.ts`
-> `src/app/exercises/ex26/live-coding/product.service.ts`
