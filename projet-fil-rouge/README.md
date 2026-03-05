# DevDesk — Application de gestion de taches Kanban

> **Projet fil rouge** de la formation Angular 19+
> Un tableau Kanban style Trello simplifie, construit progressivement a chaque module de la formation.

---

## Presentation

**DevDesk** est une application de gestion de taches organisee en tableau Kanban. Elle permet de visualiser, creer, modifier et organiser des taches dans des colonnes representant les differents statuts (A faire, En cours, Termine).

Ce projet est concu pour etre construit **progressivement** tout au long de la formation Angular. Chaque module ajoute une couche fonctionnelle ou technique au projet, de sorte qu'a la fin de la formation, vous disposez d'une application complete et professionnelle.

**Stack technique :**
- Angular 19+ (standalone, Signals)
- Angular Material (UI)
- NgRx SignalStore (state management)
- Reactive Forms (formulaires)
- Playwright (tests E2E)
- GitHub Actions (CI/CD)

---

## Fonctionnalites finales

### Tableau Kanban
- Trois colonnes : **A faire**, **En cours**, **Termine**
- Drag & drop des taches entre les colonnes (Angular CDK)
- Nombre de taches affiche par colonne
- Tri des taches par priorite, date de creation ou assignee

### CRUD de taches
- Creer une tache avec titre, description, priorite et assignee
- Modifier une tache (formulaire reactif avec validation)
- Supprimer une tache avec confirmation
- Page de detail d'une tache avec historique des modifications

### Dashboard avec statistiques
- Nombre de taches par statut (camembert ou barres)
- Nombre de taches par priorite
- Taches recemment modifiees
- Progression globale (pourcentage de taches terminees)

### Navigation multi-pages
- **Board** (`/board`) — Vue Kanban principale
- **Dashboard** (`/dashboard`) — Statistiques et graphiques
- **Detail tache** (`/tasks/:id`) — Page de detail d'une tache
- **Login** (`/login`) — Page de connexion
- **404** (`/**`) — Page introuvable

### Authentification JWT
- Connexion avec email/mot de passe
- Inscription de nouveaux utilisateurs
- Garde de routes pour les pages protegees
- Intercepteur HTTP pour le token Bearer
- Affichage conditionnel selon le role (admin/user)

### Interface utilisateur (Angular Material)
- Theme personnalise avec palette de couleurs
- Composants Material : Table, Dialog, Snackbar, Form fields, Toolbar, Sidenav
- Mode sombre (toggle)
- Design responsive

### Suite de tests complete
- Tests unitaires des services (TaskService, AuthService)
- Tests des composants (TaskCard, Board, Dashboard)
- Tests E2E avec Playwright (creation, modification, suppression, drag & drop)

---

## Types TypeScript

```typescript
// === ENUMS ===

/** Priorite d'une tache */
export enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

/** Statut d'une tache dans le tableau Kanban */
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'inProgress',
  Done = 'done',
}

// === INTERFACES ===

/** Represente une tache dans le tableau Kanban */
export interface Task {
  /** Identifiant unique (UUID v4) */
  readonly id: string;

  /** Titre de la tache (obligatoire, 3-100 caracteres) */
  readonly title: string;

  /** Description detaillee (optionnelle, max 500 caracteres) */
  readonly description: string;

  /** Statut courant dans le Kanban */
  readonly status: TaskStatus;

  /** Niveau de priorite */
  readonly priority: Priority;

  /** Utilisateur assigne a la tache (null si non assignee) */
  readonly assignee: User | null;

  /** Date de creation (generee automatiquement) */
  readonly createdAt: Date;

  /** Date de derniere modification (mise a jour automatiquement) */
  readonly updatedAt: Date;
}

/** Represente une colonne du tableau Kanban */
export interface Column {
  /** Identifiant unique de la colonne */
  readonly id: string;

  /** Titre affiche de la colonne (ex: "A faire") */
  readonly title: string;

  /** Statut des taches dans cette colonne */
  readonly status: TaskStatus;

  /** Liste ordonnee des taches dans la colonne */
  readonly tasks: Task[];
}

/** Represente un utilisateur de l'application */
export interface User {
  /** Identifiant unique (UUID v4) */
  readonly id: string;

  /** Nom complet de l'utilisateur */
  readonly name: string;

  /** Adresse email (unique) */
  readonly email: string;

  /** Role de l'utilisateur */
  readonly role: 'admin' | 'user';
}

/** Donnees de creation d'une tache (sans id ni dates) */
export type CreateTaskDto = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'assignee'> & {
  assigneeId?: string;
};

/** Donnees de mise a jour partielle d'une tache */
export type UpdateTaskDto = Partial<Omit<Task, 'id' | 'createdAt'>>;
```

---

## Construction progressive par module

| Module | Ce que vous construisez | Concepts pratiques |
|--------|------------------------|--------------------|
| **00 — De Vue a Angular** | Initialisation du projet `ng new devdesk`, structure de dossiers, premier composant `AppComponent` | CLI Angular, composant standalone, structure de projet |
| **01 — Composants & Templates** | Composants `TaskCardComponent`, `ColumnComponent`, `BoardComponent` avec inputs/outputs, affichage conditionnel et boucles | `@Component`, `input()`, `output()`, `@if`, `@for`, `ng-content` |
| **02 — Signals avances** | Signaux pour l'etat local des composants, computed pour les compteurs par colonne, effect pour la persistance localStorage | `signal()`, `computed()`, `effect()`, `linkedSignal()` |
| **03 — Services & DI** | `TaskService` pour centraliser les operations CRUD, `ConfigService` avec InjectionToken | `@Injectable`, `inject()`, `InjectionToken`, `providedIn` |
| **04 — Routing** | Navigation Board / Dashboard / Detail, parametres de route pour la page detail, guard pour les routes protegees | Routes, `routerLink`, `ActivatedRoute`, `canActivate`, lazy loading |
| **05 — RxJS Essentiel** | Recherche de taches avec debounce, filtrage temps reel, gestion du cycle de vie des subscriptions | `debounceTime`, `switchMap`, `takeUntilDestroyed`, `toSignal` |
| **06 — HTTP & API** | Connexion a une API REST (ou json-server), intercepteur pour les headers, gestion d'erreurs globale | `HttpClient`, `HttpInterceptorFn`, `catchError`, `retry` |
| **07 — Formulaires** | Formulaire de creation/edition de tache avec validation, champs dynamiques (tags), UX avec messages d'erreur | `FormGroup`, `Validators`, `FormArray`, formulaires types |
| **08 — Angular Material** | Theme DevDesk, toolbar, sidenav, dialog de confirmation, snackbar de feedback, table de taches, drag & drop CDK | Material components, CDK `DragDrop`, theming, dark mode |
| **09 — Tests** | Tests unitaires du `TaskService`, tests du `BoardComponent`, tests E2E du workflow complet | `TestBed`, `HttpTestingController`, Playwright, Page Objects |
| **10 — State Management** | Migration vers NgRx SignalStore, gestion d'entites, optimistic updates | `signalStore()`, `withEntities()`, `patchState()` |
| **11 — CI/CD & Auth** | Pipeline GitHub Actions, authentification JWT complete, protection des routes par role | GitHub Actions, `AuthService`, intercepteur auth, guards |
| **12 — Recettes ESN** | Optimisation (OnPush, lazy loading, bundle analysis), architecture propre, preparation entretien | `ChangeDetectionStrategy.OnPush`, tree-shaking, conventions |

---

## Wireframes (ASCII art)

### Vue Board (page principale)

```
+------------------------------------------------------------------+
| DevDesk                          [Dashboard] [Board]    [Logout]  |
+------------------------------------------------------------------+
|                                                                    |
|  +-------------------+  +-------------------+  +-----------------+ |
|  | A FAIRE (3)       |  | EN COURS (2)      |  | TERMINE (1)    | |
|  +-------------------+  +-------------------+  +-----------------+ |
|  |                   |  |                   |  |                 | |
|  | +---------------+ |  | +---------------+ |  | +-------------+ | |
|  | | #12 Fix bug   | |  | | #8 Ajouter   | |  | | #5 Setup    | | |
|  | | Priorite: !!  | |  | | filtre        | |  | | CI/CD       | | |
|  | | @Sophie       | |  | | Priorite: !   | |  | | Priorite: ! | | |
|  | +---------------+ |  | | @Marc         | |  | | @Sophie     | | |
|  |                   |  | +---------------+ |  | +-------------+ | |
|  | +---------------+ |  |                   |  |                 | |
|  | | #14 Refacto   | |  | +---------------+ |  |                 | |
|  | | service       | |  | | #10 Dark mode | |  |                 | |
|  | | Priorite: !   | |  | | Priorite: !!! | |  |                 | |
|  | | @Marc         | |  | | @Sophie       | |  |                 | |
|  | +---------------+ |  | +---------------+ |  |                 | |
|  |                   |  |                   |  |                 | |
|  | +---------------+ |  |                   |  |                 | |
|  | | #15 Ecrire    | |  |                   |  |                 | |
|  | | tests E2E     | |  |                   |  |                 | |
|  | | Priorite: !!  | |  |                   |  |                 | |
|  | | Non assigne   | |  |                   |  |                 | |
|  | +---------------+ |  |                   |  |                 | |
|  |                   |  |                   |  |                 | |
|  | [+ Nouvelle tache]|  |                   |  |                 | |
|  +-------------------+  +-------------------+  +-----------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

### Vue Detail de tache

```
+------------------------------------------------------------------+
| DevDesk                          [Dashboard] [Board]    [Logout]  |
+------------------------------------------------------------------+
|                                                                    |
|  [< Retour au board]                                               |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  | Tache #12 — Fix bug d'affichage sur mobile                   | |
|  +--------------------------------------------------------------+ |
|  |                                                              | |
|  |  Statut : [En cours v]     Priorite : [Haute v]              | |
|  |  Assignee : [Sophie v]                                       | |
|  |                                                              | |
|  |  Description :                                               | |
|  |  +----------------------------------------------------------+| |
|  |  | Le composant TaskCard ne s'affiche pas correctement      || |
|  |  | sur les ecrans de moins de 768px. Le titre est tronque   || |
|  |  | et les boutons d'action ne sont pas visibles.            || |
|  |  +----------------------------------------------------------+| |
|  |                                                              | |
|  |  Cree le : 15/02/2026    Modifie le : 03/03/2026            | |
|  |                                                              | |
|  |  [Modifier]  [Supprimer]                                     | |
|  +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

### Vue Dashboard

```
+------------------------------------------------------------------+
| DevDesk                          [Dashboard] [Board]    [Logout]  |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------------+  +----------------------------------+ |
|  | Taches par statut      |  | Taches par priorite              | |
|  +------------------------+  +----------------------------------+ |
|  |                        |  |                                  | |
|  |  A faire    : ███ 3    |  |  Basse    : █ 1                 | |
|  |  En cours   : ██ 2     |  |  Moyenne  : ██ 2                | |
|  |  Termine    : █ 1      |  |  Haute    : ██ 2                | |
|  |                        |  |  Urgente  : █ 1                 | |
|  |  Total : 6 taches      |  |                                  | |
|  +------------------------+  +----------------------------------+ |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  | Progression globale                                           | |
|  +--------------------------------------------------------------+ |
|  |                                                              | |
|  |  [===========>                              ] 17%            | |
|  |  1 tache terminee sur 6                                      | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  | Recemment modifiees                                           | |
|  +--------------------------------------------------------------+ |
|  | # | Titre                    | Statut    | Modifie le        | |
|  |---|--------------------------|-----------|-------------------| |
|  | 10| Dark mode                | En cours  | 03/03/2026        | |
|  | 12| Fix bug mobile           | En cours  | 03/03/2026        | |
|  | 15| Ecrire tests E2E         | A faire   | 02/03/2026        | |
|  +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Structure de dossiers recommandee

```
src/app/
  core/                          # Services singleton, guards, intercepteurs
    services/
      auth.service.ts
      task.service.ts
    guards/
      auth.guard.ts
      admin.guard.ts
    interceptors/
      auth.interceptor.ts
  features/                      # Modules fonctionnels (feature-based)
    board/
      components/
        board.component.ts
        column.component.ts
        task-card.component.ts
      board.routes.ts
    dashboard/
      components/
        dashboard.component.ts
        stats-chart.component.ts
      dashboard.routes.ts
    task-detail/
      components/
        task-detail.component.ts
        task-form.component.ts
      task-detail.routes.ts
    auth/
      components/
        login.component.ts
        register.component.ts
      auth.routes.ts
  shared/                        # Composants, pipes et directives reutilisables
    components/
      navbar.component.ts
      confirm-dialog.component.ts
    pipes/
      priority-label.pipe.ts
    directives/
      auto-focus.directive.ts
  store/                         # State management (NgRx SignalStore)
    task.store.ts
    task-entity.store.ts
  models/                        # Interfaces et types TypeScript
    task.model.ts
    user.model.ts
    column.model.ts
  app.component.ts
  app.routes.ts
  app.config.ts
```

---

## Pour commencer

```bash
# Creer le projet
ng new devdesk --style=scss --routing --ssr=false

# Ajouter Angular Material
ng add @angular/material

# Ajouter NgRx SignalStore (module 10)
npm install @ngrx/signals

# Ajouter Playwright (module 09)
npm init playwright@latest

# Lancer l'application
ng serve
```

---

> **Conseil** : Ne cherchez pas a tout construire d'un coup. Suivez les modules dans l'ordre et ajoutez les fonctionnalites au fur et a mesure. Le projet grandira naturellement avec vos competences.
