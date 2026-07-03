---
titre: RxJS — Observables, subscribe et opérateurs courants
cours: 03-angular
notions: [Observable, "subscribe() / unsubscribe()", Subscription, "of / from / interval / fromEvent", "pipe()", map, filter, debounceTime, switchMap, mergeMap, "Observable higher-order (inner Observable)", "convention de nommage $"]
outcomes:
  - sait décrire un Observable (lazy, multi-émission, annulable) et le distinguer d'une Promise
  - sait s'abonner avec subscribe (next / error / complete) et se désabonner via la Subscription pour éviter les fuites
  - sait transformer un flux avec pipe() en enchaînant map et filter
  - sait débouncer une saisie avec debounceTime pour limiter les déclenchements
  - sait choisir entre switchMap (annule le précédent) et mergeMap (tout en parallèle) selon le cas
prerequis: [modules 00-15]
next: 17-rxjs-patterns-et-interop-signals
libs: [{ name: "rxjs", version: "7" }]
tribuzen: front-office TribuZen — barre de recherche debounced des familles/sorties (flux de saisie transformé en résultats)
last-reviewed: 2026-07
---

# RxJS — Observables, `subscribe` et opérateurs courants

> **Outcomes — tu sauras FAIRE :** créer et consommer un `Observable` avec `subscribe`/`unsubscribe`, transformer un flux avec `pipe()`, `map` et `filter`, débouncer une saisie avec `debounceTime`, et choisir entre `switchMap` et `mergeMap`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **les bases d'un flux RxJS** : l'`Observable` (créer / s'abonner / se désabonner), le `pipe()`, et les opérateurs **courants** `map`, `filter`, `debounceTime`, `switchMap`, `mergeMap`. C'est tout. Les **`Subject`/`BehaviorSubject`**, l'**interop signals** (`toSignal` / `toObservable`) et `takeUntilDestroyed` sont le **module 17**. Le **`HttpClient`** (qui *retourne* des Observables) est le **module 18** : ici les flux asynchrones sont simulés avec `of`, `interval`, `timer` et `fromEvent` — jamais d'appel réseau.

## 1. Cas concret d'abord

Nouvelle story TribuZen : une **barre de recherche de familles**. L'utilisateur tape dans un champ, et une liste de suggestions doit s'afficher. Un collègue a câblé la version « naïve » : à chaque frappe, on lance la recherche.

```typescript
// recherche-familles.component.ts — AVANT (naïf, cassé)
onInput(event: Event) {
  const terme = (event.target as HTMLInputElement).value;

  // Une recherche PAR FRAPPE : "M", "Ma", "Mar", "Mart", "Marti", "Martin"...
  this.rechercher(terme).subscribe(resultats => {
    this.resultats = resultats;   // ← qui gagne la course ?
  });
}
```

Deux problèmes réels apparaissent en démo :

1. **Trop de déclenchements** : taper « Martin » lance 6 recherches. On veut attendre que l'utilisateur *arrête* de taper.
2. **Course (race condition)** : la recherche de « Mar » peut répondre *après* celle de « Martin » (réseau non déterministe). Le dernier `subscribe` qui écrit `this.resultats` gagne — et il affiche parfois un **résultat périmé**.

La solution n'est pas d'ajouter des `if` : c'est de **traiter la suite de frappes comme un flux** et de le transformer avec des opérateurs. `debounceTime` attend une pause avant d'émettre ; `switchMap` **annule** automatiquement la recherche précédente quand une nouvelle frappe arrive. C'est exactement ce que RxJS fait, et ce module te donne les briques : `Observable`, `subscribe`/`unsubscribe`, `pipe()`, `map`, `filter`, `debounceTime`, `switchMap`, `mergeMap`.

---

## 2. Théorie complète, concise

### 2.1 Un `Observable` — flux paresseux, multi-émission, annulable

Un `Observable` est un **flux de valeurs dans le temps**. Trois propriétés le distinguent d'une `Promise` :

| Caractéristique | `Promise` | `Observable` |
|-----------------|-----------|--------------|
| Exécution | **eager** (démarre à la création) | **lazy** (démarre au `subscribe`) |
| Émissions | **une** valeur | **0, 1 ou N** valeurs |
| Annulation | impossible nativement | `unsubscribe()` |
| Transformation | `.then()` / `.catch()` | `pipe()` + opérateurs |

« Lazy » est le point clé : tant que personne ne fait `subscribe`, **rien ne s'exécute**.

```typescript
import { Observable } from 'rxjs';

const source$ = new Observable<number>(subscriber => {
  console.log('exécution');   // ← ne s'affiche QU'AU subscribe
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
});
// Ici : rien n'est encore affiché.
```

> **Convention Angular** : on suffixe les variables Observable d'un `$` (`resultats$`, `clics$`). C'est un signal visuel, pas de la syntaxe.

### 2.2 Créer un Observable — `of`, `from`, `interval`, `fromEvent`

En pratique on utilise rarement `new Observable`. RxJS 7 fournit des **fonctions de création**, toutes importées depuis `'rxjs'` (plus depuis `'rxjs/operators'`) :

```typescript
import { of, from, interval, fromEvent } from 'rxjs';

const fixe$    = of(1, 2, 3);                 // émet 1, 2, 3 puis complete
const depuis$  = from([10, 20, 30]);          // convertit un tableau (ou une Promise, un itérable)
const tic$     = interval(1000);              // 0, 1, 2, 3... chaque seconde (ne complete jamais)
const saisie$  = fromEvent(inputEl, 'input'); // un flux d'événements DOM
```

### 2.3 Consommer — `subscribe` (next / error / complete)

`subscribe` **démarre** le flux et fournit jusqu'à trois callbacks. Il renvoie une **`Subscription`**.

```typescript
import { of } from 'rxjs';

const data$ = of('Alice', 'Bob');

const sub = data$.subscribe({
  next:     (v)   => console.log('reçu', v),   // à chaque valeur
  error:    (err) => console.error(err),        // si le flux échoue (termine le flux)
  complete: ()    => console.log('fini'),       // quand le flux se termine normalement
});
// reçu Alice / reçu Bob / fini
```

Signature vérifiée : `subscribe(observer?): Subscription`. On peut passer juste une fonction `next` (`data$.subscribe(v => ...)`), mais pour un flux qui peut échouer, **prévois toujours `error`**.

### 2.4 Se désabonner — `unsubscribe()` et les fuites mémoire

Un flux qui n'émet jamais `complete` (`interval`, `fromEvent`) **continue** après la destruction du composant : c'est une **fuite mémoire**. On coupe via la `Subscription`.

```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({ selector: 'app-timer', template: '{{ compteur }}' })
export class TimerComponent implements OnInit, OnDestroy {
  compteur = 0;
  private sub?: Subscription;

  ngOnInit() {
    this.sub = interval(1000).subscribe(n => (this.compteur = n));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();   // ✅ sans ça, l'interval tourne pour toujours
  }
}
```

> Un flux **fini** (`of`, `from([...])`) se termine seul : le désabonnement n'est pas critique. Un flux **infini** (`interval`, `fromEvent`) doit être coupé. `takeUntilDestroyed`, qui automatise ça, est le **module 17**.

### 2.5 `pipe()` — enchaîner des opérateurs

`pipe()` prend un flux et applique une suite d'**opérateurs**, chacun renvoyant un **nouveau** flux (l'original n'est pas modifié). C'est une chaîne de montage : la valeur entre, traverse chaque poste, ressort transformée.

```typescript
import { of, filter, map } from 'rxjs';

of(1, 2, 3, 4, 5).pipe(
  filter(n => n % 2 === 0),   // ne garde que les pairs : 2, 4
  map(n => n * 10),           // transforme : 20, 40
).subscribe(v => console.log(v));   // 20, puis 40
```

### 2.6 `map` et `filter` — transformer et filtrer

- **`map(fn)`** : applique `fn` à **chaque** valeur (comme `Array.map`, mais sur un flux). `map(user => user.name)`.
- **`filter(predicat)`** : ne laisse passer que les valeurs pour lesquelles `predicat` renvoie `true` (comme `Array.filter`). `filter(n => n > 3)`.

### 2.7 `debounceTime(ms)` — attendre une pause

`debounceTime(ms)` n'émet une valeur **que si `ms` millisecondes se sont écoulées sans nouvelle émission**. Les valeurs intermédiaires sont abandonnées. C'est l'outil anti-« une recherche par frappe ».

```typescript
import { fromEvent, map, debounceTime } from 'rxjs';

fromEvent<InputEvent>(inputEl, 'input').pipe(
  map(e => (e.target as HTMLInputElement).value),
  debounceTime(300),   // n'émet que 300 ms après la DERNIÈRE frappe
).subscribe(terme => console.log('chercher :', terme));
```

### 2.8 `switchMap` et `mergeMap` — mapper vers un **inner Observable**

`map` transforme une valeur en une **autre valeur**. Mais souvent une valeur doit déclencher **une nouvelle opération asynchrone** — donc un nouvel Observable (« inner Observable »). Si on faisait `map`, on obtiendrait un `Observable<Observable<...>>` (un flux **de flux**). Il faut un opérateur qui **aplatit** : il s'abonne à l'inner et réémet ses valeurs.

Les deux courants diffèrent sur la gestion des inners **concurrents** :

- **`switchMap`** : quand une nouvelle valeur source arrive, il **se désabonne de l'inner précédent** (l'annule) et s'abonne au nouveau. → **le précédent est jeté**. Idéal pour la **recherche** : une nouvelle frappe rend l'ancienne requête inutile.
- **`mergeMap`** : il s'abonne à **chaque** inner dès son arrivée et **fusionne** toutes leurs émissions, sans rien annuler. → **tout tourne en parallèle**. Idéal pour des actions **indépendantes** (un « like » par clic, un log par événement) où chaque résultat compte.

```typescript
import { fromEvent, of, map, debounceTime, switchMap } from 'rxjs';

// terme -> annule la recherche précédente, garde la dernière (rechercher() renvoie un Observable)
fromEvent<InputEvent>(inputEl, 'input').pipe(
  map(e => (e.target as HTMLInputElement).value),
  debounceTime(300),
  switchMap(terme => this.rechercher(terme)),   // inner Observable
).subscribe(resultats => (this.resultats = resultats));
```

Règle de choix : **le résultat précédent devient-il obsolète quand une nouvelle valeur arrive ?** Oui → `switchMap`. Non, chaque action est indépendante → `mergeMap`. (`concatMap` pour l'ordre garanti et `exhaustMap` pour ignorer pendant traitement existent aussi — vus au module 17.)

---

## 3. Worked examples

### Exemple 1 — un pipeline pur `map` / `filter` (sans composant)

Objectif : à partir des budgets de plusieurs sorties, ne garder que ceux dépassant 50 EUR et les formater.

```typescript
import { from, filter, map } from 'rxjs';

interface Sortie { nom: string; budget: number; }

const sorties: Sortie[] = [
  { nom: 'Piscine',    budget: 30 },
  { nom: 'Accrobranche', budget: 90 },
  { nom: 'Ciné',       budget: 45 },
  { nom: 'Escape game', budget: 120 },
];

from(sorties).pipe(
  filter(s => s.budget > 50),                       // Accrobranche, Escape game
  map(s => `${s.nom} : ${s.budget} EUR`),           // transformation en chaîne
).subscribe({
  next: ligne => console.log(ligne),
  complete: () => console.log('— fin —'),
});

// Accrobranche : 90 EUR
// Escape game : 120 EUR
// — fin —
```

Points à noter : `from(sorties)` émet **chaque élément** un par un (pas le tableau entier). Le flux est **fini**, donc `complete` se déclenche et le désabonnement n'est pas nécessaire ici.

### Exemple 2 — la barre de recherche debounced (TribuZen)

On résout le cas concret de §1. La recherche est **simulée** par un Observable local (`of(...).pipe(delay(...))`) — le vrai `HttpClient` est le module 18, mais l'opérateur pipeline est **identique**.

```typescript
// recherche-familles.component.ts — version RxJS
import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild,
} from '@angular/core';
import { fromEvent, of, Subscription, Observable } from 'rxjs';
import { map, filter, debounceTime, switchMap, delay } from 'rxjs';

interface Famille { id: string; nom: string; }

@Component({
  selector: 'app-recherche-familles',
  template: `
    <input #champ type="search" placeholder="Rechercher une famille…" />
    <ul>
      @for (f of resultats; track f.id) {
        <li>{{ f.nom }}</li>
      }
    </ul>
  `,
})
export class RechercheFamillesComponent implements AfterViewInit, OnDestroy {
  // #champ dans le template -> référence à l'élément <input>
  @ViewChild('champ') champ!: ElementRef<HTMLInputElement>;

  resultats: Famille[] = [];
  private sub?: Subscription;

  // ngAfterViewInit : la référence @ViewChild n'est prête qu'APRÈS le rendu de la vue
  ngAfterViewInit() {
    this.sub = fromEvent<InputEvent>(this.champ.nativeElement, 'input').pipe(
      map(e => (e.target as HTMLInputElement).value.trim()),  // valeur saisie, nettoyée
      filter(terme => terme.length >= 2),                     // ignore les recherches trop courtes
      debounceTime(300),                                      // attend 300 ms de pause
      switchMap(terme => this.rechercher(terme)),             // annule la recherche précédente
    ).subscribe(familles => (this.resultats = familles));
  }

  // fromEvent est un flux INFINI -> désabonnement obligatoire
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // Simulation d'une recherche asynchrone. Au module 18, ce sera this.http.get<Famille[]>(...)
  private rechercher(terme: string): Observable<Famille[]> {
    const base: Famille[] = [
      { id: 'f1', nom: 'Martin' },
      { id: 'f2', nom: 'Martinez' },
      { id: 'f3', nom: 'Durand' },
    ];
    const filtrees = base.filter(f =>
      f.nom.toLowerCase().includes(terme.toLowerCase()),
    );
    return of(filtrees).pipe(delay(200));   // réponse « réseau » simulée
  }
}
```

**Ce qui se passe quand on tape « Martin »** : chaque frappe passe par `map` (valeur) et `filter` (≥ 2 caractères) ; `debounceTime(300)` ne laisse passer que la dernière frappe après la pause ; `switchMap` lance `rechercher('Martin')` et, si une nouvelle frappe survient entre-temps, **annule** la requête précédente. Résultat : **une** recherche, jamais de résultat périmé. Les deux problèmes de §1 disparaissent sans un seul `if`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier de `subscribe` (le flux ne fait rien)

```typescript
// ❌ Aucun subscribe : lazy => AUCUN code interne ne tourne
of(1, 2, 3).pipe(map(n => n * 10));   // rien ne s'affiche, rien ne part

// ✅ Le subscribe démarre le flux
of(1, 2, 3).pipe(map(n => n * 10)).subscribe(v => console.log(v));
```

Contrairement à une `Promise` (qui s'exécute à la création), un `Observable` est **inerte** tant qu'on ne s'y abonne pas.

### PIÈGE #2 — `subscribe` imbriqué au lieu de `switchMap`

```typescript
// ❌ subscribe dans subscribe : callback hell + AUCUNE annulation (race condition)
saisie$.subscribe(terme => {
  this.rechercher(terme).subscribe(res => (this.resultats = res));
});

// ✅ switchMap aplatit ET annule la recherche précédente
saisie$.pipe(
  switchMap(terme => this.rechercher(terme)),
).subscribe(res => (this.resultats = res));
```

Dès qu'une valeur doit déclencher **un autre Observable**, c'est un opérateur `*Map`, jamais un `subscribe` imbriqué.

### PIÈGE #3 — `switchMap` là où il faut `mergeMap` (et inversement)

```typescript
// ❌ Enregistrer chaque "like" avec switchMap : un like rapide ANNULE le précédent -> likes perdus
clics$.pipe(switchMap(id => this.envoyerLike(id)));

// ✅ Actions indépendantes -> mergeMap : chacune va au bout, en parallèle
clics$.pipe(mergeMap(id => this.envoyerLike(id)));

// ❌ Recherche avec mergeMap : toutes les requêtes vivent -> résultat périmé possible
saisie$.pipe(mergeMap(terme => this.rechercher(terme)));

// ✅ Recherche -> switchMap : la nouvelle frappe annule l'ancienne requête
saisie$.pipe(switchMap(terme => this.rechercher(terme)));
```

`switchMap` = « seul le dernier compte » (recherche, navigation). `mergeMap` = « chacun compte » (likes, logs, envois indépendants).

### PIÈGE #4 — Oublier `unsubscribe` sur un flux infini

```typescript
// ❌ fromEvent/interval ne completent jamais : la souscription survit au composant
ngOnInit() { interval(1000).subscribe(n => (this.n = n)); }
// Le composant est détruit, l'interval continue -> fuite mémoire

// ✅ Garder la Subscription et la couper
private sub = interval(1000).subscribe(n => (this.n = n));
ngOnDestroy() { this.sub.unsubscribe(); }
```

Un flux **fini** (`of`, `from([...])`) se termine seul ; un flux **infini** doit être coupé dans `ngOnDestroy`.

### PIÈGE #5 — Croire que `pipe` mute le flux source

```typescript
const source$ = of(1, 2, 3);
const doubles$ = source$.pipe(map(n => n * 2));

// source$ n'est PAS modifié : pipe renvoie un NOUVEL Observable
source$.subscribe(v => console.log('source', v));   // 1, 2, 3
doubles$.subscribe(v => console.log('double', v));  // 2, 4, 6
```

Chaque opérateur renvoie un **nouveau** flux. `pipe` compose, il ne modifie jamais la source — comme `Array.map` renvoie un nouveau tableau.

---

## 5. Ancrage TribuZen

RxJS est la **couche des flux asynchrones** de TribuZen : tout ce qui arrive « dans le temps » (saisies, événements, plus tard les réponses HTTP et les paramètres de route) est modélisé en `Observable` et transformé par `pipe()`.

**`RechercheFamillesComponent`** (Exemple 2) — la barre de recherche du front-office : `fromEvent` sur le champ, `debounceTime(300)` pour ne pas spammer, `switchMap` pour n'afficher que le résultat de la **dernière** frappe. C'est le premier écran TribuZen qui montre pourquoi les signaux seuls ne suffisent pas : gérer le *temps* et l'*annulation* demande RxJS.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      familles/
        recherche-familles.component.ts   ← Exemple 2 (fromEvent + debounceTime + switchMap)
```

> Ici la recherche est **simulée** (`of(...).pipe(delay())`). Le branchement au vrai back-office via `HttpClient` est le **module 18**. Transformer ce flux en `signal` pour le template (`toSignal`) est le **module 17** : pour l'instant on affecte `this.resultats` dans le `subscribe`.

---

## 6. Points clés

1. Un `Observable` est **lazy** (rien avant `subscribe`), **multi-émission** (0..N valeurs) et **annulable** (`unsubscribe`) — contrairement à une `Promise`.
2. On crée un flux avec `of`, `from`, `interval`, `fromEvent` (importés de `'rxjs'`) ; on le consomme avec `subscribe({ next, error, complete })`, qui renvoie une `Subscription`.
3. Un flux **infini** (`interval`, `fromEvent`) doit être coupé avec `unsubscribe()` dans `ngOnDestroy` — sinon fuite mémoire. Un flux **fini** se termine seul.
4. `pipe()` compose des opérateurs et renvoie un **nouveau** flux ; il ne modifie jamais la source.
5. `map` transforme chaque valeur, `filter` ne laisse passer que celles qui satisfont le prédicat.
6. `debounceTime(ms)` n'émet qu'après `ms` sans nouvelle émission — anti « une action par frappe ».
7. `switchMap` **annule** l'inner précédent (recherche, navigation) ; `mergeMap` les exécute **tous en parallèle** (actions indépendantes). Jamais de `subscribe` imbriqué.

---

## 7. Seeds Anki

```
Quelles sont les 3 propriétés d'un Observable face à une Promise ?|Lazy (rien ne s'exécute avant subscribe), multi-émission (0, 1 ou N valeurs contre 1 seule), et annulable via unsubscribe (une Promise ne l'est pas).
Pourquoi of(1,2,3).pipe(map(n => n*10)) n'affiche-t-il rien sans subscribe ?|Un Observable est lazy : le code interne ne s'exécute qu'au subscribe. Sans abonné, aucune valeur n'est émise ni transformée.
Que renvoie subscribe() et à quoi sert cette valeur ?|Une Subscription. On garde sa référence pour appeler unsubscribe() (souvent dans ngOnDestroy) et couper un flux infini afin d'éviter une fuite mémoire.
Quel flux faut-il désabonner et lequel se termine seul ?|Un flux infini (interval, fromEvent) doit être désabonné dans ngOnDestroy. Un flux fini (of, from([...])) émet complete et se termine tout seul.
À quoi sert debounceTime(300) dans une barre de recherche ?|Il n'émet la valeur que 300 ms après la DERNIÈRE frappe, en abandonnant les intermédiaires. Ça évite de lancer une recherche à chaque caractère tapé.
Différence entre switchMap et mergeMap ?|switchMap annule (unsubscribe) l'inner Observable précédent quand une nouvelle valeur arrive — idéal pour la recherche. mergeMap s'abonne à chaque inner en parallèle sans annuler — idéal pour des actions indépendantes (likes, logs).
Pourquoi éviter un subscribe imbriqué dans un autre subscribe ?|Ça crée du callback hell et n'annule jamais l'appel précédent (race condition). On aplatit avec un opérateur *Map (switchMap/mergeMap) dans le pipe.
pipe() modifie-t-il l'Observable source ?|Non. Chaque opérateur renvoie un NOUVEL Observable ; la source reste intacte, comme Array.map renvoie un nouveau tableau.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-16-rxjs-observables-et-operators/README.md`. Construire la barre de recherche debounced de TribuZen avec `fromEvent` + `debounceTime` + `switchMap`, dev server Angular en oracle visuel — zéro gap-fill, corrigé commenté intégral.
