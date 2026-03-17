# Cours 25 — Gestion d'erreurs et tests RxJS

> **Objectif** : Maîtriser la gestion d'erreurs dans les chaînes RxJS (`catchError`, `retry`, strategies de recuperation), savoir tester des Observables avec le `TestScheduler` (marble testing) et `fakeAsync`/`tick`, et éviter les pieges classiques (fuites mémoire, Observables non desabonnes).

---

## Rappel du cours précédent

<details>
<summary>1. A quoi sert toSignal() et dans quel contexte doit-il etre appele ?</summary>

`toSignal()` convertit un Observable en Signal. Il doit etre appele dans un **contexte d'injection** (constructeur, champ de classe initialise avec `inject()`). Il se desabonne automatiquement quand le composant est detruit.
</details>

<details>
<summary>2. Quelle est la regle simple pour choisir entre Signals et RxJS ?</summary>

**Signal** quand la question est "quelle est la valeur actuelle ?" (etat UI synchrone). **RxJS** quand la question est "que se passe-t-il au fil du temps ?" (flux async, composition, debounce, retry).
</details>

<details>
<summary>3. Quel est le pattern recommande en ESN pour combiner Signals et RxJS ?</summary>

Le service utilise RxJS en interne pour la logique async (HttpClient, operateurs), mais expose des **Signals** aux composants via `toSignal()`. Cela simplifie les templates tout en gardant la puissance de RxJS en coulisses.
</details>

---

## Analogie

Imaginez un **service de livraison de colis** :

- **catchError** : le livreur constate que l'adresse est introuvable. Au lieu de jeter le colis, il le redirige vers un point relais (valeur de secours).
- **retry** : le livreur sonne a la porte, personne ne repond. Il revient 3 fois avant d'abandonner.
- **retry avec backoff** : a chaque tentative, il attend plus longtemps (5 min, 15 min, 1 h) pour augmenter ses chances.
- **Marble testing** : c'est la simulation sur papier du trajet du colis, etape par etape, pour verifier que la chaîne de livraison fonctionne sans envoyer de vrai colis.

---

## Theorie

### catchError : intercepter et recuperer

`catchError` intercepte une erreur dans le flux et la remplace par un Observable de secours. Sans lui, l'erreur **termine** le flux definitivement.

```typescript
import { of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ❌ Sans catchError : l'erreur remonte au subscribe et le flux meurt
this.http.get<Produit[]>('/api/produits').subscribe({
  next: (produits) => this.produits = produits,
  error: (err) => console.error('Flux termine !', err),
});

// ✅ Avec catchError : le flux continue avec une valeur de secours
this.http.get<Produit[]>('/api/produits').pipe(
  catchError(err => {
    console.error('Erreur interceptee :', err.message);
    return of([]); // Valeur de secours : tableau vide
  }),
).subscribe(produits => this.produits = produits);
```

**Points importants** :
- `catchError` doit retourner un **Observable** (pas une valeur brute)
- Il **remplace** le flux en erreur par le nouveau flux
- Apres `catchError`, le flux continue normalement (ou complete si le flux de secours complete)

```typescript
// catchError avec re-emission de l'erreur (pour la logguer puis propager)
this.http.get('/api/donnees').pipe(
  catchError(err => {
    this.logService.error('Requete echouee', err);
    return throwError(() => err); // Propage l'erreur au subscribe
  }),
).subscribe({
  next: (data) => this.data = data,
  error: (err) => this.afficherErreur(err),
});
```

### retry : reessayer automatiquement

`retry` resouscrit a l'Observable source un nombre donne de fois en cas d'erreur.

```typescript
import { retry, catchError } from 'rxjs/operators';
import { of, timer } from 'rxjs';

// Retry simple : 3 tentatives
this.http.get<Produit[]>('/api/produits').pipe(
  retry(3),
  catchError(() => of([])),
).subscribe(produits => this.produits = produits);
```

> **Ordre crucial** : `retry` doit etre **avant** `catchError` dans le pipe. Si `catchError` est avant, il remplace l'erreur par une valeur de secours et `retry` ne voit jamais l'erreur.

### retry avec backoff exponentiel

En production, un retry immediat surcharge le serveur. Le backoff exponentiel espace les tentatives :

```typescript
import { retry, catchError } from 'rxjs/operators';
import { timer, throwError, of } from 'rxjs';

this.http.get<Produit[]>('/api/produits').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      // Backoff exponentiel : 1s, 2s, 4s
      const delaiMs = Math.pow(2, retryCount - 1) * 1000;
      console.log(`Tentative ${retryCount}/${3}, retry dans ${delaiMs}ms`);
      return timer(delaiMs);
    },
  }),
  catchError(err => {
    console.error('Abandon apres 3 tentatives :', err);
    return of([]);
  }),
).subscribe(produits => this.produits = produits);
```

### retry selectif : ne reessayer que sur certaines erreurs

Il est inutile de reessayer une erreur 404 ou 403. On ne retente que les erreurs serveur (5xx) ou reseau :

```typescript
this.http.get('/api/donnees').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      // Erreur client (4xx) : inutile de reessayer
      if (error.status >= 400 && error.status < 500) {
        return throwError(() => error);
      }
      // Erreur serveur (5xx) ou reseau : retry avec backoff
      return timer(Math.pow(2, retryCount - 1) * 1000);
    },
  }),
  catchError(err => {
    this.notificationService.afficherErreur(
      err.status >= 400 && err.status < 500
        ? 'Requete invalide'
        : 'Serveur indisponible, reessayez plus tard'
    );
    return of(null);
  }),
).subscribe();
```

### Strategies de recuperation avancees

```typescript
// Strategie 1 : valeur par defaut depuis le cache local
this.http.get<Config>('/api/config').pipe(
  catchError(() => {
    console.warn('API indisponible, utilisation du cache');
    const cached = localStorage.getItem('config');
    return cached ? of(JSON.parse(cached) as Config) : of(CONFIG_PAR_DEFAUT);
  }),
).subscribe(config => this.appliquerConfig(config));

// Strategie 2 : URL de secours (fallback API)
this.http.get<Produit[]>('/api/v2/produits').pipe(
  catchError(() => {
    console.warn('API v2 echouee, fallback sur v1');
    return this.http.get<Produit[]>('/api/v1/produits');
  }),
  catchError(() => {
    console.error('Les deux APIs ont echoue');
    return of([]);
  }),
).subscribe(produits => this.produits = produits);

// Strategie 3 : notification utilisateur + valeur vide
this.http.get<Commande[]>('/api/commandes').pipe(
  retry({ count: 2, delay: () => timer(2000) }),
  catchError(err => {
    this.snackBar.open('Impossible de charger les commandes', 'Fermer', {
      duration: 5000,
    });
    return of([]);
  }),
).subscribe(commandes => this.commandes = commandes);
```

---

## Marble testing avec TestScheduler

Le **marble testing** permet de tester des chaînes RxJS de maniere **deterministe** en simulant le temps. On utilise le `TestScheduler` fourni par RxJS.

### Syntaxe des marble diagrams

```
Symboles :
  -    : 1 frame (passage du temps virtuel)
  a-z  : emission d'une valeur
  |    : complete
  #    : error
  ()   : emissions synchrones groupees
  ^    : point d'abonnement (pour les hot observables)

Exemples :
  '--a--b--c|'      → emet a, b, c puis complete
  '--a--b--#'       → emet a, b puis erreur
  '--(abc)--|'      → emet a, b, c en synchrone, puis complete
```

### Configuration du TestScheduler

```typescript
import { TestScheduler } from 'rxjs/testing';

describe('Operateurs RxJS', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      // Utiliser l'assertion de votre framework de test
      expect(actual).toEqual(expected);
    });
  });
});
```

### Tester un map simple

```typescript
it('devrait doubler les valeurs avec map', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const source$ = cold('  --a--b--c|', { a: 1, b: 2, c: 3 });
    const expected = '      --a--b--c|';
    const expectedValues = { a: 2, b: 4, c: 6 };

    const result$ = source$.pipe(map(x => x * 2));

    expectObservable(result$).toBe(expected, expectedValues);
  });
});
```

### Tester un filter

```typescript
it('devrait filtrer les nombres pairs', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const source$ = cold('  --a--b--c--d|', { a: 1, b: 2, c: 3, d: 4 });
    const expected = '      -----b-----d|';
    const expectedValues = { b: 2, d: 4 };

    const result$ = source$.pipe(filter(n => n % 2 === 0));

    expectObservable(result$).toBe(expected, expectedValues);
  });
});
```

### Tester un debounceTime

```typescript
it('devrait debouncer les emissions de 300ms', () => {
  scheduler.run(({ cold, expectObservable }) => {
    // 'ab' sont emis rapidement (synchrones), puis silence, puis 'c'
    const source$ = cold('  -a-b-------c---|');
    const expected = '      ----b-------c--|';
    //                       300ms apres 'b'  300ms apres 'c'

    const result$ = source$.pipe(debounceTime(3)); // 3 frames = 3ms en mode run()

    expectObservable(result$).toBe(expected);
  });
});
```

### Tester catchError

```typescript
it('devrait recuperer avec une valeur par defaut en cas d erreur', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const source$ = cold('  --a--#', { a: 1 }, new Error('Oops'));
    const expected = '      --a--(b|)';
    const expectedValues = { a: 1, b: 0 };

    const result$ = source$.pipe(
      catchError(() => of(0)),
    );

    expectObservable(result$).toBe(expected, expectedValues);
  });
});
```

### Tester switchMap

```typescript
it('devrait annuler l observable interne precedent avec switchMap', () => {
  scheduler.run(({ cold, hot, expectObservable }) => {
    const source$ = hot('   --a------b--|');
    const inner1$ = cold('    ---x---y|');
    const inner2$ = cold('            ---z|');
    const expected = '      -----x------z|';

    const result$ = source$.pipe(
      switchMap(val => val === 'a' ? inner1$ : inner2$)
    );

    expectObservable(result$).toBe(expected);
  });
});
```

---

## Tester des Observables dans Angular

### Tester un service avec HttpClient

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductService,
      ],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifie qu'il n'y a pas de requetes en attente
  });

  it('devrait retourner les produits', () => {
    const mockProduits = [
      { id: 1, nom: 'Clavier', prix: 49 },
      { id: 2, nom: 'Souris', prix: 29 },
    ];

    service.getProduits().subscribe(produits => {
      expect(produits.length).toBe(2);
      expect(produits[0].nom).toBe('Clavier');
    });

    const req = httpMock.expectOne('/api/produits');
    expect(req.request.method).toBe('GET');
    req.flush(mockProduits);
  });

  it('devrait gerer une erreur HTTP avec catchError', () => {
    service.getProduits().subscribe(produits => {
      // Le service retourne un tableau vide en cas d'erreur (catchError)
      expect(produits).toEqual([]);
    });

    const req = httpMock.expectOne('/api/produits');
    req.flush('Erreur serveur', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  });

  it('devrait reessayer 2 fois avant d abandonner', () => {
    service.getProduitsAvecRetry().subscribe(produits => {
      expect(produits).toEqual([]);
    });

    // Premiere tentative : erreur
    httpMock.expectOne('/api/produits').flush('Erreur', { status: 500, statusText: 'Error' });
    // Deuxieme tentative : erreur
    httpMock.expectOne('/api/produits').flush('Erreur', { status: 500, statusText: 'Error' });
    // Troisieme tentative : erreur → catchError retourne []
    httpMock.expectOne('/api/produits').flush('Erreur', { status: 500, statusText: 'Error' });
  });
});
```

### Tester avec fakeAsync et tick

`fakeAsync` et `tick` permettent de simuler le passage du temps dans les tests Angular. C'est ideal pour tester des Observables avec des delais (`debounceTime`, `delay`, `interval`).

```typescript
import { fakeAsync, tick } from '@angular/core/testing';

describe('SearchComponent', () => {
  it('devrait debouncer la recherche de 300ms', fakeAsync(() => {
    const searchService = TestBed.inject(SearchService);
    const spy = spyOn(searchService, 'search').and.returnValue(of([]));

    // Simuler une saisie
    component.searchCtrl.setValue('Ang');

    // Pas encore 300ms : la recherche ne doit PAS etre lancee
    tick(200);
    expect(spy).not.toHaveBeenCalled();

    // 300ms atteints : la recherche doit etre lancee
    tick(100);
    expect(spy).toHaveBeenCalledWith('Ang');
  }));

  it('devrait ignorer les valeurs identiques consecutives', fakeAsync(() => {
    const searchService = TestBed.inject(SearchService);
    const spy = spyOn(searchService, 'search').and.returnValue(of([]));

    component.searchCtrl.setValue('Angular');
    tick(300);

    component.searchCtrl.setValue('Angular'); // Meme valeur
    tick(300);

    // distinctUntilChanged : un seul appel
    expect(spy).toHaveBeenCalledTimes(1);
  }));

  it('devrait annuler la requete precedente avec switchMap', fakeAsync(() => {
    const searchService = TestBed.inject(SearchService);
    let callCount = 0;

    spyOn(searchService, 'search').and.callFake((terme: string) => {
      callCount++;
      // Simuler une requete lente pour le premier terme
      return terme === 'Rea'
        ? of([{ id: 1, nom: 'React' }]).pipe(delay(1000))
        : of([{ id: 2, nom: 'Angular' }]).pipe(delay(100));
    });

    component.searchCtrl.setValue('Rea');
    tick(300); // debounce

    component.searchCtrl.setValue('Ang');
    tick(300); // debounce

    tick(1000); // Laisser tout se resoudre

    // switchMap a annule la premiere requete
    expect(component.resultats.length).toBe(1);
    expect(component.resultats[0].nom).toBe('Angular');
  }));
});
```

### flush() vs tick()

```typescript
// tick(ms) : avance le temps de N millisecondes
tick(300); // Avance de 300ms exactement

// flush() : execute toutes les taches async en attente
flush(); // Equivalent a "avancer jusqu'a ce que tout soit termine"

// discardPeriodicTasks() : arrete les taches periodiques (interval)
// Necessaire si un interval n'est pas unsubscribe dans le test
discardPeriodicTasks();
```

---

## Pieges classiques et fuites memoire

### Piege 1 : Oublier de se desabonner

```typescript
// ❌ Fuite memoire : interval continue apres la destruction du composant
@Component({ selector: 'app-timer', template: `{{ count }}` })
export class TimerComponent implements OnInit {
  count = 0;

  ngOnInit() {
    interval(1000).subscribe(n => this.count = n);
    // Le subscribe vit pour toujours !
  }
}

// ✅ Avec takeUntilDestroyed
@Component({ selector: 'app-timer', template: `{{ count }}` })
export class TimerComponent {
  count = 0;

  constructor() {
    interval(1000).pipe(
      takeUntilDestroyed(),
    ).subscribe(n => this.count = n);
  }
}
```

### Piege 2 : subscribe dans un subscribe

```typescript
// ❌ Callback hell RxJS : subscribe imbrique
this.http.get<User>('/api/user').subscribe(user => {
  this.http.get<Commande[]>(`/api/users/${user.id}/commandes`).subscribe(commandes => {
    this.http.get<Adresse[]>(`/api/users/${user.id}/adresses`).subscribe(adresses => {
      // Triple imbrication : illisible, pas de gestion d'erreur globale
    });
  });
});

// ✅ Avec concatMap / switchMap : chaîne plate et lisible
this.http.get<User>('/api/user').pipe(
  switchMap(user => forkJoin({
    commandes: this.http.get<Commande[]>(`/api/users/${user.id}/commandes`),
    adresses: this.http.get<Adresse[]>(`/api/users/${user.id}/adresses`),
  })),
  catchError(err => {
    console.error('Erreur chaîne complete :', err);
    return of({ commandes: [], adresses: [] });
  }),
).subscribe(({ commandes, adresses }) => {
  this.commandes = commandes;
  this.adresses = adresses;
});
```

### Piege 3 : catchError mal place

```typescript
// ❌ catchError AVANT retry : retry ne voit jamais l'erreur
this.http.get('/api/donnees').pipe(
  catchError(() => of([])),  // L'erreur est interceptee ici
  retry(3),                   // retry ne s'execute jamais
).subscribe();

// ✅ retry AVANT catchError
this.http.get('/api/donnees').pipe(
  retry(3),                   // Reessaie 3 fois
  catchError(() => of([])),  // Si tout a echoue, valeur de secours
).subscribe();
```

### Piege 4 : Observable froid cree mais jamais subscribe

```typescript
// ❌ Cet Observable ne fait RIEN (pas de subscribe)
this.http.post('/api/commandes', { produit: 'Clavier' }).pipe(
  catchError(() => of(null)),
);
// La requete HTTP n'est jamais envoyee !

// ✅ Il faut subscribe (ou utiliser toSignal, async pipe, etc.)
this.http.post('/api/commandes', { produit: 'Clavier' }).pipe(
  catchError(() => of(null)),
).subscribe(result => {
  if (result) this.notifier('Commande creee !');
});
```

### Piege 5 : Multicasting involontaire

```typescript
// ❌ Chaque subscribe cree une NOUVELLE requete HTTP
const produits$ = this.http.get<Produit[]>('/api/produits');

produits$.subscribe(p => this.listeProduits = p);   // Requete 1
produits$.subscribe(p => this.compteur = p.length);  // Requete 2 (doublon !)

// ✅ Utiliser shareReplay pour partager le resultat
import { shareReplay } from 'rxjs/operators';

const produits$ = this.http.get<Produit[]>('/api/produits').pipe(
  shareReplay({ bufferSize: 1, refCount: true }),
);

produits$.subscribe(p => this.listeProduits = p);   // Requete unique
produits$.subscribe(p => this.compteur = p.length);  // Reçoit le meme resultat
```

### Checklist anti-fuites memoire

| Verification | Solution |
|-------------|----------|
| Observable infini (interval, fromEvent) | `takeUntilDestroyed()` ou `unsubscribe()` dans `ngOnDestroy` |
| Subscribe dans un subscribe | Utiliser `switchMap`, `concatMap`, `mergeMap` |
| Observable HTTP non subscribe | Ajouter `.subscribe()` ou utiliser `toSignal()` |
| Multiple subscribes sur meme Observable | `shareReplay({ bufferSize: 1, refCount: true })` |
| Pas de gestion d'erreur | `catchError` dans le pipe, pas seulement dans subscribe |
| Tests : interval non arrete | `discardPeriodicTasks()` dans les tests `fakeAsync` |

---

## Pratique

Creez un service `DataService` qui :
1. Effectue un `GET /api/donnees` avec `retry` (3 tentatives, backoff exponentiel)
2. En cas d'echec total, retourne une valeur par defaut depuis le `localStorage`
3. Ecrivez un test marble qui verifie le comportement de `catchError`
4. Ecrivez un test `fakeAsync` qui verifie que le `debounceTime` fonctionne correctement

<details>
<summary>Solution</summary>

```typescript
// data.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { retry, catchError, tap } from 'rxjs/operators';

export interface Donnee {
  id: number;
  valeur: string;
}

const DONNEES_PAR_DEFAUT: Donnee[] = [
  { id: 0, valeur: 'Donnee hors-ligne' },
];

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  getDonnees(): Observable<Donnee[]> {
    return this.http.get<Donnee[]>('/api/donnees').pipe(
      tap(donnees => {
        // Sauvegarder en cache pour le mode hors-ligne
        localStorage.setItem('donnees_cache', JSON.stringify(donnees));
      }),
      retry({
        count: 3,
        delay: (_error, retryCount) =>
          timer(Math.pow(2, retryCount - 1) * 1000),
      }),
      catchError(() => {
        const cache = localStorage.getItem('donnees_cache');
        return cache
          ? of(JSON.parse(cache) as Donnee[])
          : of(DONNEES_PAR_DEFAUT);
      }),
    );
  }
}
```

```typescript
// data.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestScheduler } from 'rxjs/testing';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;
  let scheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DataService,
      ],
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);

    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    localStorage.clear();
  });

  afterEach(() => httpMock.verify());

  it('devrait retourner les donnees du serveur', () => {
    const mockData = [{ id: 1, valeur: 'Test' }];

    service.getDonnees().subscribe(data => {
      expect(data).toEqual(mockData);
    });

    httpMock.expectOne('/api/donnees').flush(mockData);
  });

  it('devrait retourner les donnees du cache en cas d erreur', () => {
    localStorage.setItem('donnees_cache', JSON.stringify([{ id: 99, valeur: 'Cache' }]));

    service.getDonnees().subscribe(data => {
      expect(data[0].valeur).toBe('Cache');
    });

    // Echouer toutes les tentatives (1 initiale + 3 retries)
    for (let i = 0; i < 4; i++) {
      httpMock.expectOne('/api/donnees').flush('Erreur', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  });

  // Test marble : catchError remplace l'erreur par une valeur
  it('[marble] devrait recuperer avec catchError', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--#', { a: 'OK' }, new Error('Oops'));
      const expected = '    --a--(b|)';

      const result$ = source$.pipe(
        catchError(() => of('fallback')),
      );

      expectObservable(result$).toBe(expected, { a: 'OK', b: 'fallback' });
    });
  });
});
```

```typescript
// search.component.spec.ts — test fakeAsync
import { fakeAsync, tick, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchComponent } from './search.component';
import { SearchService } from './search.service';

describe('SearchComponent debounce', () => {
  it('devrait attendre 300ms avant de lancer la recherche', fakeAsync(() => {
    const searchService = TestBed.inject(SearchService);
    const spy = spyOn(searchService, 'search').and.returnValue(of([]));

    component.searchCtrl.setValue('Angular');

    tick(200); // Seulement 200ms
    expect(spy).not.toHaveBeenCalled();

    tick(100); // 300ms atteints
    expect(spy).toHaveBeenCalledWith('Angular');
  }));
});
```

</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `catchError` | Intercepte l'erreur, retourne un Observable de secours |
| `retry(n)` | Resouscrit n fois a la source en cas d'erreur |
| `retry({ count, delay })` | Retry avec backoff exponentiel |
| Ordre dans le pipe | `retry` **avant** `catchError`, toujours |
| Retry selectif | Ne reessayer que sur les 5xx, pas les 4xx |
| `TestScheduler` | Simule le temps pour tester les chaînes RxJS de maniere deterministe |
| Marble syntax | `--a--b|` (emissions), `#` (erreur), `()` (synchrone) |
| `fakeAsync` + `tick` | Simule le temps dans les tests Angular |
| `flush()` | Execute toutes les taches async en attente |
| Fuite memoire | Toujours `takeUntilDestroyed()` sur les Observables infinis |
| Subscribe imbrique | Remplacer par `switchMap` / `concatMap` |
| `shareReplay` | Partager un Observable entre plusieurs souscripteurs |

---

> **Prochain cours** : [Cours 26 — HttpClient et CRUD](../06-http-api/01-httpclient-crud.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommande
1. **Exercice** : [13-recherche-rxjs](../../exercices/13-recherche-rxjs/ENONCE) — mettre en pratique le debounce + error handling
2. **Renforcement** : [13b-rxjs-vs-signals](../../exercices/13b-rxjs-vs-signals/ENONCE) — comparer les approches RxJS et Signals
3. **Approfondissement** : [20-tests-complets](../../exercices/20-tests-complets/ENONCE) — ecrire des tests avec marble testing et fakeAsync
:::
