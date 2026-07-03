---
titre: Recettes ESN et pièges fréquents — architecture de mission, prep entretien, projet final
cours: 03-angular
notions: [architecture feature-based core/shared/features, smart et dumb components, pattern facade, feature flags signal-based, config runtime APP_INITIALIZER, GlobalErrorHandler, conventions de nommage et conventional commits, les pièges Angular récurrents en mission, préparation entretien technique, intégration de bout en bout]
outcomes:
  - sait structurer un projet Angular de mission en core/shared/features et justifier ce découpage
  - sait distinguer smart et dumb components et poser une facade entre l'UI et l'état
  - sait nommer, reconnaître et éviter les pièges Angular récurrents en revue de code
  - sait répondre à froid aux questions d'entretien Angular fondamentales et intermédiaires
  - sait assembler composants, signals, DI, routing, HttpClient et formulaires réactifs dans une feature complète
prerequis: [ensemble des modules 00-25 (parcours Angular complet)]
next: fin-parcours-03-angular
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: TribuZen entier — la feature « famille » de bout en bout (liste, détail, formulaire d'invitation) qui récapitule toutes les couches du produit
last-reviewed: 2026-07
---

# Recettes ESN et pièges fréquents — architecture, entretien, projet final

> **Outcomes — tu sauras FAIRE :** structurer un projet de mission en `core/shared/features`, séparer smart et dumb components derrière une facade, nommer et éviter les pièges Angular récurrents, répondre à froid aux questions d'entretien, et assembler une feature complète (composants + signals + DI + routing + HTTP + formulaires).
> **Difficulté :** :star::star::star::star:
>
> **Portée :** ce module est le **récapitulatif de fin de parcours**. Il n'introduit **aucune API nouvelle** : tout ce qu'il mobilise (`signal`, `inject`, `provideRouter`, `provideHttpClient`, `FormGroup`, guards, interceptors) a été couvert aux modules 00-25. Ce qu'il ajoute, c'est le **niveau au-dessus** : comment ces briques s'organisent dans un vrai projet d'équipe, quels réflexes attend une ESN, quels pièges font échouer une revue de code, et comment parler de tout ça en entretien. Le lab associé est le **projet final** qui coud ces couches ensemble.

## 1. Cas concret d'abord

TribuZen a grandi. Ce n'est plus le `SortieBudgetComponent` du module 02 : c'est une application avec de l'authentification (module 25), une dizaine de features, une équipe de 4 développeurs qui poussent tous les jours. Tu arrives sur la mission, on te confie une user story : **« En tant que parent, je veux inviter un membre dans ma famille depuis la page famille. »**

Un collègue pressé livre ça dans un seul fichier :

```typescript
// famille.component.ts — AVANT (tout mélangé, invalidable en revue)
@Component({
  selector: 'app-famille',
  template: `
    <h1>Ma famille</h1>
    @for (m of membres(); track m.id) { <p>{{ m.nom }}</p> }
    <input #nom />
    <button (click)="inviter(nom.value)">Inviter</button>
  `,
})
export class FamilleComponent implements OnInit {
  membres = signal<any[]>([]);           // any → pas de typage

  ngOnInit() {
    // appel HTTP en dur dans le composant, pas de service
    fetch('http://localhost:3000/api/familles/1/membres')
      .then(r => r.json())
      .then(data => this.membres.set(data));   // hors zone Angular : rendu incertain
  }

  inviter(email: string) {
    fetch('http://localhost:3000/api/invitations', { method: 'POST', body: email });
    // pas de validation, pas de gestion d'erreur, pas de feedback
  }
}
```

Ça « marche » sur le poste du collègue. En revue, ça se fait refuser : URL en dur, `any`, appel réseau dans le composant, `fetch` hors du change detection Angular, aucune validation, aucun état de chargement, aucune gestion d'erreur, aucun test possible. **Aucun de ces reproches n'est une question de syntaxe** — ce sont des reproches d'**architecture** et de **réflexes de mission**. C'est le sujet de ce module.

À la fin, tu sauras livrer cette même story dans une structure que l'équipe accepte : un service typé qui parle à l'API, un composant « smart » qui orchestre, un composant « dumb » qui affiche, un formulaire réactif validé, un état de chargement et d'erreur — le tout dans l'arborescence `features/famille/`.

---

## 2. Théorie complète, concise

### 2.1 L'architecture feature-based : `core` / `shared` / `features`

En mission ESN, un projet Angular se lit à trois dossiers près. C'est la première chose qu'un tech lead regarde.

```
src/app/
├── core/          # Singletons chargés une seule fois : services métier transverses,
│   ├── services/  # guards, interceptors, modèles. Fournis en providedIn: 'root'.
│   ├── guards/
│   ├── interceptors/
│   └── models/
├── shared/        # Réutilisable partout, SANS état : composants d'UI (spinner,
│   ├── components/# confirm-dialog), pipes, directives. Aucune dépendance à une feature.
│   ├── pipes/
│   └── directives/
├── features/      # Domaines métier autonomes, lazy-loadés par route.
│   ├── famille/   # Chaque feature = son composant, ses sous-composants, son service,
│   │   ├── famille.component.ts        #   ses routes. Ne dépend PAS d'une autre feature.
│   │   ├── components/
│   │   ├── services/famille.service.ts
│   │   └── famille.routes.ts
│   └── auth/
├── layouts/       # main-layout, auth-layout
├── app.config.ts  # providers globaux (bootstrapApplication)
└── app.routes.ts  # routes racine, lazy loading par feature
```

La règle de dépendance est **unidirectionnelle** : `features` peut importer `shared` et `core` ; `shared` n'importe **rien** des features ; `core` n'importe **rien** des features. Une feature ne dépend jamais d'une autre feature — sinon tu perds le lazy loading et tu crées des cycles.

### 2.2 Smart components vs dumb components

Le pattern qui structure une feature. On sépare deux responsabilités :

- **Smart (container)** : sait **d'où viennent les données**. Il injecte les services, lit/écrit l'état, orchestre. Peu de HTML.
- **Dumb (présentational)** : sait **comment afficher**. Il reçoit tout par `input()`, émet par `output()`, n'injecte aucun service métier. Réutilisable et trivial à tester.

```typescript
// SMART — famille.component.ts : orchestre, ne dessine presque rien
@Component({
  selector: 'app-famille',
  imports: [MembreListComponent],
  template: `<app-membre-list [membres]="membres()" (retirer)="retirerMembre($event)" />`,
})
export class FamilleComponent {
  private service = inject(FamilleService);
  membres = this.service.membres;            // état exposé par le service
  retirerMembre(id: string) { this.service.retirer(id); }
}

// DUMB — membre-list.component.ts : n'injecte rien, reçoit tout
@Component({
  selector: 'app-membre-list',
  template: `
    @for (m of membres(); track m.id) {
      <p>{{ m.nom }} <button (click)="retirer.emit(m.id)">×</button></p>
    } @empty { <p>Aucun membre.</p> }
  `,
})
export class MembreListComponent {
  membres = input.required<Membre[]>();
  retirer = output<string>();
}
```

### 2.3 Le pattern facade

Quand une feature grossit (état + appels API + cache + règles métier), le smart component ne doit pas connaître tous les détails. On interpose une **facade** : un service qui expose un état en lecture seule (signals `readonly`) et des méthodes d'intention (`charger()`, `inviter()`, `retirer()`). Le composant ne parle qu'à la facade.

```typescript
@Injectable({ providedIn: 'root' })
export class FamilleService {
  private http = inject(HttpClient);
  private readonly _membres = signal<Membre[]>([]);
  readonly membres = this._membres.asReadonly();   // exposé en lecture seule
  readonly nombre = computed(() => this._membres().length);

  charger(familleId: string) {
    this.http.get<Membre[]>(`/api/familles/${familleId}/membres`)
      .subscribe(m => this._membres.set(m));       // subscribe → la requête cold part
  }
  retirer(id: string) {
    this._membres.update(list => list.filter(m => m.id !== id));
  }
}
```

Le composant ne sait pas si les données viennent d'un cache, du réseau ou d'un store. Il demande, la facade décide. C'est ce qu'attend une revue de code sur une grosse feature.

### 2.4 Les providers globaux : `app.config.ts`

En Angular 19 standalone, il n'y a plus de `NgModule` : tout se configure dans `bootstrapApplication`. C'est le point d'entrée que tu ouvres en premier sur une mission.

```typescript
// app.config.ts — API vérifiée Context7 (/angular/angular)
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),  // ordre = important
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};

// main.ts
bootstrapApplication(App, appConfig).catch(err => console.error(err));
```

### 2.5 Deux recettes de mission : config runtime et error handler global

**Config runtime** — l'`apiUrl` ne doit pas être compilée en dur : elle change entre recette et prod. On la charge au démarrage :

```typescript
// provider dans app.config.ts — bloque le boot tant que la config n'est pas chargée
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const cfg = inject(AppConfigService);
    return () => cfg.load();   // fetch('/assets/config.json')
  },
  multi: true,
}
```

**Error handler global** — capturer toute erreur non gérée en un seul endroit, la logger et prévenir l'utilisateur, au lieu de laisser l'app planter silencieusement :

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);
  handleError(error: unknown) {
    this.logger.error('Erreur non gérée', error);
    // + notification utilisateur (snackbar)
  }
}
```

### 2.6 Feature flags signal-based

Livrer une feature en cachette derrière un drapeau, pour l'activer sans redéployer :

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private flags = signal(environment.featureFlags);
  isEnabled = (flag: string) => computed(() => this.flags()[flag] ?? false);
}
// Template : @if (nouvelleInvitation()) { <app-invitation-v2 /> } @else { <app-invitation-v1 /> }
```

### 2.7 Conventions qui passent en revue

- **Nommage** : fichiers `kebab-case` + suffixe (`famille.service.ts`, `auth.guard.ts`) ; classes `PascalCase` + suffixe (`FamilleService`) ; selectors préfixés `app-`.
- **Signals `readonly`** dès qu'ils ne doivent pas être écrits de l'extérieur (`asReadonly()`).
- **Pas de `any` non justifié** : chaque payload API a une interface.
- **Conventional commits** : `feat(famille): ajout invitation membre`, `fix(auth): refresh token`, `refactor(shared): extraction du spinner`. Non négociable en ESN.
- **Subscriptions nettoyées** : `takeUntilDestroyed()` ou `toSignal()`, jamais un `subscribe` qui fuit.

### 2.8 Se préparer à l'entretien technique

L'entretien Angular ESN suit trois strates. Sache donner, à froid, une réponse d'une phrase à chacune :

| Strate | Exemples de questions | Réflexe de réponse |
|---|---|---|
| Fondamentaux | standalone ? `signal` vs `Observable` ? DI ? `@if` vs `*ngIf` ? | définition + un mot sur le *pourquoi* |
| Intermédiaire | `switchMap` vs `mergeMap` ? interceptor ? guards ? tester un composant ? | nom de l'API + cas d'usage concret |
| Avancé | zoneless ? facade ? RBAC front ? state à grande échelle ? | position architecturale, pas juste l'API |

Un exemple type : **« `signal()` vs `computed()` ? »** → « `signal()` est un état source, modifiable via `set`/`update` ; `computed()` en dérive une valeur en lecture seule, lazy et mémoïsée, recalculée quand ses dépendances changent. » Une phrase, précise, sans hésiter.

---

## 3. Worked examples

### Exemple 1 — refactoriser le composant du §1 en architecture de mission

On reprend le `FamilleComponent` « tout mélangé » et on l'éclate proprement.

```typescript
// core/models/membre.ts — le typage d'abord
export interface Membre {
  id: string;
  nom: string;
  role: 'parent' | 'enfant';
}

// features/famille/services/famille.service.ts — la facade
@Injectable({ providedIn: 'root' })
export class FamilleService {
  private http = inject(HttpClient);
  private readonly _membres = signal<Membre[]>([]);
  private readonly _chargement = signal(false);

  readonly membres = this._membres.asReadonly();
  readonly chargement = this._chargement.asReadonly();
  readonly nombre = computed(() => this._membres().length);

  charger(familleId: string) {
    this._chargement.set(true);
    this.http.get<Membre[]>(`/api/familles/${familleId}/membres`)
      .pipe(takeUntilDestroyed())        // pas de fuite (appelé en contexte d'injection)
      .subscribe({
        next: m => { this._membres.set(m); this._chargement.set(false); },
        error: () => this._chargement.set(false),
      });
  }

  inviter(email: string) {
    return this.http.post<Membre>('/api/invitations', { email });
  }
}
```

```typescript
// features/famille/famille.component.ts — SMART : orchestre, ne dessine pas
@Component({
  selector: 'app-famille',
  imports: [MembreListComponent],
  template: `
    <h1>Ma famille ({{ service.nombre() }})</h1>
    @if (service.chargement()) {
      <p>Chargement…</p>
    } @else {
      <app-membre-list [membres]="service.membres()" />
    }
  `,
})
export class FamilleComponent {
  protected service = inject(FamilleService);
  // withComponentInputBinding + route param → familleId injecté (module 14) ; on suppose '1'
  constructor() { this.service.charger('1'); }
}
```

Chaque reproche du §1 est levé : typage (`Membre`), pas de `fetch` (HttpClient, dans la zone via signals), service séparé (testable), état de chargement, séparation smart/dumb. **C'est exactement ce diff qu'une revue attend.**

### Exemple 2 — répondre en entretien à « comment sécurises-tu une route ? »

Réponse orale d'une phrase, puis le code qu'on te demandera d'esquisser au tableau :

> « Un guard fonctionnel `CanActivateFn` : il injecte le service d'auth, et retourne `true` ou une redirection vers `/login` via `inject(Router)`. On l'attache à la route avec `canActivate: [...]`. »

```typescript
// core/guards/auth.guard.ts — API vérifiée Context7 (CanActivateFn)
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estConnecte() ? true : router.createUrlTree(['/login']);
};

// app.routes.ts
{ path: 'famille', canActivate: [authGuard], loadComponent: () =>
    import('./features/famille/famille.component').then(m => m.FamilleComponent) }
```

Le point qui impressionne : ajouter « **le guard côté front est un confort UX ; la vraie sécurité reste côté serveur** ». C'est la phrase qui distingue un junior d'un profil de mission.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Mettre l'appel HTTP dans le composant plutôt que dans un service

```typescript
// ❌ fetch/HttpClient directement dans le composant : intestable, non réutilisable
ngOnInit() { fetch('/api/membres').then(/* ... */); }

// ✅ le composant demande à une facade ; le service parle à l'API
constructor() { this.service.charger(); }
```

En revue ESN, un appel réseau dans un composant est un refus quasi automatique. Le composant orchestre, le service communique.

### PIÈGE #2 — Une feature qui importe une autre feature

```typescript
// ❌ features/famille importe features/facturation → couplage, cycle, lazy loading cassé
import { FactureService } from '../facturation/services/facture.service';

// ✅ ce qui est partagé remonte dans shared/ (sans état) ou core/ (singleton)
import { DateFrPipe } from '@shared/pipes';
```

La règle de dépendance est unidirectionnelle : `features → shared → core`, jamais l'inverse ni entre features.

### PIÈGE #3 — Confondre `providedIn: 'root'` (singleton) et `providers: []` (instance locale)

```typescript
// ❌ deux pages partagent le MÊME état de formulaire sans le vouloir
@Injectable({ providedIn: 'root' }) export class FormStateService { data = signal({}); }

// ✅ instance isolée par composant/route
@Injectable() export class FormStateService { data = signal({}); }
@Component({ providers: [FormStateService] }) export class FormPage {}
```

`root` = un seul objet pour toute l'app ; `providers: []` = un objet neuf par composant. Le choix change le comportement de partage d'état — piège classique sur les états temporaires.

### PIÈGE #4 — `subscribe` qui fuit / requête cold jamais lancée

```typescript
// ❌ fuite mémoire : la souscription survit au composant
this.service.charger().subscribe(/* ... */);

// ❌ requête JAMAIS envoyée : HttpClient est cold, personne ne consomme
this.http.get('/api/membres');

// ✅ nettoyage automatique + consommation
this.http.get<Membre[]>('/api/membres')
  .pipe(takeUntilDestroyed())
  .subscribe(m => this.membres.set(m));
```

Deux pièges jumeaux venant de Vue/React : là-bas `fetch()` part tout seul et le cleanup est automatique ; en Angular, il faut **consommer** (subscribe/`toSignal`/`| async`) **et** nettoyer.

### PIÈGE #5 — Réviser l'entretien par cœur sans savoir *justifier*

```text
❌ « OnPush, c'est une stratégie de change detection. »   (récité, creux)
✅ « OnPush ne vérifie la vue que si un input change de référence
     ou si un signal lu dans le template change — moins de vérifications,
     base du mode zoneless. »                              (justifié, situé)
```

En entretien de mission, on ne teste pas ta mémoire du nom de l'API, on teste si tu sais **quand** et **pourquoi** l'utiliser. Chaque réponse = définition + un mot sur le trade-off.

### PIÈGE #6 — Livrer sans état de chargement ni gestion d'erreur

```typescript
// ❌ l'utilisateur voit un écran figé pendant le réseau, et rien si ça échoue
charger() { this.http.get<Membre[]>('/api/membres').subscribe(m => this.membres.set(m)); }

// ✅ chargement + erreur explicites (signaux d'UI)
charger() {
  this.chargement.set(true);
  this.http.get<Membre[]>('/api/membres').subscribe({
    next: m => { this.membres.set(m); this.chargement.set(false); },
    error: () => { this.erreur.set('Impossible de charger'); this.chargement.set(false); },
  });
}
```

« Pas de loading state ni de message d'erreur » est une ligne récurrente des checklists de revue ESN. Un écran de mission gère toujours les trois états : chargement, succès, erreur.

---

## 5. Ancrage TribuZen

Ce module **est** l'ancrage : il assemble tout TribuZen. La feature « famille » récapitule chaque couche vue au parcours :

| Couche du parcours | Où elle apparaît dans la feature famille |
|---|---|
| Composants standalone + control flow (00-03) | `FamilleComponent`, `MembreListComponent`, `@if`/`@for`/`@empty` |
| Signals `signal`/`computed`/`asReadonly` (02, 09) | état `membres`, `nombre`, `chargement` dans la facade |
| `input()`/`output()` (05) | `MembreListComponent` en dumb component |
| DI `inject` / `providedIn` (11-13) | `FamilleService`, `AuthService`, tokens de config |
| Routing + guards + lazy (14-15) | `famille.routes.ts`, `authGuard`, `loadComponent` |
| HttpClient + interceptors (18) | `charger()`, `inviter()`, `authInterceptor`, `errorInterceptor` |
| Formulaires réactifs (19-20) | formulaire d'invitation validé |
| Auth JWT (25) | `authGuard` sur la route, token injecté par l'interceptor |

Arborescence cible dans `smaurier/tribuzen` :

```
tribuzen/src/app/
├── core/
│   ├── guards/auth.guard.ts
│   ├── interceptors/{auth,error}.interceptor.ts
│   └── models/membre.ts
├── shared/components/spinner/
├── features/famille/
│   ├── famille.component.ts            ← smart
│   ├── components/membre-list.component.ts   ← dumb
│   ├── components/invitation-form.component.ts ← formulaire réactif
│   ├── services/famille.service.ts     ← facade
│   └── famille.routes.ts
├── app.config.ts
└── app.routes.ts
```

C'est le livrable du **projet final** (le lab de ce module).

---

## 6. Points clés

1. Un projet de mission se structure en `core` (singletons), `shared` (réutilisable sans état) et `features` (domaines lazy-loadés) — dépendances unidirectionnelles `features → shared → core`.
2. On sépare **smart** (injecte, orchestre) et **dumb** (reçoit par `input()`, émet par `output()`, n'injecte rien).
3. La **facade** interpose un service à état `readonly` entre le composant et les détails (API, cache, store) ; le composant exprime une intention, la facade exécute.
4. Tout se configure dans `app.config.ts` / `bootstrapApplication` : `provideRouter`, `provideHttpClient(withInterceptors([...]))`, `ErrorHandler` global, `APP_INITIALIZER` pour la config runtime.
5. Les réflexes qui passent en revue : typage strict (pas de `any`), signals `readonly`, `takeUntilDestroyed`, conventional commits, états chargement/erreur systématiques.
6. Les pièges récurrents de mission : HTTP dans le composant, feature qui importe une feature, `root` vs `providers`, subscribe qui fuit ou requête cold, entretien récité sans justification, écran sans loading/erreur.
7. En entretien : une phrase par question = définition + trade-off ; distinguer les trois strates (fondamentaux / intermédiaire / avancé) ; toujours situer le front par rapport à la sécurité serveur.

---

## 7. Seeds Anki

```
Quels sont les trois dossiers d'une architecture Angular de mission et leur règle de dépendance ?|core (singletons), shared (réutilisable sans état), features (domaines lazy-loadés). Dépendances unidirectionnelles : features → shared → core, jamais l'inverse ni entre features.
Quelle est la différence entre un smart component et un dumb component ?|Smart (container) : injecte les services, orchestre l'état, peu de HTML. Dumb (présentational) : reçoit tout par input(), émet par output(), n'injecte aucun service métier, réutilisable et facile à tester.
À quoi sert le pattern facade dans une feature Angular ?|Interposer un service à état readonly entre le composant et les détails (API, cache, store). Le composant exprime une intention (charger, inviter), la facade décide comment l'exécuter. Découple l'UI de l'implémentation.
Où configure-t-on les providers globaux d'une app Angular 19 standalone ?|Dans app.config.ts via bootstrapApplication : provideRouter(routes), provideHttpClient(withInterceptors([...])), ErrorHandler global, APP_INITIALIZER pour la config runtime. Plus de NgModule.
Pourquoi un appel HTTP dans un composant est-il refusé en revue ESN ?|Il rend le composant intestable et non réutilisable, mélange orchestration et communication réseau, et court-circuite la couche service. Le composant demande à une facade ; le service parle à l'API.
Quelle est la différence entre providedIn root et providers dans un composant ?|providedIn: 'root' = singleton global partagé par toute l'app. providers: [Service] dans @Component = nouvelle instance par composant. Confondre les deux cause des bugs de partage d'état, surtout sur les formulaires.
Comment répondre en entretien à « signal() vs computed() » ?|signal() est un état source, modifiable via set/update. computed() en dérive une valeur en lecture seule, lazy et mémoïsée, recalculée quand ses dépendances changent. Une phrase, précise.
Quels trois états un écran de mission doit-il toujours gérer ?|Chargement (spinner), succès (données affichées), erreur (message). « Pas de loading state ni de message d'erreur » est un refus récurrent en revue de code ESN.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-26-recettes-esn-et-pieges/README.md`. **Projet final** : construire la feature « famille » de bout en bout dans un vrai projet Angular CLI — architecture `core/shared/features`, smart/dumb components, facade signal-based, routing + guard, HttpClient, formulaire réactif validé. Zéro gap-fill, corrigé intégral commenté, dev server comme oracle.
