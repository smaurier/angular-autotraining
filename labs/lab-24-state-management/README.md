# Lab 24 — State management : store maison puis NgRx SignalStore

> **Outcome :** à la fin, tu sais construire un store global TribuZen partagé par plusieurs composants, d'abord en **service maison** (signal privé + `asReadonly()` + actions), puis le **migrer en NgRx SignalStore** (`signalStore`, `withState`, `withComputed`, `withMethods`, `patchState`) sans toucher aux composants consommateurs.
> **Vrai outil :** Angular CLI 19 (`ng serve`) + `@ngrx/signals` (installé via npm) + un backend jetable `json-server` + l'onglet **Network** du navigateur comme oracle (une seule instance de store → une seule liste chargée, partagée entre header et page).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. L'oracle, c'est le rendu à l'écran et le Network tab.

---

## Énoncé

Tu montes le **store global des sorties** de TribuZen. Deux composants consomment le **même** état : un `HeaderComponent` qui affiche un badge « N sorties » et un `MesSortiesComponent` qui affiche la liste filtrable. Cahier des charges **exact** :

**Phase A — store maison (service + signals) :**

1. `SortieStore` = `@Injectable({ providedIn: 'root' })`.
2. État privé : `_sorties` (`signal<Sortie[]>`), `_filtre` (`signal<'toutes' | 'a-venir'>`), `_chargement` (`signal<boolean>`).
3. Lecture publique en `asReadonly()` : `sorties`, `filtre`, `chargement`.
4. Sélecteurs `computed` : `sortiesFiltrees` (filtre `a-venir` → `participants > 0`), `nbSorties`.
5. Actions : `charger()` (GET via `SortieService`), `setFiltre(f)`, `ajouter(dto)` (POST puis ajout immuable), `supprimer(id)` (DELETE puis retrait immuable).
6. `HeaderComponent` lit `store.nbSorties()` ; `MesSortiesComponent` lit `store.sortiesFiltrees()`, `store.chargement()` et appelle les actions. **Les deux injectent le même `SortieStore`.**

**Phase B — migration NgRx SignalStore :**

7. Réécris `SortieStore` avec `signalStore({ providedIn: 'root' }, withState(...), withComputed(...), withMethods(...))`, `patchState` pour toutes les mutations.
8. **Contrainte clé :** la surface publique reste identique (`store.sorties()`, `store.nbSorties()`, `store.sortiesFiltrees()`, `store.charger()`, `store.setFiltre()`, `store.ajouter()`, `store.supprimer()`) → **aucune ligne des deux composants ne change**.

**Interface (à copier dans ton `sortie.service.ts`) :**

```ts
export interface Sortie {
  id: string;
  titre: string;
  participants: number;
}

export interface CreateSortieDto {
  titre: string;
  participants: number;
}
```

**Pas de gap-fill** — tu écris les fichiers complets à partir du starter ci-dessous.

### Mise en place du vrai outil

Dans un projet Angular 19 standalone (ou ton repo TribuZen) :

```bash
# 1. Le store NgRx (phase B)
npm install @ngrx/signals

# 2. Backend de dev jetable — CRUD REST complet sur /sorties
npm install --save-dev json-server

# 3. db.json à la racine :
#    { "sorties": [
#        { "id": "s1", "titre": "Plage", "participants": 4 },
#        { "id": "s2", "titre": "Musée", "participants": 0 }
#    ] }

# 4. Lancer l'API sur le port 3000 (terminal séparé)
npx json-server --watch db.json --port 3000

# 5. proxy.conf.json : { "/api": { "target": "http://localhost:3000", "pathRewrite": { "^/api": "" } } }
#    puis : ng serve --proxy-config proxy.conf.json
```

Le `SortieService` HTTP est celui du module 18 (`getAll`, `create`, `delete`). Tu peux le reprendre tel quel — ici on se concentre sur le **store** au-dessus.

### Starter minimal

```ts
// sortie.service.ts — starter (réutilisé du module 18)
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sortie { id: string; titre: string; participants: number; }
export interface CreateSortieDto { titre: string; participants: number; }

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private readonly url = '/api/sorties';
  getAll(): Observable<Sortie[]> { return this.http.get<Sortie[]>(this.url); }
  create(dto: CreateSortieDto): Observable<Sortie> { return this.http.post<Sortie>(this.url, dto); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
```

```ts
// sortie.store.ts — starter PHASE A (store maison)
import { Injectable, inject, signal, computed } from '@angular/core';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

@Injectable({ providedIn: 'root' })
export class SortieStore {
  private api = inject(SortieService);
  // À toi : _sorties / _filtre / _chargement privés, lectures asReadonly(),
  //         computed sortiesFiltrees + nbSorties, actions charger/setFiltre/ajouter/supprimer
}
```

---

## Étapes (en friction)

1. **Phase A — état privé** : déclare `_sorties`, `_filtre`, `_chargement` en `signal(...)` **privés**. Expose `sorties`, `filtre`, `chargement` via `.asReadonly()`.
2. **Sélecteurs** : `sortiesFiltrees = computed(...)` (si `filtre() === 'a-venir'`, garde `participants > 0`, sinon tout) ; `nbSorties = computed(() => this._sorties().length)`.
3. **Actions** : `charger()` passe `_chargement` à `true`, `getAll().subscribe` remplit `_sorties` et repasse `chargement` à `false`. `setFiltre`, `ajouter` (POST + `update` immuable), `supprimer` (DELETE + `filter`).
4. **Branche 2 composants** : `HeaderComponent` avec `store.nbSorties()`, `MesSortiesComponent` avec la liste + boutons filtre/ajouter/supprimer. Les deux font `readonly store = inject(SortieStore)`.
5. **Oracle Phase A** : `MesSortiesComponent` appelle `charger()` au constructeur. Ajoute une sortie → le badge du header bouge **tout seul** (même instance de store). Au Network tab : **un seul** GET au chargement, partagé.
6. **Phase B — migration** : réécris `SortieStore` avec `signalStore({ providedIn: 'root' }, withState({...}), withComputed(...), withMethods(...))`. Chaque mutation passe par `patchState`.
7. **Contrainte de non-régression** : garde **exactement** les mêmes noms publics. Objectif : **ne modifie aucun des deux composants** — ils doivent compiler et marcher à l'identique.
8. **Oracle Phase B** : même comportement à l'écran qu'en phase A. Vérifie que `patchState(store, { chargement: true })` ne remet pas `sorties`/`filtre` à zéro (merge partiel).

---

## Corrigé complet commenté

### Phase A — store maison

```ts
// sortie.store.ts — PHASE A (service + signals)
import { Injectable, inject, signal, computed } from '@angular/core';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

@Injectable({ providedIn: 'root' })
export class SortieStore {
  private api = inject(SortieService);

  // --- État SOURCE : privé, personne ne le mute de l'extérieur ---
  private readonly _sorties = signal<Sortie[]>([]);
  private readonly _filtre = signal<'toutes' | 'a-venir'>('toutes');
  private readonly _chargement = signal(false);

  // --- Lecture PUBLIQUE : lecture seule (pas de .set() exposé) ---
  readonly sorties = this._sorties.asReadonly();
  readonly filtre = this._filtre.asReadonly();
  readonly chargement = this._chargement.asReadonly();

  // --- SÉLECTEURS dérivés : recalcul auto quand une source change ---
  readonly sortiesFiltrees = computed(() =>
    this._filtre() === 'a-venir'
      ? this._sorties().filter(s => s.participants > 0)
      : this._sorties(),
  );
  readonly nbSorties = computed(() => this._sorties().length);

  // --- ACTIONS : seul moyen de muter l'état ---
  charger(): void {
    this._chargement.set(true);
    this.api.getAll().subscribe(liste => {
      this._sorties.set(liste);
      this._chargement.set(false);
    });
  }

  setFiltre(f: 'toutes' | 'a-venir'): void {
    this._filtre.set(f);   // valeur absolue → set
  }

  ajouter(dto: CreateSortieDto): void {
    this.api.create(dto).subscribe(creee =>
      // nouvelle référence (spread) → Angular notifié
      this._sorties.update(liste => [...liste, creee]),
    );
  }

  supprimer(id: string): void {
    this.api.delete(id).subscribe(() =>
      this._sorties.update(liste => liste.filter(s => s.id !== id)),
    );
  }
}
```

```ts
// header.component.ts — consommateur #1
import { Component, inject } from '@angular/core';
import { SortieStore } from './sortie.store';

@Component({
  selector: 'app-header',
  template: `<span class="badge">{{ store.nbSorties() }} sortie(s)</span>`,
})
export class HeaderComponent {
  // MÊME store injecté que MesSortiesComponent → même instance, même état
  readonly store = inject(SortieStore);
}
```

```ts
// mes-sorties.component.ts — consommateur #2
import { Component, inject } from '@angular/core';
import { SortieStore } from './sortie.store';

@Component({
  selector: 'app-mes-sorties',
  template: `
    <div class="filtres">
      <button (click)="store.setFiltre('toutes')"
              [class.actif]="store.filtre() === 'toutes'">Toutes</button>
      <button (click)="store.setFiltre('a-venir')"
              [class.actif]="store.filtre() === 'a-venir'">À venir</button>
    </div>
    <button (click)="ajouter()">Ajouter une sortie</button>

    @if (store.chargement()) {
      <p>Chargement…</p>
    } @else {
      <ul>
        @for (s of store.sortiesFiltrees(); track s.id) {
          <li>
            {{ s.titre }} — {{ s.participants }} pers.
            <button (click)="store.supprimer(s.id)">Supprimer</button>
          </li>
        } @empty {
          <li>Aucune sortie.</li>
        }
      </ul>
    }
  `,
})
export class MesSortiesComponent {
  readonly store = inject(SortieStore);

  constructor() {
    this.store.charger();   // un seul chargement, partagé avec le header
  }

  ajouter(): void {
    this.store.ajouter({ titre: 'Nouvelle sortie', participants: 2 });
  }
}
```

### Phase B — migration NgRx SignalStore

```ts
// sortie.store.ts — PHASE B (NgRx SignalStore) — surface publique IDENTIQUE
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

type SortieState = {
  sorties: Sortie[];
  filtre: 'toutes' | 'a-venir';
  chargement: boolean;
};

const initialState: SortieState = {
  sorties: [],
  filtre: 'toutes',
  chargement: false,
};

export const SortieStore = signalStore(
  { providedIn: 'root' },            // global : même instance partout (comme le service)
  withState(initialState),           // génère store.sorties(), store.filtre(), store.chargement()

  withComputed((store) => ({
    // mêmes noms que la phase A : sortiesFiltrees, nbSorties
    sortiesFiltrees: computed(() =>
      store.filtre() === 'a-venir'
        ? store.sorties().filter(s => s.participants > 0)
        : store.sorties(),
    ),
    nbSorties: computed(() => store.sorties().length),
  })),

  withMethods((store, api = inject(SortieService)) => ({
    charger(): void {
      // patchState partiel : ne touche que chargement, sorties/filtre conservés
      patchState(store, { chargement: true });
      api.getAll().subscribe(sorties =>
        patchState(store, { sorties, chargement: false }),
      );
    },

    setFiltre(f: SortieState['filtre']): void {
      patchState(store, { filtre: f });        // objet partiel = valeur absolue
    },

    ajouter(dto: CreateSortieDto): void {
      api.create(dto).subscribe(creee =>
        // updater : dérive de l'ancien état, immuablement
        patchState(store, (state) => ({ sorties: [...state.sorties, creee] })),
      );
    },

    supprimer(id: string): void {
      api.delete(id).subscribe(() =>
        patchState(store, (state) => ({
          sorties: state.sorties.filter(s => s.id !== id),
        })),
      );
    },
  })),
);
```

**Pourquoi ce corrigé est correct :**
- **Une seule instance partagée** : `providedIn: 'root'` (service comme SignalStore) fait que `HeaderComponent` et `MesSortiesComponent` injectent le **même** store. Ajouter une sortie depuis la page met à jour le badge du header sans une ligne de synchro — c'est la preuve visible qu'un store partagé fonctionne.
- **Phase B ne touche pas les composants** : les noms publics (`sorties`, `filtre`, `chargement`, `sortiesFiltrees`, `nbSorties`, `charger`, `setFiltre`, `ajouter`, `supprimer`) sont conservés à l'identique. `inject(SortieStore)` renvoie désormais un SignalStore, mais `store.sortiesFiltrees()` s'appelle pareil. C'est ce qui rend la migration indolore.
- **`patchState` partiel** : `patchState(store, { chargement: true })` ne remet pas `sorties`/`filtre` à zéro (merge de surface). Les mutations de liste utilisent l'**updater** `(state) => ({ sorties: [...state.sorties, x] })` pour rester immuables — jamais `push`.
- **Aucun `asReadonly()` en phase B** : `withState` expose déjà les clés en signaux **lecture seule** ; on ne peut muter qu'via `patchState` à l'intérieur des `withMethods`. La garde d'encapsulation est gratuite.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis le store **de mémoire, en 30 minutes**, sans rouvrir ce corrigé ni le module 24, en partant **directement de la version SignalStore** (phase B), avec :

1. Une **recherche par titre debouncée** implémentée avec `rxMethod()` de `@ngrx/signals/rxjs-interop` : `rechercher: rxMethod<string>(pipe(debounceTime(300), distinctUntilChanged(), tap(() => patchState(store, { chargement: true })), switchMap(q => api.getByQuery(q).pipe(tapResponse({ next: sorties => patchState(store, { sorties }), error: console.error, finalize: () => patchState(store, { chargement: false }) })))))`. Ajoute `getByQuery(q)` au `SortieService` (`GET /api/sorties?titre_like=...`).
2. Un champ `<input>` dans `MesSortiesComponent` qui appelle `store.rechercher(valeur)` à chaque frappe.

**Critère de réussite :** au Network tab, taper vite ne lance **qu'une** requête après la pause de 300 ms (debounce), et changer de recherche pendant un chargement annule la requête précédente (`switchMap`). Le spinner apparaît puis disparaît via `finalize`, même en cas d'erreur.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      sorties/
        sortie.service.ts          ← HTTP (module 18) — inchangé
        sortie.store.ts             ← store global : phase A puis phase B
        mes-sorties.component.ts
      header/
        header.component.ts         ← consomme le MÊME SortieStore
```

**Différences par rapport au lab :**

- Le `CreateSortieDto` viendra d'un **formulaire réactif** (module 19), pas d'un objet en dur `{ titre: 'Nouvelle sortie', participants: 2 }`.
- Le `SortieService` sera authentifié par l'`authInterceptor` (module 25) — le store ne change pas : il délègue toujours l'HTTP au service.
- En production, on branchera les **NgRx DevTools** (via NgRx Toolkit) sur le SignalStore pour inspecter l'état — hors périmètre du lab.
- Le backend `json-server` sera remplacé par l'API TribuZen réelle ; le contrat REST est identique, le store ne bouge pas.

**Commit cible (2 commits pour tracer la migration) :**
```
feat(sorties): SortieStore maison (service + signals) partagé header/page
refactor(sorties): migration SortieStore vers NgRx SignalStore (API publique inchangée)
```
