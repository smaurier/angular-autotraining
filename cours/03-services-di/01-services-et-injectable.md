# Cours 14 — Services et @Injectable

> **Objectif** : Comprendre ce qu'est un service Angular, pourquoi il remplace les composables Vue, utiliser le décorateur `@Injectable()`, créer un service avec la CLI, et l'injecter dans un composant avec `inject()`.

---

## Rappel du cours précédent

<details>
<summary>Quel est le pattern recommandé pour gérer l'état dans un service Angular ?</summary>

Le **Signal Store local** : un service `@Injectable` avec des `signal()` privés, des `computed()` en lecture seule exposés publiquement, et des méthodes publiques pour modifier l'état. On utilise `asReadonly()` pour empêcher les modifications directes.
</details>

<details>
<summary>Pourquoi faut-il éviter de muter directement un objet dans un signal ?</summary>

Angular détecte les changements par **référence**. Si on mute un objet (`user.nom = 'x'`), la référence ne change pas et Angular ne notifie pas les dépendances. Il faut toujours créer un nouvel objet : `update(u => ({ ...u, nom: 'x' }))`.
</details>

<details>
<summary>Quand utiliser un Signal plutôt qu'un Observable ?</summary>

Les Signals couvrent ~80% des besoins : état synchrone, dérivations, état d'UI. Les Observables sont préférés pour les flux asynchrones complexes (WebSocket, debounce, retry, combinaisons avancées).
</details>

---

## Analogie

**En Vue**, tu crées des composables (`useAuth()`, `useCart()`, `useNotification()`) pour partager de la logique entre composants. Ce sont des fonctions qui encapsulent de l'état réactif et des méthodes.

**En Angular**, ce rôle est joué par les **services** : des classes décorées avec `@Injectable()` qui sont **instanciées et distribuées automatiquement** par le framework via l'injection de dépendances (DI).

| Vue | Angular |
|-----|---------|
| `useAuth()` — composable | `AuthService` — service injectable |
| `import { useAuth } from './composables'` | `inject(AuthService)` |
| Instance créée à l'appel | Instance créée par le DI |
| Partagé si exporté depuis un module | Partagé automatiquement (singleton) |

La grande différence : en Vue, c'est **toi** qui décides si un composable est un singleton ou non (variable en dehors de la fonction). En Angular, c'est le **système de DI** qui contrôle le cycle de vie.

---

## Théorie

### Qu'est-ce qu'un service ?

Un service est une **classe TypeScript** qui encapsule de la logique métier, des appels API, de la gestion d'état — tout ce qui n'est pas directement lié à l'affichage.

```typescript
// ❌ Sans service : logique métier dans le composant
@Component({ /* ... */ })
export class ProfilComponent {
  utilisateur = signal<Utilisateur | null>(null);

  async charger() {
    const res = await fetch('/api/utilisateur/moi');
    this.utilisateur.set(await res.json());
  }

  deconnecter() {
    localStorage.removeItem('token');
    this.utilisateur.set(null);
  }
}

// ✅ Avec service : le composant est léger, la logique est réutilisable
@Component({ /* ... */ })
export class ProfilComponent {
  private auth = inject(AuthService);
  utilisateur = this.auth.utilisateurCourant;

  deconnecter() {
    this.auth.deconnecter();
  }
}
```

**Règle ESN** : en mission, les composants ne contiennent que la logique d'affichage. Toute logique métier, appels API, et gestion d'état vont dans des services. C'est un critère évalué en entretien technique.

---

### Le décorateur @Injectable()

`@Injectable()` indique à Angular que cette classe peut **recevoir des dépendances** et **être injectée** dans d'autres classes.

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'  // → singleton pour toute l'application
})
export class NotificationService {
  private readonly _notifications = signal<string[]>([]);
  readonly notifications = this._notifications.asReadonly();

  afficher(message: string): void {
    this._notifications.update(n => [...n, message]);
    setTimeout(() => {
      this._notifications.update(n => n.slice(1));
    }, 3000);
  }
}
```

#### providedIn: 'root'

L'option `providedIn: 'root'` est la plus courante. Elle signifie :
- **Singleton** : une seule instance pour toute l'application
- **Tree-shakable** : si aucun composant n'injecte le service, il est supprimé du bundle
- **Pas besoin de le déclarer** dans un tableau `providers`

```typescript
// ❌ Ancien style (avant Angular 6) — toujours fonctionnel mais déconseillé
@Injectable()
export class MonService {}

// Il fallait le déclarer dans providers :
// providers: [MonService]

// ✅ Moderne — auto-enregistré, tree-shakable
@Injectable({ providedIn: 'root' })
export class MonService {}
```

---

### Créer un service avec la CLI

```bash
# Génère le service + son fichier de test
ng generate service services/auth

# Fichiers créés :
# src/app/services/auth.service.ts
# src/app/services/auth.service.spec.ts

# Raccourci
ng g s services/auth
```

Le fichier généré :

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }
}
```

---

### Injecter un service avec inject()

La fonction `inject()` est la manière **moderne et recommandée** d'injecter des dépendances en Angular 19+.

```typescript
import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-header',
  template: `
    @if (auth.estConnecte()) {
      <span>Bonjour {{ auth.utilisateurCourant()?.prenom }}</span>
      <button (click)="deconnecter()">Déconnexion</button>
    } @else {
      <a routerLink="/connexion">Se connecter</a>
    }
  `
})
export class HeaderComponent {
  // inject() remplace l'injection par constructeur
  private readonly auth = inject(AuthService);
  private readonly notif = inject(NotificationService);

  deconnecter() {
    this.auth.deconnecter();
    this.notif.afficher('Vous êtes déconnecté');
  }
}
```

**inject() vs injection par constructeur** :

```typescript
// ❌ Ancien style : injection par constructeur
@Component({ /* ... */ })
export class MonComponent {
  constructor(
    private auth: AuthService,
    private notif: NotificationService,
  ) {}
}

// ✅ Moderne : inject() — plus lisible, fonctionne dans les fonctions
@Component({ /* ... */ })
export class MonComponent {
  private auth = inject(AuthService);
  private notif = inject(NotificationService);
}
```

Avantages de `inject()` :
- Pas besoin de constructeur
- Fonctionne dans les **guards**, **resolvers**, **interceptors** fonctionnels
- Moins de boilerplate
- Plus facile à lire quand il y a beaucoup de dépendances

---

### Exemple complet : un service d'authentification

```typescript
import { Injectable, signal, computed } from '@angular/core';

export interface Utilisateur {
  id: number;
  email: string;
  prenom: string;
  role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _utilisateur = signal<Utilisateur | null>(null);
  private readonly _token = signal<string | null>(
    localStorage.getItem('token')
  );

  readonly utilisateurCourant = this._utilisateur.asReadonly();
  readonly estConnecte = computed(() => this._utilisateur() !== null);
  readonly estAdmin = computed(() => this._utilisateur()?.role === 'admin');

  async connecter(email: string, motDePasse: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      this._token.set(data.token);
      this._utilisateur.set(data.utilisateur);
      localStorage.setItem('token', data.token);
      return true;
    } catch {
      return false;
    }
  }

  deconnecter(): void {
    this._token.set(null);
    this._utilisateur.set(null);
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return this._token();
  }
}
```

---

### Comparaison détaillée : composable Vue vs service Angular

```typescript
// Vue 3 — composable useAuth
import { ref, computed } from 'vue';

const utilisateur = ref<Utilisateur | null>(null); // Singleton via module scope

export function useAuth() {
  const estConnecte = computed(() => utilisateur.value !== null);

  async function connecter(email: string, mdp: string) {
    // ...
    utilisateur.value = data.utilisateur;
  }

  function deconnecter() {
    utilisateur.value = null;
  }

  return { utilisateur: readonly(utilisateur), estConnecte, connecter, deconnecter };
}
```

```typescript
// Angular 19 — service AuthService
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _utilisateur = signal<Utilisateur | null>(null);
  readonly utilisateurCourant = this._utilisateur.asReadonly();
  readonly estConnecte = computed(() => this._utilisateur() !== null);

  async connecter(email: string, mdp: string) { /* ... */ }
  deconnecter() { /* ... */ }
}
```

Les deux approches sont très similaires. La différence clé : Angular gère le cycle de vie (singleton garanti, destruction automatique), Vue te laisse le gérer toi-même.

---

## Pratique

### Exercice : Service de gestion de thème

Crée un `ThemeService` qui :

1. Stocke le thème courant (`'clair'` ou `'sombre'`) dans un signal
2. Persiste le choix dans `localStorage`
3. Expose un computed `estSombre`
4. A une méthode `basculer()` qui change le thème
5. Injecte ce service dans un composant `ThemeBoutonComponent`

<details>
<summary>Voir la solution</summary>

```typescript
// theme.service.ts
import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'clair' | 'sombre';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(
    (localStorage.getItem('theme') as Theme) ?? 'clair'
  );

  readonly theme = this._theme.asReadonly();
  readonly estSombre = computed(() => this._theme() === 'sombre');

  constructor() {
    // Persiste automatiquement dans localStorage
    effect(() => {
      localStorage.setItem('theme', this._theme());
      document.body.classList.toggle('theme-sombre', this.estSombre());
    });
  }

  basculer(): void {
    this._theme.update(t => (t === 'clair' ? 'sombre' : 'clair'));
  }

  definir(theme: Theme): void {
    this._theme.set(theme);
  }
}

// theme-bouton.component.ts
import { Component, inject } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-theme-bouton',
  template: `
    <button (click)="themeService.basculer()">
      {{ themeService.estSombre() ? '☀️ Mode clair' : '🌙 Mode sombre' }}
    </button>
  `
})
export class ThemeBoutonComponent {
  readonly themeService = inject(ThemeService);
}
```
</details>

---

## Résumé

- Un **service** Angular est l'équivalent d'un composable Vue : il encapsule la logique métier, l'état, et les appels API hors des composants.
- `@Injectable({ providedIn: 'root' })` crée un **singleton tree-shakable** — c'est le choix par défaut.
- `inject()` est la manière moderne d'obtenir un service — préférer à l'injection par constructeur.
- Les composants restent **légers** : ils délèguent au service et se concentrent sur l'affichage.
- `ng generate service <nom>` crée le service et son fichier de test.

---

> **Prochain cours** : [Cours 15 — Providers et scopes d'injection](./02-providers-et-scopes.md)
