# Cours 15 — Providers et scopes d'injection

> **Objectif** : Comprendre la hiérarchie des injecteurs Angular (root, route, component), configurer des providers avec `useClass`, `useValue`, `useFactory`, `useExisting`, et savoir choisir le bon scope selon le cas d'usage.

---

## Rappel du cours précédent

<details>
<summary>Que fait providedIn: 'root' dans @Injectable() ?</summary>

Il enregistre le service comme un **singleton** au niveau de l'application entière. L'instance est partagée par tous les composants, et le service est tree-shakable (supprimé du bundle s'il n'est pas injecté).
</details>

<details>
<summary>Quelle est la différence entre inject() et l'injection par constructeur ?</summary>

`inject()` est la manière moderne (Angular 14+) : pas besoin de constructeur, fonctionne dans les guards/interceptors fonctionnels, et est plus lisible. L'injection par constructeur est l'ancien style, toujours fonctionnel mais moins recommandé.
</details>

<details>
<summary>Quel est l'équivalent Vue d'un service Angular ?</summary>

Un composable (`useXxx()`). La différence : Angular gère automatiquement le cycle de vie et le scope via l'injection de dépendances, alors qu'en Vue c'est le développeur qui contrôle le partage (variable au niveau module pour un singleton, ou dans le setup pour une instance par composant).
</details>

---

## Analogie

Imagine un immeuble d'entreprise :
- Le **hall d'entrée** (root) à une machine à café partagée par tout le monde.
- Chaque **étage** (route) a sa propre imprimante, partagée par tous les bureaux de l'étage.
- Chaque **bureau** (component) a sa propre corbeille à papier, pas partagée.

En Angular, c'est exactement la même hiérarchie. Un service peut être fourni à différents niveaux, et chaque niveau contrôle **qui partage la même instance**.

---

## Théorie

### La hiérarchie des injecteurs

Angular possède un arbre d'injecteurs qui suit la structure de l'application :

```
                    ┌──────────────────────┐
                    │   Root Injector      │  ← providedIn: 'root'
                    │   (singleton global)  │     ou providers dans
                    │                      │     appConfig
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Route Injector │ │ Route Inject.│ │ Route Inject.│
    │  /admin         │ │ /client      │ │ /public      │
    │  (providers     │ │              │ │              │
    │   dans la route)│ │              │ │              │
    └────────┬────────┘ └──────────────┘ └──────────────┘
             │
    ┌────────┼────────┐
    ▼                 ▼
┌──────────┐   ┌──────────┐
│Component │   │Component │  ← providers dans @Component
│Injector A│   │Injector B│     (instance par composant)
└──────────┘   └──────────┘
```

Quand un composant demandé un service via `inject()`, Angular cherche **de bas en haut** :
1. D'abord dans le composant lui-même
2. Puis dans la route parente
3. Puis dans le root injector

---

### Niveau 1 : Root (singleton global)

```typescript
// Manière 1 : providedIn (recommandé — tree-shakable)
@Injectable({ providedIn: 'root' })
export class AuthService {}

// Manière 2 : dans appConfig (utile pour les services tiers)
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    AuthService,  // Pas tree-shakable, mais parfois nécessaire
  ]
};
```

**Quand utiliser root** : authentification, thème, configuration, services partagés globalement.

---

### Niveau 2 : Route (partagé dans une section)

```typescript
// routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    providers: [
      AdminDashboardService,  // Nouvelle instance pour la section admin
    ],
    children: [
      { path: '', component: AdminHomeComponent },
      { path: 'users', component: AdminUsersComponent },
      // Tous ces composants partagent la MÊME instance de AdminDashboardService
    ]
  },
  {
    path: 'client',
    providers: [
      // Section client a ses propres services
    ],
    children: [/* ... */]
  }
];
```

**Quand utiliser route** : état spécifique à une section (dashboard admin, espace client), service qui doit être détruit quand on quitte la section.

---

### Niveau 3 : Component (instance par composant)

```typescript
@Component({
  selector: 'app-formulaire-edition',
  providers: [FormValidationService],  // Nouvelle instance par composant
  template: `...`
})
export class FormulaireEditionComponent {
  private validation = inject(FormValidationService);
}
```

Si tu as 3 instances de `FormulaireEditionComponent` dans la page, chacune aura sa propre instance de `FormValidationService`.

**Quand utiliser component** : formulaires indépendants, composants avec état isolé, composants réutilisables qui ne doivent pas partager leur état.

```typescript
// ❌ Tous les formulaires partagent le même service → bugs
@Injectable({ providedIn: 'root' })
export class FormValidationService {
  erreurs = signal<string[]>([]);
}

// ✅ Chaque formulaire a sa propre instance
@Component({
  providers: [FormValidationService]
})
export class FormulaireComponent {}
```

---

### Les types de providers : useClass, useValue, useFactory, useExisting

#### useClass — Remplacer l'implémentation

```typescript
// Interface (ou classe abstraite)
abstract class LoggerService {
  abstract log(message: string): void;
}

// Implémentation production
class ConsoleLoggerService extends LoggerService {
  log(message: string) { console.log(message); }
}

// Implémentation pour les tests ou le dev
class SilentLoggerService extends LoggerService {
  log(message: string) { /* rien */ }
}

// Configuration
providers: [
  {
    provide: LoggerService,
    useClass: environment.production
      ? ConsoleLoggerService
      : SilentLoggerService,
  }
]
```

**Cas ESN** : remplacer un service de paiement réel par un mock en environnement de développement.

---

#### useValue — Fournir une valeur constante

```typescript
import { InjectionToken } from '@angular/core';

// Token typé (on verra ça en détail au cours suivant)
const API_URL = new InjectionToken<string>('API_URL');
const APP_VERSION = new InjectionToken<string>('APP_VERSION');

providers: [
  { provide: API_URL, useValue: 'https://api.monapp.fr/v2' },
  { provide: APP_VERSION, useValue: '3.1.0' },
]

// Utilisation
const apiUrl = inject(API_URL); // 'https://api.monapp.fr/v2'
```

---

#### useFactory — Créer dynamiquement

```typescript
const AUTH_INTERCEPTOR_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');

providers: [
  {
    provide: AUTH_INTERCEPTOR_CONFIG,
    useFactory: () => {
      const env = inject(EnvironmentService);
      return {
        tokenHeader: 'Authorization',
        loginUrl: `${env.apiUrl}/auth/login`,
        refreshUrl: `${env.apiUrl}/auth/refresh`,
      };
    },
  }
]
```

La factory a accès à `inject()` pour résoudre d'autres dépendances.

```typescript
// Cas fréquent : créer un service qui dépend de la config
providers: [
  {
    provide: HttpCacheService,
    useFactory: () => {
      const config = inject(APP_CONFIG);
      return new HttpCacheService(config.cacheDuration);
    },
  }
]
```

---

#### useExisting — Alias vers un autre provider

```typescript
// Créer un alias : quand quelqu'un demande AbstractLogger, donner le ConsoleLogger
providers: [
  ConsoleLoggerService,
  { provide: AbstractLoggerService, useExisting: ConsoleLoggerService },
]

// Les deux injectent la MÊME instance
const logger1 = inject(ConsoleLoggerService);
const logger2 = inject(AbstractLoggerService);
// logger1 === logger2 → true
```

---

### Multi providers — Plusieurs valeurs pour le même token

```typescript
const VALIDATORS = new InjectionToken<Validator[]>('VALIDATORS');

providers: [
  { provide: VALIDATORS, useClass: EmailValidator, multi: true },
  { provide: VALIDATORS, useClass: MinLengthValidator, multi: true },
  { provide: VALIDATORS, useClass: RequiredValidator, multi: true },
]

// inject() retourne un tableau
const validators = inject(VALIDATORS);
// → [EmailValidator, MinLengthValidator, RequiredValidator]
```

**Cas d'usage** : plugins, validateurs, interceptors HTTP.

---

### Tableau récapitulatif — Quel scope choisir ?

| Situation | Scope | Pourquoi |
|-----------|-------|----------|
| Auth, config, thème | `root` | Partagé globalement, singleton |
| État d'une section (admin, client) | `route` | Détruit quand on quitte la section |
| Formulaire avec état propre | `component` | Chaque instance est indépendante |
| Mock pour les tests | `useClass` | Remplacer l'implémentation |
| URL d'API, constante | `useValue` | Valeur statique |
| Service qui dépend de la config | `useFactory` | Création dynamique |
| Alias d'interface | `useExisting` | Même instance, token différent |

---

## Pratique

### Exercice : Service de logger multi-niveaux

Crée une architecture avec :

1. Une classe abstraite `LoggerService` avec une méthode `log(level, message)`
2. Deux implémentations : `ConsoleLoggerService` et `JsonLoggerService`
3. Utilise `useClass` pour fournir l'implémentation selon un flag
4. Un composant qui injecte `LoggerService` (sans savoir l'implémentation)

<details>
<summary>Voir la solution</summary>

```typescript
// logger.service.ts
export type LogLevel = 'info' | 'warn' | 'error';

export abstract class LoggerService {
  abstract log(level: LogLevel, message: string): void;
}

// console-logger.service.ts
import { Injectable } from '@angular/core';

@Injectable()
export class ConsoleLoggerService extends LoggerService {
  log(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    switch (level) {
      case 'info':  console.log(`[${timestamp}] INFO: ${message}`); break;
      case 'warn':  console.warn(`[${timestamp}] WARN: ${message}`); break;
      case 'error': console.error(`[${timestamp}] ERROR: ${message}`); break;
    }
  }
}

// json-logger.service.ts
@Injectable()
export class JsonLoggerService extends LoggerService {
  private readonly logs: Array<{ level: LogLevel; message: string; timestamp: string }> = [];

  log(level: LogLevel, message: string): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date().toISOString(),
    });
    // En prod, on enverrait ces logs à un service distant
    console.log(JSON.stringify(this.logs[this.logs.length - 1]));
  }
}

// app.config.ts
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: LoggerService,
      useClass: environment.production
        ? JsonLoggerService
        : ConsoleLoggerService,
    },
  ],
};

// mon-composant.component.ts
@Component({
  selector: 'app-dashboard',
  template: `
    <button (click)="tester()">Tester le logger</button>
  `
})
export class DashboardComponent {
  private logger = inject(LoggerService);

  tester() {
    this.logger.log('info', 'Dashboard chargé');
    this.logger.log('warn', 'Données bientôt périmées');
    this.logger.log('error', 'Impossible de charger les stats');
  }
}
```
</details>

---

## Résumé

- Angular à une **hiérarchie d'injecteurs** : root (singleton global), route (section), component (instance par composant).
- `providedIn: 'root'` est le choix par défaut pour les services partagés. C'est tree-shakable.
- `providers: [...]` dans `@Component` crée une **instance isolée** par composant — essentiel pour les formulaires et composants réutilisables.
- `useClass` : remplacer l'implémentation. `useValue` : fournir une constante. `useFactory` : créer dynamiquement. `useExisting` : alias.
- `multi: true` permet de fournir **plusieurs valeurs** pour le même token (plugins, validateurs).
- En ESN, la compréhension du scope d'injection est un point fréquemment évalué en entretien Angular.

---

> **Prochain cours** : [Cours 16 — InjectionToken et patterns avancés de DI](./03-injection-tokens.md)
