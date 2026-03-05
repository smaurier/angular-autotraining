# Cours 16 — InjectionToken et patterns avancés de DI

> **Objectif** : Créer des `InjectionToken<T>` pour injecter des valeurs non-class, maîtriser les options avancées d'injection (`@Optional`, `@Self`, `@SkipSelf`), et implémenter le pattern de configuration injectable courant en entreprise.

---

## Rappel du cours précédent

<details>
<summary>Quels sont les 3 niveaux de la hiérarchie d'injecteurs Angular ?</summary>

1. **Root** : singleton global (`providedIn: 'root'` ou `providers` dans `appConfig`)
2. **Route** : partagé dans une section de routage (`providers` dans la définition de route)
3. **Component** : instance isolée par composant (`providers` dans `@Component`)
</details>

<details>
<summary>Quelle est la différence entre useClass et useExisting ?</summary>

`useClass` crée une **nouvelle instance** de la classe spécifiée. `useExisting` crée un **alias** vers une instance déjà fournie — les deux tokens pointent vers la même instance.
</details>

<details>
<summary>Quand utiliser multi: true dans un provider ?</summary>

Quand on veut fournir **plusieurs valeurs** pour le même token. Angular les collecte dans un tableau. Cas d'usage typiques : validateurs, interceptors, plugins.
</details>

---

## Analogie

En Vue, quand tu veux partager une valeur non-réactive (une URL d'API, un flag de feature, un objet de config) entre composants, tu utilises `provide/inject` avec un symbole comme clé :

```typescript
// Vue
const API_KEY = Symbol('api-key');
provide(API_KEY, 'ma-cle-secrete');
const key = inject(API_KEY);
```

Angular fait exactement la même chose avec `InjectionToken` :

```typescript
// Angular
const API_KEY = new InjectionToken<string>('api-key');
// providers: [{ provide: API_KEY, useValue: 'ma-cle-secrete' }]
const key = inject(API_KEY);
```

Le concept est identique, la syntaxe diffère légèrement.

---

## Théorie

### InjectionToken — Injecter des valeurs non-class

Le système de DI Angular utilise des **tokens** pour identifier les dépendances. Pour les classes, le token est la classe elle-même. Mais pour les chaînes, nombres, objets de config, on a besoin d'un `InjectionToken`.

```typescript
import { InjectionToken } from '@angular/core';

// Déclarer le token avec son type
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS');

export interface FeatureFlags {
  darkMode: boolean;
  newDashboard: boolean;
  betaFeatures: boolean;
}
```

```typescript
// Fournir la valeur
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: 'https://api.monapp.fr/v2' },
    {
      provide: FEATURE_FLAGS,
      useValue: {
        darkMode: true,
        newDashboard: false,
        betaFeatures: false,
      }
    },
  ]
};
```

```typescript
// Injecter la valeur
@Component({ /* ... */ })
export class ApiService {
  private baseUrl = inject(API_BASE_URL);
  private features = inject(FEATURE_FLAGS);

  getEndpoint(path: string): string {
    return `${this.baseUrl}/${path}`;
  }

  isDarkModeEnabled(): boolean {
    return this.features.darkMode;
  }
}
```

---

### InjectionToken avec factory par défaut

Un `InjectionToken` peut avoir une **valeur par défaut** via une factory. Si aucun provider ne le fournit, la factory est utilisée.

```typescript
export const MAX_RETRY = new InjectionToken<number>('MAX_RETRY', {
  providedIn: 'root',
  factory: () => 3,  // Valeur par défaut : 3 retries
});

// Utilisation sans rien configurer
const maxRetry = inject(MAX_RETRY); // → 3

// Ou on override dans un provider spécifique
providers: [
  { provide: MAX_RETRY, useValue: 5 },  // → 5 au lieu de 3
]
```

C'est le pattern idéal pour les **valeurs de configuration avec des défauts sensibles**.

---

### inject() — La fonction préférée (vs constructeur)

`inject()` est utilisable dans :
- Les propriétés de classe (champs)
- Les constructeurs
- Les factories de providers
- Les guards et resolvers fonctionnels
- Les interceptors fonctionnels

```typescript
// ✅ Dans un composant
@Component({ /* ... */ })
export class MonComponent {
  private auth = inject(AuthService);
}

// ✅ Dans un guard fonctionnel
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) return true;
  return router.createUrlTree(['/connexion']);
};

// ✅ Dans une factory
providers: [
  {
    provide: API_SERVICE,
    useFactory: () => {
      const baseUrl = inject(API_BASE_URL);
      return new ApiService(baseUrl);
    },
  }
]
```

```typescript
// ❌ inject() NE fonctionne PAS en dehors du contexte d'injection
function maFonction() {
  const auth = inject(AuthService); // 💥 Erreur : pas de contexte d'injection
}

// ❌ inject() NE fonctionne PAS dans un callback asynchrone
@Component({ /* ... */ })
export class MonComponent {
  async ngOnInit() {
    await delay(100);
    const auth = inject(AuthService); // 💥 Contexte perdu après l'await
  }
}
```

---

### Modificateurs d'injection : @Optional, @Self, @SkipSelf

Ces décorateurs sont **rarement utilisés** dans le code courant, mais ils apparaissent en entretien technique et dans les librairies.

#### @Optional — Ne pas crasher si le service n'existe pas

```typescript
import { inject } from '@angular/core';

// Sans @Optional : erreur si LoggerService n'est pas fourni
const logger = inject(LoggerService); // 💥 NullInjectorError

// Avec { optional: true } : retourne null si pas fourni
const logger = inject(LoggerService, { optional: true }); // → null
```

**Cas d'usage** : un composant de librairie qui utilise un logger s'il est disponible, mais fonctionne aussi sans.

```typescript
@Component({ /* ... */ })
export class MonComposantDeLib {
  private logger = inject(LoggerService, { optional: true });

  doSomething() {
    this.logger?.log('info', 'Action effectuée');
    // Fonctionne même sans LoggerService
  }
}
```

#### @Self — Chercher UNIQUEMENT dans l'injecteur du composant

```typescript
@Component({
  providers: [MonService],
  // ...
})
export class MonComponent {
  // Cherche UNIQUEMENT dans les providers de CE composant
  private service = inject(MonService, { self: true });
}
```

Si `MonService` n'est pas dans les `providers` du composant (même s'il existe au niveau root), Angular lève une erreur.

#### @SkipSelf — Ignorer l'injecteur du composant, chercher au-dessus

```typescript
@Component({
  providers: [CompteurService],
})
export class ComposantEnfant {
  // Ignore le provider local, prend celui du parent
  private compteurParent = inject(CompteurService, { skipSelf: true });

  // Prend le provider local
  private compteurLocal = inject(CompteurService);
}
```

**Cas d'usage classique** : un composant récursif (arbre) où chaque niveau a son propre service mais a aussi besoin d'accéder au service du parent.

---

### Pattern : Configuration injectable

Ce pattern est **très courant en entreprise**. Il permet de configurer un module ou une feature de manière flexible.

```typescript
// tokens/app-config.token.ts
export interface AppConfig {
  apiUrl: string;
  defaultLangue: string;
  maxUploadSize: number;
  features: {
    notifications: boolean;
    chat: boolean;
  };
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

```typescript
// app.config.ts
import { APP_CONFIG, AppConfig } from './tokens/app-config.token';

const config: AppConfig = {
  apiUrl: 'https://api.monapp.fr/v2',
  defaultLangue: 'fr',
  maxUploadSize: 10 * 1024 * 1024, // 10 MB
  features: {
    notifications: true,
    chat: false,
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_CONFIG, useValue: config },
    provideRouter(routes),
  ]
};
```

```typescript
// Utilisation dans n'importe quel service ou composant
@Injectable({ providedIn: 'root' })
export class ApiService {
  private config = inject(APP_CONFIG);

  get<T>(path: string): Promise<T> {
    return fetch(`${this.config.apiUrl}/${path}`).then(r => r.json());
  }
}

@Component({ /* ... */ })
export class UploadComponent {
  private config = inject(APP_CONFIG);

  readonly maxSize = this.config.maxUploadSize;
  readonly chatDisponible = this.config.features.chat;
}
```

---

### Factory providers avec dépendances

```typescript
export const NOTIFICATION_SERVICE = new InjectionToken<NotificationService>(
  'NOTIFICATION_SERVICE'
);

providers: [
  {
    provide: NOTIFICATION_SERVICE,
    useFactory: () => {
      const config = inject(APP_CONFIG);
      const http = inject(HttpClient);

      if (config.features.notifications) {
        return new PushNotificationService(http, config.apiUrl);
      }
      return new NoopNotificationService();
    },
  }
]
```

La factory utilise `inject()` pour récupérer d'autres dépendances et décider quelle implémentation fournir.

---

## Pratique

### Exercice : Configuration multi-environnement

Crée un système de configuration injectable qui :

1. Définit un `InjectionToken<AppConfig>` avec les champs `apiUrl`, `production`, `logLevel`
2. Fournit des valeurs différentes selon l'environnement
3. Crée un `ApiService` qui utilise cette config
4. Crée un `LoggerService` dont le comportement dépend de `logLevel`

<details>
<summary>Voir la solution</summary>

```typescript
// config.token.ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  production: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// configs/dev.config.ts
export const devConfig: AppConfig = {
  apiUrl: 'http://localhost:3000/api',
  production: false,
  logLevel: 'debug',
};

// configs/prod.config.ts
export const prodConfig: AppConfig = {
  apiUrl: 'https://api.monapp.fr/v2',
  production: true,
  logLevel: 'error',
};

// app.config.ts
import { environment } from '../environments/environment';
import { devConfig } from './configs/dev.config';
import { prodConfig } from './configs/prod.config';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_CONFIG,
      useValue: environment.production ? prodConfig : devConfig,
    },
    provideRouter(routes),
  ]
};

// services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private config = inject(APP_CONFIG);

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.config.apiUrl}/${path}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
}

// services/logger.service.ts
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private config = inject(APP_CONFIG);
  private minLevel = LOG_LEVELS[this.config.logLevel];

  debug(msg: string) { this.doLog('debug', msg); }
  info(msg: string)  { this.doLog('info', msg); }
  warn(msg: string)  { this.doLog('warn', msg); }
  error(msg: string) { this.doLog('error', msg); }

  private doLog(level: keyof typeof LOG_LEVELS, msg: string) {
    if (LOG_LEVELS[level] >= this.minLevel) {
      const fn = level === 'debug' ? 'log' : level;
      console[fn](`[${level.toUpperCase()}] ${msg}`);
    }
  }
}
```
</details>

---

## Résumé

- `InjectionToken<T>` permet d'injecter des **valeurs non-class** (string, nombre, config, interface) dans le système de DI Angular.
- Un `InjectionToken` peut avoir une **factory par défaut** avec `providedIn: 'root'` — le provider est optionnel.
- `inject()` est la fonction moderne pour obtenir des dépendances — elle fonctionne partout dans le contexte d'injection (composants, services, guards, factories).
- `{ optional: true }` : ne crash pas si le service n'existe pas. `{ self: true }` : cherche uniquement localement. `{ skipSelf: true }` : ignore le local, cherche au-dessus.
- Le pattern **configuration injectable** (`InjectionToken` + `useValue`) est standard en entreprise pour gérer les environnements.
- Les factories de providers utilisent `inject()` pour créer des services dont l'implémentation dépend de la config.

---

> **Prochain cours** : [Cours 17 — Routing basique](../04-routing/01-routing-basique.md)
