---
titre: Providers et scopes d'injection — hiérarchie des injecteurs
cours: 03-angular
notions: [hiérarchie des injecteurs, injecteur root, injecteur de route, injecteur de composant, tableau providers, résolution ascendante bottom-up, useClass, useValue, useFactory, deps et inject dans une factory, useExisting, "@Optional (effleuré)", multi providers]
outcomes:
  - sait décrire la hiérarchie root -> route -> composant et le sens de résolution ascendant
  - sait fournir un service au niveau composant pour obtenir une instance isolée par composant
  - sait fournir un service au niveau route pour le partager dans une section et le détruire en sortant
  - sait choisir entre useClass, useValue, useFactory et useExisting selon le besoin
  - sait écrire une useFactory qui résout ses dépendances avec inject()
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone, module 02 signaux-base, module 05 input-output-model, module 11 services-et-injectable]
next: 13-injection-tokens
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — scopes d'injection, brouillon de sortie isolé par formulaire (composant) et service de section famille partagé par route
last-reviewed: 2026-07
---

# Providers et scopes d'injection — hiérarchie des injecteurs

> **Outcomes — tu sauras FAIRE :** placer un service au bon niveau (root / route / composant), choisir entre `useClass` / `useValue` / `useFactory` / `useExisting`, et écrire une `useFactory` qui résout ses dépendances avec `inject()`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **où** on enregistre un provider (la hiérarchie d'injecteurs) et **comment** on le configure (les quatre recettes `use*`). C'est tout. Le module 11 t'a donné `@Injectable({ providedIn: 'root' })` et `inject()` — on part de là. Les jetons `InjectionToken` (fournir une valeur qui n'est pas une classe, typer une constante) sont **juste effleurés** ici et détaillés au **module 13**. Le routing complet (déclarer des routes, `provideRouter`, params) est le **module 14** : ici on se sert des `providers` d'une route sans expliquer le reste. `HttpClient` n'apparaît pas.

## 1. Cas concret d'abord

Sur TribuZen, l'écran « Mes sorties » affiche **plusieurs cartes de sortie éditables en même temps** : chaque carte a son propre formulaire de brouillon (titre, date, participants) qu'on peut modifier avant d'enregistrer. Un collègue a sorti la logique de brouillon dans un service, réflexe hérité du module 11 :

```typescript
// sortie-draft.service.ts — état de brouillon d'UNE sortie
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })   // ← le réflexe du module 11
export class SortieDraftService {
  readonly titre = signal('');
  readonly participants = signal(2);
}
```

```typescript
// sortie-card.component.ts — une carte éditable
import { Component, inject } from '@angular/core';
import { SortieDraftService } from './sortie-draft.service';

@Component({
  selector: 'app-sortie-card',
  template: `
    <input [value]="draft.titre()" (input)="draft.titre.set($any($event.target).value)" />
    <p>Participants : {{ draft.participants() }}</p>
  `,
})
export class SortieCardComponent {
  readonly draft = inject(SortieDraftService);
}
```

Le bug apparaît dès qu'il y a deux cartes à l'écran : **taper le titre dans la carte A modifie aussi la carte B**. Les deux champs sont synchronisés alors qu'ils devraient être indépendants.

La cause : `providedIn: 'root'` fait de `SortieDraftService` un **singleton global**. Les trois cartes injectent **la même instance**, donc le même `titre` signal. C'est parfait pour un `AuthService` (un seul utilisateur connecté), mais faux pour un brouillon (un par carte).

Ce qu'il faut : dire à Angular « donne à **chaque** `SortieCardComponent` sa **propre** instance de `SortieDraftService` ». C'est exactement ce que permettent les **providers au niveau composant**. Ce module te donne la carte complète des niveaux où enregistrer un provider, et les quatre façons de le configurer.

---

## 2. Théorie complète, concise

### 2.1 La hiérarchie des injecteurs

Angular ne possède pas un seul injecteur mais un **arbre** d'injecteurs qui épouse la structure de l'application. Trois niveaux te concernent en pratique :

- **Injecteur root** — un seul pour toute l'appli. C'est là qu'atterrit `@Injectable({ providedIn: 'root' })` et tout ce qui est déclaré dans `bootstrapApplication(App, { providers: [...] })`. Instances **singleton**.
- **Injecteur de route** — créé pour une route qui déclare un tableau `providers`. Partagé par la route et ses enfants, **détruit** quand on quitte la section.
- **Injecteur de composant** — créé pour chaque composant qui déclare `providers` dans son décorateur `@Component`. **Une instance par instance de composant**.

```
Injecteur root            @Injectable({ providedIn: 'root' })  → singleton global
  │                       bootstrapApplication(App, { providers: [...] })
  ├── Injecteur de route  { path: 'famille', providers: [...] } → 1 instance / section
  │     │
  │     └── Injecteur de composant  @Component({ providers: [...] }) → 1 instance / composant
```

Chaque niveau plus bas est un **injecteur enfant** du niveau au-dessus.

### 2.2 Résolution ascendante (bottom-up)

Quand un composant fait `inject(SortieDraftService)`, Angular cherche un provider **de bas en haut** :

1. l'injecteur du composant lui-même,
2. puis en remontant les composants parents qui déclarent ce provider,
3. puis l'injecteur de route,
4. puis l'injecteur root.

Le **premier** injecteur qui connaît le token gagne, et l'instance trouvée est **partagée vers le bas** avec les enfants. Si personne ne fournit le token jusqu'au root inclus, Angular lève une erreur `NG0201: No provider for ...` (sauf demande optionnelle, voir 2.7).

Conséquence directe du cas concret : fournir `SortieDraftService` **dans** `SortieCardComponent` place un provider tout en bas. Chaque carte a son injecteur, donc chacune fabrique sa propre instance — les brouillons deviennent indépendants.

### 2.3 Niveau composant — une instance isolée par composant

On ajoute le service au tableau `providers` du décorateur `@Component`.

```typescript
@Component({
  selector: 'app-sortie-card',
  providers: [SortieDraftService],   // ← une instance neuve par SortieCardComponent
  template: `...`,
})
export class SortieCardComponent {
  readonly draft = inject(SortieDraftService);
}
```

Pour que ce soit propre, on **retire** le `providedIn: 'root'` du service (sinon il reste aussi enregistrable au root). Le service devient un `@Injectable()` « nu », fourni explicitement là où on en a besoin :

```typescript
@Injectable()   // pas de providedIn : fourni à la main, au niveau composant
export class SortieDraftService { /* ... */ }
```

Trois cartes à l'écran = trois injecteurs de composant = **trois instances** de `SortieDraftService`. Le bug de synchronisation disparaît. C'est le scope à retenir pour tout état **propre à une instance de composant** : formulaire de brouillon, éditeur, wizard réutilisable.

### 2.4 Niveau route — partagé dans une section, détruit en sortie

Un tableau `providers` sur une route crée un injecteur pour **toute la section** (la route et ses enfants). Tous les composants de la section partagent **la même** instance ; quand l'utilisateur quitte la section, l'injecteur et son instance sont **détruits**.

```typescript
// app.routes.ts — la déclaration complète des routes est le module 14
export const routes = [
  {
    path: 'famille',
    providers: [FamilleSectionService],   // 1 instance pour toute la section /famille
    children: [
      { path: '', component: FamilleAccueilComponent },
      { path: 'sorties', component: SortiesListeComponent },
      // FamilleAccueilComponent et SortiesListeComponent partagent la MÊME instance
    ],
  },
];
```

À utiliser quand un état doit vivre **le temps d'une section** puis disparaître : le contexte de la famille active, un filtre commun à toutes les pages de l'espace famille, un cache de section qu'on veut vider en sortant.

### 2.5 Les quatre recettes — `useClass`, `useValue`, `useFactory`, `useExisting`

Jusqu'ici, `providers: [SortieDraftService]` est une **forme abrégée**. Sa forme complète est `{ provide: SortieDraftService, useClass: SortieDraftService }`. Le tableau `providers` accepte des objets `{ provide, use* }` où `provide` est le **token demandé** et `use*` dit **comment fabriquer** la valeur.

**`useClass` — fournir une implémentation.** Le token est une classe (souvent abstraite), la valeur est une classe concrète. Parfait pour brancher une implémentation différente selon l'environnement.

```typescript
export abstract class NotificationSender {
  abstract envoyer(message: string): void;
}

@Injectable() export class ToastSender extends NotificationSender {
  envoyer(m: string) { /* affiche un toast */ }
}
@Injectable() export class SilentSender extends NotificationSender {
  envoyer(_m: string) { /* rien — utile en dev/test */ }
}

providers: [
  { provide: NotificationSender, useClass: environment.production ? ToastSender : SilentSender },
];
// inject(NotificationSender) rend un ToastSender en prod, un SilentSender en dev
```

**`useValue` — fournir une valeur toute faite.** Aucune instanciation : Angular rend l'objet tel quel. Idéal pour une constante de configuration.

```typescript
providers: [
  { provide: FEATURE_FLAGS, useValue: { sortiesPartagees: true, betaBadge: false } },
];
```

Ici `FEATURE_FLAGS` n'est pas une classe : c'est un **jeton** (`InjectionToken`) — le mécanisme pour fournir une valeur non-classe. On l'**effleure** ici ; sa construction (`new InjectionToken<T>('...')`) et son typage sont le **module 13**.

**`useFactory` — fabriquer avec une fonction.** Angular appelle la fonction et prend son retour. La factory peut **résoudre d'autres dépendances avec `inject()`** — c'est le point clé pour un service qui dépend de la config.

```typescript
providers: [
  {
    provide: SortieDraftService,
    useFactory: () => {
      const flags = inject(FEATURE_FLAGS);            // inject() autorisé dans une factory
      const max = flags.sortiesPartagees ? 20 : 8;
      return new SortieDraftService(max);             // construction paramétrée
    },
  },
];
```

> Ancien style équivalent : `useFactory: (flags) => new SortieDraftService(...)` avec un tableau `deps: [FEATURE_FLAGS]` qui liste les dépendances passées en arguments. En Angular 19, **`inject()` dans le corps de la factory est préféré** à `deps` — plus lisible, mieux typé.

**`useExisting` — créer un alias.** Le token demandé renvoie vers **un autre provider déjà existant**. Aucune nouvelle instance : les deux tokens pointent la **même**.

```typescript
providers: [
  ToastSender,
  { provide: NotificationSender, useExisting: ToastSender },
];
const a = inject(ToastSender);
const b = inject(NotificationSender);
// a === b  → true : même instance, deux noms
```

`useExisting` diffère de `useClass` : `useClass: ToastSender` fabriquerait une **seconde** instance ; `useExisting: ToastSender` **réutilise** celle déjà fournie.

### 2.6 Multi providers — plusieurs valeurs pour un token (effleuré)

Avec `multi: true`, plusieurs providers alimentent **le même** token et `inject()` rend un **tableau**.

```typescript
providers: [
  { provide: SORTIE_VALIDATORS, useClass: DateFutureValidator, multi: true },
  { provide: SORTIE_VALIDATORS, useClass: BudgetMaxValidator,  multi: true },
];
inject(SORTIE_VALIDATORS); // → [DateFutureValidator, BudgetMaxValidator]
```

C'est le mécanisme derrière les listes extensibles (validateurs, plugins, intercepteurs). Le token typé se construit avec `InjectionToken` — encore une fois, **module 13**.

### 2.7 Modifier la résolution (effleuré)

Par défaut la résolution remonte jusqu'au root. On peut la contraindre via les options d'`inject()` :

- `inject(Token, { optional: true })` — rend `null` au lieu de lever `NG0201` si le token est introuvable.
- `inject(Token, { self: true })` — ne cherche **que** dans l'injecteur courant.
- `inject(Token, { skipSelf: true })` — commence **au parent**, ignore l'injecteur courant.

```typescript
const flags = inject(FEATURE_FLAGS, { optional: true }) ?? { sortiesPartagees: false };
```

Ces modificateurs deviennent utiles avec les jetons du module 13 ; on les cite ici pour que tu saches qu'ils existent.

---

## 3. Worked examples

### Exemple 1 — corriger le bug du cas concret (scope composant)

On repart des cartes de sortie synchronisées à tort. Deux changements suffisent : retirer le `providedIn: 'root'`, fournir le service au niveau composant.

```typescript
// sortie-draft.service.ts — plus de providedIn : fourni explicitement
import { Injectable, signal, computed } from '@angular/core';

@Injectable()   // ← nu : ne s'enregistre nulle part tout seul
export class SortieDraftService {
  readonly titre = signal('');
  readonly participants = signal(2);
  readonly resume = computed(() => `${this.titre()} — ${this.participants()} pers.`);

  reinitialiser() {
    this.titre.set('');
    this.participants.set(2);
  }
}
```

```typescript
// sortie-card.component.ts — chaque carte fournit SON brouillon
import { Component, inject } from '@angular/core';
import { SortieDraftService } from './sortie-draft.service';

@Component({
  selector: 'app-sortie-card',
  providers: [SortieDraftService],   // ← une instance neuve par carte
  template: `
    <input
      [value]="draft.titre()"
      (input)="draft.titre.set($any($event.target).value)"
    />
    <p>Participants : {{ draft.participants() }}</p>
    <p>{{ draft.resume() }}</p>
    <button (click)="draft.reinitialiser()">Réinitialiser</button>
  `,
})
export class SortieCardComponent {
  readonly draft = inject(SortieDraftService);
}
```

**Ce qui se passe à l'affichage de trois cartes** : Angular crée trois `SortieCardComponent`, donc trois injecteurs de composant. Chacun voit `providers: [SortieDraftService]` et fabrique **sa** instance. Taper dans la carte A ne touche plus B ni C — chaque `draft.titre` est un signal distinct.

Si, plus tard, on veut qu'un total de participants soit partagé **par toutes les cartes d'une même famille**, on remonte ce compteur dans un service fourni **au niveau route** de la section famille (2.4) — pas au niveau carte.

### Exemple 2 — brancher une implémentation avec `useClass` et l'aliaser avec `useExisting`

TribuZen envoie des notifications (« sortie enregistrée »). En dev, on ne veut pas de vrais toasts. On code contre une **abstraction** et on choisit l'implémentation via les providers.

```typescript
// notification-sender.ts
import { Injectable } from '@angular/core';

// Le contrat — les composants ne dépendent QUE de ça
export abstract class NotificationSender {
  abstract envoyer(message: string): void;
}

@Injectable()
export class ToastSender extends NotificationSender {
  private readonly file: string[] = [];
  envoyer(message: string) {
    this.file.push(message);
    // en vrai : déclenche un toast animé
    console.log('[toast]', message);
  }
}

@Injectable()
export class SilentSender extends NotificationSender {
  envoyer(_message: string) { /* silence en dev/test */ }
}
```

```typescript
// app.config.ts — choix à la racine
import { environment } from '../environments/environment';

export const appConfig = {
  providers: [
    // useClass : Angular instancie la classe choisie quand on demande NotificationSender
    {
      provide: NotificationSender,
      useClass: environment.production ? ToastSender : SilentSender,
    },
  ],
};
```

```typescript
// sortie-card.component.ts — dépend de l'abstraction, pas du concret
export class SortieCardComponent {
  private readonly notifier = inject(NotificationSender);
  enregistrer() {
    // ... sauvegarde ...
    this.notifier.envoyer('Sortie enregistrée');
  }
}
```

Le composant ne sait pas s'il parle à un `ToastSender` ou un `SilentSender` : c'est le provider qui décide. Pour la démo, en prod, on veut qu'un panneau de debug puisse aussi lire la file du `ToastSender` **sans créer une seconde instance** :

```typescript
providers: [
  ToastSender,                                          // l'instance réelle
  { provide: NotificationSender, useExisting: ToastSender }, // alias vers la MÊME instance
];
// inject(NotificationSender) === inject(ToastSender)  → true
```

`useExisting` réutilise l'instance ; `useClass` en aurait fabriqué une deuxième, et le panneau de debug aurait vu une file vide.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Mettre `providedIn: 'root'` sur un service qui doit être par-composant

```typescript
// ❌ Singleton global : toutes les cartes partagent le même brouillon (bug du §1)
@Injectable({ providedIn: 'root' })
export class SortieDraftService {}

// ✅ Nu + fourni au niveau composant : une instance par carte
@Injectable()
export class SortieDraftService {}
// @Component({ providers: [SortieDraftService] })
```

Règle : un état **propre à une instance** de composant (brouillon, éditeur) se fournit **dans** le composant, jamais au root.

### PIÈGE #2 — Confondre `useClass` et `useExisting`

```typescript
// ❌ Deux instances distinctes : le token abstrait n'est PAS la même que ToastSender
providers: [
  ToastSender,
  { provide: NotificationSender, useClass: ToastSender },
];
inject(ToastSender) === inject(NotificationSender); // false → deux files séparées

// ✅ Alias : même instance derrière deux tokens
providers: [
  ToastSender,
  { provide: NotificationSender, useExisting: ToastSender },
];
inject(ToastSender) === inject(NotificationSender); // true
```

`useClass` **fabrique** ; `useExisting` **pointe vers** un provider déjà là.

### PIÈGE #3 — Oublier que l'injecteur de composant partage vers le BAS

Fournir un service dans un composant parent le rend disponible à **tous ses enfants**, qui partagent alors l'instance du parent — ce n'est pas isolé par enfant.

```typescript
// providers sur le PARENT → une instance partagée par le parent ET tous ses enfants
@Component({ selector: 'app-sorties-page', providers: [SortieDraftService] })
// Si on voulait une instance par carte, il faut providers sur la CARTE, pas sur la page.
```

Le niveau où tu écris `providers` détermine **qui partage**. Trop haut = partage non voulu ; au bon niveau = isolation voulue.

### PIÈGE #4 — Passer un `EnvironmentProviders` (`provideXxx()`) dans les `providers` d'un composant

```typescript
// ❌ NG0207 : provideHttpClient() rend des EnvironmentProviders, interdits au niveau composant
@Component({ providers: [provideHttpClient()] })
export class SortieCardComponent {}

// ✅ Les provideXxx() vont dans bootstrapApplication(...) ou dans les providers d'une route
bootstrapApplication(App, { providers: [provideHttpClient()] });
```

Les fonctions `provideRouter()`, `provideHttpClient()`, `importProvidersFrom()` renvoient des **EnvironmentProviders** : uniquement au niveau **application** ou **route**, jamais dans un `@Component`. Les providers « classiques » (`{ provide, useClass/useValue/... }`) fonctionnent, eux, aux trois niveaux.

### PIÈGE #5 — Croire qu'`inject()` est interdit dans une `useFactory`

```typescript
// ✅ inject() est parfaitement valide DANS le corps d'une useFactory
providers: [
  {
    provide: SortieDraftService,
    useFactory: () => new SortieDraftService(inject(FEATURE_FLAGS).sortiesPartagees ? 20 : 8),
  },
];
```

Une factory de provider s'exécute dans un contexte d'injection : `inject()` y résout les dépendances. C'est même la façon **recommandée** en Angular 19 (préférée au tableau `deps`). Ce qui déclenche `NG0203`, c'est appeler `inject()` **hors** contexte (dans un `setTimeout`, un handler d'event), pas dans une factory.

---

## 5. Ancrage TribuZen

Les providers et scopes sont la **couche de câblage** de TribuZen : ils décident *qui partage quelle instance*.

**`SortieDraftService` au niveau composant** (Exemple 1) — chaque `SortieCardComponent` de l'écran « Mes sorties » a son propre brouillon. C'est le scope **composant** : isolation par instance. Sans ça, éditer une carte polluerait les autres.

**`FamilleSectionService` au niveau route** (théorie 2.4) — le contexte de la famille active (nom, membres, filtre courant) est partagé par toutes les pages de `/famille` et **détruit** quand on quitte la section. C'est le scope **route**.

**`AuthService` au niveau root** (rappel module 11) — l'utilisateur connecté est un **singleton global** : `providedIn: 'root'`. C'est le scope **root**.

**`NotificationSender` via `useClass`** (Exemple 2) — TribuZen code contre l'abstraction et branche `ToastSender` en prod, `SilentSender` en dev, sans toucher aux composants.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-card.component.ts       ← Exemple 1 (providers composant)
        sortie-draft.service.ts        ← @Injectable() nu, fourni par la carte
      core/
        notification-sender.ts         ← Exemple 2 (abstraction + useClass/useExisting)
      famille/
        famille-section.service.ts     ← fourni au niveau route (module 14 pour les routes)
```

> Typer proprement `FEATURE_FLAGS` (le jeton derrière `useValue`) est le **module 13** ; déclarer réellement la route `/famille` qui fournit `FamilleSectionService` est le **module 14**. Ici on maîtrise le **placement** et la **configuration** des providers.

---

## 6. Points clés

1. Angular a un **arbre d'injecteurs** : root (singleton global) → route (section) → composant (par instance).
2. La résolution est **ascendante** : Angular cherche du composant vers le root ; le premier provider trouvé gagne, `NG0201` si aucun.
3. `providers: [Service]` dans `@Component` donne **une instance par composant** — le scope des états propres à une instance (brouillon, éditeur).
4. `providers: [Service]` sur une **route** partage une instance dans toute la section et la **détruit** en sortie.
5. `providers: [X]` est l'abrégé de `{ provide: X, useClass: X }` ; la forme `{ provide, use* }` sépare le **token demandé** de la **façon de fabriquer**.
6. `useClass` fournit une implémentation, `useValue` une valeur toute faite, `useFactory` fabrique avec une fonction (qui peut appeler `inject()`), `useExisting` crée un **alias** vers un provider existant.
7. `useExisting` réutilise l'instance ; `useClass` en fabrique une nouvelle — ne pas confondre.
8. Les `provideXxx()` sont des **EnvironmentProviders** : niveau application/route seulement, pas dans un `@Component` (sinon `NG0207`).

---

## 7. Seeds Anki

```
Dans quel sens Angular résout-il une dépendance dans la hiérarchie d'injecteurs ?|De bas en haut (ascendant) : injecteur du composant, puis composants parents, puis route, puis root. Le premier provider trouvé gagne ; sinon erreur NG0201 (No provider for).
Comment obtenir une instance isolée d'un service par composant ?|Déclarer le service dans le tableau providers du décorateur @Component (et retirer providedIn: 'root'). Chaque instance de composant crée son injecteur et donc sa propre instance du service.
Que se passe-t-il pour un service fourni dans les providers d'une route ?|Une seule instance est partagée par la route et tous ses composants enfants (la section), puis elle est détruite quand on quitte la section.
Différence entre useClass et useExisting ?|useClass fabrique une NOUVELLE instance de la classe fournie. useExisting est un alias : le token pointe vers un provider déjà existant et partage la MÊME instance (inject(A) === inject(B)).
À quoi sert useFactory et peut-on y appeler inject() ?|useFactory fournit la valeur retournée par une fonction, utile pour une construction paramétrée. Oui, inject() est autorisé dans le corps de la factory (recommandé en Angular 19, préféré au tableau deps).
Pourquoi provideHttpClient() échoue-t-il dans les providers d'un @Component ?|Les fonctions provideXxx() renvoient des EnvironmentProviders, valides uniquement au niveau application (bootstrapApplication) ou route — pas au niveau composant. Erreur NG0207.
Quelle est la forme complète de providers: [MonService] ?|{ provide: MonService, useClass: MonService }. La forme courte est un raccourci ; la forme objet sépare le token demandé (provide) de la façon de le fabriquer (use*).
Quand utiliser root vs route vs composant pour un service ?|root : état global singleton (auth, config). route : état d'une section détruit en sortie. composant : état propre à chaque instance (brouillon de formulaire, éditeur réutilisable).
```

---

## Pont vers le lab

> Lab associé : `labs/lab-12-providers-et-scopes/README.md`. Reproduire et corriger le bug des brouillons partagés avec un provider au niveau composant, puis brancher un `NotificationSender` via `useClass` — dev server Angular CLI comme oracle, corrigé commenté intégral.
