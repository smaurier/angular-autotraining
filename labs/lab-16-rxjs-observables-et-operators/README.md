# Lab 16 — RxJS : barre de recherche debounced

> **Outcome :** à la fin, tu sais transformer un flux de saisie en résultats avec `fromEvent` + `pipe()` + `map` / `filter` / `debounceTime` / `switchMap`, et couper proprement l'abonnement dans `ngOnDestroy`.
> **Vrai outil :** Angular CLI (`ng new` / `ng serve`) + RxJS 7 — dev server visible en direct dans le navigateur.
> **Feedback :** le coach valide visuellement en session (network tab + comportement) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `RechercheFamillesComponent`, la barre de recherche du front-office TribuZen. Cahier des charges **exact** :

1. Un `<input type="search">` : l'utilisateur tape le nom d'une famille.
2. On **ignore** les recherches de moins de 2 caractères (après `trim`).
3. On **attend 300 ms** de pause avant de lancer la recherche (pas une par frappe).
4. Une nouvelle frappe **annule** la recherche précédente (jamais de résultat périmé).
5. Les résultats s'affichent dans une `<ul>` via `@for` (control flow, module 03).
6. L'abonnement est **coupé** dans `ngOnDestroy` (le flux `fromEvent` est infini).

La recherche est **simulée** par un Observable local (le vrai `HttpClient` est le module 18). Reste **strictement** dans RxJS : pas de `Subject`, pas de `toSignal`, pas de `HttpClient`.

**Données de la recherche simulée (à copier) :**

```ts
interface Famille { id: string; nom: string; }

const CATALOGUE: Famille[] = [
  { id: 'f1', nom: 'Martin' },
  { id: 'f2', nom: 'Martinez' },
  { id: 'f3', nom: 'Durand' },
  { id: 'f4', nom: 'Dubois' },
  { id: 'f5', nom: 'Bernard' },
];
```

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal.

### Mise en place (vrai outil)

```bash
# Si tu n'as pas déjà un projet de lab :
ng new tribuzen-labs --standalone --style=css --routing=false
cd tribuzen-labs
ng generate component familles/recherche-familles --standalone
ng serve
```

### Starter minimal

```ts
// recherche-familles.component.ts — starter
import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild,
} from '@angular/core';
import { fromEvent, of, Subscription, Observable } from 'rxjs';
import { map, filter, debounceTime, switchMap, delay } from 'rxjs';

interface Famille { id: string; nom: string; }

@Component({
  selector: 'app-recherche-familles',
  standalone: true,
  template: `
    <input #champ type="search" placeholder="Rechercher une famille…" />
    <!-- À construire : liste @for des resultats -->
  `,
})
export class RechercheFamillesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('champ') champ!: ElementRef<HTMLInputElement>;
  resultats: Famille[] = [];
  private sub?: Subscription;

  ngAfterViewInit() {
    // À toi : fromEvent(...).pipe(map, filter, debounceTime, switchMap).subscribe(...)
  }

  ngOnDestroy() {
    // À toi : couper l'abonnement
  }

  private rechercher(terme: string): Observable<Famille[]> {
    // À toi : filtrer CATALOGUE et renvoyer of(...).pipe(delay(200))
    return of([]);
  }
}
```

Branche `RechercheFamillesComponent` dans `App` (ou `app.component.ts`) et lance `ng serve` pour voir le résultat en direct.

---

## Étapes (en friction)

1. **Écris `rechercher(terme)`** — filtre `CATALOGUE` sur `nom.toLowerCase().includes(terme.toLowerCase())`, renvoie `of(filtrees).pipe(delay(200))` pour simuler la latence réseau.
2. **Construis le pipeline dans `ngAfterViewInit`** — `fromEvent<InputEvent>(this.champ.nativeElement, 'input')` puis, dans l'ordre : `map` (extraire `.value.trim()`), `filter` (`length >= 2`), `debounceTime(300)`, `switchMap(terme => this.rechercher(terme))`.
3. **Abonne-toi** — dans le `subscribe`, affecte `this.resultats`. Stocke la `Subscription` dans `this.sub`.
4. **Écris le template `@for`** — boucle sur `resultats`, `track f.id`, affiche `f.nom`.
5. **Coupe l'abonnement** — `this.sub?.unsubscribe()` dans `ngOnDestroy`.
6. **Vérifie l'ordre des opérateurs** : `debounceTime` AVANT `switchMap` (on débounce d'abord, on cherche ensuite). Inverse-les et observe : sans debounce en amont, chaque frappe déclenche un `rechercher`.
7. **Prouve l'annulation** : dans `rechercher`, passe `delay(1500)` et tape vite « Martinez ». Vérifie dans la console (ajoute un `console.log` temporaire dans `rechercher`) qu'une seule recherche « gagne » et que l'affichage n'est jamais périmé.

---

## Corrigé complet commenté

```ts
// recherche-familles.component.ts — corrigé
import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild,
} from '@angular/core';
import { fromEvent, of, Subscription, Observable } from 'rxjs';
import { map, filter, debounceTime, switchMap, delay } from 'rxjs';

interface Famille { id: string; nom: string; }

// Catalogue simulé — au module 18, ces données viendront de l'API via HttpClient
const CATALOGUE: Famille[] = [
  { id: 'f1', nom: 'Martin' },
  { id: 'f2', nom: 'Martinez' },
  { id: 'f3', nom: 'Durand' },
  { id: 'f4', nom: 'Dubois' },
  { id: 'f5', nom: 'Bernard' },
];

@Component({
  selector: 'app-recherche-familles',
  standalone: true,
  template: `
    <input #champ type="search" placeholder="Rechercher une famille…" />

    <!-- @for = control flow module 03 ; track sur l'id métier stable -->
    <ul>
      @for (f of resultats; track f.id) {
        <li>{{ f.nom }}</li>
      } @empty {
        <li class="vide">Aucune famille</li>
      }
    </ul>
  `,
})
export class RechercheFamillesComponent implements AfterViewInit, OnDestroy {
  // #champ dans le template -> référence à l'élément <input> natif
  @ViewChild('champ') champ!: ElementRef<HTMLInputElement>;

  resultats: Famille[] = [];
  private sub?: Subscription;

  // ngAfterViewInit : @ViewChild n'est disponible qu'APRÈS le rendu de la vue.
  // (Dans ngOnInit, this.champ serait undefined.)
  ngAfterViewInit() {
    this.sub = fromEvent<InputEvent>(this.champ.nativeElement, 'input').pipe(
      // 1. map : extraire la valeur saisie et la nettoyer
      map(e => (e.target as HTMLInputElement).value.trim()),
      // 2. filter : ignorer les recherches trop courtes (< 2 caractères)
      filter(terme => terme.length >= 2),
      // 3. debounceTime : n'émettre que 300 ms APRÈS la dernière frappe
      debounceTime(300),
      // 4. switchMap : lancer la recherche et ANNULER la précédente si une
      //    nouvelle frappe arrive -> jamais de résultat périmé
      switchMap(terme => this.rechercher(terme)),
    ).subscribe(familles => (this.resultats = familles));
  }

  // fromEvent est un flux INFINI : sans unsubscribe, il survit à la destruction
  // du composant -> fuite mémoire.
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // Recherche simulée. delay(200) imite la latence réseau.
  // Au module 18 : return this.http.get<Famille[]>(`/api/familles?q=${terme}`);
  private rechercher(terme: string): Observable<Famille[]> {
    const filtrees = CATALOGUE.filter(f =>
      f.nom.toLowerCase().includes(terme.toLowerCase()),
    );
    return of(filtrees).pipe(delay(200));
  }
}
```

**Pourquoi ce corrigé est correct :**
- **Ordre des opérateurs** : `map` → `filter` → `debounceTime` → `switchMap`. On nettoie, on écarte le bruit, on attend la pause, puis seulement on lance l'appel. Placer `debounceTime` après `switchMap` ne servirait à rien (l'appel serait déjà parti).
- **`switchMap` (pas `mergeMap`)** : en recherche, seule la **dernière** frappe compte. `switchMap` désabonne l'inner précédent, ce qui règle la race condition. `mergeMap` laisserait toutes les requêtes vivre et pourrait afficher un résultat périmé.
- **`ngAfterViewInit` + `unsubscribe`** : la référence `@ViewChild` n'existe qu'après le rendu ; et `fromEvent` étant infini, on **doit** couper dans `ngOnDestroy`.
- **Pas de `subscribe` imbriqué** : toute la logique async est dans le `pipe`, un seul `subscribe` en sortie.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis le composant **de mémoire, en 25 minutes**, avec :

1. Ajoute un indicateur **« Recherche en cours… »** : passe `chargement = true` juste avant l'appel (via `tap` dans le pipe, avant `switchMap`) et `false` dans le `subscribe`. Affiche-le avec `@if (chargement)`.
2. Remplace la simulation par un `mergeMap` **puis** reviens à `switchMap`, et **explique à voix haute au coach** ce que tu observes en tapant vite (résultats périmés vs annulation propre).
3. **Sans rouvrir ce corrigé** ni le module 16.

**Critère de réussite :** la recherche est debouncée, aucune requête périmée n'écrase un résultat récent, et l'abonnement est coupé (vérifie qu'aucun log ne subsiste après avoir retiré le composant du DOM).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le composant vit ici :

```
tribuzen/
  src/
    app/
      familles/
        recherche-familles.component.ts
```

**Différences par rapport au lab :**

- `rechercher()` appellera le vrai back-office via `HttpClient` (`this.http.get<Famille[]>(...)`) — **module 18**. Le pipeline (`map`/`filter`/`debounceTime`/`switchMap`) reste **identique**, seul l'inner Observable change de source.
- Le désabonnement manuel (`Subscription` + `ngOnDestroy`) sera remplacé par `takeUntilDestroyed()` — **module 17** — et les `resultats` deviendront un `signal` alimenté par `toSignal()`.
- La saisie passera probablement par un **Reactive Form** (`valueChanges` est déjà un Observable) plutôt que `fromEvent` — **module 19**.

**Commit cible :**
```
feat(familles): recherche debounced — fromEvent + debounceTime + switchMap
```
