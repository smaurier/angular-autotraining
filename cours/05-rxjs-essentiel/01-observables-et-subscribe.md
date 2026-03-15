# Cours 21 — Observables et Subscribe

> **Objectif** : Comprendre le concept d'Observable, sa différence fondamentale avec les Promises, et maîtriser le cycle subscribe/unsubscribe. Decouvrir les principaux types de Subjects et savoir pourquoi Angular utilise encore RxJS malgre les Signals.

---

## Rappel du cours précédent

<details>
<summary>1. Qu'est-ce qu'un guard `canActivate` et quand s'exécuté-t-il ?</summary>

Un `canActivate` est une fonction qui s'exécuté **avant** l'activation d'une route. Elle retourne `true`, `false` ou un `UrlTree` pour rediriger. C'est le mécanisme standard pour proteger des routes (ex : vérification d'authentification).
</details>

<details>
<summary>2. Comment définir des routes enfants imbriquees dans Angular ?</summary>

On utilise la propriété `children` dans la configuration de route, avec un `<router-outlet>` dans le template du composant parent pour afficher les composants enfants.
</details>

<details>
<summary>3. Quelle est la différence entre `loadComponent` et `loadChildren` dans le lazy loading ?</summary>

`loadComponent` charge un seul composant de manière differee. `loadChildren` charge un fichier de routes complet (sous-arbre de navigation), ce qui permet de découper l'application en chunks independants.
</details>

---

## Analogie

Imaginez deux facons de regarder un film :

- **Un DVD (Promise)** : vous achetez le disque, vous le recevez une seule fois, et c'est termine. Même si vous ne le regardez jamais, le DVD a ete produit et expedie.
- **Un abonnement Netflix (Observable)** : vous vous abonnez (subscribe), et Netflix vous **pousse** du contenu en continu. Tant que vous etes abonne, vous recevez de nouvelles emissions. Vous pouvez vous desabonner (unsubscribe) a tout moment, et le flux s'arrete pour vous.

Un Observable, c'est Netflix : **lazy** (rien ne se passe tant que personne ne s'abonne), **multi-emission** (il peut emettre 0, 1 ou N valeurs), et **annulable** (on peut couper le flux).

---

## Théorie

### Observable vs Promise

| Caracteristique | Promise | Observable |
|-----------------|---------|------------|
| Exécution | **Eager** (demarre immediatement) | **Lazy** (demarre au subscribe) |
| Emissions | Une seule valeur | 0 a N valeurs |
| Annulation | Impossible nativement | `unsubscribe()` |
| Operateurs | `.then()`, `.catch()` | `pipe()` avec des dizaines d'operateurs |
| Multicast | Toujours partagee | Unicast par defaut |

```typescript
// Promise : s'execute immediatement
const promise = new Promise(resolve => {
  console.log('Promise executee !'); // ← S'affiche tout de suite
  resolve(42);
});

// Observable : ne fait RIEN tant qu'on ne subscribe pas
const obs$ = new Observable(subscriber => {
  console.log('Observable execute !'); // ← S'affiche seulement au subscribe
  subscriber.next(42);
  subscriber.complete();
});
```

> **Convention** : en Angular, on suffixe les variables Observable avec `$` (ex : `users$`, `data$`).

### Créer des Observables

RxJS fournit des fonctions de création pratiques :

```typescript
import { of, from, interval, fromEvent, EMPTY, throwError } from 'rxjs';

// of() : emet des valeurs fixes puis complete
const fixe$ = of(1, 2, 3);

// from() : convertit un tableau, une Promise ou un iterable
const tableau$ = from([10, 20, 30]);
const promesse$ = from(fetch('/api/users'));

// interval() : emet un compteur toutes les N ms
const compteur$ = interval(1000); // 0, 1, 2, 3... chaque seconde

// fromEvent() : ecoute un evenement DOM
const clics$ = fromEvent(document, 'click');

// EMPTY : complete immediatement sans emettre
// throwError() : emet une erreur immediatement
```

### Le pattern subscribe : next, error, complete

Un Observable communique via trois callbacks :

```typescript
import { of } from 'rxjs';

const data$ = of('Alice', 'Bob', 'Charlie');

const subscription = data$.subscribe({
  next: (valeur) => console.log('Recu :', valeur),
  error: (err) => console.error('Erreur :', err),
  complete: () => console.log('Termine !'),
});

// Sortie :
// Recu : Alice
// Recu : Bob
// Recu : Charlie
// Termine !
```

```typescript
// ❌ Mauvais : oublier de gerer l'erreur
data$.subscribe(valeur => console.log(valeur));

// ✅ Bon : toujours prevoir error (surtout pour HTTP)
data$.subscribe({
  next: (valeur) => console.log(valeur),
  error: (err) => console.error('Erreur attrapee', err),
});
```

### pipe() : enchainer des operateurs

Le `pipe()` est le mécanisme pour transformer un flux :

```typescript
import { of } from 'rxjs';
import { map, filter } from 'rxjs/operators';

const nombres$ = of(1, 2, 3, 4, 5);

nombres$.pipe(
  filter(n => n % 2 === 0),   // Garde les pairs : 2, 4
  map(n => n * 10),            // Multiplie : 20, 40
).subscribe(val => console.log(val));
// 20
// 40
```

### unsubscribe() : éviter les fuites mémoire

```typescript
// ❌ Fuite memoire : interval ne s'arrete jamais
const sub = interval(1000).subscribe(n => console.log(n));
// Le composant est detruit mais l'interval continue...

// ✅ Se desabonner dans ngOnDestroy ou avec takeUntilDestroyed
import { Component, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';

@Component({ selector: 'app-timer', template: `{{ count }}` })
export class TimerComponent implements OnDestroy {
  private sub: Subscription;
  count = 0;

  constructor() {
    this.sub = interval(1000).subscribe(n => this.count = n);
  }

  ngOnDestroy() {
    this.sub.unsubscribe(); // ✅ Nettoyage
  }
}
```

### Subject, BehaviorSubject, ReplaySubject

Les Subjects sont des Observables **et** des Observers : ils peuvent à la fois emettre et etre ecoutes.

```typescript
import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

// Subject : pas de valeur initiale, les nouveaux abonnes ratent les emissions passees
const subject = new Subject<string>();
subject.next('A');                    // Personne n'ecoute, perdu
subject.subscribe(v => console.log(v));
subject.next('B');                    // → 'B'

// BehaviorSubject : garde la derniere valeur, la renvoie immediatement
const behavior = new BehaviorSubject<string>('initial');
behavior.subscribe(v => console.log(v));  // → 'initial' (tout de suite)
behavior.next('update');                   // → 'update'
console.log(behavior.getValue());          // → 'update' (acces synchrone)

// ReplaySubject : rejoue les N dernieres emissions
const replay = new ReplaySubject<string>(2); // Garde les 2 dernieres
replay.next('X');
replay.next('Y');
replay.next('Z');
replay.subscribe(v => console.log(v)); // → 'Y', 'Z' (les 2 dernieres)
```

| Type | Valeur initiale | Nouvel abonne recoit | Cas d'usage |
|------|----------------|---------------------|-------------|
| `Subject` | Non | Rien (les emissions passees sont perdues) | Event bus simple |
| `BehaviorSubject` | Oui (obligatoire) | La dernière valeur emise | État courant (user connecte) |
| `ReplaySubject(n)` | Non | Les n dernières valeurs | Historique, cache |

### Pourquoi Angular a encore besoin de RxJS

Même avec les Signals (Angular 16+), RxJS reste essentiel pour :

| Domaine | Pourquoi RxJS |
|---------|--------------|
| **HttpClient** | Retourne des Observables (cold, single-emission) |
| **Router** | `params`, `queryParams`, `events` sont des Observables |
| **Reactive Forms** | `valueChanges`, `statusChanges` sont des Observables |
| **WebSocket** | Flux continus de donnees temps réel |
| **Composition async** | debounce, retry, race conditions, polling |

> **Regle d'or en ESN** : les Signals gerent l'état UI synchrone, RxJS géré les flux asynchrones complexes. Les deux coexistent.

### Comparaison avec Vue 3

| Concept | Vue 3 | Angular (RxJS) |
|---------|-------|----------------|
| Réactivité sync | `ref()`, `computed()` | `signal()`, `computed()` |
| Flux async | Pas natif (on utilise des libs) | RxJS intégré |
| Requetes HTTP | `axios` retourne des Promises | `HttpClient` retourne des Observables |
| Annulation | `AbortController` manuel | `unsubscribe()` / `switchMap` |

---

## Pratique

Creez un service `NotificationService` qui utilise un `BehaviorSubject` pour gérer un message de notification. Le composant s'abonne pour afficher le message et le service expose une méthode `notify(message)`.

**Consignes** :
1. Creez un `BehaviorSubject<string>` avec une valeur initiale vide
2. Exposez un Observable public `message$`
3. Creez une méthode `notify(msg: string)` qui emet le message
4. Dans le composant, abonnez-vous et affichez le message

<details>
<summary>Solution</summary>

```typescript
// notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messageSubject = new BehaviorSubject<string>('');

  // ✅ Exposer un Observable, pas le Subject directement
  readonly message$ = this.messageSubject.asObservable();

  notify(msg: string): void {
    this.messageSubject.next(msg);
  }

  clear(): void {
    this.messageSubject.next('');
  }
}
```

```typescript
// notification-banner.component.ts
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-banner',
  template: `
    @if (message) {
      <div class="notification">
        {{ message }}
        <button (click)="fermer()">X</button>
      </div>
    }
  `,
})
export class NotificationBannerComponent implements OnDestroy {
  message = '';
  private sub: Subscription;

  constructor(private notifService: NotificationService) {
    this.sub = this.notifService.message$.subscribe(
      msg => this.message = msg
    );
  }

  fermer(): void {
    this.notifService.clear();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| Observable | Flux lazy, multi-emission, annulable |
| Promise | Eager, single-emission, non annulable |
| `subscribe()` | Demarre l'exécution, recoit `next`, `error`, `complete` |
| `unsubscribe()` | **Obligatoire** pour éviter les fuites mémoire |
| `pipe()` | Enchaine les operateurs de transformation |
| `Subject` | Observable + Observer, pas de valeur initiale |
| `BehaviorSubject` | Garde la dernière valeur, ideal pour l'état courant |
| `ReplaySubject(n)` | Rejoue les n dernières emissions |
| Convention `$` | Suffixer les Observables : `users$`, `data$` |
| RxJS + Signals | RxJS pour l'async complexe, Signals pour l'état UI sync |

---

> **Prochain cours** : [Cours 22 — Operateurs courants](./02-operators-courants.md)
