# Cours 25 — HttpClient et CRUD

> **Objectif** : Configurer `HttpClient` dans une application standalone Angular 19+, effectuer des requêtes CRUD typees, et exposer les donnees HTTP sous forme de Signals. Maîtriser le pattern service qui encapsule les appels API.

---

## Rappel du cours précédent

<details>
<summary>1. Que fait toSignal() et pourquoi est-ce utile ?</summary>

`toSignal()` convertit un Observable en Signal. Il géré automatiquement le `subscribe` et le `unsubscribe` (à la destruction du composant). Cela permet d'utiliser les donnees directement dans le template via `monSignal()` sans `async` pipe ni gestion manuelle du cycle de vie.
</details>

<details>
<summary>2. Quand utiliser RxJS plutot que Signals ?</summary>

RxJS pour les flux asynchrones complexes : requêtes HTTP, debounce, retry, composition de flux, WebSockets. Signals pour l'état UI synchrone et les valeurs derivees simples (`computed()`).
</details>

<details>
<summary>3. Que fait takeUntilDestroyed() ?</summary>

`takeUntilDestroyed()` complete automatiquement un Observable quand le composant (où le contexte d'injection) est detruit. Il remplace le pattern verbeux `destroy$ + takeUntil + ngOnDestroy`.
</details>

---

## Analogie

Imaginez un **serveur de restaurant** (le `HttpClient`) :

- Vous passez votre **commande** (la requête HTTP : GET, POST, PUT, DELETE)
- Vous preciser les **details** : "un steak saignant avec frites" (les paramètres, headers, body)
- Le serveur va en **cuisine** (le serveur API)
- Il revient avec votre **plat** (la réponse typee)
- Si la cuisine est en panne, il vous previent (erreur HTTP)

Le service Angular est le **maitre d'hotel** qui coordonne : il connait le menu (les endpoints), transmet au serveur (HttpClient), et présenté le plat au client (le composant) dans la bonne assiette (le type TypeScript).

---

## Théorie

### Configuration de HttpClient

En Angular 19+ standalone, la configuration se fait dans `app.config.ts` :

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
  ],
};
```

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

> **Pas de module !** En standalone, on utilise `provideHttpClient()` au lieu d'importer `HttpClientModule`.

### Injection de HttpClient

```typescript
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProductService {
  // ✅ Injection moderne avec inject()
  private http = inject(HttpClient);
}
```

### Requetes CRUD typees

#### GET — Lire des donnees

```typescript
interface Produit {
  id: number;
  nom: string;
  prix: number;
  description: string;
}

// GET liste
getProduits(): Observable<Produit[]> {
  return this.http.get<Produit[]>('/api/produits');
}

// GET par id
getProduit(id: number): Observable<Produit> {
  return this.http.get<Produit>(`/api/produits/${id}`);
}
```

#### POST — Créer une ressource

```typescript
interface CreateProduitDto {
  nom: string;
  prix: number;
  description: string;
}

creerProduit(data: CreateProduitDto): Observable<Produit> {
  return this.http.post<Produit>('/api/produits', data);
  // Le body est automatiquement serialise en JSON
}
```

#### PUT — Remplacer complètement

```typescript
mettreAJour(id: number, data: Produit): Observable<Produit> {
  return this.http.put<Produit>(`/api/produits/${id}`, data);
}
```

#### PATCH — Mise a jour partielle

```typescript
mettreAJourPartiel(id: number, patch: Partial<Produit>): Observable<Produit> {
  return this.http.patch<Produit>(`/api/produits/${id}`, patch);
}
```

#### DELETE — Supprimer

```typescript
supprimer(id: number): Observable<void> {
  return this.http.delete<void>(`/api/produits/${id}`);
}
```

### HttpParams et HttpHeaders

```typescript
import { HttpParams, HttpHeaders } from '@angular/common/http';

// Parametres de requete (query string)
rechercher(terme: string, page: number): Observable<Produit[]> {
  const params = new HttpParams()
    .set('q', terme)
    .set('page', page.toString())
    .set('limit', '20');

  return this.http.get<Produit[]>('/api/produits', { params });
  // → GET /api/produits?q=clavier&page=1&limit=20
}

// Headers personnalises
getAvecHeaders(): Observable<Produit[]> {
  const headers = new HttpHeaders()
    .set('X-Custom-Header', 'valeur')
    .set('Accept-Language', 'fr-FR');

  return this.http.get<Produit[]>('/api/produits', { headers });
}
```

> **Attention** : `HttpParams` et `HttpHeaders` sont **immutables**. Chaque appel a `.set()` retourne une **nouvelle** instance.

```typescript
// ❌ Mauvais : les params ne sont pas chaines
const params = new HttpParams();
params.set('q', 'test');     // Retourne un NOUVEL objet, non assigne
params.set('page', '1');     // Idem, l'original est toujours vide

// ✅ Bon : chainer les appels
const params = new HttpParams()
  .set('q', 'test')
  .set('page', '1');
```

### Observables HTTP : cold et single-emission

Les Observables HTTP sont **cold** (rien ne se passe sans subscribe) et **single-emission** (ils emettent une valeur puis completent) :

```typescript
// Cet Observable ne fait RIEN tant qu'on ne subscribe pas
const req$ = this.http.get('/api/produits');

// Chaque subscribe lance une NOUVELLE requete HTTP
req$.subscribe(data => console.log('Requete 1', data));
req$.subscribe(data => console.log('Requete 2', data)); // 2eme requete !

// Pas besoin de unsubscribe : l'Observable complete apres la reponse
// (sauf si vous voulez annuler une requete en cours)
```

### Pattern : service encapsulant HttpClient

```typescript
// product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Produit {
  id: number;
  nom: string;
  prix: number;
  categorieId: string;
}

export interface CreateProduitDto {
  nom: string;
  prix: number;
  categorieId: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = '/api/produits';

  getAll(categorie?: string): Observable<Produit[]> {
    let params = new HttpParams();
    if (categorie) {
      params = params.set('categorie', categorie);
    }
    return this.http.get<Produit[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateProduitDto): Observable<Produit> {
    return this.http.post<Produit>(this.baseUrl, dto);
  }

  update(id: number, dto: Partial<Produit>): Observable<Produit> {
    return this.http.patch<Produit>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

### Exposer les donnees HTTP comme Signals

Le pattern moderne combine `toSignal()` avec le service :

```typescript
// catalogue.component.ts
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService, Produit } from './product.service';

@Component({
  selector: 'app-catalogue',
  template: `
    @if (produits() === undefined) {
      <p>Chargement...</p>
    } @else if (produits()!.length === 0) {
      <p>Aucun produit</p>
    } @else {
      <ul>
        @for (p of produits(); track p.id) {
          <li>
            {{ p.nom }} — {{ p.prix }} EUR
            <button (click)="supprimer(p.id)">Supprimer</button>
          </li>
        }
      </ul>
    }
  `,
})
export class CatalogueComponent {
  private productService = inject(ProductService);

  // ✅ HTTP → Signal avec etat de chargement
  readonly produits = toSignal(this.productService.getAll());
  // Type : Signal<Produit[] | undefined>
  // undefined = en cours de chargement

  supprimer(id: number): void {
    this.productService.delete(id).subscribe(() => {
      // Recharger la liste apres suppression
      // En production, on utiliserait un state management
      window.location.reload();
    });
  }
}
```

### Comparaison avec Vue 3

| Concept | Vue 3 (axios) | Angular (HttpClient) |
|---------|---------------|---------------------|
| Librairie HTTP | `axios` (tierce) | `HttpClient` (intégré) |
| Retour | Promise | Observable (lazy, annulable) |
| Typage | `axios.get<T>(url)` | `http.get<T>(url)` |
| Intercepteurs | `axios.interceptors` | `withInterceptors()` |
| Annulation | `AbortController` | `unsubscribe()` / `switchMap` |
| Intégration template | `ref()` + `onMounted` | `toSignal()` automatique |

---

## Pratique

Creez un `TaskService` CRUD complet pour gérer des taches (todo) et un composant qui affiche la liste. L'interface `Task` contient : `id`, `titre`, `terminee` (boolean).

**Consignes** :
1. Service avec les 5 méthodes CRUD
2. Composant qui affiche les taches avec `toSignal()`
3. Bouton pour marquer une tache comme terminee (PATCH)

<details>
<summary>Solution</summary>

```typescript
// task.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Task {
  id: number;
  titre: string;
  terminee: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private url = '/api/tasks';

  getAll(): Observable<Task[]> {
    return this.http.get<Task[]>(this.url);
  }

  getById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.url}/${id}`);
  }

  create(titre: string): Observable<Task> {
    return this.http.post<Task>(this.url, { titre, terminee: false });
  }

  toggleTerminee(task: Task): Observable<Task> {
    return this.http.patch<Task>(`${this.url}/${task.id}`, {
      terminee: !task.terminee,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
```

```typescript
// task-list.component.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskService, Task } from './task.service';

@Component({
  selector: 'app-task-list',
  template: `
    <h2>Mes taches</h2>
    @for (task of taches(); track task.id) {
      <div>
        <span [style.text-decoration]="task.terminee ? 'line-through' : 'none'">
          {{ task.titre }}
        </span>
        <button (click)="toggle(task)">
          {{ task.terminee ? 'Rouvrir' : 'Terminer' }}
        </button>
      </div>
    }
  `,
})
export class TaskListComponent {
  private taskService = inject(TaskService);
  readonly taches = toSignal(this.taskService.getAll(), { initialValue: [] });

  toggle(task: Task): void {
    this.taskService.toggleTerminee(task).subscribe();
  }
}
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| `provideHttpClient()` | Configuration standalone dans `app.config.ts` |
| `http.get<T>(url)` | Toujours typer les réponses avec un générique |
| Observable HTTP | Cold (lazy) et single-emission (complete après réponse) |
| `HttpParams` / `HttpHeaders` | Immutables, chainer les `.set()` |
| Pattern service | Un service encapsule tous les appels à un endpoint |
| `toSignal()` + HTTP | Convertir les réponses en Signals pour le template |
| `undefined` = chargement | Sans `initialValue`, le Signal est `undefined` avant la réponse |
| Chaque subscribe = 1 requête | Les Observables HTTP sont cold, attention aux doubles appels |

---

> **Prochain cours** : [Cours 26 — Intercepteurs fonctionnels](./02-interceptors.md)
