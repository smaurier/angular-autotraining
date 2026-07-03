---
titre: InjectionToken — injecter de la config, des valeurs et des tokens multi
cours: 03-angular
notions: [InjectionToken, "InjectionToken<T> typé", "factory par défaut (providedIn root)", provider useValue, provider useFactory, "tokens multi (multi: true)", provider fonctionnel, config injectable, "inject() sur un token"]
outcomes:
  - "sait déclarer un InjectionToken<T> typé pour injecter une valeur non-classe (config, URL, flag)"
  - "sait donner une valeur par défaut à un token via une factory providedIn root"
  - "sait fournir un token avec useValue et le construire avec useFactory + inject()"
  - "sait collecter plusieurs valeurs sous un même token avec multi: true"
  - "sait exposer sa config via un provider fonctionnel provideXxx() réutilisable"
prerequis: [modules 00-12 (signaux, control flow, services @Injectable, providers et scopes de la hiérarchie d'injecteurs)]
next: 14-routing
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: socle TribuZen — configuration API injectable (URL de base, feature flags) partagée par tous les services, et plugins de validation collectés en multi
last-reviewed: 2026-07
---

# `InjectionToken` — injecter de la config, des valeurs et des tokens multi

> **Outcomes — tu sauras FAIRE :** déclarer un `InjectionToken<T>` typé, lui donner une valeur par défaut par factory, le fournir avec `useValue` / `useFactory`, collecter des valeurs en `multi: true`, et exposer un provider fonctionnel `provideXxx()`.
> **Difficulté :** :star::star::star:
>
> **Portée :** dernier module du **bloc DI**. On sait déjà (modules 11-12) créer un service `@Injectable`, comprendre la hiérarchie d'injecteurs (`root` / route / composant) et fournir une classe avec `useClass` / `useExisting`. Ce module traite **uniquement** l'injection de ce qui n'est **pas une classe** : des valeurs, de la config, des collections. Le `Router` et les routes sont le **module 14**. `HttpClient`, les interceptors et RxJS sont plus loin (modules 16-18) : ici on reste sur du pur DI, aucune requête réseau.

## 1. Cas concret d'abord

Sur TribuZen, plusieurs services ont besoin de l'**URL de base de l'API** et de quelques **feature flags** (chat activé ? notifications ?). Un collègue a codé ça en dur dans chaque service :

```typescript
// planning.service.ts — AVANT (config en dur, dupliquée)
@Injectable({ providedIn: 'root' })
export class PlanningService {
  private baseUrl = 'https://api.tribuzen.fr/v2';   // ← copié dans 4 services
  private chatActif = false;                         // ← re-copié partout

  urlSorties() {
    return `${this.baseUrl}/sorties`;
  }
}
```

Deux problèmes concrets :

1. **L'URL est dupliquée** dans chaque service. Passer de `dev` à `prod` = chercher/remplacer dans tout le code — et on en oublie un.
2. **On ne peut pas injecter une `string`.** On aimerait écrire `inject(baseUrl)`… mais `inject()` prend un **token**, et une `string` n'est pas un token. Une classe est son propre token ; une valeur brute, non.

Il faut une **clé d'injection** pour des valeurs qui ne sont pas des classes. C'est exactement le rôle d'`InjectionToken`. Ce module te donne : déclarer le token typé, lui fournir une valeur (voire une valeur **par défaut**), et le cas particulier des tokens qui collectent **plusieurs** valeurs (`multi`).

---

## 2. Théorie complète, concise

### 2.1 Pourquoi un token — le problème de la clé

Le DI Angular associe une **clé** (le token) à une **valeur** (la dépendance). Pour un service, la classe elle-même sert de clé : `inject(PlanningService)` marche parce que `PlanningService` est un identifiant unique à l'exécution.

Une `string`, un `number`, un objet littéral n'ont **pas** d'identité unique : deux `'https://…'` sont interchangeables, impossible d'en faire une clé. `InjectionToken` fabrique cette clé unique **et** transporte le type.

### 2.2 Déclarer un `InjectionToken<T>`

```typescript
import { InjectionToken } from '@angular/core';

// Le <string> type ce que l'on injectera ; la string 'API_BASE_URL'
// est une DESCRIPTION lisible (messages d'erreur, debug) — pas la valeur.
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
```

Signature vérifiée : `new InjectionToken<T>(description: string, options?)`. Le paramètre string est **uniquement** une étiquette de debug ; il ne porte aucune valeur et n'a pas besoin d'être unique (mais on le garde parlant).

Pour un objet de config, on type avec une interface :

```typescript
export interface TribuzenConfig {
  baseUrl: string;
  chatActif: boolean;
  notificationsActives: boolean;
}

export const TRIBUZEN_CONFIG = new InjectionToken<TribuzenConfig>('TRIBUZEN_CONFIG');
```

### 2.3 Fournir la valeur — `useValue`

On associe la valeur au token dans un tableau `providers` (ici `appConfig`, le provider racine de l'app standalone) :

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: TRIBUZEN_CONFIG, useValue: {
        baseUrl: 'https://api.tribuzen.fr/v2',
        chatActif: false,
        notificationsActives: true,
      } satisfies TribuzenConfig },
  ],
};
```

Puis on l'injecte partout, **typé**, comme un service :

```typescript
@Injectable({ providedIn: 'root' })
export class PlanningService {
  private config = inject(TRIBUZEN_CONFIG);   // TribuzenConfig — autocomplété

  urlSorties() {
    return `${this.config.baseUrl}/sorties`;  // plus de string en dur
  }
}
```

### 2.4 Valeur par défaut — la **factory** du token

Un token peut porter sa propre valeur par défaut via une **factory**. Si personne ne le fournit, Angular appelle la factory. Combiné à `providedIn: 'root'`, le token est alors utilisable **sans aucun provider**.

```typescript
// Vérifié : new InjectionToken(description, { providedIn, factory })
export const MAX_PARTICIPANTS = new InjectionToken<number>('MAX_PARTICIPANTS', {
  providedIn: 'root',
  factory: () => 12,          // défaut sensé pour une sortie famille
});

// Marche sans rien configurer :
const max = inject(MAX_PARTICIPANTS);   // → 12

// Un provider explicite écrase le défaut :
// providers: [{ provide: MAX_PARTICIPANTS, useValue: 30 }]  // → 30
```

La factory s'exécute **dans un contexte d'injection** : elle peut elle-même appeler `inject()` pour dépendre d'autres tokens.

### 2.5 Construire la valeur — `useFactory` + `inject()`

Quand la valeur doit être **calculée** (à partir d'autres dépendances, d'une condition d'environnement), on utilise `useFactory` au lieu de `useValue`. La factory peut injecter d'autres tokens.

```typescript
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

providers: [
  {
    provide: API_BASE_URL,
    // useFactory : Angular exécute cette fonction pour produire la valeur.
    // inject() est AUTORISÉ dans une factory de provider (contexte d'injection).
    useFactory: () => {
      const config = inject(TRIBUZEN_CONFIG);
      return config.baseUrl;               // dérivé d'un autre token
    },
  },
];
```

`useValue` = « voici la valeur toute faite ». `useFactory` = « voici comment la fabriquer, éventuellement à partir d'autres dépendances ».

### 2.6 Tokens **multi** — collecter plusieurs valeurs (`multi: true`)

Par défaut, deux providers pour le même token = le **dernier gagne**. Avec `multi: true`, Angular **collecte** toutes les valeurs dans un **tableau**. C'est le mécanisme des validateurs, des interceptors, des plugins.

```typescript
// Un token typé Array — la valeur injectée sera TribuzenValidator[]
export type TribuzenValidator = (sortie: Sortie) => string | null;

export const SORTIE_VALIDATORS = new InjectionToken<TribuzenValidator[]>('SORTIE_VALIDATORS');

providers: [
  // Chaque provider ajoute UN élément — noter multi: true sur chacun.
  { provide: SORTIE_VALIDATORS, multi: true, useValue: (s: Sortie) =>
      s.participants > 0 ? null : 'Au moins un participant' },
  { provide: SORTIE_VALIDATORS, multi: true, useValue: (s: Sortie) =>
      s.budget >= 0 ? null : 'Budget négatif' },
];
```

```typescript
@Injectable({ providedIn: 'root' })
export class SortieValidationService {
  // inject() renvoie le TABLEAU des deux (ou N) validateurs collectés.
  private validators = inject(SORTIE_VALIDATORS);

  erreurs(sortie: Sortie): string[] {
    return this.validators
      .map(valider => valider(sortie))
      .filter((msg): msg is string => msg !== null);
  }
}
```

Règle : **tous** les providers d'un token multi doivent avoir `multi: true`. Mélanger `multi: true` et un provider sans `multi` sur le même token est une **erreur d'exécution**.

### 2.7 Provider fonctionnel — `provideXxx()`

Plutôt que d'exposer le token brut et de demander à l'utilisateur d'écrire le bon objet provider, on fournit une **fonction** qui renvoie les providers. C'est le style Angular moderne (`provideRouter()`, `provideHttpClient()` suivent ce patron).

```typescript
import { Provider, makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';

export function provideTribuzenConfig(config: TribuzenConfig): EnvironmentProviders {
  // makeEnvironmentProviders emballe des providers destinés à l'injecteur racine/route.
  return makeEnvironmentProviders([
    { provide: TRIBUZEN_CONFIG, useValue: config },
    { provide: API_BASE_URL, useFactory: () => inject(TRIBUZEN_CONFIG).baseUrl },
  ]);
}

// app.config.ts — l'appelant écrit UNE ligne lisible, sans connaître les tokens internes :
export const appConfig: ApplicationConfig = {
  providers: [
    provideTribuzenConfig({
      baseUrl: 'https://api.tribuzen.fr/v2',
      chatActif: false,
      notificationsActives: true,
    }),
  ],
};
```

Une version plus simple retourne juste un `Provider[]` (tableau de providers) ; `makeEnvironmentProviders` est la variante durcie qui empêche d'utiliser ces providers au niveau composant par erreur.

### 2.8 Token absent — injection optionnelle

Un token sans factory par défaut et non fourni lève une `NullInjectorError`. Pour tolérer son absence, on passe `{ optional: true }` — `inject()` renvoie alors `null`.

```typescript
// null si SORTIE_VALIDATORS n'a jamais été fourni, au lieu de crasher.
private validators = inject(SORTIE_VALIDATORS, { optional: true }) ?? [];
```

---

## 3. Worked examples

### Exemple 1 — Config API injectable de bout en bout (TribuZen)

On reprend le cas concret du §1 et on supprime toute la config en dur.

```typescript
// tokens/tribuzen-config.token.ts
import { InjectionToken } from '@angular/core';

export interface TribuzenConfig {
  baseUrl: string;
  chatActif: boolean;
  notificationsActives: boolean;
}

// Token typé : la clé d'injection de la config globale.
export const TRIBUZEN_CONFIG = new InjectionToken<TribuzenConfig>('TRIBUZEN_CONFIG');
```

```typescript
// app.config.ts — on fournit la config UNE seule fois, au niveau racine.
import { ApplicationConfig } from '@angular/core';
import { TRIBUZEN_CONFIG, TribuzenConfig } from './tokens/tribuzen-config.token';

const config: TribuzenConfig = {
  baseUrl: 'https://api.tribuzen.fr/v2',
  chatActif: false,
  notificationsActives: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: TRIBUZEN_CONFIG, useValue: config },
  ],
};
```

```typescript
// planning.service.ts — APRÈS : plus une seule string en dur.
import { Injectable, inject } from '@angular/core';
import { TRIBUZEN_CONFIG } from '../tokens/tribuzen-config.token';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  // config est typée TribuzenConfig — baseUrl, chatActif… autocomplétés.
  private config = inject(TRIBUZEN_CONFIG);

  urlSorties() {
    return `${this.config.baseUrl}/sorties`;
  }

  chatDisponible() {
    return this.config.chatActif;
  }
}
```

**Ce qu'on a gagné** : une source de vérité unique, typée, changée à un seul endroit. Pour basculer `dev` ↔ `prod`, on modifie l'objet `config` (ou on choisit `devConfig`/`prodConfig`) dans `app.config.ts` — aucun service ne bouge.

### Exemple 2 — Validateurs de sortie en `multi: true` + provider fonctionnel

Chaque règle métier de validation d'une sortie est un petit validateur. On les enregistre en multi, et on expose un `provideSortieValidators()`.

```typescript
// tokens/sortie-validators.token.ts
import { InjectionToken, Provider } from '@angular/core';

export interface Sortie {
  titre: string;
  participants: number;
  budget: number;
}

// Un validateur renvoie null si OK, sinon un message d'erreur.
export type SortieValidator = (sortie: Sortie) => string | null;

export const SORTIE_VALIDATORS = new InjectionToken<SortieValidator[]>('SORTIE_VALIDATORS');

// Provider fonctionnel : chaque règle devient un provider multi.
export function provideSortieValidators(...validators: SortieValidator[]): Provider[] {
  return validators.map(valider => ({
    provide: SORTIE_VALIDATORS,
    multi: true,          // OBLIGATOIRE sur chacun — sinon le dernier écrase les autres
    useValue: valider,
  }));
}
```

```typescript
// app.config.ts — on branche les règles voulues, lisiblement.
export const appConfig: ApplicationConfig = {
  providers: [
    provideSortieValidators(
      s => s.titre.trim() ? null : 'Titre obligatoire',
      s => s.participants > 0 ? null : 'Au moins un participant',
      s => s.budget >= 0 ? null : 'Budget négatif',
    ),
  ],
};
```

```typescript
// sortie-validation.service.ts — consomme le tableau collecté.
import { Injectable, inject } from '@angular/core';
import { SORTIE_VALIDATORS, Sortie } from '../tokens/sortie-validators.token';

@Injectable({ providedIn: 'root' })
export class SortieValidationService {
  // Tableau des 3 validateurs (optional + ?? [] : robuste si aucun fourni).
  private validators = inject(SORTIE_VALIDATORS, { optional: true }) ?? [];

  erreurs(sortie: Sortie): string[] {
    return this.validators
      .map(valider => valider(sortie))
      .filter((msg): msg is string => msg !== null);
  }
}
```

**Le gain multi** : ajouter une règle = ajouter une ligne dans `provideSortieValidators(...)`, sans toucher au service consommateur. C'est le patron « ouvert à l'extension » du DI Angular.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que la string du token est la valeur

```typescript
// ❌ 'API_BASE_URL' n'est PAS la valeur — c'est juste une étiquette de debug.
const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
const url = inject(API_BASE_URL);   // undefined/erreur si aucun provider ni factory
```

La string décrit le token dans les messages d'erreur. La valeur vient d'un `useValue` / `useFactory` ou de la `factory` par défaut. Sans l'un des trois, le token n'a pas de valeur.

### PIÈGE #2 — Injecter une valeur brute sans token

```typescript
// ❌ inject() attend un token (classe ou InjectionToken), pas une string.
const url = inject('https://api.tribuzen.fr');   // ne compile pas / n'a aucun sens

// ✅ On passe par un InjectionToken qui sert de clé.
const url = inject(API_BASE_URL);
```

### PIÈGE #3 — Oublier `multi: true` sur UN des providers

```typescript
providers: [
  { provide: SORTIE_VALIDATORS, multi: true, useValue: v1 },
  { provide: SORTIE_VALIDATORS,              useValue: v2 },  // ❌ pas de multi
];
// Erreur d'exécution : on ne peut pas mélanger multi et non-multi sur le même token.
```

Soit **tous** les providers du token sont `multi: true` (valeur = tableau), soit **aucun** (valeur = dernier gagne). Jamais un mélange.

### PIÈGE #4 — Attendre une valeur unique d'un token multi

```typescript
// Le token est déclaré InjectionToken<SortieValidator[]> — la valeur EST un tableau.
private validators = inject(SORTIE_VALIDATORS);
this.validators(sortie);          // ❌ un tableau n'est pas appelable
this.validators.forEach(...);     // ✅ on itère la collection
```

Avec `multi: true`, `inject()` renvoie **toujours** un tableau — même s'il n'y a qu'un seul provider.

### PIÈGE #5 — `useValue` là où il faut `useFactory`

```typescript
// ❌ useValue reçoit une valeur figée : impossible d'injecter une dépendance ici.
{ provide: API_BASE_URL, useValue: inject(TRIBUZEN_CONFIG).baseUrl }  // inject() hors contexte

// ✅ useFactory : la fonction s'exécute dans un contexte d'injection.
{ provide: API_BASE_URL, useFactory: () => inject(TRIBUZEN_CONFIG).baseUrl }
```

Dès que la valeur **dépend** d'une autre dépendance ou d'une condition, c'est `useFactory`, pas `useValue`.

### PIÈGE #6 — Croire que la factory par défaut est appelée même si on fournit le token

```typescript
export const MAX_PARTICIPANTS = new InjectionToken<number>('MAX_PARTICIPANTS', {
  providedIn: 'root',
  factory: () => 12,
});
// providers: [{ provide: MAX_PARTICIPANTS, useValue: 30 }]
inject(MAX_PARTICIPANTS);   // → 30, PAS 12
```

Un provider explicite **écrase** la factory par défaut. La factory n'est le filet de secours que lorsque **personne** ne fournit le token.

---

## 5. Ancrage TribuZen

`InjectionToken` est la **couche de configuration** de TribuZen — tout ce qui n'est pas un service mais doit être partagé et typé.

**`TRIBUZEN_CONFIG`** (Exemple 1) — l'URL de base de l'API et les feature flags, fournis une fois dans `app.config.ts` et injectés par tous les services (`PlanningService`, plus tard le service HTTP au module 18). Une source de vérité, deux jeux de valeurs (`devConfig` / `prodConfig`).

**`SORTIE_VALIDATORS`** (Exemple 2) — les règles de validation d'une sortie famille, collectées en `multi: true` et exposées par `provideSortieValidators(...)`. Ajouter une règle métier = une ligne, sans modifier le service qui les applique.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      app.config.ts                         ← provideTribuzenConfig(...) + validateurs
      tokens/
        tribuzen-config.token.ts            ← TRIBUZEN_CONFIG + interface
        sortie-validators.token.ts          ← SORTIE_VALIDATORS + provideSortieValidators()
      core/
        planning.service.ts                 ← inject(TRIBUZEN_CONFIG)
        sortie-validation.service.ts        ← inject(SORTIE_VALIDATORS)
```

> Ces tokens n'émettent aucune requête : ils décrivent **où** et **comment** appeler l'API, pas l'appel lui-même. Le vrai `HttpClient` qui consomme `API_BASE_URL` arrive au **module 18**. C'est aussi la fin du **bloc DI** : services (11), scopes (12), tokens (13) — le module 14 ouvre le routing.

---

## 6. Points clés

1. Un `InjectionToken<T>` fabrique une **clé d'injection unique et typée** pour injecter ce qui n'est **pas une classe** (string, number, config, tableau).
2. La string passée au constructeur est une **description de debug**, pas la valeur.
3. On fournit la valeur avec `useValue` (valeur toute faite) ou `useFactory` (valeur calculée, `inject()` autorisé dedans).
4. Un token peut porter une **valeur par défaut** via `{ providedIn: 'root', factory: () => ... }` — utilisable sans provider ; un provider explicite l'écrase.
5. `multi: true` fait collecter **toutes** les valeurs d'un token dans un **tableau** ; tous les providers du token doivent alors être `multi`.
6. Un **provider fonctionnel** `provideXxx()` (idéalement via `makeEnvironmentProviders`) emballe les tokens internes derrière une API lisible.
7. `{ optional: true }` évite la `NullInjectorError` quand un token peut ne pas être fourni (`inject(TOKEN, { optional: true }) ?? défaut`).

---

## 7. Seeds Anki

```
À quoi sert un InjectionToken en Angular ?|À créer une clé d'injection unique et typée pour injecter une valeur qui n'est pas une classe (string, number, objet de config, tableau) — car une valeur brute n'a pas d'identité utilisable comme token.
Que représente la string passée à new InjectionToken('...') ?|Une simple description de debug (messages d'erreur), PAS la valeur. La valeur vient d'un useValue, d'un useFactory ou de la factory par défaut du token.
Différence entre useValue et useFactory pour fournir un token ?|useValue fournit une valeur toute faite et figée. useFactory fournit une fonction exécutée dans un contexte d'injection, qui peut appeler inject() pour dériver la valeur d'autres dépendances.
Comment donner une valeur par défaut à un InjectionToken ?|En passant { providedIn: 'root', factory: () => valeur } au constructeur. Le token est alors utilisable sans provider ; un provider explicite écrase le défaut.
À quoi sert multi: true sur un provider de token ?|À collecter plusieurs valeurs sous le même token : inject() renvoie un tableau de toutes les valeurs fournies (validateurs, interceptors, plugins). Tous les providers du token doivent être multi.
Que renvoie inject() sur un token déclaré avec multi: true, s'il n'y a qu'un seul provider ?|Toujours un tableau — ici à un seul élément. multi: true implique une collection, jamais une valeur nue.
Qu'est-ce qu'un provider fonctionnel provideXxx() ?|Une fonction qui renvoie les providers (souvent via makeEnvironmentProviders) et cache les tokens internes derrière une API lisible, à l'image de provideRouter() ou provideHttpClient().
Comment injecter un token sans crasher s'il n'est pas fourni ?|inject(TOKEN, { optional: true }) renvoie null au lieu de lever NullInjectorError ; on combine souvent avec ?? pour une valeur de repli : inject(TOKEN, { optional: true }) ?? [].
```

---

## Pont vers le lab

> Lab associé : `labs/lab-13-injection-tokens/README.md`. Déclarer `TRIBUZEN_CONFIG` et un token multi de validateurs, les fournir dans `app.config.ts` avec un provider fonctionnel, et les injecter dans un service — projet Angular CLI réel, dev server en oracle, corrigé commenté intégral.
