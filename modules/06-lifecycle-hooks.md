---
titre: Cycle de vie d'un composant — ngOnInit, ngOnDestroy, ngOnChanges, afterNextRender, DestroyRef
cours: 03-angular
notions: [cycle de vie du composant, ngOnInit et interface OnInit, ngOnDestroy et interface OnDestroy, ngOnChanges et SimpleChanges, ngAfterViewInit et interface AfterViewInit, constructor vs ngOnInit, afterNextRender, afterRender, "DestroyRef.onDestroy()", "takeUntilDestroyed()", nettoyage et fuites mémoire, "signal queries viewChild()", "viewChild.required() et viewChildren()", "contentChild()"]
outcomes:
  - sait choisir entre constructor et ngOnInit pour initialiser un composant selon la disponibilité des inputs
  - sait libérer les ressources d'un composant avec ngOnDestroy ou DestroyRef.onDestroy() pour éviter les fuites mémoire
  - sait exécuter du code qui touche le DOM au bon moment avec afterNextRender (une fois) et afterRender (à chaque rendu)
  - sait réagir à un changement d'input avec ngOnChanges et lire un SimpleChanges, et sait quand un computed le remplace
  - sait désabonner automatiquement un flux à la destruction avec takeUntilDestroyed()
  - sait lire un enfant de sa vue depuis la classe avec une signal query viewChild() / viewChild.required() / viewChildren() / contentChild()
prerequis: [module 00 de-vue-a-angular, module 01 premier-projet-standalone, module 02 signaux-base, module 03 control-flow, module 04 binding-et-events, module 05 input-output-model]
next: 07-pipes-et-directives
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — cycle de vie des écrans de sortie (chargement au démarrage, compte à rebours nettoyé, mini-graphe budget dessiné après rendu)
last-reviewed: 2026-07
---

# Cycle de vie d'un composant — `ngOnInit`, `ngOnDestroy`, `ngOnChanges`, `afterNextRender`, `DestroyRef`

> **Outcomes — tu sauras FAIRE :** initialiser un composant au bon moment (`constructor` vs `ngOnInit`), libérer ses ressources à la destruction (`ngOnDestroy` / `DestroyRef`), toucher le DOM après rendu (`afterNextRender` / `afterRender`), et réagir à un changement d'input (`ngOnChanges`).
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **le cycle de vie d'un composant** : quand Angular appelle chaque hook et pourquoi. On voit `ngOnInit`, `ngOnDestroy`, `ngOnChanges`, `ngAfterViewInit`, les fonctions `afterNextRender` / `afterRender` (Angular 19), et le nettoyage moderne via `DestroyRef` + `takeUntilDestroyed`. Le pattern `takeUntilDestroyed` est présenté **seulement comme geste de nettoyage** : les Observables RxJS en profondeur (opérateurs, `pipe`, création de flux) sont les **modules 16-17**. La création de services injectés et le routing (qui déclenchent montage/démontage) sont couverts plus tard (**modules 11-15**) ; ici on suppose le composant déjà en place.

## 1. Cas concret d'abord

Nouvelle story TribuZen : l'écran **compte à rebours de la prochaine sortie** (`ProchaineSortieComponent`). Il doit afficher le temps restant avant le rendez-vous famille, mis à jour chaque seconde, et charger les infos de la sortie au démarrage.

Un collègue a écrit ça, et ça « marche »… jusqu'à ce qu'on quitte l'écran :

```typescript
// prochaine-sortie.component.ts — AVANT (fuite mémoire)
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `<p>Départ dans {{ restant() }} s</p>`,
})
export class ProchaineSortieComponent {
  restant = signal(3600);

  constructor() {
    // Un timer démarré dans le constructor…
    setInterval(() => {
      this.restant.update(s => s - 1);
    }, 1000);
    // …que PERSONNE n'arrête quand le composant disparaît.
  }
}
```

Deux problèmes, tous deux liés au **cycle de vie** :

1. Le timer est lancé dans le `constructor`. Si l'initialisation dépendait d'un `input()` (l'id de la sortie), il ne serait **pas encore disponible** à ce moment.
2. Rien n'arrête le `setInterval` quand l'utilisateur navigue ailleurs. Le composant est détruit, mais le timer continue de tourner en mémoire, à référencer `this` : c'est une **fuite mémoire**. Ouvre et ferme l'écran dix fois → dix timers tournent en parallèle.

Un composant Angular a une **vie** : il naît, ses inputs arrivent, il s'affiche, il vit, puis il meurt. Angular expose des **hooks** pour brancher du code à chaque étape — dont, crucialement, l'étape « je vais mourir, nettoie tes ressources ». Ce module te donne la carte complète.

---

## 2. Théorie complète, concise

### 2.1 La séquence de vie, dans l'ordre

Angular appelle des méthodes à des moments précis. L'ordre garanti pour un composant :

```
constructor            → la classe est instanciée (injection de dépendances)
   │
ngOnChanges            → si le composant a des inputs (avant ngOnInit, puis à chaque changement)
   │
ngOnInit               → une fois, après le 1er ngOnChanges — les inputs sont prêts
   │
ngAfterViewInit        → une fois, après que la vue (template + enfants) est initialisée
   │
 …vie active…          → ngOnChanges à chaque nouvel input ; afterRender après chaque rendu
   │
ngOnDestroy            → une fois, juste avant que le composant soit détruit
```

Chaque hook « classique » vient d'une **interface** qu'on implémente pour la sécurité de typage. Angular appelle la méthode même sans l'interface (il regarde le nom), mais l'interface protège des fautes de frappe.

### 2.2 `constructor` vs `ngOnInit`

Le `constructor` est du **TypeScript pur** : il s'exécute à l'instanciation de la classe. À ce stade, Angular n'a **pas encore renseigné les inputs**. Il sert à l'injection de dépendances (`inject()`), pas à la logique d'initialisation.

`ngOnInit` (interface `OnInit`) est appelé **une seule fois**, après qu'Angular a renseigné les propriétés liées (dont les inputs). C'est l'endroit pour l'initialisation qui **dépend des inputs** : charger des données, calculer un état de départ.

```typescript
import { Component, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-profil-sortie',
  template: `<p>{{ titre() }}</p>`,
})
export class ProfilSortieComponent implements OnInit {
  sortieId = input.required<string>();   // input signal (module 05)
  titre = signal('');

  constructor() {
    // ❌ L'input n'est PAS encore renseigné ici
    // console.log(this.sortieId());  // valeur non fiable
    // ✅ Bon usage : injecter des dépendances
  }

  ngOnInit(): void {
    // ✅ L'input est disponible → on peut l'utiliser
    this.titre.set(`Sortie ${this.sortieId()}`);
  }
}
```

Signature vérifiée : `interface OnInit { ngOnInit(): void; }`.

### 2.3 `ngOnDestroy` — le nettoyage classique

Interface `OnDestroy`. Angular appelle `ngOnDestroy()` **juste avant** de détruire le composant. C'est là qu'on relâche tout ce qui survivrait au composant : timers (`clearInterval`), écouteurs d'événements, connexions WebSocket, souscriptions RxJS.

```typescript
import { Component, OnInit, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `<p>Départ dans {{ restant() }} s</p>`,
})
export class ProchaineSortieComponent implements OnInit, OnDestroy {
  restant = signal(3600);
  private timerId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.timerId = setInterval(() => this.restant.update(s => s - 1), 1000);
  }

  ngOnDestroy(): void {
    // ✅ On arrête le timer : plus de fuite mémoire
    clearInterval(this.timerId);
  }
}
```

Signature vérifiée : `interface OnDestroy { ngOnDestroy(): void; }`. Règle d'or : **tout ce qu'on démarre dans un composant et qui vit indépendamment de lui doit être arrêté dans `ngOnDestroy`** (ou via `DestroyRef`, ci-dessous).

### 2.4 `DestroyRef` — le nettoyage moderne, colocalisé

Plutôt qu'une méthode `ngOnDestroy` séparée, on peut injecter `DestroyRef` et enregistrer un callback de nettoyage **juste à côté** du code qui crée la ressource. Setup et teardown restent ensemble.

```typescript
import { Component, inject, DestroyRef, signal } from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `<p>Départ dans {{ restant() }} s</p>`,
})
export class ProchaineSortieComponent {
  private destroyRef = inject(DestroyRef);
  restant = signal(3600);

  constructor() {
    const timerId = setInterval(() => this.restant.update(s => s - 1), 1000);

    // Nettoyage enregistré à CÔTÉ de la création — plus lisible qu'un ngOnDestroy distant
    this.destroyRef.onDestroy(() => clearInterval(timerId));
  }
}
```

API vérifiée : `DestroyRef` s'injecte, et `destroyRef.onDestroy(callback)` enregistre un callback exécuté à la destruction. On peut enregistrer **plusieurs** callbacks ; chacun s'occupe d'une ressource.

### 2.5 `takeUntilDestroyed()` — désabonner un flux automatiquement

Quand la ressource est un Observable RxJS, `@angular/core/rxjs-interop` fournit l'opérateur `takeUntilDestroyed()` : il coupe la souscription **à la destruction du composant**, sans écrire de `ngOnDestroy` manuel.

```typescript
import { Component, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({
  selector: 'app-prochaine-sortie',
  template: `<p>Tic : {{ restant() }} s</p>`,
})
export class ProchaineSortieComponent {
  private destroyRef = inject(DestroyRef);
  restant = signal(3600);

  constructor() {
    // Appelé dans le constructor (contexte d'injection) → destroyRef optionnel
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.restant.update(s => s - 1));
  }

  chargerAilleurs(): void {
    // Hors contexte d'injection (ex : dans ngOnInit) → passer explicitement le destroyRef
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.restant.update(s => s - 1));
  }
}
```

Signature vérifiée : `takeUntilDestroyed<T>(destroyRef?: DestroyRef): MonoTypeOperatorFunction<T>`. Deux règles à retenir **ici** :

- **Dans un contexte d'injection** (le corps du `constructor`, un initialiseur de champ) : `takeUntilDestroyed()` sans argument, il trouve le `DestroyRef` tout seul.
- **Hors contexte d'injection** (dans `ngOnInit`, un handler) : passer `takeUntilDestroyed(this.destroyRef)`.

> Ce module s'arrête là sur RxJS : `interval`, `pipe`, les opérateurs et l'interop signaux ↔ Observables sont détaillés aux **modules 16-17**. Retiens juste le **geste de cleanup**.

### 2.6 `afterNextRender` et `afterRender` — toucher le DOM (Angular 19)

`ngOnInit` s'exécute **avant** que le DOM soit peint. Pour lire ou manipuler le DOM réel (dimensions, `<canvas>`, librairie tierce qui attache sur un élément), il faut attendre le rendu. Angular 19 fournit deux **fonctions** (pas des méthodes de classe), à appeler dans un **contexte d'injection** :

- `afterNextRender(callback)` : le callback s'exécute **une seule fois**, après le prochain rendu. Idéal pour initialiser un canvas ou une lib.
- `afterRender(callback)` : le callback s'exécute **après chaque** rendu. Pour mesurer/synchroniser en continu (à utiliser avec parcimonie, c'est fréquent).

Point clé vérifié : **ni l'un ni l'autre ne s'exécutent côté serveur (SSR)** ni au pré-rendu de build. Ils sont garantis « navigateur, DOM prêt ».

```typescript
import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-mini-graphe-budget',
  template: `<canvas #graphe width="240" height="80"></canvas>`,
})
export class MiniGrapheBudgetComponent {
  // viewChild signal (query de vue, §2.9) → résolu au rendu
  graphe = viewChild.required<ElementRef<HTMLCanvasElement>>('graphe');

  constructor() {
    // Le DOM du canvas existe → on peut dessiner
    afterNextRender(() => {
      const ctx = this.graphe().nativeElement.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 180, 80);   // barre « budget consommé »
      }
    });
  }
}
```

`afterNextRender` / `afterRender` renvoient une référence qu'on peut détruire manuellement (`.destroy()`), mais par défaut Angular les nettoie automatiquement à la destruction du composant.

### 2.7 `ngAfterViewInit` — la vue et ses enfants sont prêts

Interface `AfterViewInit`. Appelée **une fois**, après l'initialisation de la vue du composant (son template et ses composants enfants). C'est le hook historique pour lire un résultat de **query de vue** (`@ViewChild`).

```typescript
import { Component, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-carte-sortie',
  template: `<app-entete #entete>Sortie plage</app-entete>`,
})
export class CarteSortieComponent implements AfterViewInit {
  @ViewChild('entete') entete!: EnteteComponent;

  ngAfterViewInit(): void {
    // ✅ La vue est initialisée → l'enfant est accessible
    console.log(this.entete.texte);
    // ⚠️ NE PAS modifier un état lié au template ici :
    // provoque ExpressionChangedAfterItHasBeenCheckedError
  }
}
```

Avec les signaux, `viewChild()` (§2.9) rend souvent `ngAfterViewInit` inutile pour lire un enfant. Mais pour du code qui doit tourner **une fois la vue montée**, `ngAfterViewInit` (ou `afterNextRender` pour le DOM) reste le bon hook.

### 2.8 `ngOnChanges` — réagir à un changement d'input

Interface `OnChanges`. Appelée **avant `ngOnInit`** puis **à chaque fois** qu'un input change. Elle reçoit un objet `SimpleChanges` : une map `nomInput → SimpleChange`, où chaque `SimpleChange` porte `previousValue`, `currentValue` et `firstChange`.

```typescript
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({ selector: 'app-journal-sortie', template: `` })
export class JournalSortieComponent implements OnChanges {
  @Input() statut = '';

  ngOnChanges(changes: SimpleChanges): void {
    const c = changes['statut'];
    if (c) {
      console.log('Avant :', c.previousValue, '→ après :', c.currentValue, 'premier ?', c.firstChange);
    }
  }
}
```

Structures vérifiées : `interface OnChanges { ngOnChanges(changes: SimpleChanges): void; }`, `SimpleChanges` indexe des `SimpleChange { previousValue: any; currentValue: any; firstChange: boolean; }`.

**Avec les signaux, `ngOnChanges` est rarement le bon outil.** Pour une valeur dérivée d'un input, un `computed()` (module 02) est plus simple et typé ; pour un effet de bord, un `effect()` (module 09). `ngOnChanges` reste utile avec les inputs **décorateur** classiques (`@Input()`), ou pour comparer explicitement ancienne/nouvelle valeur.

```typescript
// ✅ Préférable avec un input signal : pas de ngOnChanges
statut = input.required<string>();
libelle = computed(() => `Statut : ${this.statut()}`);
```

### 2.9 Signal queries : `viewChild()` / `contentChild()`

Pour lire un élément ou un composant **de son propre template depuis la classe**, Angular 19 fournit des **queries sous forme de signaux**, à déclarer comme des champs (en contexte d'injection). Elles remplacent les décorateurs historiques `@ViewChild` / `@ContentChild` et se lisent avec `()`, comme n'importe quel signal. Leur domicile est ici : la valeur d'une query de vue n'est **disponible qu'une fois la vue rendue** — c'est le même « quand » que `afterNextRender` (§2.6).

- `viewChild<T>('ref')` — un enfant unique de la **vue** (référence template `#ref`, composant ou directive). Signal qui vaut `undefined` tant que la vue n'est pas rendue.
- `viewChild.required<T>('ref')` — variante **non nullable** : le type est `T` (jamais `undefined`), au prix d'une erreur à l'exécution si la cible est absente. À utiliser quand la cible est toujours présente dans le template.
- `viewChildren<T>('ref')` — **plusieurs** enfants de la vue, sous forme d'un signal de tableau `readonly T[]`.
- `contentChild<T>('ref')` — équivalent pour le **contenu projeté** (`<ng-content>`), c.-à-d. les éléments passés par le parent entre les balises du composant.

```typescript
import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-carte-sortie',
  template: `<canvas #graphe width="240" height="80"></canvas>`,
})
export class CarteSortieComponent {
  // .required : le canvas est toujours dans le template → type non nullable
  graphe = viewChild.required<ElementRef<HTMLCanvasElement>>('graphe');

  constructor() {
    // La query n'est fiable qu'APRÈS rendu → on la lit dans afterNextRender
    afterNextRender(() => {
      const ctx = this.graphe().nativeElement.getContext('2d');
      ctx?.fillRect(0, 0, 120, 80);
    });
  }
}
```

Sur TribuZen, `viewChild.required` cible le `<canvas>` du `MiniGrapheBudgetComponent` (Exemple 2) pour y dessiner la barre de budget après rendu ; `contentChild` servirait si une carte de sortie projetait un en-tête personnalisé fourni par son parent.

> Détail vérifié : ces queries se lisent à partir de `afterNextRender` / `ngAfterViewInit`. Les lire dans le `constructor` ou `ngOnInit` renvoie `undefined` (vue pas encore rendue).

---

## 3. Worked examples

### Exemple 1 — `ProchaineSortieComponent` corrigé de bout en bout (TribuZen)

On reprend le cas concret et on le rend propre : chargement au démarrage, timer nettoyé, aucune fuite.

```typescript
// prochaine-sortie.component.ts — version cycle de vie maîtrisé
import { Component, OnInit, inject, DestroyRef, input, signal, computed } from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `
    <h2>Prochaine sortie</h2>
    <p>Départ dans {{ affichage() }}</p>
  `,
})
export class ProchaineSortieComponent implements OnInit {
  private destroyRef = inject(DestroyRef);   // ← injection : OK dans le constructor implicite

  // Input : nombre de secondes avant le départ (fourni par le parent, module 05)
  secondesInitiales = input.required<number>();

  restant = signal(0);

  // Valeur dérivée formatée mm:ss — un computed, pas de logique dans le template
  affichage = computed(() => {
    const s = this.restant();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    // ✅ ngOnInit : l'input est disponible ici, pas dans le constructor
    this.restant.set(this.secondesInitiales());

    const timerId = setInterval(() => {
      this.restant.update(s => Math.max(0, s - 1));
    }, 1000);

    // ✅ Nettoyage enregistré : le timer meurt avec le composant
    this.destroyRef.onDestroy(() => clearInterval(timerId));
  }
}
```

**Pourquoi c'est correct** : l'initialisation qui dépend de l'input est dans `ngOnInit` (pas le `constructor`) ; le timer est arrêté via `destroyRef.onDestroy` (pas de fuite) ; l'affichage est un `computed` (aucune synchro manuelle). Ouvrir/fermer l'écran 10 fois ne laisse **aucun** timer résiduel.

### Exemple 2 — `MiniGrapheBudgetComponent` : dessiner après rendu

Le tableau de bord TribuZen affiche une petite barre « budget consommé / budget max ». Dessiner sur un `<canvas>` **exige** que le DOM existe : `afterNextRender`.

```typescript
import { Component, ElementRef, viewChild, input, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-mini-graphe-budget',
  template: `<canvas #graphe width="240" height="24"></canvas>`,
})
export class MiniGrapheBudgetComponent {
  consomme = input.required<number>();   // ex : 60
  budgetMax = input.required<number>();  // ex : 100

  graphe = viewChild.required<ElementRef<HTMLCanvasElement>>('graphe');

  constructor() {
    // afterNextRender : le canvas est monté → getContext ne renverra pas null par timing
    afterNextRender(() => {
      const ctx = this.graphe().nativeElement.getContext('2d');
      if (!ctx) return;

      const ratio = Math.min(1, this.consomme() / this.budgetMax());
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, 240, 24);              // fond
      ctx.fillStyle = ratio > 0.9 ? '#dc2626' : '#2563eb';
      ctx.fillRect(0, 0, 240 * ratio, 24);      // barre remplie
    });
  }
}
```

**Pourquoi pas `ngOnInit`** : dans `ngOnInit`, le `<canvas>` n'est pas encore peint ; `getContext('2d')` peut viser un élément non prêt. `afterNextRender` garantit « DOM peint, une fois », et ne s'exécute pas en SSR — exactement ce qu'il faut pour du canvas.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Utiliser les inputs dans le `constructor`

```typescript
sortieId = input.required<string>();

constructor() {
  // ❌ L'input n'est pas encore renseigné : valeur non fiable / erreur
  this.charger(this.sortieId());
}

ngOnInit() {
  // ✅ Les inputs sont prêts à partir d'ici
  this.charger(this.sortieId());
}
```

Le `constructor` sert à injecter, pas à initialiser avec les inputs. L'initialisation dépendante des inputs va dans `ngOnInit`.

### PIÈGE #2 — Oublier de nettoyer (la fuite mémoire silencieuse)

```typescript
// ❌ Timer / souscription jamais arrêtés → tournent après la destruction
ngOnInit() {
  setInterval(() => this.rafraichir(), 1000);
}

// ✅ Un des deux gestes de nettoyage
ngOnDestroy() { clearInterval(this.timerId); }
// ou
constructor() {
  const id = setInterval(() => this.rafraichir(), 1000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}
```

Rien ne « plante » visiblement : c'est le piège. La ressource s'accumule à chaque montage. Tout ce qui vit indépendamment du composant doit être arrêté à sa destruction.

### PIÈGE #3 — Accéder au DOM dans `ngOnInit`

```typescript
// ❌ Le DOM n'est pas encore peint dans ngOnInit
ngOnInit() {
  const el = document.querySelector('#graphe');  // peut être null / pas prêt
}

// ✅ afterNextRender : garanti après rendu, côté navigateur seulement
constructor() {
  afterNextRender(() => {
    const el = this.graphe().nativeElement;  // prêt
  });
}
```

`ngOnInit` s'exécute **avant** le rendu. Pour le DOM réel, c'est `afterNextRender` (une fois) ou `afterRender` (à chaque rendu).

### PIÈGE #4 — Mettre `afterRender` là où `afterNextRender` suffit

```typescript
// ❌ afterRender s'exécute APRÈS CHAQUE rendu → on redessine le canvas en boucle
constructor() {
  afterRender(() => this.dessinerGraphe());  // coûteux, appelé trop souvent
}

// ✅ afterNextRender : une seule fois, après le premier rendu
constructor() {
  afterNextRender(() => this.dessinerGraphe());
}
```

`afterRender` est puissant mais fréquent : réserve-le à la mesure/synchro continue. Pour une init unique, `afterNextRender`.

### PIÈGE #5 — Écrire un `ngOnChanges` là où un `computed` suffit

```typescript
// ❌ Recopie manuelle et fragile d'une valeur dérivée d'un input
@Input() nom = '';
libelle = '';
ngOnChanges() { this.libelle = `Bonjour ${this.nom}`; }

// ✅ input signal + computed : dérivation automatique, typée
nom = input.required<string>();
libelle = computed(() => `Bonjour ${this.nom()}`);
```

Avec les signaux, une valeur dérivée d'un input est un `computed`, pas un état recopié dans `ngOnChanges`. Garde `ngOnChanges` pour comparer explicitement ancienne/nouvelle valeur ou avec des `@Input()` classiques.

### PIÈGE #6 — Modifier l'état lié au template dans `ngAfterViewInit`

```typescript
// ❌ Changer une valeur affichée ici → ExpressionChangedAfterItHasBeenCheckedError (dev)
ngAfterViewInit() {
  this.titre.set('Chargé');   // la vue vient d'être vérifiée, on la ré-invalide
}
```

`ngAfterViewInit` sert à **lire** la vue (queries), pas à la muter. Pour un état de départ, utilise `ngOnInit`.

---

## 5. Ancrage TribuZen

Le cycle de vie est la **couche « quand » de chaque écran** TribuZen : quand charger, quand nettoyer, quand toucher le DOM. Trois usages concrets dans le front-office :

**`ProchaineSortieComponent`** (Exemple 1) — le compte à rebours avant la sortie famille. `ngOnInit` initialise `restant` depuis l'input `secondesInitiales`, un timer met à jour chaque seconde, et `destroyRef.onDestroy` arrête ce timer quand on quitte l'écran. Zéro fuite, même en naviguant en boucle entre sorties.

**`MiniGrapheBudgetComponent`** (Exemple 2) — la barre « budget consommé » du tableau de bord, dessinée sur `<canvas>` via `afterNextRender` (DOM garanti, pas de SSR). Elle prolonge le planificateur de budget du module 02.

**`FluxNotificationsComponent`** — un flux de notifications famille (nouvelle sortie proposée, RSVP reçu) souscrit à la destruction via `takeUntilDestroyed()`. On garde ici **seulement le geste** de cleanup ; le flux RxJS lui-même est retravaillé aux modules 16-17.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        prochaine-sortie.component.ts       ← Exemple 1 (ngOnInit + DestroyRef)
        mini-graphe-budget.component.ts      ← Exemple 2 (afterNextRender)
      notifications/
        flux-notifications.component.ts      ← takeUntilDestroyed (cleanup only)
```

> Le vrai chargement des données de sortie depuis l'API (au lieu de l'input en dur) relèvera de `resource` (**module 10**) et des services (**module 11**) ; ici on branche juste l'initialisation au bon hook.

---

## 6. Points clés

1. Un composant a un cycle de vie ordonné : `constructor` → `ngOnChanges` → `ngOnInit` → `ngAfterViewInit` → …vie… → `ngOnDestroy`.
2. `constructor` = injection de dépendances ; `ngOnInit` = initialisation dépendant des inputs (les inputs ne sont **pas** prêts dans le constructor).
3. Tout ce qu'un composant démarre et qui lui survit (timer, souscription, écouteur) doit être arrêté à la destruction : `ngOnDestroy` ou `DestroyRef.onDestroy()`.
4. `DestroyRef.onDestroy(cb)` colocalise le nettoyage avec la création — plus lisible qu'un `ngOnDestroy` distant.
5. `takeUntilDestroyed()` désabonne un Observable automatiquement à la destruction : sans argument en contexte d'injection, avec `this.destroyRef` ailleurs.
6. Pour toucher le DOM réel : `afterNextRender` (une fois) ou `afterRender` (à chaque rendu) ; aucun des deux ne s'exécute en SSR. `ngOnInit` est trop tôt pour le DOM.
7. `ngAfterViewInit` lit la vue et ses enfants (queries) une fois montés — on n'y modifie pas l'état affiché.
8. `ngOnChanges` reçoit un `SimpleChanges` (`previousValue`, `currentValue`, `firstChange`) ; avec les signaux, un `computed()` ou un `effect()` le remplace le plus souvent.

---

## 7. Seeds Anki

```
Pourquoi ne pas lire un input() dans le constructor d'un composant Angular ?|Au moment du constructor, Angular n'a pas encore renseigné les inputs : leur valeur n'est pas fiable. L'initialisation qui dépend des inputs va dans ngOnInit, appelé une fois après le premier ngOnChanges.
Quel hook pour libérer les ressources d'un composant, et quelle alternative moderne ?|ngOnDestroy (interface OnDestroy), appelé juste avant la destruction. Alternative moderne : inject(DestroyRef).onDestroy(cb), qui colocalise le nettoyage avec la création de la ressource.
Que fait takeUntilDestroyed() et comment l'appeler selon le contexte ?|Il désabonne un Observable automatiquement à la destruction du composant. En contexte d'injection (constructor, initialiseur de champ) : takeUntilDestroyed() sans argument. Ailleurs (ngOnInit, handler) : takeUntilDestroyed(this.destroyRef).
Différence entre afterNextRender et afterRender ?|afterNextRender exécute son callback une seule fois après le prochain rendu (init de canvas/lib). afterRender l'exécute après chaque rendu (mesure/synchro continue). Aucun des deux ne s'exécute côté serveur (SSR).
Pourquoi ne pas accéder au DOM dans ngOnInit ?|ngOnInit s'exécute avant que le DOM soit peint : document.querySelector ou un canvas peuvent ne pas être prêts. Pour le DOM réel, utiliser afterNextRender (une fois) ou afterRender (à chaque rendu).
Que contient l'objet SimpleChanges reçu par ngOnChanges ?|Une map nomInput -> SimpleChange, chaque SimpleChange portant previousValue, currentValue et firstChange (booléen indiquant le premier changement).
Quand préférer un computed() à ngOnChanges ?|Dès qu'une valeur se dérive d'un input : computed(() => ...) recalcule automatiquement, typé, sans recopier l'état. On garde ngOnChanges pour comparer explicitement ancienne/nouvelle valeur ou avec des @Input() classiques.
À quoi sert ngAfterViewInit et que ne faut-il pas y faire ?|Il s'exécute une fois après l'initialisation de la vue et de ses enfants : c'est le moment de lire un résultat de query de vue (@ViewChild). Il ne faut pas y modifier l'état affiché, sous peine d'ExpressionChangedAfterItHasBeenCheckedError en dev.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-06-lifecycle-hooks/README.md`. Construire `ProchaineSortieComponent` (compte à rebours) et brancher chaque étape au bon hook : `ngOnInit` pour l'init, `DestroyRef` pour le nettoyage, `afterNextRender` pour un indicateur visuel — dev server Angular en oracle visuel, corrigé commenté intégral, zéro harnais simulé.
