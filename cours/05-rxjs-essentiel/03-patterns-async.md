# Cours 23 — Patterns async avec RxJS

> **Objectif** : Maîtriser les patterns RxJS les plus frequents en entreprise : recherche avec debounce, polling, prevention des race conditions, requêtes paralleles et sequentielles, et récupération d'erreurs avancee.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre switchMap et concatMap ?</summary>

`switchMap` **annule** l'Observable interne précédent à chaque nouvelle emission (ideal pour la recherche). `concatMap` **attend** la completion de l'Observable interne avant de traiter l'emission suivante (ideal pour les operations qui doivent respecter un ordre).
</details>

<details>
<summary>2. Quand utiliser forkJoin vs combineLatest ?</summary>

`forkJoin` attend que **toutes** les sources completent et emet les dernières valeurs une seule fois (ideal pour des requêtes HTTP paralleles). `combineLatest` emet a **chaque** nouvelle emission d'une source des que toutes ont emis au moins une fois (ideal pour des flux continus comme des paramètres de route).
</details>

<details>
<summary>3. Pourquoi faut-il placer retry() avant catchError() dans le pipe ?</summary>

Si `catchError` est avant `retry`, l'erreur est déjà interceptee et remplacee par un Observable de secours : `retry` ne voit jamais l'erreur et ne peut pas reessayer. L'ordre dans le `pipe()` est **de haut en bas**.
</details>

---

## Analogie

Imaginez un **assistant personnel** qui géré vos recherches sur internet :

- **Sans debounce** : vous dictez lettre par lettre, et il lance une recherche Google à chaque lettre. Chaos total.
- **Avec debounce** : il attend que vous ayez fini de parler (300ms de silence), puis lance **une seule** recherche avec le terme complet.
- **Avec switchMap** : si vous changez d'avis pendant qu'il cherche, il **abandonne** la recherche en cours et en lance une nouvelle.

C'est exactement ce que font les patterns RxJS : orchestrer intelligemment les flux asynchrones.

---

## Théorie

### Pattern 1 : Recherche avec debounce

Le pattern le plus classique en Angular. Chaque ESN vous le demandera en entretien.

```typescript
import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, filter } from 'rxjs/operators';
import { ProductService } from './product.service';

// ❌ Mauvais : requete a chaque frappe
@Component({
  selector: 'app-search',
  template: `<input (input)="onSearch($event)">`,
})
export class SearchBadComponent {
  onSearch(event: Event) {
    const terme = (event.target as HTMLInputElement).value;
    // Lance une requete a CHAQUE lettre tapee !
    this.productService.search(terme).subscribe();
  }
}

// ✅ Bon : debounce + distinctUntilChanged + switchMap
@Component({
  selector: 'app-search',
  template: `
    <input #searchInput placeholder="Rechercher un produit...">
    <ul>
      @for (produit of resultats; track produit.id) {
        <li>{{ produit.nom }}</li>
      }
    </ul>
  `,
})
export class SearchComponent implements OnInit {
  @ViewChild('searchInput', { static: true }) input!: ElementRef;
  private productService = inject(ProductService);
  resultats: Produit[] = [];

  ngOnInit() {
    fromEvent<Event>(this.input.nativeElement, 'input').pipe(
      map(event => (event.target as HTMLInputElement).value),
      debounceTime(300),           // Attend 300ms de silence
      distinctUntilChanged(),      // Ignore si le terme n'a pas change
      filter(terme => terme.length >= 2), // Minimum 2 caracteres
      switchMap(terme =>           // Annule la requete precedente
        this.productService.search(terme)
      ),
    ).subscribe(resultats => this.resultats = resultats);
  }
}
```

**Flux détaillé :**

```
Frappe :    P---Pr--Pro--Prod--Produ--Produit
                                      |
debounceTime(300ms) :                 Produit (seule emission)
                                      |
distinctUntilChanged :                Produit (pas de doublon)
                                      |
filter(len >= 2) :                    Produit ✅
                                      |
switchMap :                           GET /api/search?q=Produit
                                      |
subscribe :                           [{ id: 1, nom: 'Produit A' }]
```

### Pattern 2 : Polling avec interval + switchMap

Pour rafraichir des donnees periodiquement (dashboard, monitoring) :

```typescript
import { interval, timer } from 'rxjs';
import { switchMap, startWith, retry, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  template: `
    <div>Derniere mise a jour : {{ derniereMaj }}</div>
    <div>Commandes actives : {{ commandes.length }}</div>
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  commandes: Commande[] = [];
  derniereMaj = '';

  ngOnInit() {
    interval(30_000).pipe(             // Toutes les 30 secondes
      startWith(0),                     // Charger immediatement au demarrage
      switchMap(() =>                   // Annule si le precedent n'est pas fini
        this.http.get<Commande[]>('/api/commandes').pipe(
          retry(2),                     // 2 retries par requete
          catchError(() => of([])),     // En cas d'echec, tableau vide
        )
      ),
    ).subscribe(commandes => {
      this.commandes = commandes;
      this.derniereMaj = new Date().toLocaleTimeString();
    });
  }
}
```

> **Attention** : pensez a `takeUntilDestroyed()` pour arreter le polling quand le composant est detruit !

### Pattern 3 : Prevention des race conditions avec switchMap

Sans `switchMap`, des requêtes concurrentes peuvent arriver dans le desordre :

```
// ❌ Sans switchMap : race condition
Clic categorie A → requete A (lente, 3s)
Clic categorie B → requete B (rapide, 1s)

Resultat : B arrive en premier, puis A ecrase B !
L'utilisateur voit les produits de A alors qu'il a clique sur B.

// ✅ Avec switchMap : la requete A est annulee
Clic categorie A → requete A (annulee)
Clic categorie B → requete B (seule a aboutir) ✅
```

```typescript
// Service
@Injectable({ providedIn: 'root' })
export class CategorieService {
  private categorieSelectionnee$ = new Subject<string>();
  private http = inject(HttpClient);

  // Expose un Observable de produits, safe contre les race conditions
  readonly produits$ = this.categorieSelectionnee$.pipe(
    switchMap(catId =>
      this.http.get<Produit[]>(`/api/categories/${catId}/produits`)
    ),
  );

  selectCategorie(catId: string): void {
    this.categorieSelectionnee$.next(catId);
  }
}
```

### Pattern 4 : Requetes paralleles avec forkJoin

Pour charger plusieurs ressources en même temps :

```typescript
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-profil',
  template: `
    @if (loading) {
      <p>Chargement...</p>
    } @else {
      <h2>{{ user?.nom }}</h2>
      <p>{{ commandes.length }} commandes</p>
      <p>{{ adresses.length }} adresses</p>
    }
  `,
})
export class ProfilComponent implements OnInit {
  private http = inject(HttpClient);
  loading = true;
  user: User | null = null;
  commandes: Commande[] = [];
  adresses: Adresse[] = [];

  ngOnInit() {
    const userId = '42';

    forkJoin({
      user: this.http.get<User>(`/api/users/${userId}`),
      commandes: this.http.get<Commande[]>(`/api/users/${userId}/commandes`),
      adresses: this.http.get<Adresse[]>(`/api/users/${userId}/adresses`),
    }).pipe(
      catchError(err => {
        console.error('Erreur chargement profil :', err);
        return of({ user: null, commandes: [], adresses: [] });
      }),
    ).subscribe(({ user, commandes, adresses }) => {
      this.user = user;
      this.commandes = commandes;
      this.adresses = adresses;
      this.loading = false;
    });
  }
}
```

> **Piege `forkJoin`** : si **une seule** requête echoue, TOUT echoue. Protegez chaque requête individuellement si certaines sont optionnelles :

```typescript
forkJoin({
  user: this.http.get<User>(`/api/users/${userId}`),
  // Les adresses sont optionnelles : catchError individuel
  adresses: this.http.get<Adresse[]>(`/api/users/${userId}/adresses`).pipe(
    catchError(() => of([])),
  ),
}).subscribe(/* ... */);
```

### Pattern 5 : Requetes sequentielles avec concatMap

Quand le résultat d'une requête est nécessaire pour la suivante :

```typescript
// Etape 1 : creer le client → Etape 2 : creer la commande avec l'id client
this.http.post<Client>('/api/clients', clientData).pipe(
  concatMap(client =>
    this.http.post<Commande>('/api/commandes', {
      clientId: client.id,
      produits: this.panier,
    })
  ),
  concatMap(commande =>
    this.http.post('/api/paiements', {
      commandeId: commande.id,
      montant: commande.total,
    })
  ),
).subscribe({
  next: (paiement) => console.log('Paiement ok :', paiement),
  error: (err) => console.error('Echec du processus :', err),
});
```

### Pattern 6 : Recuperation d'erreurs avancee

```typescript
import { of, timer } from 'rxjs';
import { catchError, retry, retryWhen, delay, take, switchMap } from 'rxjs/operators';

// Retry avec backoff exponentiel
this.http.get('/api/donnees').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      const delaiMs = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      console.log(`Tentative ${retryCount}, retry dans ${delaiMs}ms`);
      return timer(delaiMs);
    },
  }),
  catchError(err => {
    // Toutes les tentatives ont echoue
    console.error('Abandon apres 3 tentatives :', err);
    return of({ data: [], erreur: true });
  }),
).subscribe();

// Retry uniquement sur certaines erreurs (5xx, pas 4xx)
this.http.get('/api/donnees').pipe(
  retry({
    count: 3,
    delay: (error) => {
      if (error.status >= 400 && error.status < 500) {
        // Erreur client : inutile de reessayer
        return throwError(() => error);
      }
      return timer(2000); // Erreur serveur : reessayer
    },
  }),
  catchError(err => of(null)),
).subscribe();
```

### Récapitulatif : quel pattern pour quel besoin

| Besoin | Pattern | Operateurs clés |
|--------|---------|-----------------|
| Recherche / autocomplete | Debounce search | `debounceTime` + `distinctUntilChanged` + `switchMap` |
| Rafraichissement periodique | Polling | `interval` + `startWith` + `switchMap` |
| Éviter les race conditions | Cancel previous | `switchMap` |
| Charger N ressources en même temps | Parallel load | `forkJoin` |
| Enchainer des requêtes dependantes | Sequential chain | `concatMap` |
| Retry intelligent | Exponential backoff | `retry({ delay })` + `catchError` |

---

## Pratique

Creez un composant de recherche d'utilisateurs avec :
1. Un champ de saisie
2. `debounceTime(300)` pour ne pas surcharger l'API
3. `distinctUntilChanged` pour éviter les requêtes identiques
4. `switchMap` pour annuler les requêtes obsoletes
5. Un minimum de 3 caracteres avant de lancer la recherche
6. Gestion d'erreur avec un message "Recherche indisponible"

<details>
<summary>Solution</summary>

```typescript
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, filter, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface User {
  id: number;
  nom: string;
  email: string;
}

@Component({
  selector: 'app-user-search',
  imports: [ReactiveFormsModule],
  template: `
    <input [formControl]="searchCtrl" placeholder="Rechercher un utilisateur (min 3 car.)">

    @if (erreur) {
      <p class="error">Recherche indisponible. Reessayez plus tard.</p>
    }

    <ul>
      @for (user of resultats; track user.id) {
        <li>{{ user.nom }} — {{ user.email }}</li>
      } @empty {
        <li>Aucun resultat</li>
      }
    </ul>
  `,
})
export class UserSearchComponent {
  private http = inject(HttpClient);

  searchCtrl = new FormControl('');
  resultats: User[] = [];
  erreur = false;

  constructor() {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((terme): terme is string => !!terme && terme.length >= 3),
      switchMap(terme =>
        this.http.get<User[]>(`/api/users?search=${terme}`).pipe(
          catchError(() => {
            this.erreur = true;
            return of([]);
          }),
        )
      ),
    ).subscribe(resultats => {
      this.erreur = false;
      this.resultats = resultats;
    });
  }
}
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| Debounce search | `debounceTime` + `distinctUntilChanged` + `switchMap` = le trio gagnant |
| Polling | `interval` + `startWith` + `switchMap`, penser a couper à la destruction |
| Race conditions | `switchMap` annule automatiquement les requêtes obsoletes |
| Requetes paralleles | `forkJoin` attend tout, attention a proteger les requêtes optionnelles |
| Requetes en serie | `concatMap` enchaine en respectant l'ordre |
| Backoff exponentiel | `retry({ count, delay })` avec un timer croissant |
| Erreur selective | Ne reessayer que sur les 5xx, pas les 4xx |

---

> **Prochain cours** : [Cours 24 — Interoperabilite Signals et RxJS](./04-interop-signals-rxjs.md)
