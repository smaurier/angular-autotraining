---
titre: La Resource API — resource(), rxResource(), ResourceRef
cours: 03-angular
notions: ["resource()", "rxResource()", ResourceRef, "request (computation réactive)", "loader (fonction async)", "status()", ResourceStatus, "value()", "isLoading()", "hasValue()", "error()", "reload()", abortSignal, "value.set() (optimistic)", API expérimentale v19]
outcomes:
  - sait charger des données asynchrones de façon déclarative avec resource() en séparant request et loader
  - sait relire les états d'une ResourceRef via isLoading(), value(), error() et hasValue() dans le template
  - sait relancer un chargement avec reload() et faire une mise à jour optimiste avec value.set()
  - sait brancher l'abortSignal du loader sur fetch pour annuler la requête obsolète
  - sait choisir entre resource() (Promise) et rxResource() (Observable) et connaît leur statut expérimental en v19
prerequis: [module 02 signaux-base, module 03 control-flow, module 09 signaux-avances]
next: 11-services-et-injectable
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — chargement asynchrone de la liste des sorties famille depuis l'API (états de chargement, erreur, rechargement)
last-reviewed: 2026-07
---

# La Resource API — `resource()`, `rxResource()`, `ResourceRef`

> **Outcomes — tu sauras FAIRE :** charger des données async avec `resource()`, lire ses états (`isLoading` / `value` / `error`), la relancer avec `reload()`, annuler la requête obsolète via `abortSignal`, et choisir entre `resource()` et `rxResource()`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **la Resource API des signaux** : `resource()`, `rxResource()`, l'objet `ResourceRef` (`status`, `value`, `error`, `isLoading`, `hasValue`, `reload`), le couple `request` / `loader` et l'`abortSignal`. Le loader utilise ici un `fetch` minimal ou un `HttpClient` réduit à sa plus simple expression — **le CRUD HTTP complet, les intercepteurs et le cache HTTP sont le module 18**. RxJS en profondeur (opérateurs, `switchMap`, retry) est aux **modules 16-17** : ici `rxResource` sert juste de pont. Pas de routing. Prérequis directs : les signaux (module 02), `@if` / `@switch` (module 03), et `linkedSignal` / `effect` (module 09).

## 1. Cas concret d'abord

Nouvelle story TribuZen : la page **« Mes sorties »** doit afficher la liste des sorties famille chargée depuis l'API (`GET /api/familles/:id/sorties`). Un collègue a écrit la version « à la main » que tout le monde connaît :

```typescript
// sorties.component.ts — AVANT (chargement manuel : subscribe + 3 états à la main)
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-sorties',
  template: `
    @if (chargement()) { <p>Chargement…</p> }
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
    <ul>
      @for (s of sorties(); track s.id) { <li>{{ s.titre }}</li> }
    </ul>
  `,
})
export class SortiesComponent {
  familleId = signal('fam-1');
  sorties = signal<Sortie[]>([]);
  chargement = signal(false);
  erreur = signal<string | null>(null);

  constructor() {
    this.charger();
  }

  async charger() {
    this.chargement.set(true);
    this.erreur.set(null);                 // ← ne pas oublier de reset
    try {
      const res = await fetch(`/api/familles/${this.familleId()}/sorties`);
      if (!res.ok) throw new Error('Chargement impossible');
      this.sorties.set(await res.json());
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.chargement.set(false);          // ← ne pas oublier de re-passer à false
    }
    // Et quand familleId change ? Il faut penser à rappeler charger() partout.
    // Et si deux chargements se chevauchent ? Race condition non gérée.
  }
}
```

Trois signaux d'état à synchroniser à la main (`chargement`, `erreur`, `sorties`), un `try/catch/finally` à ne jamais rater, aucune annulation si `familleId` change en cours de route, et un rechargement à re-câbler manuellement. C'est le code qu'on écrit dix fois et qu'on rate une fois sur deux.

La **Resource API** d'Angular 19 encapsule exactement ce pattern : on déclare **ce qui déclenche** le chargement (`request`) et **comment charger** (`loader`), et Angular gère pour nous les états, l'annulation et le re-déclenchement. Ce module remplace tout le bloc ci-dessus par une dizaine de lignes déclaratives.

> ⚠️ **API expérimentale.** En Angular **19**, `resource()` et `rxResource()` sont marquées `@experimental` : elles s'importent normalement depuis `@angular/core` (aucun provider spécial requis), mais leur **surface d'API peut changer d'une mineure à l'autre** — c'est précisément le cas de `status()` (voir §2.3 et le PIÈGE #1). Leur stabilisation est intervenue dans une version ultérieure : **vérifie le statut exact sur ta version mineure** avant de t'appuyer dessus en prod. <!-- FLAG-CONTEXT7: version exacte de stabilisation de resource()/rxResource() -->

---

## 2. Théorie complète, concise

### 2.1 `resource()` — le chargement déclaratif

`resource()` crée un objet réactif (`ResourceRef`) qui lance une opération asynchrone et expose son résultat et son état via des signaux. On lui passe deux fonctions :

- **`request`** : une *computation réactive* qui produit l'entrée du chargement. Elle lit des signaux ; **quand l'un d'eux change, le loader est relancé**. C'est le déclencheur.
- **`loader`** : la fonction `async` qui fait le travail. Elle reçoit le `request` courant et un `abortSignal`, et renvoie une `Promise` de la valeur.

```typescript
import { Component, signal, resource } from '@angular/core';

@Component({ selector: 'app-sortie', template: `…` })
export class SortieComponent {
  familleId = signal('fam-1');

  sorties = resource({
    // request : la dépendance réactive. Relance le loader quand familleId change.
    request: () => ({ id: this.familleId() }),

    // loader : reçoit le request courant + un abortSignal. Renvoie une Promise.
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(`/api/familles/${request.id}/sorties`, {
        signal: abortSignal,
      });
      if (!res.ok) throw new Error('Chargement impossible');
      return (await res.json()) as Sortie[];
    },
  });
}
```

`sorties` n'est **pas** un tableau : c'est un `ResourceRef<Sortie[]>`, un objet dont on lit les propriétés-signaux (§2.2).

### 2.2 `ResourceRef` — les signaux à lire

L'objet renvoyé expose (toutes les propriétés de lecture sont des **signaux**, donc on les **appelle**) :

| Propriété | Type | Rôle |
|-----------|------|------|
| `value()` | `Signal<T>` (writable) | La dernière valeur reçue, ou `undefined` si aucune. |
| `hasValue()` | `Signal<boolean>` | `true` si `value()` n'est pas `undefined`. |
| `isLoading()` | `Signal<boolean>` | `true` tant que le loader tourne (chargement **ou** rechargement). |
| `error()` | `Signal<unknown>` | La dernière erreur du loader, ou `undefined`. |
| `status()` | `Signal<ResourceStatus>` | L'état précis (voir §2.3). |
| `reload()` | méthode | Relance le loader sans changer le `request` (voir §2.4). |

Signature vérifiée du loader : `loader: (params: ResourceLoaderParams<R>) => Promise<T>`, où `ResourceLoaderParams` contient `request`, `previous` (`{ status }`) et `abortSignal`.

Dans le template, on branche l'affichage sur ces signaux — c'est le **pattern robuste** (indépendant des changements d'API sur `status`) :

```typescript
template: `
  @if (sorties.isLoading()) {
    <p>Chargement…</p>
  } @else if (sorties.error()) {
    <p class="erreur">{{ sorties.error() }}</p>
  } @else {
    <ul>
      @for (s of sorties.value(); track s.id) {
        <li>{{ s.titre }}</li>
      } @empty {
        <li>Aucune sortie prévue.</li>
      }
    </ul>
  }
`
```

`hasValue()` sert quand on veut lire `value()` en le sachant défini : après `@if (sorties.hasValue())`, `sorties.value()` est garanti non-`undefined`.

### 2.3 `status()` et `ResourceStatus` — les six états

`status()` renvoie un `ResourceStatus`. En Angular 19, il prend **six** valeurs (bien plus fines que le trio « loading / ok / error ») :

| Statut | `value()` | Signification |
|--------|-----------|---------------|
| `Idle` | `undefined` | Pas de requête valide (`request` a renvoyé `undefined`), le loader n'a pas tourné. |
| `Loading` | `undefined` | Le loader tourne suite à un **changement de `request`**. |
| `Reloading` | valeur **précédente** | Le loader tourne suite à un `reload()` (on garde l'ancienne valeur affichée). |
| `Resolved` | valeur résolue | Le loader s'est terminé avec succès. |
| `Error` | `undefined` | Le loader a levé une erreur. |
| `Local` | valeur posée | La valeur a été fixée localement via `value.set()` / `value.update()` (§2.5). |

> ⚠️ **Piège de version (API expérimentale).** En Angular **19.0 / 19.1**, `ResourceStatus` est un **enum** (valeurs `ResourceStatus.Loading`, etc.). À partir de **19.2**, il est devenu une **union de chaînes** (`'loading'`, `'resolved'`…). Conséquence : **ne fais pas `@switch (sorties.status())` avec des cases `'loading'` en dur en v19.0/19.1** — ça ne matchera pas l'enum. Le code du support de cours interne qui utilise `@case ('loading')` est **daté de ce point** : préfère `isLoading()` / `error()` / `hasValue()`, qui sont stables. *(À reconfirmer sur Context7 pour ta mineure exacte.)*

Distinction clé à retenir : **`Loading` vs `Reloading`**. Pendant un `Loading` (le `request` a changé), `value()` est `undefined` — l'écran repart de zéro. Pendant un `Reloading` (un `reload()`), `value()` **conserve** l'ancienne valeur — l'écran ne clignote pas, on peut afficher un petit indicateur « rafraîchissement… » par-dessus la liste existante. `isLoading()` est `true` dans les deux cas.

### 2.4 `reload()` — relancer sans changer l'entrée

Pour rafraîchir les mêmes données (bouton « Actualiser », après une création), on appelle `reload()`. Il relance le `loader` avec le `request` courant inchangé et passe en statut `Reloading`.

```typescript
rafraichir() {
  this.sorties.reload(); // relance le loader ; value() garde l'ancienne liste le temps du fetch
}
```

À distinguer d'un changement de `request` : modifier `familleId` relance aussi le loader, mais en `Loading` (nouvelle entrée ⇒ `value()` repart à `undefined`).

### 2.5 `value.set()` — mise à jour optimiste locale

`value` est un signal **writable**. On peut donc poser une valeur localement sans passer par le réseau — utile pour une mise à jour optimiste (afficher tout de suite le résultat, réconcilier ensuite). Le statut passe alors à `Local`.

```typescript
renommerLocalement(id: string, titre: string) {
  // Optimistic update : on met à jour l'affichage immédiatement (statut -> Local)
  this.sorties.value.update((liste) =>
    (liste ?? []).map((s) => (s.id === id ? { ...s, titre } : s)),
  );
  // …puis on enverrait le PATCH réseau (module 18) et on reload() en cas d'échec.
}
```

### 2.6 `abortSignal` — annulation automatique

Quand le `request` change alors qu'un chargement est encore en cours, Angular **annule** le précédent en déclenchant l'`abortSignal` fourni au loader. Encore faut-il le **brancher** sur l'appel réseau. `fetch` accepte `{ signal }` nativement :

```typescript
loader: async ({ request, abortSignal }) => {
  // Si familleId rechange avant la fin, ce fetch est annulé -> pas de race condition
  const res = await fetch(`/api/familles/${request.id}/sorties`, { signal: abortSignal });
  return (await res.json()) as Sortie[];
}
```

Sans ce branchement, deux réponses peuvent revenir dans le désordre et la plus lente écrase la plus récente. **Toujours** passer l'`abortSignal`.

### 2.7 `request` qui renvoie `undefined` — ne pas charger

Si la computation `request` renvoie `undefined`, le loader **ne tourne pas** et le statut reste `Idle`. C'est le moyen déclaratif de dire « pas encore » (dépendance manquante, filtre non activé) :

```typescript
sorties = resource({
  // Tant qu'aucune famille n'est sélectionnée, on ne charge rien (statut Idle)
  request: () => {
    const id = this.familleId();
    return id ? { id } : undefined;
  },
  loader: async ({ request }) => { /* request est garanti défini ici */ },
});
```

### 2.8 `rxResource()` — le pont vers RxJS / `HttpClient`

Si le chargement passe par `HttpClient` (qui renvoie un `Observable`, pas une `Promise`), on utilise **`rxResource()`**, importée depuis **`@angular/core/rxjs-interop`**. Même objet `ResourceRef`, même `request`, mais le `loader` renvoie un **`Observable`** au lieu d'une `Promise` :

```typescript
import { Component, signal, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({ selector: 'app-sorties', template: `…` })
export class SortiesComponent {
  private http = inject(HttpClient);
  familleId = signal('fam-1');

  sorties = rxResource({
    request: () => ({ id: this.familleId() }),
    // loader renvoie un Observable ; Angular s'abonne et prend la 1re valeur émise
    loader: ({ request }) =>
      this.http.get<Sortie[]>(`/api/familles/${request.id}/sorties`),
  });
}
```

`rxResource` est **elle aussi expérimentale en v19**. Choix rapide :

| Situation | Choix |
|-----------|-------|
| `fetch` / Promise, pas de RxJS | `resource()` |
| Déjà `HttpClient` (Observable) | `rxResource()` |
| Besoin d'opérateurs RxJS (debounce, retry…) | `rxResource()` (opérateurs vus aux modules 16-17) |

> `rxResource` gère l'annulation via l'`abortSignal` en se désabonnant de l'Observable — on n'a pas à câbler `signal:` comme avec `fetch`.

---

## 3. Worked examples

### Exemple 1 — `SortiesComponent` complet (TribuZen, `resource()` + `fetch`)

On reprend le cas concret et on remplace le chargement manuel par une `resource()`.

```typescript
// sorties.component.ts — APRÈS (Resource API)
import { Component, signal, resource } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

@Component({
  selector: 'app-sorties',
  template: `
    <label>
      Famille :
      <select (change)="familleId.set($any($event.target).value)">
        <option value="fam-1">Famille Martin</option>
        <option value="fam-2">Famille Nguyen</option>
      </select>
    </label>

    <button (click)="sorties.reload()" [disabled]="sorties.isLoading()">
      Actualiser
    </button>

    <!-- Branchement robuste : isLoading / error / value, PAS status() en dur -->
    @if (sorties.isLoading()) {
      <p>Chargement des sorties…</p>
    } @else if (sorties.error()) {
      <p class="erreur">Oups : {{ sorties.error() }}</p>
    } @else {
      <ul>
        @for (s of sorties.value(); track s.id) {
          <li>{{ s.titre }}</li>
        } @empty {
          <li>Aucune sortie prévue pour cette famille.</li>
        }
      </ul>
    }
  `,
})
export class SortiesComponent {
  familleId = signal('fam-1');

  sorties = resource<Sortie[], { id: string }>({
    // request : relance le loader à chaque changement de familleId
    request: () => ({ id: this.familleId() }),

    // loader : abortSignal branché sur fetch -> la requête obsolète est annulée
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(
        `/api/familles/${request.id}/sorties`,
        { signal: abortSignal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Sortie[];
    },
  });
}
```

**Ce qui se passe quand on change de famille dans le `<select>`** : `familleId.set(...)` change → la computation `request` renvoie un nouvel objet → Angular **annule** le fetch précédent (via `abortSignal`) et **relance** le loader → `status()` passe `Loading`, `isLoading()` vaut `true`, `value()` repart à `undefined` → au retour du fetch, `Resolved`, `value()` contient la nouvelle liste. **Zéro** ligne de synchronisation d'états. Comparé au bloc `try/catch/finally` du §1, on a supprimé trois signaux d'état et une source de bugs.

### Exemple 2 — `reload()` + mise à jour optimiste

Après avoir renommé une sortie côté client, on veut l'afficher immédiatement, puis recharger la vérité serveur.

```typescript
renommer(id: string, nouveauTitre: string) {
  // 1) Optimistic : on modifie value localement -> l'écran réagit tout de suite (statut Local)
  this.sorties.value.update((liste) =>
    (liste ?? []).map((s) => (s.id === id ? { ...s, titre: nouveauTitre } : s)),
  );

  // 2) (module 18) on enverrait ici le PATCH réseau…
  //    en cas d'échec du PATCH, on annule l'optimisme en rechargeant la vérité serveur :
  // this.sorties.reload();
}
```

Point clé : `value.update()` fait passer `status()` à `Local` (et non `Resolved`), ce qui documente que la valeur affichée est une supposition locale, pas encore confirmée par le serveur.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Faire `@switch (r.status())` avec des cases chaîne en dur

```typescript
// ❌ En Angular 19.0/19.1, status() renvoie un ENUM ResourceStatus, pas une chaîne.
//    Les @case ('loading') / ('resolved') ne matchent JAMAIS -> écran figé.
@switch (sorties.status()) {
  @case ('loading') { <p>…</p> }     // ne matche pas l'enum
  @case ('resolved') { … }
}

// ✅ Pattern robuste, stable quelle que soit la représentation de status :
@if (sorties.isLoading()) { <p>…</p> }
@else if (sorties.error()) { … }
@else { … }
```

C'est l'API expérimentale qui a changé entre 19.1 et 19.2 (enum → union de chaînes). `isLoading()` / `error()` / `hasValue()` ne bougent pas : utilise-les pour brancher le template.

### PIÈGE #2 — Oublier de brancher l'`abortSignal`

```typescript
// ❌ abortSignal ignoré : si request change vite, deux réponses reviennent dans le désordre
loader: async ({ request }) => {
  const res = await fetch(`/api/familles/${request.id}/sorties`);
  return res.json();
}

// ✅ abortSignal branché : la requête obsolète est annulée
loader: async ({ request, abortSignal }) => {
  const res = await fetch(`/api/familles/${request.id}/sorties`, { signal: abortSignal });
  return res.json();
}
```

Angular déclenche l'`abortSignal` tout seul ; à toi de le **passer** à `fetch`.

### PIÈGE #3 — Croire que `resource()` renvoie la valeur

```typescript
sorties = resource({ /* … */ });

// ❌ sorties est un ResourceRef, pas un tableau
for (const s of sorties) { … }          // erreur : ResourceRef n'est pas itérable
const n = sorties.length;               // undefined

// ✅ on lit la valeur en appelant le signal value()
for (const s of sorties.value() ?? []) { … }
```

`resource()` renvoie un **objet** dont on lit les signaux (`value()`, `isLoading()`…). Comme tout signal, `value` s'**appelle**.

### PIÈGE #4 — Mettre le déclencheur dans le `loader` au lieu du `request`

```typescript
// ❌ familleId lu dans le loader : le resource NE se relance PAS quand familleId change
sorties = resource({
  request: () => ({}),                              // rien de réactif ici
  loader: async () => fetch(`/api/…/${this.familleId()}/sorties`).then(r => r.json()),
});

// ✅ familleId lu dans request : tout changement relance le loader
sorties = resource({
  request: () => ({ id: this.familleId() }),
  loader: async ({ request }) => fetch(`/api/…/${request.id}/sorties`).then(r => r.json()),
});
```

Le **suivi des dépendances se fait sur la computation `request`**, pas sur le corps du `loader`. Ce qui doit re-déclencher le chargement se lit dans `request`.

### PIÈGE #5 — Confondre `Loading` et `Reloading`

Pendant un **`Loading`** (le `request` a changé), `value()` repart à `undefined` : la liste disparaît le temps du fetch. Pendant un **`Reloading`** (un `reload()`), `value()` **garde** l'ancienne valeur : la liste reste visible. Si tu veux un rafraîchissement « sans clignotement » (garder l'écran pendant l'actualisation), c'est `reload()` qu'il faut, pas un changement de `request`. `isLoading()` est `true` dans les deux cas — c'est `status()` qui les distingue.

### PIÈGE #6 — Utiliser `resource()` pour écrire (POST/PATCH/DELETE)

`resource()` est conçu pour la **lecture**. Il annule son loader via `abortSignal` dès que le `request` change ou que le composant est détruit — ce qui **interromprait une mutation** en cours. Pour créer/modifier/supprimer, on fait un appel impératif (module 18), et on `reload()` la resource ensuite pour rafraîchir la liste.

---

## 5. Ancrage TribuZen

La Resource API est la **couche de lecture asynchrone** du front-office TribuZen : dès qu'un écran affiche des données qui viennent du serveur, c'est une `resource()` (ou `rxResource()` si on passe par `HttpClient`).

**`SortiesComponent`** (Exemple 1) — la page « Mes sorties » charge la liste des sorties d'une famille. `familleId` est un `signal` dans le `request` ; changer de famille relance le chargement avec annulation automatique de la requête précédente. Les états `isLoading` / `error` / `value` pilotent l'affichage (spinner, message d'erreur, liste, empty state via `@empty`).

**Rechargement & optimisme** (Exemple 2) — le bouton « Actualiser » appelle `reload()` (statut `Reloading`, la liste reste affichée). Le renommage d'une sortie fait une mise à jour optimiste via `value.update()` (statut `Local`) avant le PATCH réseau.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sorties.component.ts        ← Exemple 1 (resource + fetch + abortSignal)
        sorties.component.spec.ts   ← test au module 23
```

> Le module précédent (02) chargeait les participants depuis des données **en dur** ; ici on branche la **vraie** source réseau. Le `HttpClient` complet (headers, intercepteurs d'auth, cache, retry) arrive au **module 18** — ici on reste au `fetch` minimal (ou `rxResource` + un `http.get` nu) pour se concentrer sur la Resource API elle-même.

---

## 6. Points clés

1. `resource({ request, loader })` encapsule un chargement async : `request` déclare **ce qui déclenche**, `loader` déclare **comment charger** — plus de trio `chargement`/`erreur`/`data` à synchroniser à la main.
2. `resource()` renvoie une **`ResourceRef`**, pas la valeur : on lit ses **signaux** `value()`, `isLoading()`, `error()`, `hasValue()`, `status()`.
3. Brancher le template sur `isLoading()` / `error()` / `hasValue()` est le pattern **robuste** ; `status()` (six valeurs `Idle`/`Loading`/`Reloading`/`Resolved`/`Error`/`Local`) a changé de forme entre mineures v19 (enum → chaînes).
4. Le suivi réactif se fait sur la computation **`request`** : ce qui doit relancer le loader s'y lit. Un `request` qui renvoie `undefined` ⇒ statut `Idle`, loader non exécuté.
5. **Toujours brancher l'`abortSignal`** sur `fetch` (`{ signal }`) — Angular le déclenche pour annuler la requête obsolète quand `request` change.
6. `reload()` relance sans changer l'entrée (statut `Reloading`, l'ancienne `value()` reste visible) ; `value.set()/update()` fait une mise à jour optimiste locale (statut `Local`).
7. `rxResource()` (import `@angular/core/rxjs-interop`) est la variante dont le `loader` renvoie un **Observable** — à choisir avec `HttpClient`.
8. En Angular **19**, `resource()` et `rxResource()` sont **`@experimental`** (stabilisées dans une version ultérieure — vérifie le statut sur ta mineure exacte) : vérifier l'API sur la doc de sa version. <!-- FLAG-CONTEXT7: version exacte de stabilisation de resource()/rxResource() -->

---

## 7. Seeds Anki

```
Que renvoie resource() en Angular 19 ?|Un ResourceRef, pas la valeur. On lit ses signaux : value(), isLoading(), error(), hasValue(), status(), et on relance avec reload().
À quoi servent request et loader dans resource() ?|request est une computation réactive qui déclare le déclencheur (relance le loader quand un signal lu change). loader est la fonction async qui charge et renvoie une Promise de la valeur.
Où lire le signal qui doit relancer un resource : dans request ou dans loader ?|Dans request. Le suivi des dépendances se fait sur la computation request ; un signal lu seulement dans le loader ne relance pas le chargement.
Pourquoi éviter @switch sur status() avec des cases chaîne en dur en Angular 19.0/19.1 ?|Car status() y renvoie un enum ResourceStatus (pas une chaîne) — la forme a changé pour une union de chaînes en 19.2. Pattern stable : brancher sur isLoading() / error() / hasValue().
Quelle est la différence entre les statuts Loading et Reloading d'une resource ?|Loading = le request a changé, value() repart à undefined (écran vidé). Reloading = suite à reload(), value() garde l'ancienne valeur (pas de clignotement). isLoading() vaut true dans les deux cas.
Comment annuler la requête obsolète d'un resource ?|Brancher l'abortSignal fourni au loader sur fetch : fetch(url, { signal: abortSignal }). Angular déclenche l'abortSignal quand request change ou au destroy.
Que se passe-t-il si la computation request renvoie undefined ?|Le loader ne s'exécute pas et le statut reste Idle. C'est le moyen déclaratif de dire "pas encore" (dépendance manquante, filtre inactif).
Quand utiliser rxResource() plutôt que resource() ?|Quand le loader renvoie un Observable (typiquement HttpClient.get) ou qu'on a besoin d'opérateurs RxJS. Import depuis @angular/core/rxjs-interop. Les deux sont expérimentales en v19.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-10-resource-api/README.md`. Remplacer le chargement manuel des sorties TribuZen par une `resource()` avec `fetch` + `abortSignal`, brancher le template sur `isLoading` / `error` / `value`, câbler `reload()` — dev server Angular CLI comme oracle visuel, corrigé commenté intégral.
