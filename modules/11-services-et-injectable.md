---
titre: Services et @Injectable — inject(), providedIn root, état partagé en signals
cours: 03-angular
notions: ["@Injectable()", providedIn root, service singleton tree-shakable, inject() fonction, injection context, état dans un service via signal(), asReadonly() pour exposer en lecture seule, computed() dérivé dans un service, séparation logique métier et vue]
outcomes:
  - "sait créer un service avec @Injectable({ providedIn: 'root' }) et comprend que c'est un singleton tree-shakable"
  - sait injecter un service dans un composant avec la fonction inject() plutôt que par le constructeur
  - sait porter un état partagé dans un service avec des signal() privés exposés en lecture seule via asReadonly()
  - sait exposer des valeurs dérivées d'un service avec computed() et des méthodes de mutation publiques
  - sait déplacer la logique métier hors du composant pour ne garder que la logique de vue
prerequis: [module 00 de-vue-a-angular, module 02 signaux-base, module 09 signaux-avances, module 10 resource-api]
next: 12-providers-et-scopes
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: couche services TribuZen — FamilleStore, état partagé de la famille injecté dans plusieurs composants
last-reviewed: 2026-07
---

# Services et `@Injectable` — `inject()`, `providedIn: 'root'`, état partagé en signals

> **Outcomes — tu sauras FAIRE :** créer un service `@Injectable({ providedIn: 'root' })`, l'injecter avec `inject()`, y porter un état partagé en `signal()` exposé en lecture seule, et sortir la logique métier du composant.
> **Difficulté :** :star::star:
>
> **Portée :** ce module couvre **le service de base et son injection** : le décorateur `@Injectable`, l'option `providedIn: 'root'` (le singleton d'application), la fonction `inject()`, et le pattern « état signals dans un service ». C'est tout. La configuration fine des providers (tableau `providers`, scopes hiérarchiques par composant) est le **module 12**. Les jetons d'injection (`InjectionToken`) sont le **module 13**. Les appels HTTP réels (`HttpClient`) sont le **module 18** — ici on garde l'état en mémoire. Les signaux (`signal`, `computed`, `asReadonly`) sont supposés acquis (**modules 02 et 09**).

## 1. Cas concret d'abord

Sur TribuZen, deux écrans affichent la même famille en même temps : le **header** montre le nom de la famille et le nombre de membres, et la **page famille** en dessous montre la liste détaillée. Quand on ajoute un membre depuis la page, le compteur du header doit bouger aussi.

Un collègue a mis tout l'état dans le composant page :

```typescript
// famille-page.component.ts — AVANT (état enfermé dans le composant)
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-famille-page',
  template: `
    <p>{{ nombreMembres() }} membre(s)</p>
    <button (click)="ajouterMembre()">Ajouter</button>
  `,
})
export class FamillePageComponent {
  private membres = signal<string[]>(['Alice', 'Bob']);
  nombreMembres = computed(() => this.membres().length);

  ajouterMembre() {
    this.membres.update(liste => [...liste, 'Invité']);
  }
}
```

Problème : cet état vit **à l'intérieur** de `FamillePageComponent`. Le header est un autre composant, ailleurs dans l'arbre — il n'a aucun moyen de lire `membres` ni d'être notifié quand la liste grandit. Copier l'état dans le header créerait **deux sources de vérité** qui se désynchronisent.

Il faut sortir l'état du composant et le mettre dans un endroit **partagé**, que n'importe quel composant peut récupérer. En Angular, cet endroit est un **service** : une classe `@Injectable` que le framework instancie une seule fois et distribue à qui la demande. Ce module te donne les trois briques : `@Injectable`, `inject()`, et le pattern « état signals dans un service ».

---

## 2. Théorie complète, concise

### 2.1 Un service = une classe qui vit hors des composants

Un service est une **classe TypeScript** ordinaire qui encapsule ce qui n'est pas de l'affichage : logique métier, état partagé, futurs appels API. Le composant, lui, ne garde que la logique de vue (quoi afficher, réagir aux clics).

Si tu viens de Vue, c'est le rôle du **composable** (`useAuth()`, `useFamille()`) — sauf qu'ici, ce n'est pas toi qui décides du cycle de vie : c'est le système d'**injection de dépendances** (DI) d'Angular qui crée l'instance et te la donne.

### 2.2 `@Injectable({ providedIn: 'root' })` — le décorateur

Le décorateur `@Injectable()` marque une classe comme **injectable** : Angular sait la construire et la fournir à d'autres classes. L'option `providedIn: 'root'` est le cas courant.

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FamilleStore {
  // état + méthodes
}
```

`providedIn: 'root'` a trois conséquences vérifiées (source Context7 `angular.dev`) :

- **Singleton d'application** : Angular crée **une seule** instance, partagée par tous les composants. C'est ce qui règle notre problème d'état partagé.
- **Tree-shakable** : si **aucun** composant n'injecte le service, il est retiré du bundle final. Zéro coût si inutilisé.
- **Auto-enregistré** : pas besoin de le déclarer dans un tableau `providers` — il est disponible partout tout de suite.

### 2.3 `inject()` — récupérer le service

En Angular 19+, la façon **recommandée** d'obtenir une instance est la fonction `inject()`, importée de `@angular/core`. On la range dans une propriété de classe.

```typescript
import { Component, inject } from '@angular/core';
import { FamilleStore } from './famille-store';

@Component({ selector: 'app-header', template: `...` })
export class HeaderComponent {
  private famille = inject(FamilleStore);
}
```

`inject(FamilleStore)` renvoie l'instance singleton. Deux composants qui font `inject(FamilleStore)` reçoivent **le même objet** — donc le même état.

### 2.4 `inject()` plutôt que le constructeur

Historiquement, on injectait par le **constructeur** :

```typescript
// Ancien style — toujours valide, mais on ne l'écrit plus par défaut en Angular 19
export class HeaderComponent {
  constructor(private famille: FamilleStore) {}
}
```

La doc Angular recommande désormais `inject()` (source Context7). Avantages vérifiés :

- pas de constructeur à écrire, moins de boilerplate quand il y a plusieurs dépendances ;
- `inject()` marche aussi dans des fonctions (guards, resolvers, interceptors fonctionnels — modules 15 et 18), là où le constructeur n'existe pas ;
- lecture plus directe : chaque dépendance est une propriété nommée.

### 2.5 Injection context — où `inject()` a le droit d'être appelé

`inject()` ne peut pas être appelé n'importe où : il doit s'exécuter dans un **injection context**. En pratique, pour ce module, ça veut dire **à l'initialisation de la propriété de classe** (ou dans le constructeur).

```typescript
export class HeaderComponent {
  private famille = inject(FamilleStore); // ✅ initialisation de propriété : injection context

  ajouter() {
    const s = inject(FamilleStore);       // ❌ dans une méthode appelée plus tard : hors contexte → erreur runtime
  }
}
```

Règle simple : **on injecte en haut, une fois, dans une propriété.** On ne rappelle jamais `inject()` dans un handler.

### 2.6 Porter un état partagé : le pattern « signals dans un service »

Le service devient la **source de vérité unique** de l'état. Le pattern idiomatique en Angular 19 :

1. des `signal()` **privés** (`_prefix`) pour l'état modifiable ;
2. une version **lecture seule** exposée avec `asReadonly()` ;
3. des `computed()` publics pour les valeurs dérivées ;
4. des **méthodes publiques** pour les mutations — seul le service touche ses signals privés.

```typescript
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FamilleStore {
  // 1. état privé, modifiable seulement à l'intérieur
  private readonly _membres = signal<string[]>(['Alice', 'Bob']);

  // 2. lecture seule pour l'extérieur — impossible d'appeler .set() dessus
  readonly membres = this._membres.asReadonly();

  // 3. valeur dérivée exposée
  readonly nombreMembres = computed(() => this._membres().length);

  // 4. mutation via une méthode : l'extérieur ne mute jamais directement
  ajouterMembre(nom: string): void {
    this._membres.update(liste => [...liste, nom]);
  }

  retirerMembre(nom: string): void {
    this._membres.update(liste => liste.filter(m => m !== nom));
  }
}
```

Résultat : `HeaderComponent` et `FamillePageComponent` injectent le **même** `FamilleStore`, lisent `store.nombreMembres()` / `store.membres()`, et quand la page appelle `store.ajouterMembre(...)`, le header se réactualise **tout seul** (les signaux notifient tous leurs lecteurs).

### 2.7 Séparation logique / vue

Une fois l'état dans le service, le composant maigrit : il **délègue**. La règle qu'on te demandera en entretien ESN : le composant ne contient que la logique de vue ; toute logique métier / état partagé / futurs appels API vivent dans des services.

```typescript
@Component({
  selector: 'app-famille-page',
  template: `
    <p>{{ store.nombreMembres() }} membre(s)</p>
    <button (click)="store.ajouterMembre('Invité')">Ajouter</button>
  `,
})
export class FamillePageComponent {
  protected readonly store = inject(FamilleStore); // délègue tout au service
}
```

### 2.8 Générer un service avec la CLI

On ne crée pas le fichier à la main :

```bash
ng generate service famille-store
# raccourci : ng g s famille-store
# crée src/app/famille-store.ts (+ le .spec.ts de test)
```

Le fichier généré arrive déjà avec `@Injectable({ providedIn: 'root' })` — on n'a plus qu'à ajouter l'état et les méthodes.

---

## 3. Worked examples

### Exemple 1 — `FamilleStore` partagé entre header et page (TribuZen)

On résout le cas concret de bout en bout : un seul service, deux composants qui restent synchronisés.

```typescript
// famille-store.ts — la source de vérité unique
import { Injectable, signal, computed } from '@angular/core';

export interface Membre {
  id: string;
  nom: string;
}

@Injectable({ providedIn: 'root' })
export class FamilleStore {
  // État privé : seul le service peut le muter
  private readonly _nomFamille = signal('Famille Martin');
  private readonly _membres = signal<Membre[]>([
    { id: 'm1', nom: 'Alice' },
    { id: 'm2', nom: 'Bob' },
  ]);

  // Exposition lecture seule — l'extérieur lit mais ne set() pas
  readonly nomFamille = this._nomFamille.asReadonly();
  readonly membres = this._membres.asReadonly();

  // Valeur dérivée : recalculée quand _membres change
  readonly nombreMembres = computed(() => this._membres().length);

  // Mutations : seule API publique pour changer l'état
  ajouterMembre(nom: string): void {
    const nouveau: Membre = { id: crypto.randomUUID(), nom };
    // immuable : nouveau tableau → nouvelle référence → tous les lecteurs notifiés
    this._membres.update(liste => [...liste, nouveau]);
  }

  retirerMembre(id: string): void {
    this._membres.update(liste => liste.filter(m => m.id !== id));
  }
}
```

```typescript
// header.component.ts — LIT l'état partagé
import { Component, inject } from '@angular/core';
import { FamilleStore } from './famille-store';

@Component({
  selector: 'app-header',
  template: `
    <header>
      <strong>{{ store.nomFamille() }}</strong>
      <span>{{ store.nombreMembres() }} membre(s)</span>
    </header>
  `,
})
export class HeaderComponent {
  // même instance singleton que la page — injection en propriété
  protected readonly store = inject(FamilleStore);
}
```

```typescript
// famille-page.component.ts — MODIFIE l'état partagé
import { Component, inject } from '@angular/core';
import { FamilleStore } from './famille-store';

@Component({
  selector: 'app-famille-page',
  template: `
    <button (click)="store.ajouterMembre('Invité')">Ajouter un membre</button>
  `,
})
export class FamillePageComponent {
  protected readonly store = inject(FamilleStore);
}
```

**Ce qui se passe au clic « Ajouter »** : `FamillePageComponent` appelle `store.ajouterMembre(...)` → le service fait `_membres.update(...)` → `nombreMembres` (qui lit `_membres`) est invalidé → **les deux** templates qui lisent `store.nombreMembres()` se réactualisent, header compris. Aucune ligne de synchronisation entre composants : le service est l'unique source, les signaux propagent.

### Exemple 2 — sortir la logique de vue d'un composant lourd

Avant : un composant qui mélange état, règle métier et affichage.

```typescript
// AVANT — logique métier coincée dans le composant
@Component({
  selector: 'app-invitations',
  template: `<p>{{ enAttente() }} invitation(s) en attente</p>`,
})
export class InvitationsComponent {
  private invitations = signal<{ id: string; acceptee: boolean }[]>([]);
  enAttente = computed(() => this.invitations().filter(i => !i.acceptee).length);

  inviter(id: string) {
    this.invitations.update(l => [...l, { id, acceptee: false }]);
  }
  accepter(id: string) {
    this.invitations.update(l =>
      l.map(i => (i.id === id ? { ...i, acceptee: true } : i))
    );
  }
}
```

Après : la logique part dans un service, le composant ne fait plus que déléguer.

```typescript
// invitations-store.ts — la logique métier isolée et testable seule
import { Injectable, signal, computed } from '@angular/core';

interface Invitation { id: string; acceptee: boolean; }

@Injectable({ providedIn: 'root' })
export class InvitationsStore {
  private readonly _invitations = signal<Invitation[]>([]);
  readonly enAttente = computed(
    () => this._invitations().filter(i => !i.acceptee).length
  );

  inviter(id: string): void {
    this._invitations.update(l => [...l, { id, acceptee: false }]);
  }
  accepter(id: string): void {
    this._invitations.update(l =>
      l.map(i => (i.id === id ? { ...i, acceptee: true } : i))
    );
  }
}
```

```typescript
// invitations.component.ts — APRÈS : uniquement de la vue
@Component({
  selector: 'app-invitations',
  template: `<p>{{ store.enAttente() }} invitation(s) en attente</p>`,
})
export class InvitationsComponent {
  protected readonly store = inject(InvitationsStore);
}
```

Bénéfice concret : la règle « une invitation acceptée ne compte plus » vit maintenant dans `InvitationsStore`. On peut la réutiliser dans un autre écran, et la tester **sans instancier de composant** (module 23) — il suffit d'instancier le service.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Rappeler `inject()` dans une méthode (hors injection context)

```typescript
export class HeaderComponent {
  ajouter() {
    // ❌ méthode appelée après la construction → plus dans l'injection context → erreur runtime
    const store = inject(FamilleStore);
    store.ajouterMembre('X');
  }
}
```

```typescript
export class HeaderComponent {
  // ✅ injecté une fois, à l'initialisation de la propriété
  private readonly store = inject(FamilleStore);
  ajouter() {
    this.store.ajouterMembre('X');
  }
}
```

`inject()` s'appelle **à la construction** (propriété ou constructeur), jamais dans un handler exécuté plus tard.

### PIÈGE #2 — Oublier `providedIn: 'root'` et croire que le service est dispo partout

```typescript
// ❌ Décorateur sans providedIn : le service n'est enregistré nulle part
@Injectable()
export class FamilleStore {}
// inject(FamilleStore) → NullInjectorError: No provider for FamilleStore
```

```typescript
// ✅ providedIn: 'root' → enregistré comme singleton d'application
@Injectable({ providedIn: 'root' })
export class FamilleStore {}
```

Sans `providedIn` (et sans entrée dans un tableau `providers` — module 12), Angular ne sait pas fabriquer le service : `inject()` lève `NullInjectorError`.

### PIÈGE #3 — Exposer le signal **modifiable** au lieu de sa version lecture seule

```typescript
@Injectable({ providedIn: 'root' })
export class FamilleStore {
  // ❌ public et writable : n'importe quel composant peut .set() et court-circuiter la logique
  membres = signal<string[]>([]);
}
```

```typescript
@Injectable({ providedIn: 'root' })
export class FamilleStore {
  private readonly _membres = signal<string[]>([]);
  // ✅ lecture seule dehors, mutation seulement via les méthodes du service
  readonly membres = this._membres.asReadonly();
  ajouterMembre(nom: string) { this._membres.update(l => [...l, nom]); }
}
```

Exposer le `WritableSignal` casse l'encapsulation : la règle métier vit dans les méthodes, pas dans dix `set()` éparpillés dans les composants.

### PIÈGE #4 — Créer le service à la main avec `new`

```typescript
// ❌ new casse la DI : ce n'est PAS le singleton, chaque new crée un état séparé
const store = new FamilleStore();
```

```typescript
// ✅ toujours passer par inject() → Angular renvoie l'instance singleton partagée
private readonly store = inject(FamilleStore);
```

Faire `new` te donne un objet isolé : le header et la page auraient chacun leur `FamilleStore`, et l'état ne serait plus partagé. Le point d'un service `providedIn: 'root'` est justement de laisser Angular gérer l'unique instance.

### PIÈGE #5 — Croire que `providedIn: 'root'` recrée le service à chaque injection

`providedIn: 'root'` **n'est pas** « une instance par composant ». C'est **une** instance pour toute l'application, créée **paresseusement** au premier `inject()`, puis réutilisée. Tous les `inject(FamilleStore)` renvoient le même objet. (Faire varier la portée — une instance par composant — est le sujet des scopes du **module 12**.)

---

## 5. Ancrage TribuZen

Les services sont la **couche d'état partagé et de logique métier** de TribuZen. Dès qu'une donnée est lue par plus d'un composant, ou qu'une règle métier n'appartient à aucun écran en particulier, elle vit dans un service `@Injectable({ providedIn: 'root' })`.

**`FamilleStore`** (Exemple 1) — la source de vérité de la famille courante : `nomFamille`, `membres` (signals privés exposés en `asReadonly()`), `nombreMembres` (`computed`), et les mutations `ajouterMembre` / `retirerMembre`. Injecté dans le header, la page famille, et bientôt l'écran de sortie. Un seul état, zéro désynchronisation.

**`InvitationsStore`** (Exemple 2) — la logique d'invitations sortie du composant : réutilisable et testable seule.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      famille/
        famille-store.ts            ← Exemple 1 (état partagé signals + inject)
        header.component.ts         ← lit le store
        famille-page.component.ts   ← mute le store
      invitations/
        invitations-store.ts        ← Exemple 2 (logique métier isolée)
```

> Pour l'instant `FamilleStore` garde ses données **en mémoire** (tableau initial en dur). Le chargement depuis l'API — remplacer le tableau par un `resource` / `HttpClient` — arrive au **module 18** ; le service change en interne, mais son interface publique (`membres()`, `ajouterMembre(...)`) reste identique. Fournir le service à une portée plus étroite qu'`root` (une instance par page) est le **module 12**.

---

## 6. Points clés

1. Un **service** est une classe qui porte l'état partagé et la logique métier, hors des composants (l'équivalent Angular d'un composable Vue).
2. `@Injectable({ providedIn: 'root' })` crée un **singleton d'application**, **tree-shakable**, disponible partout sans tableau `providers`.
3. On récupère un service avec **`inject(Service)`** — la façon recommandée en Angular 19, préférée à l'injection par constructeur.
4. `inject()` s'appelle dans un **injection context** : à l'initialisation d'une propriété (ou dans le constructeur), **jamais** dans un handler tardif.
5. Deux composants qui injectent le même service `root` partagent **la même instance** — donc le même état, synchronisé automatiquement par les signaux.
6. Pattern d'état : `signal()` **privés**, exposition **lecture seule** via `asReadonly()`, dérivés en `computed()`, mutations par **méthodes publiques**.
7. Le composant **délègue** au service et ne garde que la logique de vue ; on ne fait jamais `new Service()` (ça casse la DI et le partage).

---

## 7. Seeds Anki

```
Que fait providedIn: 'root' sur un @Injectable ?|Enregistre le service comme singleton d'application : une seule instance partagée partout, tree-shakable (retirée du bundle si jamais injectée), sans avoir à le déclarer dans un tableau providers.
Comment récupère-t-on un service dans un composant Angular 19 ?|Avec la fonction inject() rangée dans une propriété : private store = inject(FamilleStore). C'est la façon recommandée, préférée à l'injection par constructeur.
Pourquoi inject() ne marche-t-il pas dans une méthode appelée au clic ?|inject() doit s'exécuter dans un injection context, c'est-à-dire à la construction (initialisation de propriété ou constructeur). Dans un handler appelé plus tard, on est hors contexte → erreur runtime. On injecte une fois en propriété.
Comment deux composants partagent-ils le même état via un service ?|Ils font tous deux inject(FamilleStore) : providedIn: 'root' garantit une instance singleton unique, donc le même objet et le même état. Une mutation par l'un est vue par l'autre via les signaux.
Quel est le pattern d'état recommandé dans un service ?|signal() privés (_prefix) pour l'état modifiable, exposition lecture seule via asReadonly(), valeurs dérivées en computed() publics, et mutations par des méthodes publiques — seul le service touche ses signals privés.
Pourquoi ne faut-il jamais faire new MonService() ?|new crée une instance isolée hors du système de DI : ce n'est pas le singleton partagé, chaque new a son propre état. Il faut toujours passer par inject() pour obtenir l'instance gérée par Angular.
Que se passe-t-il si on met @Injectable() sans providedIn ni entrée providers ?|Le service n'est enregistré nulle part : inject() lève NullInjectorError (No provider). providedIn: 'root' (ou un tableau providers, module 12) est nécessaire pour qu'Angular sache le fabriquer.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-11-services-et-injectable/README.md`. Extraire l'état de la famille dans un `FamilleStore` `@Injectable({ providedIn: 'root' })`, l'injecter avec `inject()` dans deux composants, et vérifier la synchronisation en direct dans le navigateur — zéro gap-fill, corrigé commenté intégral.
