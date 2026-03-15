# Cours 22 — Operateurs RxJS courants

> **Objectif** : Maîtriser les operateurs RxJS les plus utilises en entreprise : transformation, filtrage, combinaison, utilitaires et gestion d'erreurs. Savoir choisir le bon operateur selon le contexte grâce à un arbre de decision.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre un Observable lazy et une Promise eager ?</summary>

Une Promise s'exécuté **immediatement** a sa création. Un Observable ne fait rien tant que personne n'appelle `subscribe()`. C'est le subscribe qui declenche l'exécution.
</details>

<details>
<summary>2. Quelle est la différence entre Subject et BehaviorSubject ?</summary>

Un `Subject` n'a pas de valeur initiale : un nouvel abonne ne recoit rien tant qu'une nouvelle emission n'a pas lieu. Un `BehaviorSubject` garde toujours la dernière valeur et la renvoie immediatement a tout nouvel abonne.
</details>

<details>
<summary>3. Pourquoi faut-il toujours se desabonner d'un Observable dans un composant ?</summary>

Si l'Observable emet indefiniment (ex : `interval`, `fromEvent`), le subscribe continue après la destruction du composant, causant une **fuite mémoire**. Il faut appeler `unsubscribe()` dans `ngOnDestroy` ou utiliser `takeUntilDestroyed()`.
</details>

---

## Analogie

Imaginez une **chaine de montage dans une usine** :

- La **matiere première** arrive sur un tapis roulant (l'Observable source)
- Chaque **poste de travail** modifie ou filtre la piece (un operateur)
- A la fin de la chaine, le **produit fini** est livre (le subscribe)

Les operateurs RxJS sont ces postes de travail. Vous les enchainez dans un `pipe()` pour construire votre chaine de transformation.

---

## Théorie

### Operateurs de transformation

#### `map` — transformer chaque valeur

```typescript
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

of(1, 2, 3).pipe(
  map(n => n * 10)
).subscribe(v => console.log(v));
// 10, 20, 30
```

> **Parallele Vue** : c'est l'équivalent de `.map()` sur un tableau, mais sur un flux.

#### Les operateurs *Map : switchMap, mergeMap, concatMap, exhaustMap

Ces quatre operateurs transforment chaque valeur source en un **nouvel Observable** (inner Observable) et gerent la souscription interne differemment.

```typescript
import { fromEvent } from 'rxjs';
import { switchMap, mergeMap, concatMap, exhaustMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

// switchMap : annule le precedent, garde le dernier
// → Ideal pour la RECHERCHE (chaque frappe annule la requete precedente)
input$.pipe(
  switchMap(terme => this.http.get(`/api/search?q=${terme}`))
);

// mergeMap : execute tout en parallele, pas d'annulation
// → Ideal pour des actions INDEPENDANTES (like, log, analytics)
clics$.pipe(
  mergeMap(event => this.http.post('/api/like', { id: event.id }))
);

// concatMap : execute en SERIE, attend la fin du precedent
// → Ideal pour un ORDRE garanti (upload de fichiers un par un)
fichiers$.pipe(
  concatMap(fichier => this.http.post('/api/upload', fichier))
);

// exhaustMap : IGNORE les nouvelles emissions tant que la precedente tourne
// → Ideal pour un BOUTON SUBMIT (empeche le double-clic)
submit$.pipe(
  exhaustMap(() => this.http.post('/api/commander', this.form))
);
```

**Arbre de decision :**

```
Dois-je lancer un Observable interne pour chaque emission ?
│
├── Oui → Les precedentes sont-elles encore pertinentes ?
│   │
│   ├── Non → switchMap (annule les anciennes)
│   │         Ex: recherche, autocomplete
│   │
│   └── Oui → L'ordre est-il important ?
│       │
│       ├── Oui → concatMap (file d'attente)
│       │         Ex: upload sequentiel, transactions
│       │
│       └── Non → mergeMap (tout en parallele)
│                 Ex: likes, logs, evenements independants
│
└── Je veux ignorer les emissions pendant le traitement ?
    └── exhaustMap (ignore si occupe)
              Ex: soumission de formulaire, login
```

### Operateurs de filtrage

```typescript
import { of, interval } from 'rxjs';
import { filter, take, takeUntil, first, distinctUntilChanged } from 'rxjs/operators';

// filter : garde les valeurs qui passent le predicat
of(1, 2, 3, 4, 5).pipe(
  filter(n => n > 3)
).subscribe(v => console.log(v)); // 4, 5

// take : prend les N premieres emissions puis complete
interval(1000).pipe(
  take(3)
).subscribe(v => console.log(v)); // 0, 1, 2 puis complete

// first : prend la premiere emission (avec predicat optionnel)
of(10, 20, 30).pipe(
  first(v => v > 15)
).subscribe(v => console.log(v)); // 20

// distinctUntilChanged : ignore les doublons consecutifs
of(1, 1, 2, 2, 3, 1).pipe(
  distinctUntilChanged()
).subscribe(v => console.log(v)); // 1, 2, 3, 1
```

#### `takeUntil` — desabonnement propre

```typescript
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ❌ Mauvais : gerer manuellement chaque subscription
private sub1: Subscription;
private sub2: Subscription;

ngOnDestroy() {
  this.sub1.unsubscribe();
  this.sub2.unsubscribe(); // Facile d'en oublier un
}

// ✅ Bon : un seul Subject qui coupe tout
private destroy$ = new Subject<void>();

ngOnInit() {
  interval(1000).pipe(
    takeUntil(this.destroy$)
  ).subscribe(v => this.compteur = v);

  this.service.data$.pipe(
    takeUntil(this.destroy$)
  ).subscribe(d => this.data = d);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete(); // Coupe toutes les souscriptions d'un coup
}
```

### Operateurs de combinaison

```typescript
import { combineLatest, forkJoin, merge, concat, of, timer } from 'rxjs';

// combineLatest : emet quand CHAQUE source a emis au moins une fois,
// puis a chaque nouvelle emission de n'importe quelle source
combineLatest([
  this.route.params,           // { id: '42' }
  this.route.queryParams,      // { page: '1' }
]).subscribe(([params, query]) => {
  console.log(params.id, query.page);
});

// forkJoin : attend que TOUTES les sources completent, emet les dernieres valeurs
// → Ideal pour des requetes paralleles
forkJoin({
  users: this.http.get<User[]>('/api/users'),
  roles: this.http.get<Role[]>('/api/roles'),
}).subscribe(({ users, roles }) => {
  console.log(users, roles); // Arrive en une fois quand tout est charge
});

// merge : fusionne les emissions en un seul flux (pas d'attente)
merge(
  fromEvent(btnA, 'click').pipe(map(() => 'A')),
  fromEvent(btnB, 'click').pipe(map(() => 'B')),
).subscribe(lettre => console.log(lettre)); // 'A' ou 'B' au clic

// concat : execute en serie, attend la completion de chaque source
concat(
  of('Premier'),
  timer(1000).pipe(map(() => 'Deuxieme')),
  of('Troisieme'),
).subscribe(v => console.log(v));
// 'Premier' → (1s) → 'Deuxieme' → 'Troisieme'
```

| Operateur | Attend tout ? | Ordre | Cas d'usage |
|-----------|--------------|-------|-------------|
| `combineLatest` | Au moins 1 emission chacun | Simultanee | Filtres multiples, paramètres route |
| `forkJoin` | Tout doit completer | Parallele | Requetes HTTP paralleles |
| `merge` | Non | Entrelace | Fusionner des événements |
| `concat` | Oui, sequentiel | Serie | Enchainer des actions |

### Operateurs utilitaires

```typescript
import { of } from 'rxjs';
import { tap, delay, finalize } from 'rxjs/operators';

this.http.get('/api/users').pipe(
  tap(users => console.log('Debug :', users)),    // Effet de bord sans modifier le flux
  delay(500),                                       // Ajoute un delai artificiel
  finalize(() => this.loading = false),             // Execute a la fin (complete OU error)
).subscribe(users => this.users = users);
```

> **`tap`** est votre meilleur ami pour le debug. Il permet d'inspecter le flux sans le modifier.

### Gestion d'erreurs

```typescript
import { of, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

// catchError : intercepte l'erreur et retourne un Observable de remplacement
this.http.get<User[]>('/api/users').pipe(
  catchError(err => {
    console.error('Erreur API :', err);
    return of([]); // ✅ Retourne un tableau vide par defaut
  }),
).subscribe(users => this.users = users);

// retry : reessaie N fois avant de propager l'erreur
this.http.get('/api/fragile').pipe(
  retry(3),                          // 3 tentatives supplementaires
  catchError(err => {
    console.error('Echec apres 4 tentatives');
    return of(null);
  }),
).subscribe();

// ❌ Mauvais : catchError AVANT retry
this.http.get('/api/data').pipe(
  catchError(err => of(null)),  // ← L'erreur est deja attrapee...
  retry(3),                     // ← ...retry ne verra jamais l'erreur !
);

// ✅ Bon : retry AVANT catchError
this.http.get('/api/data').pipe(
  retry(3),                     // Reessaie d'abord
  catchError(err => of(null)),  // Attrape si tout a echoue
);
```

### Résumé des operateurs par categorie

| Categorie | Operateurs | Usage principal |
|-----------|-----------|-----------------|
| Transformation | `map`, `switchMap`, `mergeMap`, `concatMap`, `exhaustMap` | Modifier ou projeter des valeurs |
| Filtrage | `filter`, `take`, `takeUntil`, `first`, `distinctUntilChanged` | Reduire le flux |
| Combinaison | `combineLatest`, `forkJoin`, `merge`, `concat` | Assembler plusieurs sources |
| Utilitaire | `tap`, `delay`, `finalize` | Debug, timing, nettoyage |
| Erreur | `catchError`, `retry` | Résilience |

---

## Pratique

Creez un service `ProductService` qui :
1. Charge une liste de produits via HTTP
2. Transforme chaque produit pour ajouter un champ `prixTTC` (prix * 1.2)
3. Gere les erreurs en retournant un tableau vide
4. Log le résultat avec `tap` pour le debug

<details>
<summary>Solution</summary>

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

interface Produit {
  id: number;
  nom: string;
  prix: number;
}

interface ProduitTTC extends Produit {
  prixTTC: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  getProduits(): Observable<ProduitTTC[]> {
    return this.http.get<Produit[]>('/api/produits').pipe(
      map(produits => produits.map(p => ({
        ...p,
        prixTTC: Math.round(p.prix * 1.2 * 100) / 100,
      }))),
      tap(produits => console.log(`${produits.length} produits charges`)),
      catchError(err => {
        console.error('Erreur chargement produits :', err);
        return of([]);
      }),
    );
  }
}
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| `switchMap` | Annule le précédent — **recherche, autocomplete** |
| `mergeMap` | Tout en parallele — **actions independantes** |
| `concatMap` | En serie, ordre garanti — **uploads, transactions** |
| `exhaustMap` | Ignore si occupe — **soumission formulaire** |
| `combineLatest` | Emet quand toutes les sources ont emis |
| `forkJoin` | Attend la completion de tout — **requêtes paralleles** |
| `catchError` | Intercepte et remplace par un Observable de secours |
| `retry` | Reessaie avant `catchError` |
| `tap` | Debug sans modifier le flux |
| Ordre des operateurs | `retry` **avant** `catchError` dans le `pipe()` |

---

> **Prochain cours** : [Cours 23 — Patterns async avec RxJS](./03-patterns-async.md)
