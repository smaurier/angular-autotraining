# Lab 17 — RxJS patterns et interop signals

> **Outcome :** à la fin, tu sais construire une **façade** `ActivitesService` (état via `BehaviorSubject`, exposé en signals avec `toSignal()`), une recherche débouncée qui convertit un `signal` en flux (`toObservable()` + `debounceTime` + `switchMap`), et un error handling correct (`retry` **avant** `catchError`) — le tout dans un vrai projet Angular.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, HMR visible dans le navigateur). Sources async **simulées** avec `of(...).pipe(delay())` — pas de HttpClient (module 18), et surtout **aucun harnais de test maison**.
> **Feedback :** le coach valide visuellement en session (change de catégorie, tape dans la recherche) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le **cœur du planificateur d'activités TribuZen** : un service en façade et deux composants qui n'utilisent **que des signals**.

Cahier des charges **exact** :

1. **`ActivitesService`** — un état « catégorie active » dans un `BehaviorSubject<Categorie>` (initial : `'nature'`).
2. À chaque changement de catégorie, (re)charger la liste via un pipeline RxJS **interne** : `switchMap` (annule le chargement obsolète) + `retry` (2 tentatives, délai 500 ms) + `catchError` (secours : liste vide).
3. Exposer **uniquement des signals** : `categorie` (via `requireSync`), `activites` (via `initialValue`), `nombre` (un `computed`).
4. **`PlanificateurComponent`** — trois boutons de catégorie (le bouton actif a la classe `actif`), la liste des activités avec un `@empty`, et le compteur `nombre()`.
5. **`RechercheComponent`** — un `input` piloté par un `signal` `terme` ; via `toObservable()` : `debounceTime(300)` + `distinctUntilChanged()` + `filter(len >= 2)` + `switchMap`. En cas d'échec de la source, allumer un signal `erreur` (message à l'écran) **sans casser le flux**.
6. La source async est **simulée** (`of(...).pipe(delay())`). Un commentaire `// module 18 : this.http.get` marque l'endroit du futur vrai appel.

**Pas de gap-fill** — tu écris le service et les composants à partir du starter minimal.

### Mise en place (vrai outil)

```bash
# Si tu n'as pas encore de projet
npm install -g @angular/cli@19
ng new tribuzen-lab --standalone --style=css --routing=false
cd tribuzen-lab

# Génère le service et les deux composants
ng generate service activites/activites
ng generate component activites/planificateur
ng generate component activites/recherche

# Lance l'oracle visuel
ng serve -o
```

Branche `<app-planificateur />` et `<app-recherche />` dans `app.component.ts` pour voir le résultat en direct.

### Starter minimal

```typescript
// activites/activites.service.ts — starter
import { Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of, timer } from 'rxjs';
import { switchMap, delay, retry, catchError } from 'rxjs';

export interface Activite { id: string; nom: string; categorie: Categorie; }
export type Categorie = 'nature' | 'culture' | 'sport';

const BASE: Activite[] = [
  { id: 'a1', nom: 'Rando cascade',      categorie: 'nature'  },
  { id: 'a2', nom: 'Musée des sciences', categorie: 'culture' },
  { id: 'a3', nom: 'Accrobranche',       categorie: 'nature'  },
  { id: 'a4', nom: 'Tournoi de foot',    categorie: 'sport'   },
];

@Injectable({ providedIn: 'root' })
export class ActivitesService {
  // TODO : BehaviorSubject 'nature', pipeline activites$, signals exposés, choisir(), charger()
}
```

---

## Étapes (en friction)

1. **État** — déclare `private categorieSubject = new BehaviorSubject<Categorie>('nature')`.
2. **Source simulée** — écris `private charger(cat)` qui renvoie `of(BASE.filter(a => a.categorie === cat)).pipe(delay(300))`. Ajoute le commentaire `// module 18 : this.http.get`.
3. **Pipeline interne** — `private activites$ = this.categorieSubject.pipe(switchMap(...))` avec `retry({ count: 2, delay: () => timer(500) })` **puis** `catchError(() => of([]))` **à l'intérieur** du `switchMap`.
4. **Signals exposés** — `categorie` avec `{ requireSync: true }`, `activites` avec `{ initialValue: [] }`, `nombre = computed(() => this.activites().length)`.
5. **Action** — `choisir(cat: Categorie) { this.categorieSubject.next(cat); }`.
6. **`PlanificateurComponent`** — injecte le service, `@for` sur `['nature','culture','sport']`, `[class.actif]="svc.categorie() === c"`, `(click)="svc.choisir(c)"`, liste `@for` + `@empty`, titre avec `svc.nombre()`.
7. **`RechercheComponent`** — `terme = signal('')`, `erreur = signal(false)` ; `resultats = toSignal(toObservable(this.terme).pipe(...))`.
8. **Vérifie en direct** : clique vite sur trois catégories → seule la dernière liste s'affiche (switchMap). Tape « ac » → résultats après ~300 ms. Tape 1 caractère → rien (filter).
9. **Cas d'erreur** — force temporairement `charger()` à renvoyer `throwError(() => ({ status: 500 }))` : la liste reste vide (catchError) et l'app ne crashe pas ; remets ensuite la version qui marche.

---

## Corrigé complet commenté

```typescript
// activites/activites.service.ts — corrigé
import { Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of, timer } from 'rxjs';
import { switchMap, delay, retry, catchError } from 'rxjs';

export interface Activite { id: string; nom: string; categorie: Categorie; }
export type Categorie = 'nature' | 'culture' | 'sport';

// Données en dur — simulent la base. Module 18 : vrai backend HTTP.
const BASE: Activite[] = [
  { id: 'a1', nom: 'Rando cascade',      categorie: 'nature'  },
  { id: 'a2', nom: 'Musée des sciences', categorie: 'culture' },
  { id: 'a3', nom: 'Accrobranche',       categorie: 'nature'  },
  { id: 'a4', nom: 'Tournoi de foot',    categorie: 'sport'   },
];

@Injectable({ providedIn: 'root' })
export class ActivitesService {
  // BehaviorSubject : porte l'ÉTAT "catégorie active".
  // Valeur initiale obligatoire → il y a toujours une catégorie courante.
  private categorieSubject = new BehaviorSubject<Categorie>('nature');

  // Flux INTERNE (jamais exposé tel quel) : à chaque nouvelle catégorie,
  // switchMap annule le chargement précédent et en lance un nouveau.
  private activites$ = this.categorieSubject.pipe(
    switchMap(cat =>
      this.charger(cat).pipe(
        // retry AVANT catchError : réessaie 2 fois (500 ms d'écart) sur erreur.
        retry({ count: 2, delay: () => timer(500) }),
        // catchError APRÈS : si tout a échoué, secours = liste vide.
        // Retourne un Observable (of), jamais une valeur nue.
        catchError(() => of([] as Activite[])),
      ),
    ),
  );

  // --- EXPOSÉ : uniquement des signals ---
  // requireSync : le BehaviorSubject émet 'nature' de façon synchrone → Signal<Categorie> sans undefined.
  readonly categorie = toSignal(this.categorieSubject, { requireSync: true });
  // Source asynchrone (delay) → initialValue obligatoire pour éviter undefined.
  readonly activites = toSignal(this.activites$, { initialValue: [] });
  // computed dérivé — se recalcule à chaque changement de la liste.
  readonly nombre = computed(() => this.activites().length);

  // Seule porte pour changer l'état : la façade décide quand émettre.
  choisir(cat: Categorie) {
    this.categorieSubject.next(cat);
  }

  // Source async SIMULÉE. Module 18 : return this.http.get<Activite[]>(`/api/activites?cat=${cat}`);
  private charger(cat: Categorie) {
    return of(BASE.filter(a => a.categorie === cat)).pipe(delay(300));
  }
}
```

```typescript
// activites/planificateur.component.ts — corrigé
import { Component, inject } from '@angular/core';
import { ActivitesService, Categorie } from './activites.service';

@Component({
  selector: 'app-planificateur',
  standalone: true,
  template: `
    <h2>Activités ({{ svc.nombre() }})</h2>

    <div class="filtres">
      <!-- @for track sur la valeur elle-même (chaîne stable) -->
      @for (c of categories; track c) {
        <!-- [class.actif] : lit le signal categorie() — bouton actif mis en évidence -->
        <button
          [class.actif]="svc.categorie() === c"
          (click)="svc.choisir(c)">
          {{ c }}
        </button>
      }
    </div>

    <ul>
      <!-- svc.activites() est un signal alimenté par toSignal — pas de subscribe ici -->
      @for (a of svc.activites(); track a.id) {
        <li>{{ a.nom }}</li>
      } @empty {
        <li>Aucune activité dans cette catégorie.</li>
      }
    </ul>
  `,
  styles: [`
    .filtres { display: flex; gap: .5rem; margin-bottom: 1rem; }
    button { padding: .4rem .8rem; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; background: #fff; }
    button.actif { background: #1e293b; color: #fff; border-color: #1e293b; }
  `],
})
export class PlanificateurComponent {
  // Le composant ne connaît QUE des signals — toute la logique RxJS est dans le service.
  readonly svc = inject(ActivitesService);
  readonly categories: Categorie[] = ['nature', 'culture', 'sport'];
}
```

```typescript
// activites/recherche.component.ts — corrigé
import { Component, signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, retry, catchError, delay } from 'rxjs';
import { Activite } from './activites.service';

@Component({
  selector: 'app-recherche',
  standalone: true,
  template: `
    <input
      [value]="terme()"
      (input)="terme.set($any($event.target).value)"
      placeholder="Rechercher une activité (min. 2 car.)" />

    @if (erreur()) {
      <p class="erreur">Recherche indisponible, réessaie plus tard.</p>
    }

    <ul>
      @for (a of resultats(); track a.id) {
        <li>{{ a.nom }}</li>
      } @empty {
        <li>Aucun résultat.</li>
      }
    </ul>
  `,
  styles: [`.erreur { color: #b91c1c; }`],
})
export class RechercheComponent {
  // terme : état de saisie piloté par le template → un signal.
  readonly terme = signal('');
  readonly erreur = signal(false);

  // signal → Observable (toObservable) pour brancher les opérateurs temporels,
  // puis retour en signal (toSignal). Appelé en CHAMP de classe = contexte d'injection.
  readonly resultats = toSignal(
    toObservable(this.terme).pipe(
      debounceTime(300),           // attend 300 ms de silence de frappe
      distinctUntilChanged(),      // ignore une saisie identique consécutive
      filter(t => t.length >= 2),  // minimum 2 caractères avant de chercher
      switchMap(t =>               // annule la recherche précédente encore en vol
        this.rechercher(t).pipe(
          retry({ count: 2, delay: () => timer(500) }), // retry AVANT catchError
          catchError(() => {       // toutes les tentatives ont échoué
            this.erreur.set(true);
            return of([] as Activite[]); // secours : le flux continue, pas de crash
          }),
        ),
      ),
    ),
    { initialValue: [] as Activite[] },
  );

  // Source async SIMULÉE. Module 18 : this.http.get<Activite[]>(`/api/activites?q=${terme}`).
  private rechercher(terme: string) {
    this.erreur.set(false);
    return of([
      { id: 'r1', nom: `Résultat pour "${terme}"`, categorie: 'nature' as const },
    ]).pipe(delay(200));
  }
}
```

**Pourquoi ce corrigé est correct :**
- Le **service est une façade** : `BehaviorSubject` + opérateurs en interne, uniquement des **signals** exposés. Les composants n'ont aucun `subscribe` ni `unsubscribe` — `toSignal()` gère le désabonnement.
- `requireSync` sur `categorie` est légitime : un `BehaviorSubject` émet sa valeur **synchroniquement** à l'abonnement. Sur `activites$` (avec `delay`), on utilise `initialValue` — `requireSync` y planterait.
- `switchMap` garantit qu'un clic rapide (ou une frappe rapide) n'affiche **jamais** un résultat périmé.
- L'ordre `retry` **puis** `catchError` est respecté : on réessaie avant de basculer sur le secours.
- `terme` est un signal côté saisie, mais on passe par `toObservable` **parce que** `debounceTime`/`switchMap` n'existent pas sur les signals.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées** — reproduis le service et les deux composants **de mémoire, en 30 minutes**, avec ces modifications, **sans rouvrir ce corrigé ni le module 17** :

1. Ajoute au service un `computed` `estVide = computed(() => this.nombre() === 0)` et affiche un bandeau « Catégorie vide » dans le planificateur quand il est vrai.
2. Dans la recherche, ajoute un signal `chargement` passé à `true` juste avant l'appel et remis à `false` à la première émission (indice : un opérateur `tap` sur la source, ou `startWith`).
3. Cumule recherche **et** catégorie : la recherche ne cherche que dans la catégorie active (passe `svc.categorie()` à `rechercher`).

**Critère de réussite :** dans le navigateur, changer vite de catégorie n'affiche jamais une liste périmée, la recherche est débouncée, et forcer une erreur de source laisse l'app fonctionnelle (liste vide + message).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      activites/
        activites.service.ts        ← façade BehaviorSubject → signals
        planificateur.component.ts  ← consomme les signals
        recherche.component.ts      ← toObservable + error handling
```

**Différences par rapport au lab :**
- `charger()` et `rechercher()` deviendront de vrais `this.http.get(...)` au **module 18** — la structure du service (Subject, `switchMap`, `retry`, `catchError`, `toSignal`) ne bouge **pas**.
- L'interface `Activite` et le type `Categorie` seront importés depuis `src/app/activites/activites.types.ts` (partagés) — ici on les définit dans le service.
- Le style passera par le design system TribuZen (tokens CSS) plutôt que des `styles` inline.

**Commit cible :**
```
feat(activites): façade RxJS→signals — filtre BehaviorSubject, recherche débouncée, retry+catchError
```
