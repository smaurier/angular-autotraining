# Lab 13 — InjectionToken : config injectable + validateurs multi

> **Outcome :** à la fin, tu sais déclarer un `InjectionToken<T>` typé, le fournir avec `useValue` / provider fonctionnel, collecter plusieurs valeurs en `multi: true`, et injecter le tout dans un service — dans un vrai projet Angular.
> **Vrai outil :** Angular CLI 19 (`ng new`, `ng serve`) — dev server dans le navigateur comme oracle visuel.
> **Feedback :** le coach valide en session (lecture de code + affichage à l'écran) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu montes le **socle de configuration** de TribuZen. Deux briques DI, aucune classe métier magique :

1. **Un token de config** `TRIBUZEN_CONFIG` (`InjectionToken<TribuzenConfig>`), fourni au niveau racine, injecté par un `PlanningService` qui expose l'URL des sorties.
2. **Un token multi** `SORTIE_VALIDATORS` qui collecte plusieurs règles de validation, exposé par un **provider fonctionnel** `provideSortieValidators(...)`, injecté par un `SortieValidationService`.

Un composant affiche à l'écran l'URL construite depuis la config **et** les erreurs de validation d'une sortie de test — pour voir le DI fonctionner en direct.

**Cahier des charges exact :**

1. `TRIBUZEN_CONFIG` typé `{ baseUrl: string; chatActif: boolean }`, fourni via `useValue` dans `app.config.ts`.
2. `PlanningService` (`providedIn: 'root'`) injecte le token et expose `urlSorties()` → `` `${baseUrl}/sorties` ``.
3. `SORTIE_VALIDATORS` typé `SortieValidator[]` où `SortieValidator = (s: Sortie) => string | null`.
4. `provideSortieValidators(...validators)` renvoie un `Provider[]` avec `multi: true` sur chacun.
5. Au moins **2 validateurs** branchés : « titre obligatoire » et « au moins un participant ».
6. `SortieValidationService` injecte le tableau (`{ optional: true } ?? []`) et expose `erreurs(sortie): string[]`.
7. Le composant racine affiche `urlSorties()` et la liste des erreurs d'une sortie de test invalide.

**Pas de gap-fill** — tu pars du starter Angular CLI et tu écris les fichiers toi-même.

### Starter — vrai projet Angular CLI

```bash
# Crée le projet (standalone + zoneless par défaut en Angular 19)
ng new tribuzen-di --style=css --ssr=false
cd tribuzen-di
ng serve
# Ouvre http://localhost:4200 — tu verras tes changements en direct
```

Arborescence cible à créer sous `src/app/` :

```
src/app/
  tokens/
    tribuzen-config.token.ts     ← à écrire
    sortie-validators.token.ts   ← à écrire
  core/
    planning.service.ts          ← à écrire
    sortie-validation.service.ts ← à écrire
  app.config.ts                  ← à compléter (providers)
  app.component.ts               ← à compléter (affichage)
```

---

## Étapes (en friction)

1. **Déclare `TribuzenConfig` + `TRIBUZEN_CONFIG`** dans `tokens/tribuzen-config.token.ts`. Rappelle-toi : la string du constructeur est une étiquette de debug, pas la valeur.
2. **Fournis-le** dans `app.config.ts` avec `{ provide: TRIBUZEN_CONFIG, useValue: {...} }`.
3. **Écris `PlanningService`** : `private config = inject(TRIBUZEN_CONFIG)` puis `urlSorties()`.
4. **Déclare le type `Sortie`, `SortieValidator` et `SORTIE_VALIDATORS`** dans `tokens/sortie-validators.token.ts`. Le token est typé **tableau**.
5. **Écris `provideSortieValidators(...validators)`** qui `map` chaque validateur vers un provider `multi: true`. N'oublie **aucun** `multi`.
6. **Branche 2+ validateurs** dans `app.config.ts` via `provideSortieValidators(...)`.
7. **Écris `SortieValidationService`** : injecte le tableau en `{ optional: true } ?? []`, expose `erreurs()` qui `map` puis `filter` les `null`.
8. **Affiche** dans `app.component.ts` : `urlSorties()` et `@for` sur les erreurs d'une sortie invalide (ex : `{ titre: '', participants: 0, budget: 10 }`).
9. **Cas limites à vérifier à l'écran** : (a) retire un `multi` → observe l'erreur d'exécution dans la console ; (b) passe une sortie valide → la liste d'erreurs se vide ; (c) ajoute un 3ᵉ validateur sans toucher au service → il s'applique tout seul.

---

## Corrigé complet commenté

```typescript
// src/app/tokens/tribuzen-config.token.ts
import { InjectionToken } from '@angular/core';

export interface TribuzenConfig {
  baseUrl: string;
  chatActif: boolean;
}

// 'TRIBUZEN_CONFIG' = description de debug uniquement. Le <TribuzenConfig> type l'injection.
export const TRIBUZEN_CONFIG = new InjectionToken<TribuzenConfig>('TRIBUZEN_CONFIG');
```

```typescript
// src/app/tokens/sortie-validators.token.ts
import { InjectionToken, Provider } from '@angular/core';

export interface Sortie {
  titre: string;
  participants: number;
  budget: number;
}

// Un validateur : null si OK, sinon un message.
export type SortieValidator = (sortie: Sortie) => string | null;

// Token typé TABLEAU — car il sera alimenté en multi.
export const SORTIE_VALIDATORS = new InjectionToken<SortieValidator[]>('SORTIE_VALIDATORS');

// Provider fonctionnel : transforme N validateurs en N providers multi.
export function provideSortieValidators(...validators: SortieValidator[]): Provider[] {
  return validators.map(valider => ({
    provide: SORTIE_VALIDATORS,
    multi: true,          // OBLIGATOIRE sur chacun : sinon le dernier écrase les autres
    useValue: valider,
  }));
}
```

```typescript
// src/app/core/planning.service.ts
import { Injectable, inject } from '@angular/core';
import { TRIBUZEN_CONFIG } from '../tokens/tribuzen-config.token';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  // config est typée TribuzenConfig — baseUrl / chatActif autocomplétés.
  private config = inject(TRIBUZEN_CONFIG);

  urlSorties(): string {
    return `${this.config.baseUrl}/sorties`;   // plus de string en dur
  }
}
```

```typescript
// src/app/core/sortie-validation.service.ts
import { Injectable, inject } from '@angular/core';
import { SORTIE_VALIDATORS, Sortie } from '../tokens/sortie-validators.token';

@Injectable({ providedIn: 'root' })
export class SortieValidationService {
  // multi => inject() renvoie le TABLEAU. optional + ?? [] : robuste si aucun fourni.
  private validators = inject(SORTIE_VALIDATORS, { optional: true }) ?? [];

  erreurs(sortie: Sortie): string[] {
    return this.validators
      .map(valider => valider(sortie))
      // Type guard : ne garde que les messages (string), écarte les null.
      .filter((msg): msg is string => msg !== null);
  }
}
```

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { TRIBUZEN_CONFIG } from './tokens/tribuzen-config.token';
import { provideSortieValidators } from './tokens/sortie-validators.token';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1) Config globale, une seule source de vérité.
    { provide: TRIBUZEN_CONFIG, useValue: { baseUrl: 'https://api.tribuzen.fr/v2', chatActif: false } },

    // 2) Règles de validation collectées en multi via le provider fonctionnel.
    provideSortieValidators(
      s => s.titre.trim() ? null : 'Titre obligatoire',
      s => s.participants > 0 ? null : 'Au moins un participant',
    ),
  ],
};
```

```typescript
// src/app/app.component.ts
import { Component, inject } from '@angular/core';
import { PlanningService } from './core/planning.service';
import { SortieValidationService } from './core/sortie-validation.service';
import { Sortie } from './tokens/sortie-validators.token';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>Socle DI TribuZen</h1>

    <!-- Vient de TRIBUZEN_CONFIG, injecté par PlanningService -->
    <p>Endpoint sorties : {{ planning.urlSorties() }}</p>

    <h2>Validation d'une sortie de test</h2>
    @if (erreurs.length === 0) {
      <p>Sortie valide.</p>
    } @else {
      <ul>
        @for (msg of erreurs; track msg) {
          <li>{{ msg }}</li>
        }
      </ul>
    }
  `,
})
export class AppComponent {
  protected planning = inject(PlanningService);
  private validation = inject(SortieValidationService);

  // Sortie volontairement invalide : titre vide + 0 participant.
  private sortieTest: Sortie = { titre: '', participants: 0, budget: 10 };

  // Deux validateurs collectés en multi → deux messages attendus.
  protected erreurs = this.validation.erreurs(this.sortieTest);
}
```

**Pourquoi ce corrigé est correct :**
- `TRIBUZEN_CONFIG` est injecté typé : aucun service ne code l'URL en dur, un seul point de changement `dev` ↔ `prod`.
- `SORTIE_VALIDATORS` est déclaré `InjectionToken<SortieValidator[]>` et chaque provider porte `multi: true` → `inject()` renvoie le **tableau** des règles.
- `SortieValidationService` ne connaît **pas** les règles : ajouter une 3ᵉ ligne dans `provideSortieValidators(...)` l'active sans modifier le service (extension sans modification).
- `{ optional: true } ?? []` évite la `NullInjectorError` si le token n'est jamais fourni.
- À l'écran : l'endpoint s'affiche via la config, et les deux erreurs (`Titre obligatoire`, `Au moins un participant`) prouvent que le token multi est bien collecté.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — de mémoire, en 25 minutes, sans rouvrir ce corrigé ni le module 13 :**

1. Ajoute un token **`MAX_PARTICIPANTS`** avec une **valeur par défaut par factory** : `new InjectionToken<number>('MAX_PARTICIPANTS', { providedIn: 'root', factory: () => 12 })`. Ne le fournis **pas** dans `app.config.ts` — il doit marcher grâce au défaut.
2. Ajoute un 3ᵉ validateur qui **injecte** `MAX_PARTICIPANTS` : `s => s.participants <= inject(MAX_PARTICIPANTS) ? null : 'Trop de participants'`. Indice : ce validateur doit être **créé dans un contexte d'injection** (une factory), pas en `useValue` figé — utilise un provider `useFactory`.
3. Vérifie à l'écran qu'une sortie à 15 participants déclenche « Trop de participants » alors que **rien** n'a fourni `MAX_PARTICIPANTS`.

**Critère de réussite :** le 3ᵉ validateur lit la limite via le token par défaut, sans provider explicite, et le service consommateur n'a pas changé d'une ligne.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      tokens/
        tribuzen-config.token.ts
        sortie-validators.token.ts
      core/
        planning.service.ts
        sortie-validation.service.ts
      app.config.ts
```

**Différences par rapport au lab :**

- `TRIBUZEN_CONFIG` sera fourni via un provider fonctionnel `provideTribuzenConfig(config)` (avec `makeEnvironmentProviders`) et choisira `devConfig` / `prodConfig` selon l'environnement.
- `PlanningService` consommera plus tard `baseUrl` via un vrai `HttpClient` (module 18) — ici on se contente de construire l'URL.
- Les validateurs de sortie seront réutilisés par les formulaires réactifs (module 19) : même collection multi, branchée sur le state du formulaire.

**Commit cible :**
```
feat(core): socle DI — TRIBUZEN_CONFIG injectable + SORTIE_VALIDATORS multi
```
