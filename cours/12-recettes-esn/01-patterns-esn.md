# Cours 45 — Patterns et conventions d'entreprise (ESN)

> **Objectif** : Maîtriser l'architecture, les conventions et les patterns organisationnels utilises dans les projets Angular en ESN. Savoir structurer un projet maintenable par une équipe de 5 a 20 développeurs.

---

## Rappel du cours précédent

<details>
<summary>1. Comment Angular protege-t-il contre le XSS par defaut ?</summary>

Angular sanitise automatiquement les interpolations `{{ }}` et les bindings `[innerHTML]`. Les scripts et attributs dangereux (onerror, onclick) sont supprimes.
</details>

<details>
<summary>2. Qu'est-ce qu'un CSP header ?</summary>

Le Content Security Policy indique au navigateur quelles sources de contenu sont autorisees (scripts, styles, connexions API). Il empeche l'exécution de scripts injectes.
</details>

<details>
<summary>3. Comment Angular géré-t-il la protection CSRF ?</summary>

Avec `withXsrfConfiguration()` : le serveur envoie un cookie XSRF-TOKEN, Angular le renvoie dans un header, le serveur vérifié la correspondance.
</details>

---

## Analogie

En équipe Vue 3, tu as discute structure de dossiers, conventions de nommage et workflow Git. En Angular ESN, c'est **encore plus important** : les projets sont plus gros et les équipes tournent.

Pense a l'architecture comme l'**urbanisme d'une ville** : sans plan, chaque quartier se construit de manière anarchique. Avec des conventions claires, un nouveau venu trouve n'importe quel fichier en secondes.

---

## Théorie

### Structure feature-based

```
src/app/
├── core/                     # Singletons (charges une seule fois)
│   ├── guards/
│   ├── interceptors/
│   ├── services/             # auth, logger, error-handler
│   └── models/
├── shared/                   # Reutilisable partout
│   ├── components/           # confirm-dialog, loading-spinner
│   ├── directives/
│   ├── pipes/
│   └── utils/
├── features/                 # Domaines metier (lazy loaded)
│   ├── dashboard/
│   │   ├── dashboard.component.ts
│   │   ├── components/       # sous-composants prives
│   │   └── dashboard.routes.ts
│   ├── tasks/
│   │   ├── task-list/
│   │   ├── task-detail/
│   │   ├── services/task.service.ts
│   │   └── tasks.routes.ts
│   └── auth/
├── layouts/                  # main-layout, auth-layout
├── app.config.ts
└── app.routes.ts
```

```typescript
// ❌ Tout dans un dossier plat — introuvable au-dela de 20 fichiers
src/app/
├── auth.service.ts
├── task.service.ts
├── task-list.component.ts
├── ...50 autres fichiers...

// ✅ Feature-based — chaque domaine est autonome
src/app/features/tasks/
├── task-list/
├── services/task.service.ts
└── tasks.routes.ts
```

### Conventions de nommage

```typescript
// Fichiers : kebab-case + suffixe
task-list.component.ts    task.service.ts    auth.guard.ts    date-fr.pipe.ts

// Classes : PascalCase + suffixe
export class TaskListComponent {}
export class TaskService {}

// Selectors : prefixe app-
selector: 'app-task-list'

// Signals : camelCase
readonly tasks = signal<Task[]>([]);
readonly isLoading = signal(false);
```

### Alias tsconfig et barrel exports

```json
// tsconfig.json
{ "compilerOptions": {
  "paths": {
    "@core/*": ["src/app/core/*"],
    "@shared/*": ["src/app/shared/*"],
    "@features/*": ["src/app/features/*"]
  }
}}
```

```typescript
// ✅ shared/pipes/index.ts — utile pour les shared
export { DateFrPipe } from './date-fr.pipe';
// Usage : import { DateFrPipe } from '@shared/pipes';

// ❌ Barrel exports dans les features — risque de dependances circulaires
```

### Configuration d'environnement

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  featureFlags: { nouveauDashboard: true, exportPdf: false }
};
```

**Config runtime** (charger depuis le serveur) :

```typescript
// app.config.ts
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const config = inject(AppConfigService);
    return () => config.loadConfig();  // fetch('/assets/config.json')
  },
  multi: true,
}
```

### Gestion globale des erreurs

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);
  private readonly snackBar = inject(MatSnackBar);

  handleError(error: unknown) {
    this.logger.error('Erreur non geree', error);
    this.snackBar.open('Une erreur est survenue', 'Fermer', { duration: 5000 });
  }
}

// app.config.ts
providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
```

### Feature flags

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly flags = signal(environment.featureFlags);
  isEnabled = (flag: string) => computed(() => this.flags()[flag] ?? false);
}

// Template
@if (showNewDashboard()) { <app-new-dashboard /> }
@else { <app-legacy-dashboard /> }
```

### Workflow Git et conventional commits

```bash
# Branches
main    develop    feature/JIRA-123-filtre-taches    bugfix/JIRA-456-date

# ❌ Messages flous
git commit -m "fix bug"

# ✅ Conventional commits
git commit -m "feat(tasks): ajout du filtre par statut"
git commit -m "fix(auth): correction du refresh token"
git commit -m "refactor(shared): extraction du DateFrPipe"
```

### Code review checklist

```markdown
- [ ] Code dans la bonne feature (pas de logique metier dans les composants)
- [ ] Pas de `any` non justifie
- [ ] Signaux en readonly quand possible
- [ ] Subscriptions nettoyees (takeUntilDestroyed)
- [ ] Pas de bypassSecurityTrust* sans justification
- [ ] Tests pour les nouveaux services
- [ ] Loading states et messages d'erreur
```

---

## Pratique

Vous demarrez un projet de gestion de tickets avec 4 domaines : **tickets**, **utilisateurs**, **rapports**, **paramètres**. Creez la structure de dossiers, les routes avec lazy loading, et configurez les alias tsconfig.

<details>
<summary>Solution</summary>

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'tickets', pathMatch: 'full' },
      {
        path: 'tickets',
        loadChildren: () => import('./features/tickets/tickets.routes')
          .then(m => m.TICKETS_ROUTES)
      },
      {
        path: 'utilisateurs',
        loadChildren: () => import('./features/utilisateurs/utilisateurs.routes')
          .then(m => m.UTILISATEURS_ROUTES)
      },
      {
        path: 'rapports',
        loadChildren: () => import('./features/rapports/rapports.routes')
          .then(m => m.RAPPORTS_ROUTES)
      },
      {
        path: 'parametres',
        loadChildren: () => import('./features/parametres/parametres.routes')
          .then(m => m.PARAMETRES_ROUTES)
      },
    ]
  },
  { path: 'login', component: LoginComponent },
];

// features/tickets/tickets.routes.ts
export const TICKETS_ROUTES: Routes = [
  { path: '', component: TicketListComponent },
  { path: 'nouveau', component: TicketFormComponent },
  { path: ':id', component: TicketDetailComponent },
];
```

```json
// tsconfig.json
{ "compilerOptions": { "paths": {
  "@core/*": ["src/app/core/*"],
  "@shared/*": ["src/app/shared/*"],
  "@features/*": ["src/app/features/*"]
}}}
```
</details>

---

## Résumé

| Point clé | A retenir |
|---|---|
| Structure | `core/` + `shared/` + `features/` — chaque domaine autonome |
| Nommage | kebab-case fichiers, PascalCase classes, prefixe `app-` |
| Alias | `@core/*`, `@shared/*`, `@features/*` dans tsconfig |
| Config runtime | `APP_INITIALIZER` pour charger depuis le serveur |
| Error handler | `GlobalErrorHandler` pour capturer toutes les erreurs |
| Feature flags | Signal-based pour activer/désactiver des fonctionnalites |
| Commits | `feat:`, `fix:`, `refactor:` — obligatoire en ESN |

---

> **Prochain cours** : [Cours 46 — Entretien technique Angular : 30 questions](./02-entretien-technique.md)
