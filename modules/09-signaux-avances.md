---
titre: Signaux avancés — effect(), linkedSignal(), untracked(), dérivation et égalité custom
cours: 03-angular
notions: ["effect()", "onCleanup", "EffectRef destroy()", "injection context requis", "linkedSignal() forme courte", "linkedSignal({ source, computation })", "previous dans computation", "untracked()", "égalité custom equal", "computed vs linkedSignal", "pièges effect (boucle, écriture)"]
outcomes:
  - sait déclencher un effet de bord réactif avec effect() qui suit automatiquement les signaux lus
  - sait nettoyer un effect (onCleanup, destroy) et sait qu'il doit vivre dans un contexte d'injection
  - sait créer un état modifiable qui se réinitialise sur une source avec linkedSignal() et sa forme source/computation
  - sait lire un signal sans créer de dépendance grâce à untracked()
  - sait fournir une fonction d'égalité custom à signal/computed/linkedSignal pour couper les recalculs inutiles
  - sait distinguer computed, linkedSignal et effect et éviter les boucles infinies
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone, module 02 signaux-base, modules 03-08]
next: 10-resource-api
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — auto-sauvegarde du brouillon de sortie et sélection persistante du planificateur
last-reviewed: 2026-07
---

# Signaux avancés — `effect()`, `linkedSignal()`, `untracked()`

> **Outcomes — tu sauras FAIRE :** déclencher un effet de bord réactif avec `effect()` (et le nettoyer), créer un état modifiable réinitialisable avec `linkedSignal()`, lire hors-piste avec `untracked()`, et régler l'égalité d'un signal pour couper les recalculs inutiles.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre les signaux **avancés** : les effets de bord (`effect`), les signaux liés à une source (`linkedSignal`), la lecture non suivie (`untracked`), l'égalité custom (`equal`) et les patterns/pièges de dérivation. Le module 02 a posé `signal` / `computed` / `set` / `update` — on suppose ces bases acquises. Le chargement asynchrone (`resource`) est le **module 10**, pas ici. Pas de service injectable, pas de RxJS, pas de routing dans ce module — uniquement les primitives de réactivité.

## 1. Cas concret d'abord

TribuZen a un besoin nouveau sur le **planificateur de sortie famille** : deux exigences qui ne se résolvent pas avec `signal` + `computed` seuls.

1. **Auto-sauvegarde du brouillon.** Dès que l'utilisateur modifie sa sortie (participants, budget, note), on veut persister l'état dans `localStorage` — sans bouton « Enregistrer ». À chaque changement, on écrit.
2. **Sélection persistante mais réinitialisable.** L'écran liste plusieurs sorties. La sortie sélectionnée doit se **réinitialiser** sur la première quand la liste change (l'utilisateur change de famille), **mais** l'utilisateur peut aussi cliquer pour en choisir une autre entre-temps.

Un collègue tente ceci :

```typescript
// planificateur.component.ts — AVANT (deux mauvais réflexes)
export class PlanificateurComponent {
  sorties = signal<Sortie[]>([]);

  // ❌ #1 : une propriété normale ne suit rien — jamais réinitialisée
  sortieSelectionnee: Sortie | null = null;

  // ❌ #2 : sauvegarder à la main dans CHAQUE handler — on en oubliera un
  ajouterParticipant() {
    /* ... update ... */
    localStorage.setItem('brouillon', JSON.stringify(/* ... */));
  }
  changerBudget() {
    /* ... update ... */
    localStorage.setItem('brouillon', JSON.stringify(/* ... */)); // dupliqué
  }
}
```

Les deux problèmes ont la même cause : `computed` **dérive une valeur en lecture seule** et ne fait **aucun effet de bord**. Or ici on veut (1) un effet de bord automatique (écrire dans `localStorage`) et (2) un état **modifiable** qui suit quand même une source. Ce sont exactement les rôles de `effect()` et `linkedSignal()`.

---

## 2. Théorie complète, concise

### 2.1 `effect()` — réagir à un changement (effet de bord)

`effect()` exécute une fonction **à effet de bord** dans un contexte réactif : Angular repère les signaux lus pendant l'exécution et **ré-exécute** la fonction quand l'un d'eux change. C'est l'outil pour synchroniser un signal avec le « monde extérieur » : `localStorage`, `console`, une lib tierce, le DOM impératif.

Signature vérifiée : `effect(effectFn, options?): EffectRef`, avec `options?: { injector?, manualCleanup?, allowSignalWrites? }`.

```typescript
import { signal, effect } from '@angular/core';

const brouillon = signal('sortie vide');

// Se relance à chaque changement de brouillon()
effect(() => {
  localStorage.setItem('brouillon', brouillon());
});
```

Trois faits à retenir :

- **Suivi automatique et dynamique** : seuls les signaux **réellement lus** pendant l'exécution deviennent des dépendances (comme `computed`).
- **Exécution planifiée, pas synchrone** : après un `set`, l'effect ne tourne **pas** immédiatement ; Angular le planifie. Le timing exact n'est pas garanti — ne compte jamais sur un ordre précis.
- **Premier passage** : l'effect s'exécute une première fois pour capturer ses dépendances.

### 2.2 Où déclarer un `effect()` — le contexte d'injection

Un `effect()` doit être créé dans un **contexte d'injection** : à l'initialisation d'un champ de composant, dans le `constructor`, ou dans une factory de provider. C'est ce qui lie l'effect au cycle de vie du composant et le détruit automatiquement quand le composant est détruit.

```typescript
import { Component, signal, effect } from '@angular/core';

@Component({ selector: 'app-planif', template: `...` })
export class PlanifComponent {
  participants = signal(2);

  constructor() {
    // ✅ dans le constructor = contexte d'injection
    effect(() => console.log('participants =', this.participants()));
  }
}
```

Hors contexte d'injection (ex. dans un handler de clic), il faut passer un `Injector` explicitement : `effect(fn, { injector })`. Sinon Angular lève une erreur `NG0203`.

### 2.3 Nettoyer un `effect()` — `onCleanup` et `EffectRef.destroy()`

Si l'effect démarre quelque chose qui doit être annulé (timer, souscription, requête), il reçoit une fonction `onCleanup` en **premier paramètre**. Le callback passé à `onCleanup` s'exécute **juste avant la ré-exécution** de l'effect et **à sa destruction**.

```typescript
effect((onCleanup) => {
  const user = currentUser();
  const timer = setTimeout(() => console.log(`utilisateur : ${user}`), 1000);
  // annule le timer avant le prochain run ou à la destruction
  onCleanup(() => clearTimeout(timer));
});
```

`effect()` renvoie aussi un **`EffectRef`** : appeler `ref.destroy()` arrête l'effect manuellement. En pratique, dans un composant tu n'en as pas besoin (destruction auto), mais c'est utile pour un effect créé à la volée avec `manualCleanup: true`.

### 2.4 `linkedSignal()` — un état modifiable **et** lié à une source

`linkedSignal()` crée un signal **en lecture/écriture** (comme `signal`) dont la valeur est **recalculée** quand une source change (comme `computed`) — tout en restant modifiable à la main entre deux changements de source.

**Forme courte** — la valeur dérive d'une expression réactive :

```typescript
import { signal, linkedSignal } from '@angular/core';

const sorties = signal(['Ground', 'Air', 'Sea']);
const selection = linkedSignal(() => sorties()[0]);

selection();               // 'Ground'
selection.set(sorties()[2]); // écriture manuelle → 'Sea'
sorties.set(['A', 'B']);   // la source change → selection revient à 'A'
```

**Forme `{ source, computation }`** — quand tu veux exploiter la **valeur précédente** pour préserver un choix :

```typescript
selectedOption = linkedSignal<Sortie[], Sortie>({
  source: this.sorties,                 // signal source suivi
  computation: (nouvelles, previous) => {
    // previous?.value = ancienne valeur ; previous?.source = ancienne source
    return nouvelles.find(s => s.id === previous?.value?.id) ?? nouvelles[0];
  },
});
```

Type vérifié de la computation : `(source, previous?: { source, value }) => D`. Le `computation` renvoie la nouvelle valeur à chaque changement de `source`, avec accès à l'ancienne pour la logique « garder la sélection si elle existe encore ».

### 2.5 `untracked()` — lire sans créer de dépendance

Dans un `effect` (ou un `computed`), **tout** signal lu devient une dépendance. Parfois on veut lire une valeur sans que son changement redéclenche l'effect : c'est `untracked(fn)`.

```typescript
import { effect, untracked } from '@angular/core';

effect(() => {
  const id = sortieCourante().id;          // dépendance suivie
  // on lit userId() mais on NE VEUT PAS relancer l'effect quand il change
  const uid = untracked(() => userId());
  console.log(`sortie ${id} vue par ${uid}`);
});
```

Ici l'effect se relance quand `sortieCourante` change, **pas** quand `userId` change. `untracked` prend une fonction et renvoie sa valeur, en désactivant le suivi le temps de son exécution.

### 2.6 Égalité custom — l'option `equal`

Par défaut, un signal compare l'ancienne et la nouvelle valeur par **référence/`Object.is`** : un `set` avec une valeur « égale » ne notifie personne. Pour des objets, tu peux fournir un comparateur `equal: (a, b) => boolean` à `signal`, `computed` **et** `linkedSignal`. S'il renvoie `true`, Angular considère la valeur **inchangée** et **coupe** la propagation (pas de recalcul, pas d'effect).

```typescript
const activeUser = signal(
  { id: 123, name: 'Morgan' },
  { equal: (a, b) => a.id === b.id }, // « même utilisateur si même id »
);

activeUser.set({ id: 123, name: 'Morgan B.' }); // même id → AUCUNE notification
```

Signature vérifiée : `signal(initialValue, { equal })` et `computed(fn, { equal })`. Sur `linkedSignal`, `equal` va dans l'objet de config (`{ source, computation, equal }` ou en 2ᵉ argument de la forme courte).

### 2.7 Quel outil pour quel besoin ?

| Besoin | Outil |
|--------|-------|
| Valeur dérivée, **lecture seule** | `computed()` |
| Valeur dérivée **modifiable**, réinitialisée sur une source | `linkedSignal()` |
| **Effet de bord** (localStorage, DOM, log) en réaction | `effect()` |
| Lire un signal **sans** en dépendre | `untracked()` |
| Couper les recalculs quand la valeur « équivaut » | option `equal` |

Règle d'or : un `computed`/`linkedSignal` est **pur** (il calcule et renvoie), un `effect` **agit** (il ne renvoie rien d'utile). Ne mélange jamais les deux.

---

## 3. Worked examples

### Exemple 1 — Auto-sauvegarde du brouillon (effect + untracked + cleanup)

On résout l'exigence #1 du cas concret : persister le brouillon à chaque changement, en debouncant pour ne pas écrire à chaque frappe, et en journalisant l'auteur **sans** que changer d'auteur ne déclenche une sauvegarde.

```typescript
import { Component, signal, effect, untracked } from '@angular/core';

interface Brouillon {
  participants: number;
  budgetMax: number;
  note: string;
}

@Component({
  selector: 'app-brouillon-sortie',
  template: `
    <input type="number" [value]="brouillon().participants"
           (input)="setParticipants($event)" />
    <textarea [value]="brouillon().note" (input)="setNote($event)"></textarea>
    <p>Sauvegardé automatiquement.</p>
  `,
})
export class BrouillonSortieComponent {
  brouillon = signal<Brouillon>({ participants: 2, budgetMax: 100, note: '' });
  auteurId = signal('u-001');

  constructor() {
    // effect : se relance à chaque changement de brouillon()
    effect((onCleanup) => {
      const data = this.brouillon();               // DÉPENDANCE suivie

      // untracked : on lit l'auteur SANS en dépendre
      // → changer d'auteur ne redéclenche pas une sauvegarde
      const auteur = untracked(() => this.auteurId());

      // debounce : on écrit 400 ms après le dernier changement
      const timer = setTimeout(() => {
        localStorage.setItem(
          'tribuzen:brouillon',
          JSON.stringify({ ...data, auteur }),
        );
      }, 400);

      // onCleanup : annule le timer en attente avant le prochain run
      // (sinon chaque frappe programmerait une écriture)
      onCleanup(() => clearTimeout(timer));
    });
  }

  setParticipants(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    this.brouillon.update(b => ({ ...b, participants: n }));
  }

  setNote(e: Event) {
    const note = (e.target as HTMLTextAreaElement).value;
    this.brouillon.update(b => ({ ...b, note }));
  }
}
```

**Déroulé** : chaque frappe → `update` immuable de `brouillon` → l'effect est planifié → il lit `brouillon()` (dépendance), lit `auteurId()` en `untracked` (pas de dépendance), programme un `setTimeout`. Frappe suivante avant 400 ms → `onCleanup` annule le timer précédent, puis un nouveau est programmé. On n'a écrit **aucune** ligne de sauvegarde dans les handlers.

### Exemple 2 — Sélection persistante (linkedSignal source/computation)

On résout l'exigence #2 : la sortie sélectionnée se réinitialise quand la liste change, mais préserve le choix de l'utilisateur si la sortie existe toujours.

```typescript
import { Component, signal, linkedSignal } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

@Component({
  selector: 'app-selecteur-sortie',
  template: `
    <ul>
      @for (s of sorties(); track s.id) {
        <li [class.active]="selection()?.id === s.id"
            (click)="selection.set(s)">
          {{ s.titre }}
        </li>
      }
    </ul>
    <p>Sélection : {{ selection()?.titre ?? 'Aucune' }}</p>
    <button (click)="changerFamille()">Charger une autre famille</button>
  `,
})
export class SelecteurSortieComponent {
  sorties = signal<Sortie[]>([
    { id: 's1', titre: 'Pique-nique parc' },
    { id: 's2', titre: 'Cinéma' },
    { id: 's3', titre: 'Rando' },
  ]);

  // linkedSignal : modifiable (set au clic) ET recalculé quand sorties() change
  selection = linkedSignal<Sortie[], Sortie | null>({
    source: this.sorties,
    computation: (liste, previous) =>
      // garde la sélection précédente si elle existe encore, sinon la 1ʳᵉ
      liste.find(s => s.id === previous?.value?.id) ?? liste[0] ?? null,
    // deux sorties sont « la même » si même id → évite un reset cosmétique
    equal: (a, b) => a?.id === b?.id,
  });

  changerFamille() {
    // nouvelle liste → computation relancée → selection revient à la 1ʳᵉ
    this.sorties.set([
      { id: 's9', titre: 'Musée' },
      { id: 's10', titre: 'Plage' },
    ]);
  }
}
```

**Pourquoi `linkedSignal` et pas `computed` ?** Parce que `selection` doit être **modifiable** au clic (`selection.set(s)`). Un `computed` interdirait le `set`. Et pourquoi pas un `signal` simple ? Parce qu'il faudrait écrire soi-même la logique « réinitialise quand la liste change » — c'est exactement ce que `linkedSignal` fournit gratuitement.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Écrire dans un signal que l'effect lit (boucle)

```typescript
const compteur = signal(0);

// ❌ L'effect lit compteur() ET l'écrit → il se re-déclenche lui-même : boucle
effect(() => {
  compteur.set(compteur() + 1);
});

// ✅ Une valeur dérivée d'un signal n'est PAS un effet de bord : c'est un computed
const compteurDouble = computed(() => compteur() * 2);
```

Un `effect` sert à **sortir** de la réactivité (écrire dehors), pas à transformer un signal en un autre. Pour dériver, utilise `computed` ou `linkedSignal`.

### PIÈGE #2 — Utiliser `linkedSignal` (ou `effect`) pour un simple calcul

```typescript
// ❌ Surdimensionné : ni écriture manuelle, ni effet de bord ici
const total = linkedSignal(() => prix() * quantite());
effect(() => { this.total = prix() * quantite(); });

// ✅ Un calcul pur en lecture seule = computed, point
const total = computed(() => prix() * quantite());
```

Choisis l'outil le plus **faible** qui fait le travail : `computed` d'abord ; `linkedSignal` seulement si tu dois aussi **écrire** dedans ; `effect` seulement pour un vrai **effet de bord**.

### PIÈGE #3 — Créer un `effect()` hors contexte d'injection

```typescript
// ❌ Dans un handler : pas de contexte d'injection → erreur NG0203 à l'exécution
onClick() {
  effect(() => console.log(this.valeur()));
}

// ✅ Soit dans le constructor / initialisation de champ…
constructor() {
  effect(() => console.log(this.valeur()));
}
// ✅ …soit en passant un injector explicite
private injector = inject(Injector);
onClick() {
  effect(() => console.log(this.valeur()), { injector: this.injector });
}
```

### PIÈGE #4 — Oublier `onCleanup` sur une ressource répétée

```typescript
// ❌ Un timer par run, jamais annulé → fuites et écritures fantômes
effect(() => {
  const data = brouillon();
  setTimeout(() => save(data), 400);
});

// ✅ Annuler le run précédent avant le suivant
effect((onCleanup) => {
  const data = brouillon();
  const t = setTimeout(() => save(data), 400);
  onCleanup(() => clearTimeout(t));
});
```

Dès qu'un effect démarre quelque chose d'annulable (timer, `fetch`, abonnement DOM), il **doit** enregistrer un `onCleanup`.

### PIÈGE #5 — Croire que `untracked` « fige » la valeur

```typescript
effect(() => {
  const a = signalA();                  // dépendance
  const b = untracked(() => signalB()); // lu au moment du run, PAS figé
  // b vaut la valeur COURANTE de signalB à chaque exécution de l'effect ;
  // untracked empêche juste que changer signalB RELANCE l'effect.
});
```

`untracked` ne met pas en cache : il lit la valeur courante à chaque exécution, il supprime seulement le **suivi de dépendance**.

### PIÈGE #6 — `equal` qui renvoie `true` trop souvent

```typescript
// ❌ equal toujours vrai → le signal ne notifie JAMAIS, l'UI se fige
const s = signal(obj, { equal: () => true });

// ✅ equal compare une clé stable et pertinente
const s = signal(obj, { equal: (a, b) => a.id === b.id });
```

L'`equal` est une optimisation fine : mal réglé, il **avale** des changements réels. Ne l'ajoute que si tu constates des recalculs inutiles mesurés.

---

## 5. Ancrage TribuZen

Ces primitives sont la **couche de réactivité avancée** du front-office TribuZen, partout où `signal`/`computed` ne suffisent plus :

- **`BrouillonSortieComponent`** (Exemple 1) — auto-sauvegarde du brouillon de sortie dans `localStorage` via un `effect` debouncé, avec `untracked` pour lire l'auteur sans redéclencher la sauvegarde et `onCleanup` pour annuler le timer. C'est la persistance « sans bouton Enregistrer » du planificateur.
- **`SelecteurSortieComponent`** (Exemple 2) — la sortie sélectionnée est un `linkedSignal` : cliquable (`set`), réinitialisée quand la famille change (`source`/`computation`), avec `equal` par `id` pour éviter les resets cosmétiques.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        brouillon-sortie.component.ts    ← Exemple 1 (effect + untracked + cleanup)
        selecteur-sortie.component.ts     ← Exemple 2 (linkedSignal source/computation)
```

> La persistance **serveur** du brouillon (au lieu de `localStorage`) et le chargement des sorties depuis l'API relèveront de `resource` au **module 10**. Ici on reste sur des effets de bord **locaux** et de l'état en mémoire.

---

## 6. Points clés

1. `effect(fn)` exécute un **effet de bord** ré-exécuté quand un signal lu change ; le suivi est automatique et dynamique, l'exécution est **planifiée** (pas synchrone).
2. Un `effect` vit dans un **contexte d'injection** (constructor / init de champ) ou reçoit un `injector` explicite — sinon erreur `NG0203`.
3. La fonction d'effect reçoit `onCleanup` en 1ᵉʳ paramètre pour annuler avant le prochain run et à la destruction ; `effect()` renvoie un `EffectRef` avec `.destroy()`.
4. `linkedSignal()` = état **modifiable** qui se **réinitialise** sur une source ; la forme `{ source, computation }` donne accès à `previous` pour préserver un choix.
5. `untracked(fn)` lit un signal **sans** en dépendre — il supprime le suivi, il ne fige pas la valeur.
6. L'option `equal: (a, b) => boolean` sur `signal`/`computed`/`linkedSignal` coupe la propagation quand la valeur « équivaut » — puissant mais dangereux si trop laxiste.
7. Choisis l'outil le plus faible : `computed` pour dériver en lecture seule, `linkedSignal` s'il faut écrire aussi, `effect` seulement pour un vrai effet de bord ; jamais d'écriture d'un signal lu par le même effect.

---

## 7. Seeds Anki

```
À quoi sert effect() en Angular et quand se ré-exécute-t-il ?|effect(fn) exécute un effet de bord (localStorage, DOM, log) dans un contexte réactif ; il se ré-exécute quand un signal lu à l'intérieur change. Le suivi est automatique et l'exécution est planifiée, pas synchrone.
Où doit-on créer un effect() et que se passe-t-il sinon ?|Dans un contexte d'injection : constructor ou initialisation d'un champ de composant. Ailleurs (ex. handler de clic), il faut passer { injector }, sinon Angular lève NG0203.
Comment nettoyer un effect qui démarre un timer ou une souscription ?|La fonction d'effect reçoit onCleanup en premier paramètre : effect((onCleanup) => { ...; onCleanup(() => clearTimeout(t)); }). Le callback tourne avant le prochain run et à la destruction. effect() renvoie aussi un EffectRef avec destroy().
Quelle est la différence entre computed() et linkedSignal() ?|computed() dérive une valeur en LECTURE SEULE. linkedSignal() dérive une valeur MODIFIABLE (set/update) qui se réinitialise quand sa source change. On prend linkedSignal seulement si on doit aussi écrire dans le signal.
À quoi sert la forme linkedSignal({ source, computation }) ?|Elle recalcule la valeur à chaque changement de source, et la computation reçoit (source, previous?: { source, value }) — ce qui permet de préserver la sélection précédente si elle existe encore, sinon revenir au défaut.
Que fait untracked() et que ne fait-il PAS ?|untracked(fn) lit des signaux sans créer de dépendance : changer ces signaux ne relance pas l'effect/computed. Il ne fige pas la valeur — il lit la valeur courante à chaque exécution, il supprime seulement le suivi.
À quoi sert l'option equal d'un signal et quel est le risque ?|equal: (a, b) => boolean décide si la nouvelle valeur « équivaut » à l'ancienne ; si true, Angular coupe la propagation (pas de recalcul ni d'effect). Risque : un equal trop laxiste (ex. () => true) avale des changements réels et fige l'UI.
Pourquoi effect(() => compteur.set(compteur() + 1)) est-il un bug ?|L'effect lit compteur() (dépendance) et l'écrit : il se re-déclenche lui-même en boucle. Pour dériver un signal d'un autre, utiliser computed ou linkedSignal, jamais un effect.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-09-signaux-avances/README.md`. Construire l'auto-sauvegarde debouncée (`effect` + `onCleanup` + `untracked`) et la sélection persistante (`linkedSignal`) du planificateur TribuZen, dev server Angular en oracle visuel — zéro gap-fill, corrigé commenté intégral.
